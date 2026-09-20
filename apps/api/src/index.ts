// RunMax API server (port 8000). Home is the Board; failures come back as
// JSON the Board renders as a banner. All data routes require a bearer
// token (ADR 0017): each runner's Week and chat are their own.
//   /api/build, /api/week  — Weeksmith Board data (per user)
//   /api/chat              — streaming chat (per user), history persisted
//   /auth/*                — register / login / me (argon2id + JWT bearer)
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { buildRouter } from "./modules/build/router.js";
import { weekRouter } from "./modules/week/router.js";
import { authRoute } from "./modules/auth/route.js";
import { chatRouter } from "./modules/chat/router.js";
import { shutdownConsultAgent } from "./modules/chat/agent-consult.js";
import { langfuse } from "@runmax/agent";

const app = new Hono()
  .use(
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      exposeHeaders: ["x-anvia-stream-protocol"],
    }),
  )
  .route("/api/build", buildRouter)
  .route("/api/week", weekRouter)
  .route("/api/chat", chatRouter)
  .route("/auth", authRoute)
  .get("/health", (c) => c.json({ ok: true }));

serve(
  {
    fetch: app.fetch,
    port: 8000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

const shutdown = async () => {
  await shutdownConsultAgent();
  await langfuse.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
