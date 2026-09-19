# RunMax

One runner’s **this Week** of running, aimed at VO2 max in copy only. Produced from an optional messy Log (pasted on the Board, or written by Consult). Shown as a Board on mobile-first web. Home is not a chatbot. Not a plan, not a race Goal, not a lab, not WhatsApp.

## Language

**Week**:
Exactly seven Sessions for one calendar week (Monday–Sunday), plus flags, keyed by `weekStart`. Rebuild overwrites **this** Monday. v1 does not keep older Mondays, a season, or snapshots of the same Monday.
_Avoid_: plan, calendar, block, mesocycle, schedule, Goal, WhatsApp text, WeekVersion, undo log

**Session**:
One day’s running assignment: a date, a kind, a duration in minutes, whether it is hard, and a short note.
_Avoid_: workout, activity, run (as the object), training unit

**Kind**:
The type of a Session: `easy`, `quality`, `rest`, or `walk`.
_Avoid_: zone, intensity name, workout type, race (as a Kind)

**Easy**:
A Session at conversation pace. Most Sessions in a Week are Easy.
_Avoid_: recovery run, zone 2 (as the object)

**Quality**:
The at-most-one harder Session in a Week. Minutes plus a one-line note in ordinary language. Not a workout library, not paces, not set×distance.
_Avoid_: speedwork, intervals (as the Kind), workout, VO2 session (as a second Kind)

**Rest**:
A Session with no running. Duration is 0 minutes.
_Avoid_: off, zero, full rest day (as a second object)

**Walk**:
A Session that is walking, not running. Counts toward the “at least one Rest or Walk” rule. May have minutes.
_Avoid_: active recovery (as the object)

**Hard**:
A boolean on a Session. At most one Session in a Week may be Hard. Quality is Hard. Easy, Rest, and Walk are not.
_Avoid_: intense, key session, workout, race (as Hard)

**Log**:
Optional messy text the runner pastes (Indonesian, English, or mixed) about recent training and how the body felt. Empty is legal.
_Avoid_: journal, diary, history, Strava, activity feed, questionnaire, daily required log

**Pain**:
A Week flag set when the Log contains injury or pain cues. Pain means no Quality and no running intervals. It is not a diagnosis.
_Avoid_: injury (as a medical object), diagnosis, condition

**Board**:
The home screen and the v1 artifact: seven Session cards for this Week, on mobile-first web. Not a share-to-chat message. Consult is a second entry, not the Board.
_Avoid_: inbox, feed, calendar UI, WhatsApp, copy block, Why drawer, past Weeks list, chat as home

**Build this week**:
The one-button action that runs the BuildThisWeek workflow and writes the Week. Empty Log still builds a dated Week. Consult may ask this as a confirm before handoff.
_Avoid_: generate, ask the AI, plan my week (as a prompt)

**Weeksmith**:
The AI agent that drafts and checks the Week. The only agent that may call `draftWeek` / `checkWeek` / `saveWeek`.
_Avoid_: chatbot, copilot, assistant (as the product), Vo2PlanAgent, planner, ConsultSmith (as an alias)

**BuildThisWeek**:
The Weeksmith workflow: parse Log, retrieve notes, draft Week, check Week, save Week. Board CTA and Consult handoff both run this.
_Avoid_: SundayRoll (alias only), conversation, chain, formatWhatsApp, loadGoal, BuildWeek

**Consult**:
Optional second entry: a short interview that writes a Log, then asks **Build this week?** and hands off to Weeksmith. Not home. Never drafts Sessions.
_Avoid_: chatbot (as home), planner thread, Why drawer, questionnaire, onboarding

**ConsultSmith**:
The AI agent that runs Consult. Tools: `askCues`, `saveLog`, `buildThisWeek` (handoff). Does not draft, check, or save a Week.
_Avoid_: Weeksmith (as an alias), chatbot, copilot, diagnosis bot

**ConsultThenBuild**:
The ConsultSmith workflow: interview → saveLog → confirm → buildThisWeek handoff (nested BuildThisWeek).
_Avoid_: conversation as the artifact, doAnything, loadGoal

**VO2 max**:
Purpose copy on the Board only. Not a stored number, not a lab value, not a wearable reading, not a 5K time.
_Avoid_: VO2 field, lab test, wearable, seed time, Goal
