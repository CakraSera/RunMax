// Langfuse reporting for evals: every case's scores land on its own trace.
// onMissingTrace "warn" — a Langfuse outage must never fail the eval suite.
import { LangfuseClient } from "@anvia/langfuse";

const langfuseClient = new LangfuseClient({
  baseUrl: process.env.LANGFUSE_BASE_URL,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  environment: process.env.NODE_ENV,
  serviceName: "weeksmith",
});

/** Eval scores → per-case traces. Warn on missing traces, never fail evals. */
export const evalReporter = langfuseClient.evalReporter({
  traceObserver: "langfuse",
  onMissingTrace: "warn",
});
