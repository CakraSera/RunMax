// Consult evals (PRD §10 fixtures 11–13), v2: cases live in cases.ts, this
// file is mechanics — drive ConsultThenBuild, apply the rule oracle, report.
// Gate = oracle. Advisory scores publish to Langfuse but never flip verdicts.
import { runEvalSuite, evalExitCode, type EvalSuiteResult } from "@anvia/core/evals";
import { createWeeksmith } from "../agent.js";
import { langfuse } from "../tracing.js";
import { connectNotesMcp } from "../notes.js";
import { evalReporter } from "./reporter.js";
import { fileWeekStore, memoryLogStore } from "../stores.js";
import { runConsultThenBuild } from "../workflow.js";
import { CONSULT_CASES } from "./cases.js";

const CASE_TIMEOUT_MS = Number(process.env.EVAL_CASE_TIMEOUT_MS ?? 240_000);

interface ConsultOutput {
  reply: string;
  log: string;
  ok: boolean;
  error?: string;
  weekStart: string | null;
}

async function main() {
  const only = process.argv.slice(2);
  const cases = only.length > 0 ? CONSULT_CASES.filter((c) => only.includes(c.id)) : CONSULT_CASES;
  if (cases.length === 0) {
    console.error(`no cases match: ${only.join(", ")}`);
    process.exit(2);
  }

  const notes = await connectNotesMcp();

  try {
    const suite = await runEvalSuite<ConsultOutput, ConsultOutput, (typeof CONSULT_CASES)[number]>({
      name: "consultsmith-evals",
      cases: cases.map((c) => ({
        id: c.id,
        input: { reply: "", log: c.transcript, ok: false, weekStart: null },
        metadata: { category: c.category, expect: c.expect },
      })),
      target: async (input) => {
        const logs = memoryLogStore();
        const weeks = fileWeekStore();
        const weeksmith = createWeeksmith({ stores: { notes, weeks }, effort: "low" });
        const result = await runConsultThenBuild(
          { consultStores: { logs }, weeksmith, weeksmithStores: { notes, weeks }, effort: "low" },
          { transcript: input.log },
        );
        return {
          reply: result.ok
            ? `Week built and saved: ${result.week?.weekStart}`
            : `Build failed: ${result.error ?? "unknown"}`,
          log: result.log,
          ok: result.ok,
          error: result.error,
          weekStart: result.week?.weekStart ?? null,
        };
      },
      metrics: [],
      concurrency: 1,
      caseTimeoutMs: CASE_TIMEOUT_MS,
      failFast: false,
      reporters: [evalReporter],
      reporterErrorPolicy: "collect",
    });

    let failures = 0;
    for (const r of suite.results) {
      const c = cases.find((x) => x.id === r.case.id)!;
      const out = r.output;
      const verdict =
        out === undefined
          ? `target failed: ${stringify(r.targetError)}`
          : c.assert(out.log, null, { ok: out.ok, error: out.error });
      const pass = verdict === true;
      if (!pass) failures++;
      console.log(`eval ${r.case.id} ... ${pass ? "PASS" : `FAIL (${verdict})`}`);
    }

    console.log(`\n${suite.results.length - failures}/${suite.results.length} passed`);
    process.exit(evalExitCode(suite));
  } finally {
    await notes.close();
    await langfuse.close();
  }
}

function stringify(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200);
}

await main();
