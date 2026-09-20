import {
  parseClientStreamRequest,
  type ClientStreamRequest,
} from '@anvia/client'
import type { Message } from '@anvia/core/completion'

const MAX_BODY_BYTES = 64_000
const MAX_MESSAGES = 40
const MAX_PARTS = 16
const MAX_TEXT_LENGTH = 4_000
const MAX_REASONING_LENGTH = 32_000

/** A Request the route must return verbatim (413/400 from validation). */
export class RequestRejected extends Error {
  readonly response: Response
  constructor(response: Response) {
    super(response.statusText || 'Request rejected')
    this.response = response
  }
}

/**
 * Validate the public chat request before any model work: size caps first,
 * then Anvia protocol parsing, then product limits. Browser history is
 * untrusted context — the server owns instructions and tools.
 */
export async function readChatRequest(request: Request): Promise<ClientStreamRequest> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) {
    throw new RequestRejected(
      new Response('Request body is too large', { status: 413 }),
    )
  }

  let input: unknown
  try {
    input = await request.json()
  } catch {
    throw new RequestRejected(new Response('Invalid JSON body', { status: 400 }))
  }
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > MAX_BODY_BYTES) {
    throw new RequestRejected(
      new Response('Request body is too large', { status: 413 }),
    )
  }

  let body: ClientStreamRequest
  try {
    body = parseClientStreamRequest(input)
  } catch {
    throw new RequestRejected(
      new Response('Invalid client stream request', { status: 400 }),
    )
  }
  if (body.type !== 'messages') {
    throw new RequestRejected(
      new Response('This route does not accept interaction responses', { status: 400 }),
    )
  }
  if (body.resume !== undefined || body.messages.length > MAX_MESSAGES) {
    throw new RequestRejected(new Response('Invalid chat request', { status: 400 }))
  }
  if (
    body.messages.at(-1)?.role !== 'user' ||
    !body.messages.every(isTextConversation)
  ) {
    throw new RequestRejected(
      new Response('Only user and assistant text messages are accepted', { status: 400 }),
    )
  }
  return body
}

function isTextConversation(message: Message): boolean {
  if (message.role !== 'user' && message.role !== 'assistant') return false
  if (typeof message.content === 'string') {
    // Empty strings are allowed: the UI can echo blank assistant placeholders.
    // They carry no context, but rejecting them breaks replay after a reload.
    return message.content.length <= MAX_TEXT_LENGTH
  }
  return (
    message.content.length <= MAX_PARTS &&
    message.content.every(
      (part) =>
        // Reasoning parts are display-only and routinely exceed the text cap
        // (the model thinks in long chains); only text content is bounded.
        (part.type === 'reasoning' && (part.text?.length ?? 0) <= MAX_REASONING_LENGTH) ||
        (part.type === 'text' && part.text.length <= MAX_TEXT_LENGTH),
    )
  )
}
