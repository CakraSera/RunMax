import { applyClientStreamEvent, assistantText } from "@anvia/client";
import type { ClientStreamEvent, UIMessage } from "@anvia/client";
import { prisma } from "../../utils/prisma.js";

/** PRD v1 (ADR 0002): one implicit user; anonymous chat writes under it. */
export const DEMO_USER_ID = "demo";

/**
 * Persistence for one chat turn: the last user message and the assistant
 * reply captured from the client protocol stream. Failure to persist must
 * never break the stream — logging only.
 */
export async function recordTurn(options: {
  userId: string
  threadId: string | undefined
  messages: readonly { role: string; content: unknown }[]
  stream: AsyncIterable<ClientStreamEvent>
}): Promise<void> {
  let ui: UIMessage[] = []
  let failed = false
  let runText = ''
  for await (const event of options.stream) {
    try {
      // Reassign — never mutate in place. applyClientStreamEvent returns the
      // same array for no-op events; `ui.length = 0` would wipe that alias.
      ui = [...applyClientStreamEvent(ui, event)]
    } catch {
      // Protocol drift must not crash persistence.
    }
    if (event.type === 'error') failed = true
    if (event.type === 'run_end') {
      if (event.status === 'error') failed = true
      if (typeof event.text === 'string' && event.text.length > 0) runText = event.text
    }
  }

  const input = lastUserText(options.messages)
  const output = assistantText(ui) || runText
  if (input === undefined && output.length === 0 && !failed) return

  try {
    // PRD v1 (ADR 0002): one implicit `demo` user; the auth-less chat route
    // always writes under it. Idempotent.
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: { id: DEMO_USER_ID },
    })
    const threadId = await resolveThreadId(options.userId, options.threadId)
    const seq = await prisma.turn.count({ where: { threadId } })
    await prisma.turn.create({
      data: {
        threadId,
        seq,
        input: input ?? '',
        output: output.length > 0 ? output : null,
        failed,
      },
    })
  } catch (error) {
    console.error('[chat] failed to persist turn', error)
  }
}

function lastUserText(
  messages: readonly { role: string; content: unknown }[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message === undefined || message.role !== 'user') continue
    if (typeof message.content === 'string') return message.content
    if (Array.isArray(message.content)) {
      return message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('')
    }
    return undefined
  }
  return undefined
}

async function resolveThreadId(userId: string, threadId: string | undefined) {
  if (threadId !== undefined) {
    const existing = await prisma.thread.findFirst({
      where: { id: threadId, userId },
      select: { id: true },
    })
    if (existing) return existing.id
    const created = await prisma.thread.create({ data: { id: threadId, userId } })
    return created.id
  }
  const created = await prisma.thread.create({ data: { userId } })
  return created.id
}
