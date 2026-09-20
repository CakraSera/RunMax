// Eval runner v2 (anvia-rag-evals structure): cases are data, suites are
// mechanics. Gate = the pure-rule oracle in each case's assert(). Advisory
// LLM-judged scores publish to Langfuse but never flip a verdict.
// Run: pnpm --filter @runmax/agent evals [caseId ...]
import { evalExitCode, runEvalSuite, type EvalMetricResult, type EvalSuiteResult } from "@anvia/core/evals";
import { createWeeksmith } from "../agent.js";
import { langfuse } from "../tracing.js";
import { metricsFor, type TargetOutput } from "./metrics.js";
import { connectNotesMcp } from "../notes.js";
import { evalReporter } from "./reporter.js";
import type { NotesStore, WeekStore } from "../stores.js";
import type { Week } from "@runmax/domain";
import { runBuildThisWeek } from "../workflow.js";
import { BOARD_CASES, type WeekEvalCase } from "./cases.js";

/** In-memory store that keeps every build so overwrite can be observed. */
function memoryWeekStore() {
  let current: Week | null = null;
  let builds = 0;
  const store: WeekStore = {
    async save(week) {
      current = structuredClone(week);
      builds++;
    },
    async load() {
      return current ? structuredClone(current) : null;
    },
  };
  return { store, builds: () => builds };
}

/** Notes store that remembers what retrieveNotes fetched, for faithfulness. */
function captureNotesStore(inner: NotesStore): { store: NotesStore; captured: () => string[] } {
  const capturedNotes: string[] = [];
  return {
    store: {
      async search(query) {
        const ids = await inner.search(query);
        for (const id of ids) {
          capturedNotes.push(await inner.read(id));
        }
        return ids;
      },
      read: (id) => inner.read(id),
    },
    captured: () => capturedNotes,
  };
}

const CASE_TIMEOUT_MS = Number(process.env.EVAL_CASE_TIMEOUT_MS ?? 180_000);

async function main() {
  const only = process.argv.slice(2);
  const cases = only.length > 0 ? BOARD_CASES.filter((c) => only.includes(c.id)) : BOARD_CASES;
  if (cases.length === 0) {
    console.error(`no cases match: ${only.join(", ")}`);
    process.exit(2);
  }

  const rawNotes = await connectNotesMcp();
  const { store: notes, captured } = captureNotesStore(rawNotes);

  try {
    const suite = await runEvalSuite<TargetOutput, TargetOutput, WeekEvalCase>({
      name: "weeksmith-board-evals",
      cases: cases.map((c) => ({
        id: c.id,
        input: { prompt: c.input, reply: "", week: null, notes: [] },
        metadata: { category: c.category, expect: c.expect },
      })),
      target: async (input) => {
        const { store } = memoryWeekStore();
        const agent = createWeeksmith({ stores: { notes, weeks: store }, effort: "low" });
        const result = await runBuildThisWeek(agent, { notes, weeks: store }, { log: input.prompt });
        const week = await stores_load(store);
        return {
          prompt: input.prompt,
          reply: result.ok
            ? `Week built and saved: ${result.week?.weekStart}`
            : `Build failed: ${result.error ?? "unknown"}`,
          week: week
            ? {
                weekStart: week.weekStart,
                sessions: week.sessions.map((s) => ({ kind: s.kind, note: s.note })),
                flags: [...week.flags],
              }
            : null,
          notes: captured(),
        };
      },
      metrics: metricsFor(["relevancy", "faithfulness"]),
      concurrency: 1,
      caseTimeoutMs: CASE_TIMEOUT_MS,
      failFast: false,
      reporters: [evalReporter],
      reporterErrorPolicy: "collect",
    });

    let failures = 0;
    for (const r of suite.results) {
      const c = cases.find((x) => x.id === r.case.id)!;
      // Gate: the rule oracle against the Week the run actually saved.
      const week = r.output?.week ?? null;
      const verdict = week === null ? `build failed: ${stringify(r.targetError)}` : c.assert(toWeek(week));
      const pass = verdict === true;
      if (!pass) failures++;
      const advisory = r.metrics.map(formatMetric).filter(Boolean).join(" ");
      console.log(
        `eval ${r.case.id} ... ${pass ? "PASS" : `FAIL (${verdict})`}${advisory ? `  [${advisory}]` : ""}`,
      );
    }

    console.log(`\n${suite.results.length - failures}/${suite.results.length} passed`);
    console.log(
      `cases pass=${suite.cases.passed} fail=${suite.cases.failed} invalid=${suite.cases.invalid} · ${Math.round(suite.durationMs / 1000)}s`,
    );
    process.exit(evalExitCode(suite));
  } finally {
    await rawNotes.close();
    await langfuse.close();
  }
}

async function stores_load(store: WeekStore) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return store.load(`${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`);
}

/** Widen the runner's Week projection back to the domain type for asserts.
 *  Dates/durations are reconstructed from weekStart + slot so checkWeek's
 *  date-order and duration rules see the same Week saveWeek validated. */
function toWeek(week: TargetOutput["week"]): Week {
  const start = new Date(`${week!.weekStart}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    weekStart: week!.weekStart,
    sessions: week!.sessions.map((s, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const kind = s.kind as "easy" | "quality" | "rest" | "walk";
      return {
        date,
        kind,
        durationMinutes: kind === "rest" ? 0 : kind === "walk" ? 30 : 40,
        hard: kind === "quality",
        note: s.note,
      };
    }),
    flags: week!.flags as Week["flags"],
  };
}

function stringify(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200);
}

function formatMetric(m: EvalMetricResult<unknown, string>): string {
  const score = m.outcome && typeof m.outcome === "object" && "score" in m.outcome ? m.outcome.score : undefined;
  const outcome = m.outcome && typeof m.outcome === "object" && "outcome" in m.outcome ? m.outcome.outcome : "?";
  const value = typeof score === "number" ? score.toFixed(2) : String(score ?? "-");
  return `${m.metricName}=${value}(${outcome})`;
}

await main();
