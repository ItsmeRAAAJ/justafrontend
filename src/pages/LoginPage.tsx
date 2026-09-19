import { useState, useEffect, FormEvent, lazy, Suspense } from 'react';
import trainHonk from '../soundEffect/trainhonk.mp3';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useReducedMotion } from '../theme/ThemeContext';
import { Reveal } from '../components/ui/Reveal';
import { Lamp } from '../components/ui/Lamp';
import { SweepRail } from '../components/ui/RelayLoader';

// ============================================================================
//  Sign in.
//
//  Behind the form: a 3D digital twin of the Mumbai Division stretch —
//  CSMT → Kalyan Jn, then the Y to Igatpuri and Karjat — with services running
//  continuously and a slow cinematic orbit around the junction. In front: a
//  frosted-glass panel that is always read as "control room at night",
//  whatever the app-wide theme is.
// ============================================================================

// Lazy so three.js never lands in the bundle for users who are already signed in.
const RailwayScene = lazy(() =>
  import('../components/3d/railway/RailwayScene').then((m) => ({ default: m.RailwayScene })),
);

/** The login screen has its own fixed light palette, independent of app theme. */
const LIGHT_VARS: React.CSSProperties = {
  ['--rs-bg' as string]: '#eef3f2',
  ['--rs-bg-alt' as string]: '#e4ecea',
  ['--rs-surface' as string]: 'rgba(255, 255, 255, 0.78)',
  ['--rs-surface-2' as string]: 'rgba(247, 250, 249, 0.82)',
  ['--rs-surface-3' as string]: 'rgba(255, 255, 255, 0.9)',
  ['--rs-line' as string]: 'rgba(25, 52, 55, 0.14)',
  ['--rs-line-strong' as string]: 'rgba(25, 52, 55, 0.25)',
  ['--rs-line-soft' as string]: 'rgba(25, 52, 55, 0.09)',
  ['--rs-text' as string]: '#17383a',
  ['--rs-text-muted' as string]: '#4f6868',
  ['--rs-text-dim' as string]: '#657b7a',
  ['--rs-on-accent' as string]: '#ffffff',
  ['--rs-accent' as string]: '#a66f16',
  ['--rs-accent-strong' as string]: '#7d500c',
  ['--rs-accent-soft' as string]: 'rgba(166, 111, 22, 0.12)',
  ['--rs-accent-line' as string]: 'rgba(166, 111, 22, 0.34)',
  ['--rs-rail-strong' as string]: '#3f6263',
  ['--rs-red' as string]: '#b33a2f',
  ['--rs-red-text' as string]: '#8f2e26',
  ['--rs-red-fill' as string]: 'rgba(179, 58, 47, 0.09)',
  ['--rs-red-line' as string]: 'rgba(179, 58, 47, 0.35)',
  ['--rs-red-core' as string]: '#d94b3d',
  ['--rs-amber-core' as string]: '#d59320',
  ['--rs-green-core' as string]: '#168764',
  ['--rs-focus' as string]: '#a66f16',
  colorScheme: 'light',
};

function LoginRoundel() {
  return (
    <svg viewBox="0 0 100 100" width="84" height="84" aria-hidden="true">
      <rect x="10" y="20" width="80" height="68" rx="14" fill="none" stroke="var(--rs-accent-strong)" strokeWidth="5" />
      <rect x="24" y="8" width="9" height="22" rx="4.5" fill="var(--rs-bg)" stroke="var(--rs-accent-strong)" strokeWidth="5" />
      <rect x="67" y="8" width="9" height="22" rx="4.5" fill="var(--rs-bg)" stroke="var(--rs-accent-strong)" strokeWidth="5" />
      <line x1="10" y1="36" x2="90" y2="36" stroke="var(--rs-accent-strong)" strokeWidth="4" strokeLinecap="round" />
      <rect x="17" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="35" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="53" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="71" y="43" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="17" y="59" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="35" y="59" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <rect x="53" y="59" width="12" height="11" rx="2" fill="var(--rs-accent)" />
      <rect x="71" y="59" width="12" height="11" rx="2" fill="var(--rs-accent-line)" opacity="0.55" />
      <path d="M12 90 C 18 74, 28 58, 50 42" fill="none" stroke="var(--rs-accent-strong)" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 90 C 32 74, 41 59, 60 44" fill="none" stroke="var(--rs-accent-strong)" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M13 84 L 27.5 85 M16.5 76 L 30.5 77.5 M21 68 L 34.5 70 M26.5 60.5 L 39.5 62.5 M33 53 L 45 55.5 M40.5 46.5 L 51.5 49"
        stroke="var(--rs-accent-strong)" strokeWidth="3.2" strokeLinecap="round"
      />
      <circle cx="72" cy="72" r="17" fill="var(--rs-bg)" />
      <path d="M64 72 L 70 78 L 82 64" fill="none" stroke="var(--rs-accent-strong)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Three relay lamps stepping in — the room coming up to power. */
function PowerOnLamps() {
  const reduced = useReducedMotion();
  const aspects = ['var(--rs-red-core)', 'var(--rs-amber-core)', 'var(--rs-green-core)'];
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {aspects.map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.2 }}
          animate={reduced ? { opacity: 1 } : { opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          className="flex"
        >
          <Lamp color={c} size={6} />
        </motion.span>
      ))}
    </span>
  );
}

