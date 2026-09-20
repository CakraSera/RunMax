// Advisory LLM-judged metrics (anvia-rag-evals style). These NEVER gate —
// the rule oracle in cases.ts is the gate. Scores publish to each case's
// Langfuse trace so quality trends are visible in Score Analytics.
import type { CompletionModel } from "@anvia/core";
import type { EvalMetric } from "@anvia/core/evals";
import { answerRelevancy, faithfulness } from "@anvia/core/evals";
import { getModel } from "../model.js";
import type { AdvisoryKind, WeekEvalCase } from "./cases.js";

/** Shared judge: the same gateway model (override with EVAL_JUDGE_MODEL). */
export function judgeModel(): CompletionModel {
  return getModel(process.env.EVAL_JUDGE_MODEL);
}

const JUDGE_THRESHOLD = 0.8;

/** What the eval target hands to the metrics: reply text, week projection, retrieved notes. */
export interface TargetOutput {
  /** The Log prompt this run built from (echoed so metrics can read it). */
  prompt: string;
  reply: string;
  week: {
    weekStart: string;
    sessions: Array<{ kind: string; note: string }>;
    flags: string[];
  } | null;
  notes: string[];
}

/** Quality-note text from the shipped week; falls back to the reply when pain removed Quality. */
function judgedText(output: TargetOutput): string {
  const q = output.week?.sessions.find((s) => s.kind === "quality");
  return q?.note || output.reply;
}

export function metricsFor(
  kinds: AdvisoryKind[] | undefined,
): EvalMetric<TargetOutput, TargetOutput, unknown, WeekEvalCase>[] {
  const metrics: EvalMetric<TargetOutput, TargetOutput, unknown, WeekEvalCase>[] = [];
  if (kinds?.includes("relevancy")) {
    metrics.push(
      answerRelevancy({
        name: "answer-relevancy",
        model: judgeModel(),
        threshold: JUDGE_THRESHOLD,
        required: false,
        input: (args) => args.output.prompt,
        actual: (args) => args.output.reply,
      }) as EvalMetric<TargetOutput, TargetOutput, unknown, WeekEvalCase>,
    );
  }
  if (kinds?.includes("faithfulness")) {
    metrics.push(
      faithfulness({
        name: "quality-note-faithfulness",
        model: judgeModel(),
        threshold: JUDGE_THRESHOLD,
        required: false,
        // Ground the judgement in what retrieveNotes actually fetched.
        retrievalContext: (args) => args.output.notes,
        actual: (args) => judgedText(args.output),
      }) as EvalMetric<TargetOutput, TargetOutput, unknown, WeekEvalCase>,
    );
  }
  return metrics;
}
