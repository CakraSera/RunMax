# Tracing Debug Resources

## Knowledge

- [RunMax PRD (local)](../../document/PRD.en.md)
  The product contract: scope, the 5 verb tools, §10 golden fixtures. Use for: any claim about what the agent must do.
- [RunMax CONTEXT.md (local)](../../CONTEXT.md)
  The one true vocabulary: Week, Session, Kind, Board, Weeksmith, BuildThisWeek. Use for: naming things in the presentation.
- [ADRs (local)](../../docs/adr/)
  Why-decisions: Monday–Sunday, ≤1 Hard, pain gate, overwrite-this-Monday. Use for: answering "why" questions.
- [Langfuse: Core Concepts (traces, observations, sessions)](https://langfuse.com/docs/observability/data-model)
  What a trace is, that observations nest inside it, and that export is background-batched. Use for: “why did flush succeed but the UI is empty?”
- [Langfuse: Event queuing / batching](https://langfuse.com/docs/observability/features/queuing-batching)
  Official `flush` / `forceFlush` / shutdown rules for short-lived scripts. Use for: `runner:dev` and evals.
- [Langfuse: Observation types](https://langfuse.com/docs/observability/features/observation-types)
  `agent`, `generation`, `tool`, `span`. Use for: “why isn’t the type Agent?”
- [Langfuse: Get started (JS / NodeSDK)](https://langfuse.com/docs/observability/get-started)
  Canonical `NodeSDK` + `LangfuseSpanProcessor` setup. Use for: matching what this repo actually ships.
- [Anvia: `@anvia/langfuse` get started](https://docs.anvia.dev/packages/langfuse/get-started.html)
  The documented `LangfuseClient().observer()` surface. Use for: comparing docs vs this repo’s working path.
- [OpenTelemetry JS: Force flush](https://opentelemetry.io/docs/languages/js/instrumentation/#force-flush)
  What flush means at the SDK layer. Use for: “flush is a send attempt, not a receipt.”

## Wisdom (Communities)

- [Langfuse GitHub Discussions](https://github.com/orgs/langfuse/discussions)
  High-signal, searchable. Use for: ingest/auth/UI-filter issues with a `traceId` in hand.
- [OpenTelemetry JS GitHub](https://github.com/open-telemetry/opentelemetry-js)
  Use for: processor / exporter behaviour, not Langfuse UI.

## Gaps

- Anvia 1.x `@anvia/langfuse` does not document the `langfuse-sdk` vs `@anvia/langfuse` tracer-name mismatch. Treat Anvia docs as the intended API, this repo’s `src/tracing.ts` as the working one.
