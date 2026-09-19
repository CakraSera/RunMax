import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { signOut, useMe } from "@/lib/auth";

export interface NavTarget {
  id: string;
  label: string;
}

interface Props {
  open: boolean;
  targets: NavTarget[];
  /** Close the drawer, then navigate to the section anchor. */
  onNavigate: (id: string) => void;
  onClose: () => void;
}

/**
 * Right-side navigation drawer, opened from the header hamburger. Backdrop
 * tap, ✕, Escape, or choosing an entry dismisses it. Board section ids
 * scroll in place; `route:` ids are Links (ADR 0016: Plan with AI).
 */
export default function NavDrawer({ open, targets, onNavigate, onClose }: Props) {
  const me = useMe();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={open ? "" : "pointer-events-none"} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-20 bg-ink/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 z-30 flex h-full w-64 max-w-[80vw] flex-col bg-surface shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-bold tracking-wide text-muted uppercase">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-info-tint"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col p-3">
          {targets.map((target) =>
            target.id.startsWith("route:") ? (
              <Link
                key={target.id}
                to={target.id.slice("route:".length)}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold text-ink hover:bg-info-tint"
              >
                {target.label}
              </Link>
            ) : (
              <button
                key={target.id}
                type="button"
                onClick={() => onNavigate(target.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold text-ink hover:bg-info-tint"
              >
                {target.label}
              </button>
            ),
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border p-3">
          {me ? (
            <>
              <div className="px-3 pt-1">
                <p className="text-sm font-bold text-ink">{me.fullName ?? me.username ?? "Runner"}</p>
                <p className="truncate text-xs text-muted">{me.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="rounded-xl px-3 py-3 text-left text-[15px] font-semibold text-danger hover:bg-danger-tint"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                onClick={onClose}
                className="rounded-control bg-ink px-3 py-3 text-center text-[15px] font-bold text-white"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="rounded-control border border-border px-3 py-3 text-center text-[15px] font-semibold text-ink hover:bg-info-tint"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        <p className="px-5 pb-6 pt-2 text-xs leading-relaxed text-faint">
          One week at a time. No past weeks, no diagnosis.
        </p>
      </aside>
    </div>
  );
}
