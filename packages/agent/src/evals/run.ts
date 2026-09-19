// Eval runner (PRD §10): drives the real Weeksmith through every golden
// fixture against a throwaway store, checks the pure-rule oracle, and
// reports pass/fail per case. Run: pnpm --filter @runmax/agent evals
import { createWeeksmith } from "../agent.js";
import { GOLDEN_CASES, type EvalCase } from "./cases.js";
import { connectNotesMcp } from "../notes.js";
import type { Week } from "@runmax/domain";
import type { WeekStore } from "../stores.js";
import { langfuse } from "../tracing.js";
import { runBuildThisWeek } from "../workflow.js";

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

interface CaseResult {
  id: string;
  pass: boolean;
  detail: string;
  ms: number;
}

async function runCase(notes: Awaited<ReturnType<typeof connectNotesMcp>>, c: EvalCase): Promise<CaseResult> {
  const started = Date.now();
  const { store } = memoryWeekStore();
  const agent = createWeeksmith({ stores: { notes, weeks: store }, effort: "low" });
  try {
    const result = await runBuildThisWeek(agent, { notes, weeks: store }, { log: c.log });
    if (!result.ok || !result.week) {
      return { id: c.id, pass: false, detail: `build failed: ${result.error ?? "unknown"}`, ms: Date.now() - started };
    }
    const verdict = c.assert(result.week);
    return {
      id: c.id,
      pass: verdict === true,
      detail: verdict === true ? "ok" : String(verdict),
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      id: c.id,
      pass: false,
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const only = process.argv.slice(2);
  const cases = only.length > 0 ? GOLDEN_CASES.filter((c) => only.includes(c.id)) : GOLDEN_CASES;
  const notes = await connectNotesMcp();
  const results: CaseResult[] = [];
  try {
    for (const c of cases) {
      process.stdout.write(`eval ${c.id} ... `);
      const r = await runCase(notes, c);
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
