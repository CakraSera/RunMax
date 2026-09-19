import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MemoryStore } from "@anvia/core";
import type { Message } from "@anvia/core/completion";
import type { Week } from "@runmax/domain";

export interface NotesStore {
  search(query: string): Promise<string[]>;
  read(id: string): Promise<string>;
}

export interface WeekStore {
  save(week: Week): Promise<void>;
  load(weekStart: string): Promise<Week | null>;
}

export interface LogStore {
  save(log: string): Promise<void>;
  load(): Promise<string>;
}

const dataDir = join(import.meta.dirname, "../../../.data");
const weekFile = join(dataDir, "week-demo.json");

export function fileWeekStore(): WeekStore {
  return {
    async save(week) {
      await mkdir(dataDir, { recursive: true });
      await writeFile(weekFile, JSON.stringify(week, null, 2), "utf8");
    },
    async load() {
      try {
        return JSON.parse(await readFile(weekFile, "utf8")) as Week;
      } catch {
        return null;
      }
    },
  };
}

export function memoryLogStore(initial = ""): LogStore {
  let current = initial;
  return {
    async save(log) {
      current = log;
    },
    async load() {
      return current;
    },
  };
}

export function createLocalMemoryStore(): MemoryStore {
  const conversations = new Map<
    string,
    {
      messages: Array<{ position: number; runId: string; turn: number; createdAt: string; message: Message }>;
      createdAt: string;
      updatedAt: string;
    }
  >();
  const key = (scope: { sessionId: string; userId?: string }) => `${scope.userId ?? "-"}:${scope.sessionId}`;

  return {
    async load({ scope }) {
      return conversations.get(key(scope))?.messages.map((m) => m.message) ?? [];
    },
    async append({ scope, runId, turn, messages }) {
      const k = key(scope);
      const now = new Date().toISOString();
      const stored = conversations.get(k) ?? { messages: [], createdAt: now, updatedAt: now };
      for (const message of messages) {
        stored.messages.push({ position: stored.messages.length, runId, turn, createdAt: now, message });
      }
      stored.updatedAt = now;
      conversations.set(k, stored);
    },
    async clear({ scope }) {
      conversations.delete(key(scope));
    },
    async recordError({ scope, runId, error }) {
      console.error(`[memory:${key(scope)}:${runId}]`, error);
    },
    get inspector() {
      return {
        async listConversations({ limit }: { limit: number }) {
          return [...conversations.entries()].slice(0, limit).map(([k, v]) => ({
            ref: k,
            sessionId: k.split(":")[1] ?? k,
            messageCount: v.messages.length,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          }));
        },
        async getConversation({ ref }: { ref: string }) {
          const stored = conversations.get(ref);
          if (stored === undefined) return undefined;
          return {
            ref,
            sessionId: ref.split(":")[1] ?? ref,
            messageCount: stored.messages.length,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            messages: stored.messages,
          };
        },
      };
    },
  };
}
