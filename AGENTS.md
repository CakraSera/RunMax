# Repository Guidelines

`CLAUDE.md` is `@AGENTS.md` — this file is the single assistant brief.

## Project Overview

**RunMax** (repo `CakraSera/RunMax`) is a runner’s **this Week** of running from an optional messy **Log**, shown as a **Board** on mobile-first web. **VO2 max** is why-copy only. Not a 16-week calendar, not a chatbot, not a clinic, not WhatsApp, not a race Goal.

Canonical terms live in [`CONTEXT.md`](CONTEXT.md). Use those words in code, evals, and UI copy. Honor each term’s **Avoid** list (no “plan”, “workout”, “calendar”, “chatbot”, “generate”, …).

v1 scope is locked in [`document/PRD.en.md`](document/PRD.en.md) (Indonesian twin: [`document/PRD.id.md`](document/PRD.id.md); object names stay English). Decisions: [`docs/adr/`](docs/adr/).

## Architecture & Data Flow

**Intended (PRD §7 + [ADR 0016](docs/adr/0016-chat-surface-plan-with-ai.md)):** two agent surfaces, both
Weeksmith: the Board's one-button **Build this week** and the `/chat` "Plan
with AI" streaming surface.

```
optional Log  →  Build this week  →  Weeksmith / BuildThisWeek
                                      │
              parseLog → retrieveNotes → draftWeek → checkWeek → saveWeek
                                      │
                                   Board (7 Session cards, Mon–Sun)
```

- **Agent:** `Weeksmith`. **Workflow:** `BuildThisWeek`. Five verb tools only — no `doAnything`, no `loadGoal`.
- **MCP:** `notes` (`searchNotes`, `readNote`) over builder-written markdown, not copyrighted books.
- **Persistence:** Week as one unauthenticated server record (`user: demo`). Rebuild **overwrites this Monday**. Older Mondays are not kept ([ADR 0010](docs/adr/0010-week-and-log-not-goal.md), [ADR 0011](docs/adr/0011-no-past-weeks.md)). Chat turns persist per thread; `GET /api/chat` replays them as history.
- **Home is the Board**, not chat. Chat is a second surface ("Plan with AI" in the nav drawer). No **Why?** drawer. Failures = banner on the surface that triggered them.

**Actual (today):**

pnpm workspace:

```
apps/platform   FE — Vite + TanStack Router Board + /chat (Plan with AI)
apps/api        BE — Hono + Prisma (Week record + chat threads, user `demo`)
packages/agent  AI — Weeksmith on Anvia (`@runmax/agent`)
packages/domain Shared rules — checkWeek, parseCues (`@runmax/domain`)
```

Board lives at [`apps/platform/src/routes/index.tsx`](apps/platform/src/routes/index.tsx); the chat surface is
[`apps/platform/src/routes/chat.tsx`](apps/platform/src/routes/chat.tsx). Board week data, edits, and Build go
through `/api/week` and `/api/build` (`apps/platform/src/lib/board-api.ts`); chat streams
through `/api/chat` (`apps/platform/src/lib/chat.ts`). The FE mock seam
(`lib/store.ts`) is gone.

Load-bearing product rules (enforce in `checkWeek` and at card-tap; never render an illegal Week):

- Week = exactly 7 Sessions, Monday–Sunday, keyed by `weekStart` ([ADR 0001](docs/adr/0001-this-week-is-monday-sunday.md)).
- ≤1 Hard Session (`quality` is Hard; `easy` | `rest` | `walk` are not). No `race` Kind ([ADR 0010](docs/adr/0010-week-and-log-not-goal.md)).
- ≥1 Rest or Walk.
- Pain in Log → no Quality, no running intervals, no diagnosis.
- Quality note is minutes + ordinary language; paces / set×distance fail `checkWeek` ([ADR 0014](docs/adr/0014-quality-is-one-line.md)).
- Rest duration = 0 min; Walk may have minutes; Easy/Quality must be > 0 ([ADR 0012](docs/adr/0012-duration-without-race.md)).
- Illegal Kind edits blocked at tap with a banner ([ADR 0007](docs/adr/0007-checkweek-blocks-illegal-edits.md)).
- No past Weeks list ([ADR 0011](docs/adr/0011-no-past-weeks.md)).

