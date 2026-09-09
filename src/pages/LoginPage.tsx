import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useReducedMotion } from '../theme/ThemeContext';
import { Reveal } from '../components/ui/Reveal';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Lamp } from '../components/ui/Lamp';
import { SweepRail } from '../components/ui/RelayLoader';

// ============================================================================
//  Sign in.
//
//  Behind the form is a schematic of a rail network — running lines, junctions,
//  station marks — drifting very slowly, with two track-circuit indications
//  creeping along distant roads. It is the same drawing in both themes: a lit
//  panel diagram at night, a printed route chart by day.
//
//  The entrance reads as the room coming up in dark (three relay lamps stepping
//  in) and as a document being laid down in light (the sheet settling from its
//  top edge). One sequence, two readings.
// ============================================================================

const BACKDROP_W = 1280;
const BACKDROP_H = 720;

/** Running lines of the ambient network. */
const ROADS = [
  { y: 108, from: -60, to: 1340 },
  { y: 246, from: -60, to: 1340 },
  { y: 430, from: -60, to: 1340 },
  { y: 592, from: -60, to: 1340 },
];

/** Connections between roads, drawn as turnout-like curves. */
const LINKS = [
  { x: 180, y1: 108, y2: 246 },
  { x: 470, y1: 246, y2: 430 },
  { x: 742, y1: 108, y2: 246 },
  { x: 636, y1: 430, y2: 592 },
  { x: 1010, y1: 246, y2: 430 },
  { x: 1148, y1: 430, y2: 592 },
];

function linkPath(x: number, y1: number, y2: number) {
  const span = (y2 - y1) * 0.55;
  return `M ${x} ${y1} C ${x + 46} ${y1 + span * 0.2}, ${x + 62} ${y2 - span * 0.2}, ${x + 108} ${y2}`;
}

