# RunMax — PRD v1

**Status:** scope lock for the 14-day build; consult amendment 2026-09-16
**Date:** 2026-09-12 (consult: 2026-09-16)
**Class:** Devscale Indonesia, AI Product Engineering TypeScript Batch I
**Stack:** TypeScript fullstack. **Expo 54 web, mobile-first** (phone width) + TypeScript agent server.
**Persistence:** this **Week** and optional source **Log** on the agent server as user **`demo`**. No auth in v1. Rebuild **overwrites this Monday**. Older Mondays are not kept.
**Job:** From an optional messy **Log** (pasted on the Board, or written by **Consult**), produce **this Week** with ≤1 Hard **Session**, as a **Board**. **VO2 max** is why-copy only.

Canonical terms live in [`../CONTEXT.md`](../CONTEXT.md). Use those words in code, evals, and UI copy. Object names (`Week`, `Session`, `Kind`, …) stay English.

---

## 1. Problem

A runner wants to raise VO2 max and instead gets a complicated plan: 16-week calendars, questionnaires, daily logging, weekly reviews, invented paces. Sunday night they either stack two Hard days or they do nothing.

v1 does **not** measure VO2 max. No lab, no watch, no 5K field. The product enforces the week that is *for* VO2 max: mostly Easy, at most one Quality, at least one Rest or Walk, and no Quality if the Log says pain.

Home is the **Board**, not a chatbot. **Consult** is an optional second entry that interviews, writes a Log, then hands off to Weeksmith. This is not WhatsApp. This is not a clinic.

---

## 2. User

One runner (the maker). Log may be Indonesian, English, or mixed.

v1 is **not** a club captain, a roster, or a beginner/intermediate/advanced matrix.

**Surface:** mobile-first web. Demo in a phone-width browser. Not a store app.

---

## 3. In scope

- PRD before code (this file + Indonesian twin).
- Home = **Board**. **Consult** is a second entry, not home. No **Why?** drawer.
- Two agents: `Weeksmith` (`BuildThisWeek`) and `ConsultSmith` (`ConsultThenBuild`).
- Weeksmith: 5 verb tools. ConsultSmith: 3 verb tools (`askCues`, `saveLog`, `buildThisWeek`). No `doAnything`. No `loadGoal`. Consult never drafts Sessions.
- MCP `notes` + RAG from **short builder-written markdown** (not copyrighted books).
- Eval + traces: one trace per `BuildThisWeek` (each tool one span). `ConsultThenBuild` is a second trace that may nest a Build.
- Only **this Week** (**Monday–Sunday**, not rolling 7 days). No 16-week calendar UI. No past Weeks list.
- Week + optional Log stored as user `demo` on the agent server. No login. This Monday overwritten; older Mondays discarded.
- Majority of Sessions Easy (conversation pace).
- At most 1 Hard Session per Week (Quality is the only Hard Kind).
- ≥1 Rest or Walk.
- Pain/injury cues in the Log → no Quality, no running intervals. Not a medical diagnosis.
- Empty Log is legal. The app dates the seven cards from this calendar week.
- Quality = minutes + one ordinary-language line. No paces, zones, or set×distance.
- After Build, tap a card to change Kind, minutes, or note. Illegal taps do not stick.
- Expo 54 **web**, mobile-first layout.
- Strava / Garmin not required.
- **No WhatsApp** (no copy, no send, no template).

---

## 4. Out of scope (not in the 14 days)
1. Chat as home, or an open planner thread that drafts Sessions. (Consult as Log-then-handoff is in scope.)
2. 16-week calendar UI
3. Strava, Garmin, Apple Health, lab VO2, wearable VO2, 5K time as a field
4. Copy / template / send WhatsApp
5. Auth, teams, club roster
6. Photo OCR / voice Log
7. Past Weeks list, snapshots of this Monday, undo log
8. Interval / workout library; paced splits
9. Race Goal, race date, `race` Kind, taper / D-7 rules
10. Onboarding questionnaire, level picker, weekly review interview, required daily logs
11. HR zones, TSS, charts, VDOT, race-time predictor
12. Diagnosis, physio, body map
13. Why? drawer (RAG is traces, not a runner-facing panel)
14. Push notification / calendar sync / native store builds
15. Full app i18n (bilingual Log is enough; UI chrome is English)
16. Payments, social feed, coach marketplace
17. A stored VO2 number

