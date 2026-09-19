import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import HeaderBrand from "@/components/HeaderBrand";
import NavDrawer, { type NavTarget } from "@/components/NavDrawer";
import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

const NAV_TARGETS: NavTarget[] = [
  { id: "route:/", label: "This Week" },
  { id: "route:/chat", label: "Plan with AI" },
];

function RootComponent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Hide the header while scrolling down, reveal on scroll up. Skip while
  // the drawer is open so a background scroll can't steal the hamburger.
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      if (menuOpenRef.current) return;
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y > 8 && delta > 4) setHeaderHidden(true);
      else if (delta < -4 || y <= 8) setHeaderHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigateToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    const top = el ? window.scrollY + el.getBoundingClientRect().top - 56 : 0;
    setMenuOpen(false);
    setHeaderHidden(false);
    window.scrollTo(0, Math.max(0, top));
  }, []);

  return (
    <div className="min-h-full bg-bg">
      <header
        className={`sticky top-0 z-10 border-b border-border bg-bg transition-transform duration-200 ${
          headerHidden && !menuOpen ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4">
          <HeaderBrand />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-info-tint"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>
      <Outlet />
      <NavDrawer
        open={menuOpen}
        targets={NAV_TARGETS}
        onNavigate={navigateToSection}
        onClose={closeMenu}
      />
    </div>
  );
}
