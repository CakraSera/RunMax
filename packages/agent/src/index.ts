export { createWeeksmith, createConsultSmith, BASE_INSTRUCTIONS, CONSULT_INSTRUCTIONS } from "./agent.js";
export type { CreateWeeksmithOptions, CreateConsultSmithOptions } from "./agent.js";
export { runBuildThisWeek, runConsultThenBuild } from "./workflow.js";
export type {
  BuildThisWeekInput,
  BuildThisWeekResult,
  ConsultThenBuildInput,
  ConsultThenBuildResult,
  ConsultDeps,
} from "./workflow.js";
export { defaultModel, getModel, openaiClient } from "./model.js";
export type { WeeksmithEffort } from "./model.js";
export { langfuse, tracing } from "./tracing.js";
export { createNotesServer, connectNotesMcp } from "./notes.js";
export type { NotesMcpConnection } from "./notes.js";
export type { NotesStore, WeekStore, LogStore } from "./stores.js";
export { memoryLogStore, fileWeekStore, createLocalMemoryStore } from "./stores.js";
export type { WeeksmithStores, ConsultStores, Handoff } from "./tools.js";