---

## 5. Domain objects

| Object | Fields | Rules |
|---|---|---|
| **Week** | `weekStart` (Monday), `sessions[7]`, `flags[]`, `sourceLog?` | Exactly 7 Sessions. No share-text field. |
| **Session** | `date`, `kind`, `durationMinutes`, `hard`, `note` | `kind`: `easy` \| `quality` \| `rest` \| `walk` |
| **Log** | optional text | Empty is legal. Not a required daily journal. |

**Flags (on Week):** `pain` · `emptyLog`

**Hard:** `quality` is Hard. `easy`, `rest`, `walk` are not. `hardCount` ≤ 1.

No **Goal**. No `race` Kind. No km field. No VO2 field.

---

## 6. UI (home is not chat)

Mobile-first web. Phone width. One column.

1. **Board** (home): 7 Session cards for this Week, **always Monday–Sunday** (a Wednesday Build still fills Monday and Tuesday). Empty until the first Build. **This is the artifact.** Chrome may say the Week is for VO2 max. That is copy, not a widget.
2. **Log** textarea (paste optional).
3. Primary CTA: **Build this week**.
4. Workflow chips (not chat bubbles): `parseLog` → `retrieveNotes` → `draftWeek` → `checkWeek` → `saveWeek`.
5. Banner: pain / ok / illegal tap.
6. Tap a card → edit **Kind**, minutes, and note. Date cannot change. `hard` follows Kind. Illegal edits (**second Quality**, **zero Rest/Walk**, Quality while `pain`, Easy/Quality at 0 min) **are blocked**: the card does not change, a banner explains.
7. Duration: Rest = **0** minutes (cleared if Kind becomes Rest). Walk may have minutes. Easy / Quality minutes **must be > 0** (0 is blocked).
8. No past-Weeks list. No Why? drawer. No Goal fields.
9. Optional **Consult** (not home): short interview. Writes the **Log**. Asks **Build this week?**. Yes → Weeksmith `BuildThisWeek`. The Board CTA still works with an empty Log and no Consult.

No Copy / Share / WhatsApp button in v1.

Failure on the Board = banner, not a conversation. A failed `saveWeek` after handoff is a Board banner. Consult does not keep drafting Sessions in chat.

---

## 7. Agent, workflow, tools

Two agents. Two entries. One fail-closed Week.

- **Agent (Board / Build):** `Weeksmith`
- **Workflow (Board CTA):** `BuildThisWeek` (one button; empty Log is legal)
- **Agent (Consult):** `ConsultSmith`
- **Workflow (Consult):** `ConsultThenBuild` (interview → `saveLog` → confirm → `buildThisWeek` handoff)

### Weeksmith tools

| Tool | Role |
|---|---|
| `parseLog` | Parse the optional ID/EN/mixed Log into cues: pain, recent Hard, rough volume. Empty Log is valid. |
| `retrieveNotes` | RAG through MCP `notes` (`searchNotes`, `readNote`). |
| `draftWeek` | Write 7 Sessions for this Monday–Sunday. |
| `checkWeek` | Enforce product rules. Fix or reject — never ship an illegal Week. |
| `saveWeek` | Save the Week as the single-user server record (overwrites this `weekStart`). |

`checkWeek` **fails** if:

- `hardCount > 1`
- no Rest and no Walk
- `pain` and a Quality / running interval
- Session count ≠ 7
- a diagnosis sentence (“you have X”)
- Quality note contains a pace, zone, or set×distance (e.g. `5×1000 @ 4:15`)
- Easy or Quality `durationMinutes` is 0
- Rest `durationMinutes` is not 0

