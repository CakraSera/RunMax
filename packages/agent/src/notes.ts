import { McpClient, type McpServer as AnviaMcpServer } from "@anvia/mcp";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { basename, join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { z } from "zod";
import type { NotesStore } from "./stores.js";

const notesDirDefault = join(import.meta.dirname, "../notes");

export function createNotesServer(notesDir: string): McpServer {
  const server = new McpServer({ name: "notes", version: "1.0.0" });

  server.registerTool(
    "searchNotes",
    {
      description: "Search the coach notes by keyword. Returns note ids, most relevant first.",
      inputSchema: z.object({ query: z.string() }),
    },
    async ({ query }) => {
      const ids = await rankNotes(notesDir, query);
      return { content: [{ type: "text", text: JSON.stringify({ ids }) }] };
    },
  );

  server.registerTool(
    "readNote",
    {
      description: "Read one note's full markdown body by id (file name without .md).",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      const body = await readFile(join(notesDir, `${basename(id)}.md`), "utf8");
      return { content: [{ type: "text", text: JSON.stringify({ body }) }] };
    },
  );

  return server;
}

async function rankNotes(notesDir: string, query: string): Promise<string[]> {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const files = (await readdir(notesDir)).filter((f) => f.endsWith(".md"));
  const scored = await Promise.all(
    files.map(async (file) => {
      const body = (await readFile(join(notesDir, file), "utf8")).toLowerCase();
      const score = terms.reduce((sum, term) => sum + (body.includes(term) ? 1 : 0), 0);
      return { id: basename(file, ".md"), score };
    }),
  );
  return scored
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((n) => n.id);
}

export interface NotesMcpConnection extends NotesStore {
  close(): Promise<void>;
}

export async function connectNotesMcp(): Promise<NotesMcpConnection> {
  const notesDir = join(import.meta.dirname, "../notes");
  const client = new McpClient({
    name: "weeksmith-notes-client",
    transport: {
      type: "stdio",
      command: "pnpm",
      args: ["--filter", "@runmax/agent", "notes:dev"],
      env: { ...process.env, NOTES_DIR: notesDir } as Record<string, string>,
    },
    versionNegotiation: { mode: "auto" },
  });
  const store: AnviaMcpServer = await client.connect();
  const notes: NotesStore = {
    search: (query) => callTool(store, "searchNotes", { query }, (r) => r.ids as string[]),
    read: (id) => callTool(store, "readNote", { id }, (r) => r.body as string),
  };
  return {
    ...notes,
    async close() {
      await client.close();
    },
  };
}

interface RichToolOutput {
  content: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
}

function isRichToolOutput(value: unknown): value is RichToolOutput {
  return typeof value === "object" && value !== null && Array.isArray((value as RichToolOutput).content);
}

async function callTool<T>(
  store: AnviaMcpServer,
  name: string,
  args: Record<string, unknown>,
  pick: (result: Record<string, unknown>) => T,
): Promise<T> {
  const tool = store.tools.find((t) => t.name === name);
  if (tool === undefined) throw new Error(`notes MCP server has no tool "${name}"`);
  const output = await tool.call(args);
  if (!isRichToolOutput(output)) throw new TypeError(`notes tool "${name}" returned no content`);
  const text = output.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
  return pick(JSON.parse(text) as Record<string, unknown>);
}

if (process.argv[1]?.endsWith("notes.ts")) {
  const notesDir = process.env.NOTES_DIR ?? notesDirDefault;
  await createNotesServer(notesDir).connect(new StdioServerTransport());
}
