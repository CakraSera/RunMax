// Server-owned chat agent: the one Weeksmith agent (PRD §7), wired exactly
// like /api/build — notes MCP + the shared Prisma WeekStore for user `demo`
// (ADR 0002). saveWeek fails closed, so chat can never persist an illegal
// Week. The notes connection and agent are built lazily on first use and
// reused across turns; shutdownChatAgent releases them on server shutdown.
import { Agent } from "@anvia/core/agent";
import { connectNotesMcp, createWeeksmith, langfuse, type NotesMcpConnection } from "@runmax/agent";
import { prismaWeekStore } from "../week/store.js";

let notes: NotesMcpConnection | undefined;
let cached: Agent | undefined;
let closed = false;

export async function getAgent(): Promise<Agent> {
  if (cached) return cached;
  if (closed) throw new Error("chat agent is shut down");
  notes = await connectNotesMcp();
  cached = createWeeksmith({ stores: { notes, weeks: prismaWeekStore() } });
  return cached;
}

export async function shutdownChatAgent(): Promise<void> {
  closed = true;
  cached = undefined;
  const connection = notes;
  notes = undefined;
  await connection?.close();
  await langfuse.flush();
}
