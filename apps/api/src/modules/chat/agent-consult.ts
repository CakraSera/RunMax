// Server-owned chat agent: ConsultSmith (ADR 0016) with durable memory
// (docs.anvia.dev/sdk/memory). Same wiring as health-buddy: notes MCP +
// Prisma memory store for user `demo`. The handoff runs the real
// BuildThisWeek (saveWeek fails closed), so chat can ship a saved Week.
import type { Agent } from "@anvia/core/agent";
import { PrismaMemoryStore } from "@anvia/memory-prisma";
import {
  connectNotesMcp,
  createConsultSmith,
  createWeeksmith,
  langfuse,
  runBuildThisWeek,
  type NotesMcpConnection,
} from "@runmax/agent";
import { prisma } from "../../utils/prisma.js";
import { prismaWeekStore } from "../week/store.js";

const SESSION_ID = "demo";
const USER_ID = "demo";

let notes: NotesMcpConnection | undefined;
let cached: Agent | undefined;
let closed = false;

export function memoryStore() {
  return new PrismaMemoryStore({ client: prisma });
}

export async function getConsultAgent(): Promise<Agent> {
  if (cached) return cached;
  if (closed) throw new Error("chat agent is shut down");

  notes = await connectNotesMcp();
  const weeks = prismaWeekStore();
  const weeksmith = createWeeksmith({ stores: { notes, weeks } });

  cached = createConsultSmith({
    stores: { logs: memoryLog() },
    memory: { store: memoryStore() },
    handoff: async () => {
      const log = await memoryLog().load();
      const result = await runBuildThisWeek(weeksmith, { notes: notes!, weeks }, { log });
      return {
        ok: result.ok,
        text: result.ok
          ? `Week built and saved: ${result.week?.weekStart}`
          : `Build failed: ${result.error ?? "unknown"}`,
      };
    },
  });
  return cached;
}

// Consult's Log is the last saveLog call in the session — a process-local
// mirror of the memory transcript's artifact (PRD v1: one `demo` user).
let currentLog = "";
function memoryLog() {
  return {
    async save(log: string) {
      currentLog = log;
    },
    async load() {
      return currentLog;
    },
  };
}

export async function loadHistory() {
  return memoryStore().load({ scope: { sessionId: SESSION_ID, userId: USER_ID } });
}

export async function shutdownConsultAgent(): Promise<void> {
  closed = true;
  cached = undefined;
  const connection = notes;
  notes = undefined;
  await connection?.close();
  await langfuse.flush();
}
