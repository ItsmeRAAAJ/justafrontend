import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useReducedMotion } from '../../theme/ThemeContext';

gsap.registerPlugin(MotionPathPlugin);

// ============================================================================
//  SolverTelemetry — the panel diagram, live, while the solver thinks.
//
//  A signal-box panel diagram of the corridor: single-line, because that is how
//  real panels draw a route. Two track-circuit indications run out of C.S.M.T.
//  and take different roads at Kalyan Junction — one straight on to Igatpuri,
//  one over the turnout to Karjat. They keep running for as long as the solver
//  is still deciding, which is the honest signal: the route is being set.
//
//  This is the only component that uses GSAP, and only for MotionPathPlugin —
//  the lights follow the actual drawn geometry rather than a faked translate.
//  Under prefers-reduced-motion the same diagram is drawn with both indications
//  parked at the junction and nothing moves.
// ============================================================================

const W = 340;
const H = 78;
const Y_MAIN = 26;
const Y_DIV = 58;
const X_START = 16;
const X_JN = 172;
const X_END = 322;

const PATH_IGATPURI = `M ${X_START} ${Y_MAIN} L ${X_END} ${Y_MAIN}`;
const PATH_KARJAT = `M ${X_START} ${Y_MAIN} L ${X_JN} ${Y_MAIN} C ${X_JN + 14} ${Y_MAIN} ${X_JN + 18} ${Y_DIV} ${X_JN + 34} ${Y_DIV} L ${X_END} ${Y_DIV}`;

/** Perpendicular sleeper ticks along a horizontal run. */
function sleeperTicks(from: number, to: number, y: number, step = 9) {
  const out = [];
  for (let x = from + step; x < to; x += step) {
    out.push(
      <line
        key={`${y}-${x}`}
        x1={x}
        y1={y - 3}
        x2={x}
        y2={y + 3}
        stroke="var(--rs-sleeper-major)"
        strokeWidth="1"
      />,
    );
  }
  return out;
}

function BufferStop({ x, y, facing }: { x: number; y: number; facing: 1 | -1 }) {
  return (
    <>
      <line
        x1={x}
        y1={y - 4}
        x2={x}
        y2={y + 4}
        stroke="var(--rs-rail-strong)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1={x}
        y1={y}
        x2={x + facing * 4}
        y2={y}
        stroke="var(--rs-rail-strong)"
        strokeWidth="1.3"
      />
    </>
  );
}

/** The travelling indication: a lit core with a halo that only burns at night. */
function Indication({ tint }: { tint: string }) {
  return (
    <>
      <circle r="7" fill={tint} style={{ opacity: 'calc(0.32 * var(--rs-glow))' }} />
      <circle r="3.4" fill={tint} />
      <circle r="3.4" fill="none" stroke="var(--rs-bg)" strokeWidth="0.8" opacity="0.5" />
    </>
  );
}

interface SolverTelemetryProps {
  /** Mono caption above the diagram. */
  label?: string;
  /** Second line beneath, for solver detail. */
  detail?: string;
  className?: string;
}

export function SolverTelemetry({
  label = 'Setting route — solver running',
  detail,
  className = '',
}: SolverTelemetryProps) {
  const reduced = useReducedMotion();
  const pathA = useRef<SVGPathElement | null>(null);
  const pathB = useRef<SVGPathElement | null>(null);
  const lightA = useRef<SVGGElement | null>(null);
  const lightB = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const a = pathA.current;
    const b = pathB.current;
    const la = lightA.current;
    const lb = lightB.current;
    if (!a || !b || !la || !lb) return;

    const tweens = [
      gsap.to(la, {
        duration: 2.5,
        ease: 'none',
        repeat: -1,
        repeatDelay: 0.35,
        motionPath: { path: a, align: a, alignOrigin: [0.5, 0.5] },
      }),
      gsap.to(lb, {
        duration: 2.9,
        ease: 'none',
        repeat: -1,
        repeatDelay: 0.2,
        delay: 0.85,
        motionPath: { path: b, align: b, alignOrigin: [0.5, 0.5] },
      }),
    ];
    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [reduced]);

  // Start both indications at the junction so the first paint is a valid
  // diagram; GSAP overwrites the transform once the tween takes over.
  const parked = { transform: `translate(${X_JN}px, ${Y_MAIN}px)` };

  return (
    <div
      className={`flex flex-col items-center gap-2.5 ${className}`}
      role="status"
      aria-label={label}
    >
      <span className="caption text-muted">{label}</span>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="max-w-full"
        aria-hidden="true"
      >
        {/* Sleepers */}
        {sleeperTicks(X_START, X_END, Y_MAIN)}
        {sleeperTicks(X_JN + 34, X_END, Y_DIV)}

        {/* Running lines, single-line panel convention */}
        <path ref={pathA} d={PATH_IGATPURI} fill="none" stroke="var(--rs-rail)" strokeWidth="2" />
        <path ref={pathB} d={PATH_KARJAT} fill="none" stroke="var(--rs-rail)" strokeWidth="2" />

        {/* Point machine at the turnout */}
        <rect
          x={X_JN - 2.5}
          y={Y_MAIN + 7}
          width="5"
          height="5"
          rx="1"
          fill="var(--rs-accent-soft)"
          stroke="var(--rs-accent-line)"
          strokeWidth="1"
        />

        {/* Termini and the junction */}
        <BufferStop x={X_START} y={Y_MAIN} facing={1} />
        <BufferStop x={X_END} y={Y_MAIN} facing={-1} />
        <BufferStop x={X_END} y={Y_DIV} facing={-1} />
        <circle
          cx={X_JN}
          cy={Y_MAIN}
          r="6.4"
          fill="none"
          stroke="var(--rs-accent-line)"
          strokeWidth="1"
        />
        <circle
          cx={X_JN}
          cy={Y_MAIN}
          r="3.8"
          fill="var(--rs-node)"
          stroke="var(--rs-node-line)"
          strokeWidth="1.5"
        />

        {/* Panel lettering */}
        <g
          fill="var(--rs-text-dim)"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.08em' }}
        >
          <text x={X_START} y={Y_MAIN - 10}>
            C.S.M.T.
          </text>
          <text x={X_JN - 9} y={Y_MAIN + 15} textAnchor="end">
            KALYAN JN
          </text>
          <text x={X_END} y={Y_MAIN - 10} textAnchor="end">
            IGATPURI
          </text>
          <text x={X_END} y={Y_DIV + 16} textAnchor="end">
            KARJAT
          </text>
        </g>

        <g ref={lightA} style={parked}>
          <Indication tint="var(--rs-flare)" />
        </g>
        <g ref={lightB} style={parked}>
          <Indication tint="var(--rs-amber-core)" />
        </g>
      </svg>
      {detail && (
        <span className="max-w-[26rem] text-center font-mono text-[11px] leading-relaxed text-dim">
          {detail}
        </span>
      )}
    </div>
  );
}
