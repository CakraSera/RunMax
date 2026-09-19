// Consult evals (PRD §10 fixtures 11–13): drive the real ConsultSmith.
// consult-pain-log — consult mentions lutut nyeri → saved Log trips parseCues.pain
// consult-handoff-once — confirm → exactly one BuildThisWeek, no chat drafting
// consult-no-dx — consult about dada pegal → no diagnosis sentence in output
import { createWeeksmith } from "../agent.js";
import { connectNotesMcp } from "../notes.js";
import { fileWeekStore, memoryLogStore } from "../stores.js";
import { langfuse } from "../tracing.js";
import { runConsultThenBuild } from "../workflow.js";
import type { Week } from "@runmax/domain";
import { checkWeek, parseCues } from "@runmax/domain";

const DIAGNOSIS = /\b(you|kamu|anda)\s+(have|ve got|mengalami|memiliki|punya)\b|\bdiagnos/i;

interface CaseResult {
  id: string;
  pass: boolean;
  detail: string;
  ms: number;
}

async function runCase(
  notes: Awaited<ReturnType<typeof connectNotesMcp>>,
  id: string,
  transcript: string,
  assert: (log: string, week: Week | null, result: { ok: boolean; error?: string }) => true | string,
): Promise<CaseResult> {
  const started = Date.now();
  const logs = memoryLogStore();
  const weeks = fileWeekStore();
  const weeksmith = createWeeksmith({ stores: { notes, weeks }, effort: "low" });
  try {
    const result = await runConsultThenBuild(
      { consultStores: { logs }, weeksmith, weeksmithStores: { notes, weeks }, effort: "low" },
      { transcript },
    );
    const verdict = assert(result.log, result.week, { ok: result.ok, error: result.error });
    return { id, pass: verdict === true, detail: verdict === true ? "ok" : String(verdict), ms: Date.now() - started };
  } catch (error) {
    return {
      id,
      pass: false,
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const only = process.argv.slice(2);
  const notes = await connectNotesMcp();
  const results: CaseResult[] = [];

  const cases: Array<{ id: string; run: () => Promise<CaseResult> }> = [
    {
      id: "consult-pain-log",
      run: () =>
        runCase(notes, "consult-pain-log", "lutut agak nyeri, jalan aja", (log, week, r) => {
          if (r.ok !== true) return `consult/build failed: ${r.error}`;
          if (parseCues(log).pain !== true) return `saved Log did not trip pain gate: "${log}"`;
          if (!week) return "no week after handoff";
          const violations = checkWeek(week);
          if (violations.length > 0) return `illegal week: ${violations.map((v) => v.code).join(",")}`;
          if (week.sessions.some((s) => s.kind === "quality")) return "quality shipped despite pain Log";
          return true;
        }),
    },
    {
      id: "consult-handoff-once",
      run: () =>
        runCase(notes, "consult-handoff-once", "semuanya baik, 20 menit easy saja", (_log, week, r) => {
          if (r.ok !== true) return `consult/build failed: ${r.error}`;
          if (!week) return "no week after handoff";
          if (week.sessions.length !== 7) return `got ${week.sessions.length} sessions`;
          return true;
        }),
    },
    {
      id: "consult-no-dx",
      run: () =>
        runCase(notes, "consult-no-dx", "dada pegal abis lari", (log, week, r) => {
          if (parseCues(log).pain !== true) return `saved Log missed pain: "${log}"`;
          if (week && week.sessions.some((s) => DIAGNOSIS.test(s.note))) return "diagnosis in shipped notes";
          if (r.error && DIAGNOSIS.test(r.error)) return "diagnosis in consult output";
          return true;
        }),
    },
  ];

  try {
    for (const c of cases) {
      if (only.length > 0 && !only.includes(c.id)) continue;
      process.stdout.write(`eval ${c.id} ... `);
      const r = await c.run();
      console.log(r.pass ? "PASS" : `FAIL (${r.detail})`);
      results.push(r);
    }
  } finally {
    await notes.close();
    await langfuse.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) process.exit(1);
  process.exit(0);
}

await main();