The builder may supply a model prompt. The prompt is not a product object. It must obey this contract or `checkWeek` rejects the draft.

### ConsultSmith tools

| Tool | Role |
|---|---|
| `askCues` | Read what is already known (pain / walk / recent Hard / rough minutes). Stop asking once the Log is enough. Empty start is legal. |
| `saveLog` | Write the consult into the optional Log (ID/EN/mixed). This is the only artifact ConsultSmith persists. Does not write a Week. |
| `buildThisWeek` | Handoff: run existing `BuildThisWeek` with that Log. Must follow `saveLog` (empty string is a real save). Does not draft Sessions. |

Consult **never** calls `draftWeek` / `checkWeek` / `saveWeek`. If Weeksmith rejects, Consult reports the failure — it does not “fix the Week in chat.”

Consult **never** diagnoses, invents paces, or names a race Goal. Pain in chat → Log cue only; Weeksmith’s pain gate still owns Quality lockout.

---

## 8. MCP and RAG

**MCP server:** `notes`

- `searchNotes(query)`
- `readNote(id)`

**RAG corpus** (builder-written markdown only):

- `easy-majority.md` — conversation pace; most minutes Easy
- `one-hard-day.md` — max 1 Quality per Week
- `rest-or-walk.md` — ≥1 Rest or Walk
- `pain-gate.md` — pain/injury cues → no intervals; not a diagnosis
- `quality-is-a-line.md` — Quality is minutes + one ordinary-language line; no paces
- `log-cues-id-en.md` — pain and effort cues in ID/EN

Not copyrighted books. Not medical sources dressed up as diagnosis. Not beginner/intermediate/advanced recipe packs (that is a level picker).

---

## 9. Rules (product, not vibe)

- Build **this calendar Week** (Monday–Sunday), not rolling 7 days, not a season.
- Most Sessions Easy.
- Duration is **minutes only**. No km on the card.
- Quality = `kind=quality` plus **one line from the agent** (RAG-bounded, e.g. “20 min hard”). Not a workout picker.
- Default when there is no Pain: **exactly 1 Quality**. Do not drop Quality only because the Log “feels heavy.”
- Board chrome is **English**. Log stays ID/EN/mixed.
- Pain → 0 Quality, 0 running intervals; Easy / Walk / Rest only.
- Do not diagnose. Do not prescribe drugs or supplements.
- Do not invent paces. There is no 5K and no VO2 number to pace from.
- Consult never drafts Sessions. Only `saveWeek` ships a Week.
- Consult never diagnoses. Pain in chat is a Log cue; Weeksmith’s pain gate still owns Quality.

---

## 10. Eval and observability

**Observability:** one trace per `BuildThisWeek`. Each Weeksmith tool = one span. Demo may show the Build trace (phone-width web or a narrow second panel). `ConsultThenBuild` is a second trace (`askCues` / `saveLog` / `buildThisWeek`) that may nest a Build. Consult is not the home surface and not a Why? drawer.

**Golden fixtures (must pass):**

1. `happy-en` — English Log, no pain → 1 Quality, ≥1 Rest/Walk, rest Easy, 7 Sessions. Quality note has no pace.
2. `pain-lutut` — `Rabu lutut agak nyeri, jalan aja` → `hardCount=0`, no Quality, Walk or Rest present, pain banner.
3. `two-hard-draft` — draft tries two Quality days → `checkWeek` rejects; shipped Week ≤1 Hard.
4. `no-rest` — 7 Easy/Quality, 0 Rest/Walk → reject until ≥1 Rest or Walk.
5. `empty-log` — no Log → conservative Week, exactly 1 Quality, ≥1 Rest/Walk, 7 Sessions, dates Monday–Sunday for this `weekStart`.
6. `quality-no-pace` — draft tries `5×1000 @ 5K pace` (or similar) → `checkWeek` rejects; Board Quality is minutes + ordinary language.
7. `mixed-id-en` — mixed Log still yields 7 Sessions.
8. `board-has-seven` — saved Week is exactly 7 Sessions, kinds in Monday–Sunday order.
9. `second-build-overwrite` — two Builds on the same Monday → one stored Week; the second overwrites the first.
10. `sakit-no-dx` — `dada pegal abis lari` → no Quality; output has no diagnosis sentence.
11. `consult-pain-log` — consult mentions `lutut nyeri` → `saveLog` text trips `parseCues.pain`; after handoff, shipped Week has no Quality.
12. `consult-handoff-once` — user confirms Build → Weeksmith runs exactly one `BuildThisWeek`; Consult does not draft Sessions.
13. `consult-no-dx` — consult about `dada pegal` → no diagnosis sentence in consult output or shipped notes.

