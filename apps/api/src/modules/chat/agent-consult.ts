// Server-owned chat agent: ConsultSmith (ADR 0016) with durable memory
// (docs.anvia.dev/sdk/memory). Same wiring as health-buddy: notes MCP +
// Prisma memory store, keyed per authenticated user (ADR 0017). The handoff
// runs the real BuildThisWeek (saveWeek fails closed), so chat can ship a
// saved Week.
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

let notesPromise: Promise<NotesMcpConnection> | undefined;
let closed = false;

async function sharedNotes(): Promise<NotesMcpConnection> {
  if (closed) throw new Error("chat agent is shut down");
  notesPromise ??= connectNotesMcp();
  return notesPromise;
}

export function memoryStore() {
  return new PrismaMemoryStore({ client: prisma });
}

// Consult's Log is the last saveLog call in the runner's session — a
// process-local mirror of the memory transcript's artifact, per user.
const logs = new Map<string, string>();

// The Handoff contract carries no identity, and the tool set captures its
// stores at construction — so the agent is wired per request with the
// caller's own Week store (ADR 0017). Wiring is cheap; the notes MCP
// connection is shared.
export async function getConsultAgent(userId: string): Promise<Agent> {
  const notes = await sharedNotes();
  return createConsultSmith({
    stores: {
      logs: {
        save: async (log) => {
          logs.set(userId, log);
        },
        load: async () => logs.get(userId) ?? "",
      },
    },
    memory: { store: memoryStore() },
    handoff: async () => {
      const weeks = prismaWeekStore(userId);
      const weeksmith = createWeeksmith({ stores: { notes, weeks } });
      const result = await runBuildThisWeek(weeksmith, { notes, weeks }, { log: logs.get(userId) ?? "" });
      return {
        ok: result.ok,
        text: result.ok
          ? `Week built and saved: ${result.week?.weekStart}`
          : `Build failed: ${result.error ?? "unknown"}`,
      };
    },
  });
}

export async function loadHistory(userId: string) {
  return memoryStore().load({ scope: { sessionId: userId, userId } });
}

export async function shutdownConsultAgent(): Promise<void> {
  closed = true;
  const pending = notesPromise;
  notesPromise = undefined;
  const connection = await pending?.catch(() => undefined);
  await connection?.close();
  await langfuse.flush();
}
