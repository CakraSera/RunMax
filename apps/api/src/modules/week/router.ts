// Board data routes: GET /api/week returns the authenticated runner's stored
// Week (or null). PATCH applies a card edit only when checkWeek passes —
// illegal edits never stick (ADR 0007), the client shows the banner.
import { Hono } from "hono";
import { checkWeek, mondayOf, type Week } from "@runmax/domain";
import { checkAuthorized } from "../auth/middleware.js";
import { prismaWeekStore } from "./store.js";

export const weekRouter = new Hono()
  // ADR 0017: the Week is per-account; no bearer, no Board data.
  .use("*", checkAuthorized)
  .get("/", async (c) => {
    const week = await prismaWeekStore(c.get("user").id).load(mondayOf(new Date()));
    return c.json({ week });
  })
  .patch("/", async (c) => {
    const body = await c.req.json<{ week: Week }>();
    const next = body.week;
    const violations = checkWeek(next);
    if (violations.length > 0) {
      return c.json({ ok: false, violations }, 422);
    }
    await prismaWeekStore(c.get("user").id).save(next);
    return c.json({ ok: true, week: next });
  });

