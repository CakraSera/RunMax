import type {
  AgentGenerationEndArgs,
  AgentGenerationErrorArgs,
  AgentGenerationObserver,
  AgentGenerationStartArgs,
  AgentObserver,
  AgentRunEndArgs,
  AgentRunErrorArgs,
  AgentRunObserver,
  AgentRunStartArgs,
  AgentToolEndArgs,
  AgentToolErrorArgs,
  AgentToolObserver,
  AgentToolStartArgs,
} from "@anvia/core/observability";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { startObservation } from "@langfuse/tracing";
import { NodeSDK } from "@opentelemetry/sdk-node";

const processor = new LangfuseSpanProcessor({ mediaUploadEnabled: false });
const sdk = new NodeSDK({ spanProcessors: [processor] });
sdk.start();

/**
 * Langfuse v5 — https://docs.anvia.dev/lens/connect/langfuse
 * `startObservation(..., { asType: "agent" })` sets langfuse.observation.type.
 * createOtelObserver does not, so the UI showed Span instead of Agent.
 */
export const tracing: AgentObserver = {
  startRun(args: AgentRunStartArgs): AgentRunObserver {
    const root = startObservation(
      args.trace?.name ?? args.agentName ?? "agent.run",
      {
        input: { prompt: args.prompt, history: args.history },
        metadata: {
          agentName: args.agentName,
          agentDescription: args.agentDescription,
          maxTurns: args.maxTurns,
          sessionId: args.trace?.sessionId,
          userId: args.trace?.userId,
        },
        version: args.trace?.version,
      },
      { asType: "agent" },
    );
    return {
      trace: { traceId: root.traceId, observationId: root.id },
      startGeneration(gen: AgentGenerationStartArgs): AgentGenerationObserver {
        const generation = root.startObservation(
          `model.turn.${gen.turn}`,
          {
            input: { instructions: gen.request.instructions },
            model: gen.modelInfo?.modelId,
          },
          { asType: "generation" },
        );
        return {
          end(endArgs: AgentGenerationEndArgs) {
            generation.update({ output: endArgs.response });
            generation.end();
          },
          error(err: AgentGenerationErrorArgs) {
            generation.update({ level: "ERROR", statusMessage: errorMessage(err.error) });
            generation.end();
          },
        };
      },
      startTool(tool: AgentToolStartArgs): AgentToolObserver {
        const observation = root.startObservation(
          tool.toolName,
          { input: { args: tool.args } },
          { asType: "tool" },
        );
        return {
          end(endArgs: AgentToolEndArgs) {
            observation.update({ output: endArgs.result });
            observation.end();
          },
          error(err: AgentToolErrorArgs) {
            observation.update({ level: "ERROR", statusMessage: errorMessage(err.error) });
            observation.end();
          },
        };
      },
      end(endArgs: AgentRunEndArgs) {
        root.update({
          output:
            endArgs.status === "completed"
              ? { status: endArgs.status, output: endArgs.output, text: endArgs.text }
              : { status: endArgs.status, text: endArgs.text },
        });
        root.end();
      },
      error(err: AgentRunErrorArgs) {
        root.update({ level: "ERROR", statusMessage: errorMessage(err.error) });
        root.end();
      },
    };
  },
};

export const langfuse = {
  flush: () => processor.forceFlush(),
  close: () => sdk.shutdown(),
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