---

## 11. Acceptance

v1 is done when all of this is true:

- [ ] Home is the Board on **mobile-first web**, not chat as home, not WhatsApp, not a Why? drawer.
- [ ] Empty Log still yields this Week, ≤1 Hard, ≥1 Rest or Walk, seven dated cards — **without Consult**.
- [ ] Pain Log → no Quality / intervals, a banner — and no diagnosis.
- [ ] Board shows 7 Sessions Monday–Sunday.
- [ ] Card edits that would break the rules do not stick.
- [ ] `BuildThisWeek` runs the 5 named tools in one trace.
- [ ] MCP `notes` + RAG notes are actually retrieved (span proof).
- [ ] 10 Board golden fixtures pass.
- [ ] Consult fixtures `consult-pain-log`, `consult-handoff-once`, `consult-no-dx` pass.
- [ ] The 60-second Board demo runs without opening Consult.
- [ ] Consult is reachable as a second entry; confirm Build hands off to Weeksmith; Board is still home after handoff.
- [ ] No Goal fields, no 5K/lab/VO2 number, no past-Weeks list.

---

## 12. 60-second demo

0:00 Phone-width browser. Home = empty Board. Chrome: for VO2 max. Not chat.
0:08 Leave Log empty. Tap **Build this week**. Chips light up.
0:18 Board: 7 dated cards Mon–Sun. One Quality, ≥1 Rest or Walk, rest Easy. Quality note has no pace.
0:28 Tap a card. Easy → Rest. Sticks. Minutes clear to 0.
0:35 Tap another card to a second Quality. Blocked. Banner.
0:42 Paste Log: `Rabu lutut agak nyeri jadi jalan.` Tap **Build this week** (overwrites).
0:52 Board: no Quality. Walk or Rest. Pain banner. No diagnosis sentence.
0:58 Open the trace: 5 tool spans.
1:00 Stop the Board demo. Do not open WhatsApp.

**Consult path (second entry, not home):**

0:00 From the Board, open Consult. Home is still the Board when you leave.
0:10 Say `lutut agak nyeri, jalan aja`. Agent does not diagnose.
0:20 Confirm **Build this week**.
0:35 Board: no Quality. Pain banner. Trace: consult spans + nested 5 Weeksmith spans.

---

## 13. Class checklist

| Requirement | Where |
|---|---|
| PRD before code | `document/PRD.en.md`, `document/PRD.id.md` |
| Agent with verb tools (4–6) | `Weeksmith` + 5 tools; `ConsultSmith` + 3 tools |
| MCP and RAG | MCP `notes` + markdown `/notes` |
| Eval and traces | §10 |
| ≥1 agent workflow + 1 AI agent | `BuildThisWeek` + `Weeksmith`; also `ConsultThenBuild` + `ConsultSmith` |
| Home is not chat | Board is home; Consult is a second entry |

---

## 14. Later (not v1)

16-week calendar · Strava/Garmin/lab VO2 · 5K time-trial · race Goal · copy/send WhatsApp · native store app · multi-runner · mid-week adaptation beyond overwrite · workout library · race predictor · OCR · HR zones · Why? drawer · past Weeks · diagnosis/physio/store.

All of that reuses `Week` / `Session`. Do not invent v1 objects for them.
