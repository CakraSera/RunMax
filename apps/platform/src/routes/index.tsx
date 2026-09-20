import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Banner, { type BannerTone } from "@/components/Banner";
import EditSheet from "@/components/EditSheet";
import SessionCard from "@/components/SessionCard";
import TraceSection from "@/components/TraceSection";
import WorkflowChips from "@/components/WorkflowChips";
import { checkWeek, DAY_SHORT, formatRange, humanizeViolation, mondayOf, weekSummary, type Kind, type ViolationCode, type Week } from "@runmax/domain";
import { requireAuth } from "@/lib/auth";
import { buildWeek, fetchWeek, patchWeek } from "@/lib/board-api";
import type { Span, ToolStatus } from "@/lib/weeksmith";

interface BannerState {
  tone: BannerTone;
  text: string;
}

export const Route = createFileRoute("/")({
  component: Board,
  beforeLoad: requireAuth,
});

function Board() {
  const [log, setLog] = useState("");
  const [week, setWeek] = useState<Week | null>(null);
  const [building, setBuilding] = useState(false);
  const [spans, setSpans] = useState<Span[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ToolStatus>>({});
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const weekStart = mondayOf(new Date());

  // Load the persisted server Week on mount (ADR 0002: the record lives on
  // the server for user `demo`).
  useEffect(() => {
    fetchWeek()
      .then(setWeek)
      .catch(() =>
        setBanner({
          tone: "error",
          text: "Could not load your Week. Check that the API server is running.",
        }),
      );
  }, []);
  const build = useCallback(async () => {
    setBuilding(true);
    setBanner(null);
    setStatuses({});
    // Animate the five workflow chips while the real workflow runs server
    // side (PRD §6.4); the API response is the source of truth.
    const animate = setInterval(() => {
      setStatuses((prev) => {
        const order = ["parseLog", "retrieveNotes", "draftWeek", "checkWeek", "saveWeek"] as const;
        const next = { ...prev };
        for (const tool of order) {
          if (next[tool] !== "ok") {
            next[tool] = "running";
            break;
          }
        }
        return next;
      });
    }, 600);
    try {
      const result = await buildWeek(log);
      if (result.ok && result.week) {
        setStatuses(Object.fromEntries(["parseLog", "retrieveNotes", "draftWeek", "checkWeek", "saveWeek"].map((tool) => [tool, "ok" as ToolStatus])));
        setWeek(result.week);
        setBanner(
          result.week.flags.includes("pain")
            ? {
                tone: "pain",
                text: "Your Log mentions pain, so this week has no Quality — Easy, Walk, and Rest only. This is not a diagnosis.",
              }
            : { tone: "ok", text: `Week saved · ${weekSummary(result.week)}` },
        );
      } else {
        setStatuses((prev) => ({ ...prev, saveWeek: "fail" }));
        setBanner({
          tone: "error",
          text: `Build failed: ${result.error ?? "Weeksmith could not complete"}. Nothing was saved.`,
        });
      }
    } catch {
      setBanner({ tone: "error", text: "Build failed: the API server is unreachable. Nothing was saved." });
    } finally {
      clearInterval(animate);
      setBuilding(false);
    }
  }, [log]);


  const applyEdit = useCallback(
    (index: number, kind: Kind, minutes: number, note: string) => {
      if (!week) return;
      const sessions = week.sessions.map((s, i) =>
        i === index
          ? {
              ...s,
              kind,
              durationMinutes: kind === "rest" ? 0 : minutes,
              note: kind === "rest" && kind !== week.sessions[i].kind ? "" : note,
              hard: kind === "quality",
            }
          : s,
      );
      const next: Week = { ...week, sessions };
      // Server re-checks (ADR 0007): illegal edits never stick; the local
      // checkWeek pass keeps the banner instant for the common rejections.
      const violations = checkWeek(next);
      if (violations.length > 0) {
        setBanner({
          tone: "blocked",
          text: `Change not applied — ${humanizeViolation(violations[0].code)} (${violations[0].detail})`,
        });
        setEditingIndex(null);
        return;
      }
      patchWeek(next)
        .then((res) => {
          if (res.ok) {
            setWeek(next);
            setBanner({ tone: "ok", text: "Session updated." });
          } else {
            const first = res.violations?.[0];
            setBanner({
              tone: "blocked",
                text: `Change not applied — ${first ? humanizeViolation(first.code as ViolationCode) : "the Week would be illegal"}`,
            });
          }
        })
        .catch(() =>
          setBanner({ tone: "error", text: "Could not save the change. The API server is unreachable." }),
        )
        .finally(() => setEditingIndex(null));
    },
    [week],
  );


  const editing = useMemo(
    () => (editingIndex !== null && week ? week.sessions[editingIndex] : null),
    [editingIndex, week],
  );

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-3.5 px-4 py-4">
      <p className="mt-2 text-[13px] leading-[18px] text-muted">
        This week is for VO₂ max — mostly Easy, one Quality, one Rest or Walk.
      </p>

      <div id="board-week" className="mt-1.5 flex scroll-mt-16 items-baseline justify-between">
        <h1 className="text-[17px] font-bold text-ink">This Week</h1>
        <p className="text-[13px] text-muted">{formatRange(weekStart)}</p>
      </div>

      {banner ? <Banner tone={banner.tone} text={banner.text} /> : null}

      {week ? (
        <div className="flex flex-col gap-2.5">
          {week.sessions.map((session, i) => (
            <SessionCard
              key={session.date}
              kind={session.kind}
              minutes={session.durationMinutes}
              note={session.note}
              date={session.date}
              dayIndex={i}
              disabled={building}
              onTap={() => setEditingIndex(i)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-card border border-dashed border-border bg-surface p-5">
          <p className="text-[15px] font-bold text-ink">No week yet</p>
          <p className="text-[13px] leading-[19px] text-muted">
            Paste a messy Log below (or leave it empty), then tap Build this week. Seven cards,
            Monday to Sunday, always.
          </p>
        </div>
      )}

      <section id="board-log" className="mt-1 flex scroll-mt-16 flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Log (optional)</p>
        <textarea
          className="min-h-[72px] rounded-control border border-border bg-surface p-3 text-sm text-ink placeholder:text-faint"
          placeholder="e.g. Rabu lutut agak nyeri, jalan aja. Selasa 40 menit gampang."
          value={log}
          onChange={(event) => setLog(event.target.value)}
        />
        <button
          type="button"
          className="rounded-control bg-ink py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
          onClick={build}
          disabled={building}
        >
          {building ? "Building…" : "Build this week"}
        </button>
        <WorkflowChips statuses={statuses} />
      </section>

      <div id="board-trace" className="scroll-mt-16">
        <TraceSection spans={spans} running={building} />
      </div>

      <EditSheet
        session={editing}
        dayIndex={editingIndex ?? 0}
        painFlag={week?.flags.includes("pain") ?? false}
        onApply={(kind, minutes, note) =>
          editingIndex !== null && applyEdit(editingIndex, kind, minutes, note)
        }
        onClose={() => setEditingIndex(null)}
      />

      <p className="mb-6 text-center text-[11px] text-faint">
        {DAY_SHORT.join(" · ")} — one week at a time. No past weeks, no diagnosis.
      </p>
    </main>
  );
}
