// BuildThisWeek route: POST /api/build runs the workflow and returns the
// saved Week. Illegal weeks cannot be persisted (saveWeek fails closed) and
// the response re-checks before answering (ADR 0007).
import { Hono } from "hono";
import { createWeeksmith, connectNotesMcp, runBuildThisWeek } from "@runmax/agent";
import { checkWeek } from "@runmax/domain";
import { checkAuthorized } from "../auth/middleware.js";
import { prismaWeekStore } from "../week/store.js";

export const buildRouter = new Hono()
  // ADR 0017: Build writes the runner's own Week record.
  .use("*", checkAuthorized)
  .post("/", async (c) => {
    const body = await c.req.json<{ log?: string }>();
    const log = body.log ?? "";
    const userId = c.get("user").id;

    const notes = await connectNotesMcp();
    const weeks = prismaWeekStore(userId);
    const agent = createWeeksmith({ stores: { notes, weeks } });

    try {
      const result = await runBuildThisWeek(agent, { notes, weeks }, { log });
      if (!result.ok || !result.week) {
        return c.json({ ok: false, error: result.error ?? "Build failed" }, 502);
      }
      const violations = checkWeek(result.week);
      if (violations.length > 0) {
        return c.json({ ok: false, error: `shipped week illegal: ${violations[0]?.code}` }, 500);
      }
      return c.json({ ok: true, week: result.week });
    } finally {
      await notes.close();
    }
  });