v1 surface is **web, phone width** ([ADR 0004](docs/adr/0004-web-mobile-first.md)). No store builds, no WhatsApp ([ADR 0003](docs/adr/0003-board-only-no-whatsapp.md)).

## Key Directories

| Path | Role |
|---|---|
| `apps/platform/` | **FE** — Vite + TanStack Router Board (`name: platform`). |
| `apps/platform/src/routes/` | File routes. Board is `/`. |
| `apps/platform/src/components/` | Board chrome. |
| `apps/platform/src/lib/` | Domain, mock Weeksmith, store, theme. |
| `apps/api/` | **BE** — Hono + Prisma server (`name: api`). Routes: `/api/build`, `/api/week`, `/api/chat`, `/auth/*`. |
| `packages/agent/` | **AI** — Weeksmith agent on Anvia (`name: @runmax/agent`). 5 verb tools, MCP `notes`, Langfuse tracing. |
| `packages/domain/` | Shared rule engine (`name: @runmax/domain`) — `checkWeek`, `parseCues`, Week/Session types. Platform, api, and agent all import it. |
| `document/` | Bilingual PRD. Update **both** `PRD.en.md` and `PRD.id.md`. |
| `docs/adr/` | Short title+rationale ADRs `0001`–`0014`. New architecture → next `00NN-kebab.md`. |
| `apps/api/src/` | Server sources: `index.ts` entry; `modules/auth` (register/login/me), `modules/chat` (streaming), `modules/{build,week}` (Board data); `utils/prisma.ts`. |
| `apps/api/prisma/` | Schema + migrations for the server's PostgreSQL store. |
| `apps/api/scripts/` | `dev-db.ts` (embedded Postgres) and `smoke.ts` (route contract checks). |

`app-example/` is leftover create-expo-app starter. Gitignored. Do not import from it.

## Development Commands

Package manager is **pnpm**. Never npm/yarn/bun. Install from the **repo root**.

```bash
pnpm install
pnpm start                 # Vite on http://localhost:3000
pnpm web                   # same
pnpm typecheck             # all workspace packages
pnpm --filter platform typecheck
pnpm --filter api typecheck
pnpm --filter @runmax/agent typecheck
pnpm --filter @runmax/domain test      # golden fixtures, offline
pnpm --filter @runmax/agent evals      # PRD §10 fixtures through the model
pnpm --filter @runmax/agent studio     # Anvia Studio UI at http://127.0.0.1:4021/playground
pnpm --filter api dev      # server: tsx watch src/index.ts (port 8000)
pnpm db:up                 # docker compose db on :15433 (api db:up = embedded on :54329)
pnpm db:migrate            # prisma migrate via root .env
pnpm --filter api smoke    # route contract checks incl. auth flow
```

Agent env comes from the root `.env` (`OPENAI_BASE_URL`, `OPENAI_API_KEY`,
`WEEKSMITH_MODEL=z-ai/glm-5.3-flash`, `WEEKSMITH_EFFORT=low|high|max` (default
max), `LANGFUSE_*`). Gateway is OpenRouter.

## Code Conventions & Common Patterns

- **Language:** TypeScript `strict`. Default-export named function components. Double quotes.
- **Routing:** TanStack Router file routes under `apps/platform/src/routes/`. `routeTree.gen.ts` is generated — do not hand-edit after `pnpm --filter platform generate-routes`.
- **Imports:** `@/foo` maps to `apps/platform/src/` (`apps/platform/tsconfig.json` `paths`).
- **Styling:** Tailwind CSS 4. Phone-width, one column (`max-w-[480px]`). UI chrome is English; Logs may be ID/EN/mixed.
- **Domain naming in identifiers and copy:** `Week`, `Session`, `kind`, `hard`, `Log`, `Pain`, `Board`, `Weeksmith`, `BuildThisWeek`. Kind values: `easy` \| `quality` \| `rest` \| `walk`. No `Goal`, no `race`.
- **State / DI:** Week + optional Log live on the agent server as user `demo` ([ADR 0010](docs/adr/0010-week-and-log-not-goal.md)); chat persistence and registered users are live in `apps/api` (Prisma/PostgreSQL). The Board still uses its mock store until the FE is pointed at `/api/*`.
- **Errors:** Board banner, not a conversation. `checkWeek` fails closed (never ship `hardCount > 1`, 0 Rest/Walk, pain+Quality, ≠7 Sessions, a pace in the Quality note, or a diagnosis sentence).
- **Async:** BuildThisWeek tools should be verb-named functions, one span each, one trace per Build.

