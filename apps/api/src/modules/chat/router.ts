// /api/chat — ConsultSmith chat (health-buddy shape): GET returns the
// memory transcript, POST runs ConsultSmith with `session` scope so history
// loads and saves through the Prisma memory store. One session (`demo`).
// ADR 0016: interview → saveLog → confirm → buildThisWeek handoff.
import { agentToClientStream } from "@anvia/client";
import type { ClientStreamEvent, ClientStreamRequest, UIMessage } from "@anvia/client";
import { createClientStreamResponse } from "@anvia/server";
import type { Agent } from "@anvia/core/agent";
import { Hono, type Context } from "hono";
import { getConsultAgent, loadHistory } from "./agent-consult.js";
import { RequestRejected, readChatRequest } from "../../lib/request.js";

const SESSION_ID = "demo";
const USER_ID = "demo";

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

async function resolveAgent(): Promise<Agent | undefined> {
  return getConsultAgent().catch((error: unknown) => {
    console.error("[chat] agent unavailable", error);
    return undefined;
  });
}

export const chatRouter = new Hono()
  .get("/", async (c) => {
    const history = await loadHistory().catch((error: unknown) => {
      console.error("[chat] history unavailable", error);
      return [];
    });
    // Memory returns provider-neutral Messages; the UI wants UIMessages
    // with text parts. Tool-call/tool-result turns become empty text here,
    // so drop them instead of shipping blanks the request validator or the
    // model would choke on.
    const messages: UIMessage[] = history
      .map((message, index) => ({
        id: `m${index}`,
        role: message.role === "assistant" || message.role === "user" ? message.role : "assistant",
        parts: [{ id: `p${index}`, type: "text", text: textOf(message.content) }] as [
          { id: string; type: "text"; text: string },
        ],
      }))
      .filter((message) => message.parts.some((part) => part.type === "text" && part.text.length > 0));
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

    const agent = await resolveAgent();
    if (agent === undefined) {
      return c.json({ error: "The assistant is not available right now." }, 503);
    }

    // Memory-backed run: `session` loads history from the store; the last
    // user text is the prompt (docs.anvia.dev/sdk/memory#2).
    const prompt = lastUserText(body.messages);
    const clientStream = agentToClientStream({
      events: agent.stream({
        prompt,
        session: { sessionId: SESSION_ID, userId: USER_ID },
        trace: { name: "ConsultChat", sessionId: SESSION_ID, userId: USER_ID },
      }),
      metadata: { userId: USER_ID },
      mapError: () => ({
        message: "The model request failed.",
        code: "MODEL_REQUEST_FAILED",
        retryable: true,
      }),
    });

    return createClientStreamResponse({
      events: tappedClientStream(clientStream, () => {}),
      format: "jsonl",
      headers: {
        "content-security-policy": "default-src 'none'",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
    });
  });

function lastUserText(messages: readonly { role: string; content: unknown }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message === undefined || message.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .filter((part) => (part as { type?: string; text?: string }).type === "text")
        .map((part) => (part as { text?: string }).text ?? "")
        .join("");
    }
  }
  return "";
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => (part as { type?: string }).type === "text")
      .map((part) => (part as { text?: string }).text ?? "")
      .join("");
  }
  return "";
}
