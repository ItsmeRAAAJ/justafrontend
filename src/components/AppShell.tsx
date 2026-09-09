import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useReducedMotion } from '../theme/ThemeContext';
import { ThemeToggle } from './ui/ThemeToggle';

const ROLE_LABELS: Record<string, string> = {
  depot_incharge: 'Depot Incharge',
  tpc: 'TPC',
  coa_official: 'COA Official',
  divisional_controller: 'Div. Controller',
};

// ── Nav glyphs ──────────────────────────────────────────────────────────────
//
//  Hand-drawn from the objects the pages are actually about: the block
//  requisition docket, the train graph, the signal mast, the return columns,
//  and the lever frame. Generic tray/chart/warning icons would say nothing.

const glyph = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconDocket() {
  return (
    <svg viewBox="0 0 20 20" className="h-[19px] w-[19px]" {...glyph} aria-hidden="true">
      <path d="M4.5 2.5h7l4 4v11h-11z" />
      <path d="M11.5 2.5v4h4" />
      <path d="M6.9 10h6.2M6.9 12.6h6.2M6.9 15.2h3.4" />
    </svg>
  );
}

function IconTrainGraph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[19px] w-[19px]" {...glyph} aria-hidden="true">
      <path d="M3.2 2.8v14.4h13.6" />
      <path d="M3.2 7.4h13.4M3.2 12.2h13.4" opacity="0.42" />
      <path d="M5 16.6 9.4 4.2" />
      <path d="M10.7 16.6 15 6.3" />
    </svg>
  );
}

function IconSignalMast() {
  return (
    <svg viewBox="0 0 20 20" className="h-[19px] w-[19px]" {...glyph} aria-hidden="true">
      <rect x="6.9" y="2.2" width="6.2" height="10.6" rx="2.1" />
      <path d="M10 12.8v4.6M7.2 17.4h5.6" />
      <circle cx="10" cy="4.7" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconColumns() {
  return (
    <svg viewBox="0 0 20 20" className="h-[19px] w-[19px]" {...glyph} aria-hidden="true">
      <path d="M2.8 16.9h14.4" />
      <path d="M6 16.9v-5.4M10 16.9V5.2M14 16.9V8.6" strokeWidth="2" />
    </svg>
  );
}

function IconLeverFrame() {
  return (
    <svg viewBox="0 0 20 20" className="h-[19px] w-[19px]" {...glyph} aria-hidden="true">
      <rect x="2.4" y="13.2" width="15.2" height="4.4" rx="1" />
      <path d="M6.2 13.4V7.2" strokeWidth="1.9" />
      <circle cx="6.2" cy="5.4" r="1.9" />
      <path d="M12.2 13.4 14.5 7.6" strokeWidth="1.9" />
      <circle cx="15.2" cy="5.8" r="1.9" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-pending', to: '/', label: 'Pending Requests', icon: <IconDocket /> },
  { id: 'nav-schedule', to: '/schedule', label: 'Schedule', icon: <IconTrainGraph /> },
  { id: 'nav-conflicts', to: '/conflicts', label: 'Conflict Alerts', icon: <IconSignalMast /> },
  { id: 'nav-analytics', to: '/analytics', label: 'Analytics', icon: <IconColumns /> },
  { id: 'nav-demo', to: '/demo', label: 'Demo Mode', icon: <IconLeverFrame /> },
];

// ── Brand ───────────────────────────────────────────────────────────────────
//
//  A station roundel with the road ahead inside it: two rails converging to a
//  vanishing point, sleepers across them. Brass in both themes — polished
//  hardware at night, printed seal on paper.

function Roundel({ size = 34 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14.2" fill="var(--rs-accent-soft)" stroke="var(--rs-accent)" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="10.6" fill="none" stroke="var(--rs-accent-line)" strokeWidth="1" />
      <path
        d="M10.9 24.4 14.5 9.2M21.1 24.4 17.5 9.2"
        stroke="var(--rs-accent-strong)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12.1 20.6h7.8M12.9 17.4h6.2M13.6 14.2h4.8"
        stroke="var(--rs-accent-strong)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.72"
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="min-w-0">
      <div className="font-display text-2xl font-bold uppercase leading-none tracking-[0.1em] text-ink">
        Niyojan
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase leading-none tracking-[0.18em] text-dim">
        Indian Railways
      </div>
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export function AppShell() {
  const { user, logout } = useAuth();
  const reduced = useReducedMotion();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // The drawer is a mobile affordance only: dismiss it on navigation and Escape.
  useEffect(() => setNavOpen(false), [location.pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Backdrop, below lg only */}
      <AnimatePresence>
        {navOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'var(--rs-overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — rendered once; a drawer below lg, a column at lg and up */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] shrink-0 flex-col border-r border-line bg-bg-alt transition-transform duration-300 ease-signal lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand plate */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Wordmark />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.id}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded border pl-4 pr-3 py-2.5 font-display text-[13.5px] font-semibold uppercase tracking-[0.07em] transition-colors duration-150 ${
                  isActive
                    ? 'border-line bg-surface-2 text-ink'
                    : 'border-transparent text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-y-0 left-0 w-[3px] rounded-l"
                      style={{ background: 'var(--rs-accent)' }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 460, damping: 34 }
                      }
                      aria-hidden="true"
                    />
                  )}
                  <span className={isActive ? 'text-brass' : ''}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Duty plate, panel lamp, sign out */}
        <div className="space-y-2 border-t border-line px-2.5 py-3">
          <div className="rounded border border-line bg-surface px-3 py-2.5 shadow-paper">
            <div className="caption">On duty</div>
            <div className="mt-1 truncate font-display text-[15px] font-semibold uppercase leading-none tracking-[0.06em] text-ink">
              {user?.username}
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-brass">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </div>
          </div>

          <ThemeToggle variant="bar" />

          <button
            id="btn-logout"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded border border-transparent px-3 py-2 font-display text-[13px] font-semibold uppercase tracking-[0.07em] text-muted transition-colors duration-150 hover:border-signal-red-line hover:bg-signal-red-fill hover:text-signal-red-text"
          >
            <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" {...glyph} aria-hidden="true">
              <path d="M12.6 5.4V4.2a2 2 0 0 0-2-2H5.2a2 2 0 0 0-2 2v11.6a2 2 0 0 0 2 2h5.4a2 2 0 0 0 2-2v-1.2" />
              <path d="M8.4 10h8.4M14.2 7.2 17 10l-2.8 2.8" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-line bg-bg-alt px-3 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            className="flex h-9 w-9 items-center justify-center rounded border border-line bg-surface text-muted transition-colors hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...glyph} aria-hidden="true">
              <path d="M3.5 6h13M3.5 10h13M3.5 14h8.5" />
            </svg>
          </button>
          <Roundel size={26} />
          <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold uppercase tracking-[0.1em] text-ink">
            Rail Samanvay
          </span>
          <ThemeToggle variant="icon" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
