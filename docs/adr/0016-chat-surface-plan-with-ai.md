# 0016 — Chat surface: Plan with AI (Weeksmith), Board stays home

Date: 2026-09-14
Status: Accepted

## Context

PRD v1 locked "Home = Board. No chat" (§3, §6) when the only agent surface was
the one-button **Build this week**. Two things changed:

1. A streaming chat API already exists (`/api/chat`, Anvia client protocol,
   Turn persistence) but was wired to a second, explain-only agent on a model
   outside the gateway convention.
2. The product needs a way to **make the weekly plan with AI chat**: a runner
   pastes a messy Log in words, reacts to questions, and the Week gets built
   and saved — without losing the Board as the artifact.

## Decision

- **Weeksmith is the chat agent.** `/api/chat` streams the same
  `createWeeksmith` agent `/api/build` uses (notes MCP + shared Prisma
  WeekStore, user `demo`). One agent, one product (PRD §7); the separate
  explain-only agent is deleted. `saveWeek` fails closed, so chat can never
  persist an illegal Week.
- **Home stays the Board.** Chat is a second surface at `/chat`, reached from
  the nav drawer ("Plan with AI"). Chat is a builder input, not a planner
  thread: no past-Weeks list, no Why? drawer, no diagnosis (ADR 0011, PRD §5).
- **One server record.** Chat builds and Board edits both read and write the
  same Week row (ADR 0010); the Board is rewired from the FE mock to
  `/api/week` + `/api/build` and the mock seam (`lib/store.ts`) is deleted.
- **History is replayed from Turns.** `GET /api/chat` rebuilds the visible
  thread from persisted Turns (seq order; failed turns keep the user line,
  drop the assistant line). No thread picker in v1: one live thread per
  browser, addressed by an advisory `x-thread-id`.
- **Copy rules hold.** The surface is labeled "Plan with AI"; UI copy keeps
  CONTEXT.md's Avoid lists (no "chatbot", no plan/calendar objects, Quality
  stays minutes + ordinary language).

## Consequences

- The PRD's "No chat" v1 line is superseded for the `/chat` surface; "Home is
  the Board" and every Board/banner rule are unchanged.
- The wire protocol is the Anvia client protocol (JSONL) end to end; the FE
  transport collapses history to text-only roles within the route's caps
  (40 messages / 4000 chars) before sending; the server re-validates.
- A chat-driven Build shows its tool calls as message parts, not the Board's
  workflow chips; the Board keeps chips for its own Build button.