/** Corridor legend, bottom-left: tells the viewer what the drawing is. */
// function CorridorLegend() {
//   return (
//     <div className="pointer-events-none absolute bottom-5 left-5 hidden select-none md:block" aria-hidden="true">
//       <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--rs-text-dim)' }}>
//         Central Railway · Mumbai Division
//       </div>
//       <div className="mt-1 font-display text-[15px] uppercase tracking-[0.1em]" style={{ color: 'var(--rs-text-muted)' }}>
//         CSMT — KYN
//         <span style={{ color: 'var(--rs-accent)' }}> ⑂ </span>
//         IGP / KJT
//       </div>
//     </div>
//   );
// }

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

  useEffect(() => {
    const audio = new Audio(trainHonk);
    audio.preload = 'auto';

    const startAudio = () => {
      void audio.play().catch((e) => console.warn('Login sound could not play:', e));
    };
    const removeFallback = () => {
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };

    startAudio();
    window.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });

    return () => {
      removeFallback();
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

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
    <div
      className="relative flex min-h-screen items-center justify-center md:justify-end md:pr-[15%] lg:pr-[20%] overflow-hidden p-4"
      data-niyojan-login
      style={{ ...LIGHT_VARS, background: 'var(--rs-bg)' }}
    >
      {/* ── 3D digital twin ──────────────────────────────────────────────── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 1.6, ease: 'easeOut' }}
      >
        <Suspense fallback={null}>
          <RailwayScene reduced={reduced} className="absolute inset-0" />
        </Suspense>
        {/* A very light wash preserves form contrast without hiding the network. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(238,243,242,0.08), rgba(238,243,242,0.02))' }}
        />
      </motion.div>

      {/* <CorridorLegend /> */}


      {/* ── Foreground ──────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[26rem]">
        <div className="mb-6 flex flex-col items-center text-center">
          <Reveal index={0} className="flex">
            <LoginRoundel />
          </Reveal>
          <Reveal index={1} className="mt-4">
            <h1
              className="font-display text-[34px] font-bold uppercase leading-none tracking-[0.09em]"
              style={{ color: 'var(--rs-text)' }}
            >
              Niyojan AI
            </h1>
          </Reveal>
          <Reveal index={3} className="mt-3">
            <p className="text-[13px] leading-snug" style={{ color: 'var(--rs-text-muted)' }}>
              Optimized Block Scheduling AI Brain for Indian Railways
            </p>
          </Reveal>
        </div>

        {/* Frosted-glass sheet — settles from its top edge */}
        <motion.div
          className="overflow-hidden rounded-lg"
          style={{
            transformOrigin: 'top center',
            background: 'var(--rs-surface)',
            border: '1px solid var(--rs-line-strong)',
            backdropFilter: 'blur(10px) saturate(115%)',
            WebkitBackdropFilter: 'blur(10px) saturate(115%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.75) inset, 0 22px 55px -28px rgba(24,56,58,0.32)' ,
          }}
          initial={reduced ? false : { opacity: 0, y: 8, scaleY: 0.982 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 0.44, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Brass hairline across the top edge — the one accent the glass carries */}
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(90deg, transparent, var(--rs-accent), transparent)' }}
          />

          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--rs-line)', background: 'var(--rs-surface-2)' }}
          >
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
                className="mb-4 flex items-start gap-2.5 rounded px-3 py-2.5 text-[13px] leading-snug"
                style={{
                  border: '1px solid var(--rs-red-line)',
                  background: 'var(--rs-red-fill)',
                  color: 'var(--rs-red-text)',
                }}
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
                  placeholder="e.g. tpc"
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

            <div className="mt-5 pt-3.5 text-center" style={{ borderTop: '1px solid var(--rs-line-soft)' }}>
              <span className="caption">Smart India Hackathon 2026 · PS 26027</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
