import { createHttpClientTransport } from "@anvia/client";
import { useChat } from "@anvia/react";
import {
  ChatProvider,
  ComposerPrimitive as Composer,
  MessagePrimitive as Message,
  ThreadPrimitive as Thread,
} from "@anvia/react-ui";
import { createFileRoute } from "@tanstack/react-router";
import { authHeaders, requireAuth } from "@/lib/auth";

const API = "http://localhost:8000/api/chat";
// The header function is evaluated per request, so sign-in/sign-out is
// always reflected in the stream call (ADR 0017).
const transport = createHttpClientTransport({ endpoint: API, format: "jsonl", headers: authHeaders });

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  beforeLoad: requireAuth,
  loader: async () => {
    const res = await fetch(API, { headers: authHeaders() });
    const data = (await res.json()) as { messages?: unknown };
    return Array.isArray(data.messages) ? data.messages : [];
  },
});

function ChatPage() {
  const messages = Route.useLoaderData();
  const chat = useChat({
    transport,
    initialMessages: messages as never,
  });

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-[480px] flex-col overflow-hidden">
      <ChatProvider controller={chat}>
        <Thread.Root className="flex min-h-0 flex-1 flex-col">
          <Thread.Viewport
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            autoScroll
          >
            <Thread.Empty className="m-auto max-w-[85%] text-balance text-center text-sm text-muted">
              Chat with ConsultSmith — tell it about your running week and it
              will build this week&apos;s plan.
            </Thread.Empty>
            <Thread.Messages className="flex flex-col gap-3">
              {(message) => (
                <Message.Root className="group flex max-w-[85%] flex-col gap-1 data-[role=assistant]:mr-auto data-[role=assistant]:items-start data-[role=user]:ml-auto data-[role=user]:items-end">
                  <Message.Content className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm group-data-[role=assistant]:rounded-bl-sm group-data-[role=assistant]:bg-surface group-data-[role=assistant]:text-ink group-data-[role=user]:rounded-br-sm group-data-[role=user]:bg-ink group-data-[role=user]:text-white">
                    <Message.Parts>
                      {(part) => {
                        if (part.type === "text") {
                          return (
                            <Message.Part className="whitespace-pre-wrap break-words [&_a]:underline [&_p]:m-0">
                              <Message.Markdown />
                            </Message.Part>
                          );
                        }
                        if (part.type === "tool") {
                          return (
                            <Message.Part className="mt-1">
                              <Message.Tool
                                className="rounded-xl border border-border bg-bg/60 p-2 text-xs text-muted"
                                renderWhen="always"
                              />
                            </Message.Part>
                          );
                        }
                        return <Message.Part />;
                      }}
                    </Message.Parts>
                  </Message.Content>
                  {message.role === "assistant" ? (
                    <Message.Actions className="flex gap-3 px-1 text-xs text-muted">
                      <Message.Copy className="hover:text-ink">Copy</Message.Copy>
                      <Message.Regenerate className="hover:text-ink">Retry</Message.Regenerate>
                    </Message.Actions>
                  ) : null}
                </Message.Root>
              )}
            </Thread.Messages>
            <Thread.Error className="mx-auto rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-sm text-danger" />
          </Thread.Viewport>
          <Composer.Root className="flex shrink-0 items-end gap-2 border-t border-border bg-bg px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Composer.Input
              minRows={1}
              maxRows={6}
              placeholder="Message ConsultSmith..."
              className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
            />
            {chat.status === "streaming" ? (
              <Composer.Stop className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-tint text-sm font-semibold text-ink">
                Stop
              </Composer.Stop>
            ) : (
              <Composer.Submit className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white disabled:opacity-40">
                Send
              </Composer.Submit>
            )}
          </Composer.Root>
        </Thread.Root>
      </ChatProvider>
    </div>
  );
}
