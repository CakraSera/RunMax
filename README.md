# RunMax

One runner’s **this Week** of running from an optional messy **Log** — shown as a **Board** on mobile-first web. See [CONTEXT.md](CONTEXT.md) for the domain language and [document/PRD.en.md](document/PRD.en.md) for the full PRD.

## Stack

- pnpm workspace — `packages/domain` (shared rules), `packages/agent` (Weeksmith on Anvia), `apps/api` (BE), `apps/platform` (FE)
- Agent: `@anvia/core` + `@anvia/openai` + `@langfuse/otel` + `@langfuse/tracing` + `@anvia/mcp`, model `z-ai/glm-5.3-flash` (effort low/high/max, default max)
- FE: Vite 8 · React 19 · TanStack Router · Tailwind CSS 4

## Get started

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Start the Board

   ```bash
   pnpm start
   ```

Open `http://localhost:3000`. Edit `apps/platform/src/routes/index.tsx`.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `pnpm start` / `pnpm web` | Vite Board on port 3000 |
| `pnpm --filter platform typecheck` | Typecheck FE |
| `pnpm --filter api typecheck` | Typecheck BE |
| `pnpm --filter @runmax/agent typecheck` | Typecheck AI |
| `pnpm --filter @runmax/domain test` | Domain golden-fixture tests (offline) |
| `pnpm --filter @runmax/agent evals` | 10 PRD §10 golden fixtures through the real model |
| `pnpm --filter @runmax/agent evals -- pain-lutut` | Run one eval case by id |
| `pnpm --filter @runmax/agent runner:dev` | One BuildThisWeek from argv through the real agent |
| `pnpm --filter @runmax/agent notes:dev` | MCP notes server over stdio (used by the agent) |
| `pnpm --filter @runmax/agent studio` | Anvia Studio UI at http://127.0.0.1:4021/playground |
