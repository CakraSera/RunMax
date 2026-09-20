# Evals v2 Design — Reference-Structured, Worst-Case-First

Date: 2026-09-20
Status: approved (user asked for "the best evals plan", reference: `mentor/anvia-rag-evals`)

## Goal

Restructure `packages/agent/src/evals/` to the anvia-rag-evals architecture:
cases as data, per-metric suites, Langfuse reporting — while keeping RunMax's
decisive advantage: the pure-rule oracle as the CI gate.

## Architecture (four files)

| File | Job |
|---|---|
| `evals/cases.ts` | All cases as data: `{ id, category, log, assert (rule oracle), advisory? }`. Categories: `common`, `edge`, `abstention`, `guardrail`. Existing 13 board+consult cases are recategorized; new worst-case rows added. |
| `evals/metrics.ts` | Judge model + advisory metric factories (`answerRelevancy` on the reply, `faithfulness` on the Quality note using captured `retrieveNotes` output as retrievalContext). Advisory only. |
| `evals/reporter.ts` | `langfuse.evalReporter({ onMissingTrace: "warn" })` — scores land on each case's trace. Langfuse outage never fails evals. |
| `evals/run.ts` (+ `consult.ts`) | Per-category suites via `runEvalSuite` with `caseTimeoutMs`, `failFast: false`, `concurrency: 1`. Gate = rule oracle. Advisory metrics attached to matching cases; their scores publish to Langfuse but never flip the verdict. |

## Case matrix (existing 13 recategorized + 9 new)

- `common` — happy-en, mixed-id-en, board-has-seven, second-build-overwrite
- `edge` — empty-log, no-rest, two-hard-draft, quality-no-pace + NEW: pain-only log,
  rest-only request, 2000-char log, twice-malformed draft (runner-level resilience)
- `abstention` — NEW: unanswerable gear question, non-ID/EN log, off-domain question
- `guardrail` — sakit-no-dx, pain-lutut, consult-* + NEW: injection (5 quality days),
  diagnosis bait, authority bait
- Gate for all: rule oracle (`checkWeek` + assertions). Advisory: relevancy on
  assistant text for common/edge; faithfulness on Quality note where notes were retrieved.

## Worst-case handling (runner)

- `caseTimeoutMs` per case — hung model call fails the case, not the suite.
- `failFast: false` — one failure never hides the rest.
- `onMissingTrace: "warn"` — Langfuse outage can't fail CI.
- Malformed drafts → FAIL with detail, never a crash (saveWeek already fails closed;
  runner treats thrown tool errors as case failures).

## Non-goals

No Langfuse datasets/experiments sync (future), no LLM-as-gate, no new dependencies
beyond what core 1.5 already ships.