## Important Files

| File | Why |
|---|---|
| `packages/domain/src/domain.ts` | `checkWeek`, `parseCues`, and Week/Session types (shared rule engine). |
| `packages/agent/src/agent.ts` | Weeksmith and ConsultSmith construction. |
| `packages/agent/src/tools.ts` | Verb tools; `saveWeek` fails closed. |
| `packages/agent/src/evals/` | PRD §10 golden fixtures + runner. |
| `packages/agent/notes/` | RAG corpus — 6 builder-written markdown notes. |
| `apps/platform/src/routes/__root.tsx` | Root layout / header. |
| `apps/platform/src/routes/index.tsx` | Home — Board. |
| `apps/platform/src/lib/weeksmith.ts` | Mock BuildThisWeek workflow (FE stand-in until the API is wired). |
| `apps/api/src/index.ts` | Server entry: `/api/build`, `/api/week`, `/api/chat`, `/auth/*`. |
| `apps/api/src/modules/auth/route.ts` | Register / login / me (argon2id + JWT bearer). |
| `apps/api/prisma/schema.prisma` | Persistence schema: WeekRecord, User, Thread, Turn. |
| `apps/api/scripts/smoke.ts` | Route contract checks (413/400/200/401). |
| `package.json` | Workspace root `name: runmax`. Scripts filter to `platform`. |
| `apps/platform/package.json` | Vite app `name: platform`. |
| `CONTEXT.md` | Domain language. |
| `document/PRD.en.md` | v1 scope, tools, evals, acceptance. |
| `docs/adr/*.md` | Binding product decisions. |

## Runtime/Tooling Preferences

| Item | Pin |
|---|---|
| Agent framework | Anvia 1.x — `@anvia/core@^1.3.0`, `@anvia/openai`, `@anvia/mcp`; traces via `@langfuse/otel` + `@langfuse/tracing` + NodeSDK |
| Model | `z-ai/glm-5.3-flash` via OpenRouter; `reasoningEffort` low \| high \| max, default **max** |
| Frontend | Vite 8 + TanStack Router + React 19 + Tailwind CSS 4 |
| TypeScript | `~5.9.2` |
| Package manager | **pnpm** |
| Server runtime | Node ≥ 22.18, Hono + @hono/node-server, Prisma 7 + @prisma/adapter-pg |
| Docs (TanStack Router) | https://tanstack.com/router/latest |

`pnpm-workspace.yaml` members: `apps/**`, `packages/**`. FE `apps/platform`, BE `apps/api`, AI `packages/agent`. `allowBuilds` additionally allowlists `@embedded-postgres/linux-x64`, `@prisma/engines`, and `prisma` postinstall scripts.

## Testing & QA

Pure rule logic is tested: `pnpm --filter @runmax/domain test` runs the PRD §10
golden fixtures over `checkWeek`/`parseCues` offline (vitest). Model-backed
behavior is gated by `pnpm --filter @runmax/agent evals` — the same 10 fixtures
driven through the real Weeksmith + gateway (needs root `.env`). When adding
FE/BE changes before their suites exist, gate with typecheck.

- Highest value is **pure rule logic** from CONTEXT.md / ADRs: 7 Sessions, `hardCount ≤ 1`, Rest/Walk gate, pain gate, duration-by-kind, Quality one-line, overwrite this Monday.
- PRD §10 golden fixtures (must pass for v1): `happy-en`, `pain-lutut`, `two-hard-draft`, `no-rest`, `empty-log`, `quality-no-pace`, `mixed-id-en`, `board-has-seven`, `second-build-overwrite`, `sakit-no-dx`.
- Observability: one trace per Build; each tool = one span.
