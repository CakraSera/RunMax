// GET /api/chat — history. POST /api/chat — stream. One session (`demo`),
// same shape as health-buddy: fetch history, then useChat against this URL.
import { agentToClientStream } from "@anvia/client";
import type { ClientStreamEvent, ClientStreamRequest, UIMessage } from "@anvia/client";
import { createClientStreamResponse } from "@anvia/server";
import { Hono } from "hono";
import { getAgent } from "./agent.js";
import { RequestRejected, readChatRequest } from "../../lib/request.js";
import { DEMO_USER_ID, recordTurn } from "./store.js";
import { prisma } from "../../utils/prisma.js";

const SESSION_ID = "demo";

function tappedClientStream(
  stream: AsyncIterable<ClientStreamEvent>,
  tap: (event: ClientStreamEvent) => void | Promise<void>,
): AsyncIterable<ClientStreamEvent> {
  async function* run() {
    for await (const event of stream) {
      await tap(event);
      yield event;
    }
  }
  return run();
}

function eventsToStream(events: readonly ClientStreamEvent[]): AsyncIterable<ClientStreamEvent> {
  async function* run() {
    yield* events;
  }
  return run();
}

export const chatRouter = new Hono()
  .get("/", async (c) => {
    const thread = await prisma.thread.findFirst({
      where: { id: SESSION_ID, userId: DEMO_USER_ID },
      select: { id: true },
    });
    if (thread === null) return c.json({ messages: [] });
    const turns = await prisma.turn.findMany({
      where: { threadId: thread.id },
      orderBy: { seq: "asc" },
    });
    const messages: UIMessage[] = [];
    for (const turn of turns) {
      const key = `${turn.seq}`;
      messages.push({
        id: `u${key}`,
        role: "user",
        parts: [{ id: `ut${key}`, type: "text", text: turn.input }],
      });
      if (!turn.failed && turn.output !== null) {
        messages.push({
          id: `a${key}`,
          role: "assistant",
          parts: [{ id: `at${key}`, type: "text", text: turn.output }],
        });
      }
    }
    return c.json({ messages });
  })
  .post("/", async (c) => {
    let body: Extract<ClientStreamRequest, { type: "messages" }>;
    try {
      body = (await readChatRequest(c.req.raw)) as Extract<
        ClientStreamRequest,
        { type: "messages" }
      >;
    } catch (error) {
      if (error instanceof RequestRejected) return error.response;
      return c.text("Invalid chat request", 400);
    }

    const agent = await getAgent().catch((error: unknown) => {
      console.error("[chat] agent unavailable", error);
      return undefined;
    });
    if (agent === undefined) {
      return c.json({ error: "The assistant is not available right now." }, 503);
    }

    const clientStream = agentToClientStream({
      events: agent.stream({ messages: body.messages }),
      metadata: { userId: DEMO_USER_ID },
      mapError: () => ({
        message: "The model request failed.",
        code: "MODEL_REQUEST_FAILED",
        retryable: true,
      }),
    });

    const observedEvents: ClientStreamEvent[] = [];
    const tapped = tappedClientStream(clientStream, async (event) => {
      observedEvents.push(event);
      if (event.type !== "run_end") return;
      const events = [...observedEvents];
      observedEvents.length = 0;
      await recordTurn({
        userId: DEMO_USER_ID,
        threadId: SESSION_ID,
        messages: body.messages,
        stream: eventsToStream(events),
      });
    });

    return createClientStreamResponse({
      events: tapped,
      format: "jsonl",
      headers: {
        "content-security-policy": "default-src 'none'",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
    });
  });