function LoginBackdrop() {
  const reduced = useReducedMotion();
  const marks: { x: number; y: number }[] = [];
  for (const road of ROADS) {
    for (let x = 40; x < 1300; x += 128) marks.push({ x, y: road.y });
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.svg
        viewBox={`0 0 ${BACKDROP_W} ${BACKDROP_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        initial={reduced ? { opacity: 0.42 } : { opacity: 0 }}
        animate={{ opacity: 0.42 }}
        transition={{ duration: reduced ? 0 : 1.4, ease: 'easeOut' }}
      >
        <motion.g
          animate={reduced ? undefined : { x: [0, -34, 0], y: [0, 8, 0] }}
          transition={
            reduced ? undefined : { duration: 64, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {/* Sleeper texture on the nearest road only, so the depth reads */}
          {Array.from({ length: 108 }, (_, i) => -40 + i * 13).map((x) => (
            <line
              key={x}
              x1={x}
              y1={ROADS[3].y - 5}
              x2={x}
              y2={ROADS[3].y + 5}
              stroke="var(--rs-sleeper-major)"
              strokeWidth="1"
            />
          ))}

          {LINKS.map((l) => (
            <path
              key={`${l.x}-${l.y1}`}
              d={linkPath(l.x, l.y1, l.y2)}
              fill="none"
              stroke="var(--rs-rail)"
              strokeWidth="1.4"
            />
          ))}

          {ROADS.map((r) => (
            <line
              key={r.y}
              x1={r.from}
              y1={r.y}
              x2={r.to}
              y2={r.y}
              stroke="var(--rs-rail)"
              strokeWidth="1.8"
            />
          ))}

          {marks.map((m) => (
            <circle
              key={`${m.x}-${m.y}`}
              cx={m.x}
              cy={m.y}
              r="3"
              fill="var(--rs-bg)"
              stroke="var(--rs-rail-strong)"
              strokeWidth="1.2"
            />
          ))}

          {/* Two occupancy indications creeping along distant roads */}
          {!reduced &&
            [
              { y: ROADS[1].y, dur: 26, delay: 0 },
              { y: ROADS[2].y, dur: 34, delay: 9 },
            ].map((s) => (
              <motion.line
                key={s.y}
                x1="-60"
                y1={s.y}
                x2="1340"
                y2={s.y}
                stroke="var(--rs-flare)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray="52 1400"
                initial={{ strokeDashoffset: 52 }}
                animate={{ strokeDashoffset: -1400 }}
                transition={{
                  duration: s.dur,
                  delay: s.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
        </motion.g>
      </motion.svg>

      {/* Vignette: the network recedes behind the form */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 66% 62% at 50% 46%, transparent 6%, var(--rs-bg) 88%)',
        }}
      />
    </div>
  );
}

function LoginRoundel() {
  return (
    <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
      {/* Calendar body */}
      <rect
        x="10" y="20" width="80" height="68" rx="14"
        fill="none"
        stroke="var(--rs-accent-strong)"
        strokeWidth="5"
      />

      {/* Binder rings */}
      <rect x="24" y="8" width="9" height="22" rx="4.5" fill="var(--rs-surface, transparent)" stroke="var(--rs-accent-strong)" strokeWidth="5" />
      <rect x="67" y="8" width="9" height="22" rx="4.5" fill="var(--rs-surface, transparent)" stroke="var(--rs-accent-strong)" strokeWidth="5" />

      {/* Header divider */}
      <line x1="10" y1="36" x2="90" y2="36" stroke="var(--rs-accent-strong)" strokeWidth="4" strokeLinecap="round" />

      {/* Grid cells (row 1) */}
      <rect x="17" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="35" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="53" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="71" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />

      {/* Grid cells (row 2) — one highlighted */}
      <rect x="17" y="59" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="35" y="59" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="53" y="59" width="12" height="11" rx="2" fill="var(--rs-accent)" />
      <rect x="71" y="59" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />

      {/* Rail track — two rails curving from bottom-left up through the card */}
      <path
        d="M12 90 C 18 74, 28 58, 50 42"
        fill="none"
        stroke="var(--rs-accent-strong)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M26 90 C 32 74, 41 59, 60 44"
        fill="none"
        stroke="var(--rs-accent-strong)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Sleepers (ties) across the rails, perpendicular to the curve */}
      <path
        d="M13 84 L 27.5 85 M16.5 76 L 30.5 77.5 M21 68 L 34.5 70 M26.5 60.5 L 39.5 62.5 M33 53 L 45 55.5 M40.5 46.5 L 51.5 49"
        stroke="var(--rs-accent-strong)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Checkmark badge — small, bottom-right corner */}
      <circle cx="72" cy="72" r="17" fill="var(--rs-surface, transparent)" />
      <path
        d="M64 72 L 70 78 L 82 64"
        fill="none"
        stroke="var(--rs-accent-strong)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Three relay lamps stepping in — the room coming up to power. */
function PowerOnLamps() {
  const reduced = useReducedMotion();
  const aspects = ['var(--rs-amber-core)', 'var(--rs-green-core)', 'var(--rs-green-core)'];
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {aspects.map((c, i) => (
        <motion.span
          key={i}
          initial={reduced ? { opacity: 1 } : { opacity: 0.14 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: reduced ? 0 : 0.62 + i * 0.13 }}
          className="flex"
        >
          <Lamp color={c} size={6} />
        </motion.span>
      ))}
    </span>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
  const reduced = useReducedMotion();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'NETWORK_ERROR') {
          setError('Cannot reach the backend server. Make sure the AI Engine is running (docker compose up).');
        } else if (err.message.toLowerCase().includes('incorrect') || err.message.startsWith('HTTP 401')) {
          setError('Wrong username or password. Please try again.');
        } else {
          setError(`Login failed: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <LoginBackdrop />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle variant="icon" />
      </div>

      <div className="relative w-full max-w-[26rem]">
        {/* Seal and title block */}
        <div className="mb-7 flex flex-col items-center text-center">
          <Reveal index={0} className="flex">
            <LoginRoundel />
          </Reveal>
          <Reveal index={1} className="mt-4">
            <h1 className="font-display text-[34px] font-bold uppercase leading-none tracking-[0.09em] text-ink">
              Niyojan AI
            </h1>
          </Reveal>
          <Reveal index={3} className="mt-3">
            <p className="text-[13px] leading-snug text-muted">
              Optimized Block Scheduling AI Brain
            </p>
          </Reveal>
        </div>

        {/* The sheet settles from its top edge */}
        <motion.div
          className="panel overflow-hidden"
          style={{ transformOrigin: 'top center' }}
          initial={reduced ? false : { opacity: 0, y: 8, scaleY: 0.982 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 0.44, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3">
            <h2 className="section-title">Sign in to continue</h2>
            <PowerOnLamps />
          </div>

          <div className="p-5">
            {error && (
              <motion.div
                role="alert"
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.22 }}
                className="mb-4 flex items-start gap-2.5 rounded border border-signal-red-line bg-signal-red-fill px-3 py-2.5 text-[13px] leading-snug text-signal-red-text"
              >
                <span className="mt-[3px] flex">
                  <Lamp color="var(--rs-red-core)" size={8} />
                </span>
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="field-label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="field"
                  placeholder="e.g. tpc_admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-brass mt-1 w-full py-2.5 font-display text-[15px] uppercase tracking-[0.1em]"
              >
                {loading ? (
                  <>
                    <SweepRail width={52} height={10} />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-line-soft pt-3.5 text-center">
              <span className="caption">Smart India Hackathon 2025 · PS 26027</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
