// Anvia Studio: local browser UI attached to the live agents — Weeksmith
// (BuildThisWeek) and ConsultSmith (ConsultThenBuild, ADR 0016). Inspect
// tools/traces/sessions and drive runs without the Board. One process.
import { Studio, createInMemoryStudioStore } from "@anvia/studio";
import type { Agent } from "@anvia/core";
import { createConsultSmith, createWeeksmith } from "./agent.js";
import { getModel, WEEKSMITH_MODEL_ID } from "./model.js";
import { connectNotesMcp } from "./notes.js";
import { createLocalMemoryStore, fileWeekStore, memoryLogStore } from "./stores.js";
import { langfuse } from "./tracing.js";
import { runBuildThisWeek } from "./workflow.js";

const modelId = process.env.WEEKSMITH_MODEL ?? WEEKSMITH_MODEL_ID;
const gatewayRef = { providerId: "gateway", modelId };

const notes = await connectNotesMcp();
const weeks = fileWeekStore();
const logs = memoryLogStore();

const weeksmith = createWeeksmith({
  stores: { notes, weeks },
  memory: { store: createLocalMemoryStore() },
});

// ConsultSmith hands off into the same Weeksmith — one fail-closed saveWeek.
const consult = createConsultSmith({
  stores: { logs },
  memory: { store: createLocalMemoryStore() },
  handoff: async () => {
    const log = await logs.load();
    const result = await runBuildThisWeek(weeksmith, { notes, weeks }, { log });
    return {
      ok: result.ok,
      text: result.ok
        ? `Week built and saved: ${result.week?.weekStart}`
        : `Build failed: ${result.error ?? "unknown"}`,
    };
  },
});

const agents: Agent[] = [weeksmith, consult];

const store = createInMemoryStudioStore();
const studio = new Studio(agents, {
  ui: true,
  stores: { sessions: store, traces: store },
  models: {
    providers: [
      {
        id: "gateway",
        name: "DevScale gateway",
        defaultModelId: modelId,
        models: [{ id: modelId, name: modelId }],
        createCompletionModel: ({ modelId: id }) => getModel(id),
      },
    ],
    defaultModelRef: gatewayRef,
    agents: {
      weeksmith: { defaultModelRef: gatewayRef },
      consultsmith: { defaultModelRef: gatewayRef },
    },
  },
  quickPrompts: {
    weeksmith: [
      "Build this week. The Log is empty.",
      "Build this week from this Log:\n\nRabu lutut agak nyeri, jalan aja",
      "Build this week from this Log:\n\nLast week 20km total, felt strong.",
    ],
    consultsmith: [
      "lutut agak nyeri, jalan aja — lalu Build this week.",
      "Semuanya baik, biasanya 20 menit easy. Build this week.",
      "Last week felt strong, 20km total. Build this week.",
    ],
  },
});

studio.start({ port: 4021, hostname: "127.0.0.1", log: true });

const shutdown = async () => {
  await studio.shutdown({ timeoutMs: 3000 });
  await notes.close();
  await langfuse.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
