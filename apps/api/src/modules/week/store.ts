// Prisma-backed WeekStore for one authenticated user (ADR 0002/0010, amended
// by 0017): each runner owns the one server record the Board, /api/build,
// and the chat handoff all read and write. Rebuilds overwrite this Monday;
// older Mondays are never kept (ADR 0011).
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../utils/prisma.js";
import type { WeekStore } from "@runmax/agent";
import type { Week } from "@runmax/domain";

export function prismaWeekStore(userId: string): WeekStore {
  return {
    async save(week: Week): Promise<void> {
      const weekStart = new Date(`${week.weekStart}T00:00:00`);
      const json = week as unknown as Prisma.InputJsonValue;
      await prisma.weekRecord.upsert({
        where: { userId_weekStart: { userId, weekStart } },
        create: { userId, weekStart, week: json },
        update: { week: json },
      });
    },
    async load(weekStart: string): Promise<Week | null> {
      const record = await prisma.weekRecord.findUnique({
        where: {
          userId_weekStart: { userId, weekStart: new Date(`${weekStart}T00:00:00`) },
        },
      });
      return record ? (record.week as unknown as Week) : null;
    },
  };
}
