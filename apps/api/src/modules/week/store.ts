// Prisma-backed WeekStore for user `demo` (ADR 0002/0010): the one server
// record the Board, /api/build, and the chat agent all read and write.
// Rebuilds overwrite this Monday; older Mondays are never kept (ADR 0011).
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../utils/prisma.js";
import type { WeekStore } from "@runmax/agent";
import type { Week } from "@runmax/domain";

export function prismaWeekStore(): WeekStore {
  return {
    async save(week: Week): Promise<void> {
      const weekStart = new Date(`${week.weekStart}T00:00:00`);
      const json = week as unknown as Prisma.InputJsonValue;
      await prisma.weekRecord.upsert({
        where: { userId_weekStart: { userId: "demo", weekStart } },
        create: { userId: "demo", weekStart, week: json },
        update: { week: json },
      });
    },
    async load(weekStart: string): Promise<Week | null> {
      const record = await prisma.weekRecord.findUnique({
        where: {
          userId_weekStart: { userId: "demo", weekStart: new Date(`${weekStart}T00:00:00`) },
        },
      });
      return record ? (record.week as unknown as Week) : null;
    },
  };
}
