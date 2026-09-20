# 0017 — Login required; each runner's Week and chat are their own

Date: 2026-09-20 · Status: Accepted · Amends: [0002](0002-single-user-server-record.md), [0010](0010-week-and-log-not-goal.md)

## Decision

The Board (`/`) and Plan with AI (`/chat`) require a signed-in account. The
data routes `/api/week`, `/api/build`, and `/api/chat` answer 401 without a
valid bearer token, and every persisted record keys to the authenticated
`user.id` instead of the shared `demo` singleton:

- `WeekRecord.userId` = the runner's id (one Week per Monday, ADR 0011
  unchanged).
- Chat memory scope is `{ sessionId: userId, userId }` — the Anvia memory
  scope key (`JSON.stringify([sessionId, userId])`) isolates transcripts per
  account. Turn persistence (Thread/Turn) already keyed by user.

## Rationale

ADR 0002's single-record assumption was a v1 scaffolding choice; real
accounts made it a correctness bug: any registered user could read and
overwrite the shared Week and read another runner's chat transcript.
Frontend guards (`beforeLoad` redirect to `/signin`) keep the surface honest;
the middleware keeps the data honest. The frontend is the UX gate, the API is
the trust boundary — neither alone is sufficient.

## Consequences

- The `demo` row remains only as legacy data; nothing new is written under it.
- Anonymous use is impossible. Sign up is two fields away (email, password)
  and registration immediately signs the runner in.
- `WeekRecord.userId` is a free string, so no migration was needed; older
  `demo` rows simply stop appearing.
- Per-request ConsultSmith wiring (cheap object construction) replaces the
  cached singleton because the handoff's Week store must be the caller's;
  the notes MCP connection is still shared and opened once.
