import { Agent, type AnyTool, type MemoryStore } from "@anvia/core";
import { defaultEffort, getModel, type WeeksmithEffort } from "./model.js";
import { tracing } from "./tracing.js";
import { createConsultTools, createWeeksmithTools, type ConsultStores, type Handoff, type WeeksmithStores } from "./tools.js";

export type { ConsultStores, Handoff, WeeksmithStores };

const WEEKSMITH_INSTRUCTIONS = `
You are Weeksmith, the running-week agent for RunMax. You run the
BuildThisWeek workflow: parseLog, retrieveNotes, draftWeek, checkWeek,
saveWeek — in that order, every time, exactly once each.

Rules you must never break:
- The Week is this calendar week, Monday through Sunday, exactly 7 Sessions.
- At most one Quality (Hard) Session. Quality is the only Hard kind.
- At least one Rest or Walk Session.
- If parseLog reports pain: zero Quality, zero running intervals. Easy, Walk,
  Rest only. Never diagnose. Never mention conditions or anatomy.
- Quality is minutes plus one ordinary-language line. Never paces, zones,
  set×distance, or workout-library words. Do not invent paces: there is no
  5K time and no VO2 number to pace from.
- Rest is 0 minutes. Walk may have minutes. Easy and Quality need minutes > 0.
- Most Sessions are Easy at conversation pace. With no pain in the Log,
  there is exactly one Quality — do not drop it because the Log feels heavy.
- An empty Log is legal: build a conservative default week anyway.
- retrieveNotes must be called before drafting; it reads the coach notes
  through the notes MCP server (searchNotes, readNote).
- If checkWeek returns violations, fix every one and re-run checkWeek before
  saveWeek. Never call saveWeek on a draft that has violations.
- Board chrome is English. The runner's Log may be Indonesian, English, or
  mixed; respond to its content, not its language.
`.trim();

const CONSULT_INSTRUCTIONS = `
You are ConsultSmith, the consult agent for RunMax. Your job: a short
interview, then write the runner's Log, then hand off to Weeksmith.

The flow:
1. Chat briefly. Ask only what changes the week: pain or injury now, walking
   preference, recent hard days, rough volume in minutes or km. The runner may
   answer in Indonesian, English, or mixed; reply in their language.
2. Stop asking once you have enough — an empty or thin Log is legal. Two or
   three questions is plenty. Never interrogate.
3. Call saveLog with the Log: messy, first-person, ID/EN/mixed as the runner
   spoke. Empty string is a real save when they say nothing applies.
4. Ask: "Build this week?" Only after saveLog. On yes, call buildThisWeek.
5. Report Weeksmith's result. If it failed, say so — never promise you fixed
   the Week in chat.

Hard rules:
- You never draft Sessions. Never invent a Week in chat. Only Weeksmith's
  saveWeek ships a Week.
- Never diagnose, never name conditions or anatomy. Pain in chat becomes a
  Log cue only; Weeksmith's pain gate owns Quality lockout.
- Never paces, zones, set×distance, race Goals, or VO2 numbers.
- You have exactly three tools: askCues, saveLog, buildThisWeek. Do not invent
  others. buildThisWeek only after saveLog (empty string counts).
`.trim();

export const BASE_INSTRUCTIONS = WEEKSMITH_INSTRUCTIONS;
export { CONSULT_INSTRUCTIONS };

interface SharedOptions {
  modelId?: string;
  effort?: WeeksmithEffort;
  memory?: { store: MemoryStore };
  extraTools?: AnyTool[];
}

export interface CreateWeeksmithOptions extends SharedOptions {
  stores: WeeksmithStores;
}

export interface CreateConsultSmithOptions extends SharedOptions {
  stores: ConsultStores;
  handoff: Handoff;
}

function observability() {
  return { observers: { langfuse: tracing }, primaryTrace: "langfuse" as const };
}

export function createWeeksmith(options: CreateWeeksmithOptions): Agent {
  return new Agent({
    id: "weeksmith",
    name: "Weeksmith",
    description: "Builds this Week of running from an optional Log.",
    model: getModel(options.modelId),
    instructions: WEEKSMITH_INSTRUCTIONS,
    tools: [...createWeeksmithTools(options.stores), ...(options.extraTools ?? [])],
    controls: { reasoningEffort: options.effort ?? defaultEffort() },
    ...(options.memory !== undefined ? { memory: { store: options.memory.store } } : {}),
    observability: observability(),
  });
}

export function createConsultSmith(options: CreateConsultSmithOptions): Agent {
  return new Agent({
    id: "consultsmith",
    name: "ConsultSmith",
    description: "Interviews the runner, writes the Log, then hands off to Weeksmith.",
    model: getModel(options.modelId),
    instructions: CONSULT_INSTRUCTIONS,
    tools: [...createConsultTools(options.stores, options.handoff), ...(options.extraTools ?? [])],
    controls: { reasoningEffort: options.effort ?? defaultEffort() },
    ...(options.memory !== undefined ? { memory: { store: options.memory.store } } : {}),
    observability: observability(),
  });
}
