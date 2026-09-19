import type { Agent } from "@anvia/core";
import type { Week } from "@runmax/domain";
import { createConsultSmith } from "./agent.js";
import type { WeeksmithEffort } from "./model.js";
import type { ConsultStores, WeeksmithStores } from "./tools.js";

export interface BuildThisWeekInput {
  log: string;
  traceId?: string;
}

export interface BuildThisWeekResult {
  ok: boolean;
  week: Week | null;
  error?: string;
}

export async function runBuildThisWeek(
  agent: Agent,
  stores: WeeksmithStores,
  input: BuildThisWeekInput,
): Promise<BuildThisWeekResult> {
  try {
    const result = await agent.generate({
      prompt: buildPrompt(input.log),
      trace: { name: "BuildThisWeek", sessionId: "demo", ...(input.traceId ? { traceId: input.traceId } : {}) },
    });
    const week = await stores.weeks.load(currentWeekStart());
    if (!week) {
      return { ok: false, week: null, error: `Weeksmith finished without saving: ${result.text.slice(0, 200)}` };
    }
    return { ok: true, week };
  } catch (error) {
    return { ok: false, week: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface ConsultThenBuildInput {
  transcript: string;
  traceId?: string;
}

export interface ConsultDeps {
  consultStores: ConsultStores;
  weeksmith: Agent;
  weeksmithStores: WeeksmithStores;
  modelId?: string;
  effort?: WeeksmithEffort;
}

export interface ConsultThenBuildResult {
  ok: boolean;
  log: string;
  week: Week | null;
  error?: string;
}

export async function runConsultThenBuild(
  deps: ConsultDeps,
  input: ConsultThenBuildInput,
): Promise<ConsultThenBuildResult> {
  let build: Promise<BuildThisWeekResult> | null = null;

  const consult = createConsultSmith({
    stores: deps.consultStores,
    modelId: deps.modelId,
    effort: deps.effort,
    handoff: async () => {
      const log = await deps.consultStores.logs.load();
      build = runBuildThisWeek(deps.weeksmith, deps.weeksmithStores, { log });
      const r = await build;
      return {
        ok: r.ok,
        text: r.ok ? "Week built and saved." : `Build failed: ${r.error ?? "unknown"}`,
      };
    },
  });

  try {
    const result = await consult.generate({
      prompt: consultPrompt(input.transcript),
      trace: {
        name: "ConsultThenBuild",
        sessionId: "demo",
        ...(input.traceId ? { traceId: input.traceId } : {}),
      },
    });
    const log = await deps.consultStores.logs.load();
    if (build === null) {
      return {
        ok: false,
        log,
        week: null,
        error: `Consult ended without a confirmed build: ${result.text.slice(0, 200)}`,
      };
    }
    const buildResult: BuildThisWeekResult = await build;
    return { ...buildResult, log };
  } catch (error) {
    return {
      ok: false,
      log: await safeLoad(deps.consultStores),
      week: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildPrompt(log: string): string {
  return log.trim().length === 0
    ? "Build this week. The Log is empty."
    : `Build this week from this Log:\n\n${log.trim()}`;
}

function consultPrompt(transcript: string): string {
  const t = transcript.trim();
  const confirmed =
    "The runner has already answered yes to Build this week. In this single turn: saveLog with their words, then immediately buildThisWeek. Do not stop to ask again.";
  return t.length === 0
    ? `Consult. The runner said nothing that changes the week. ${confirmed}`
    : `Consult from this runner conversation:\n\n${t}\n\n${confirmed}`;
}

function currentWeekStart(): string {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

async function safeLoad(stores: ConsultStores): Promise<string> {
  try {
    return await stores.logs.load();
  } catch {
    return "";
  }
}
