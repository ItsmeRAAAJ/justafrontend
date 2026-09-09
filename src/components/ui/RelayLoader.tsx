import { motion } from 'motion/react';
import { useReducedMotion } from '../../theme/ThemeContext';

// ============================================================================
//  RelayLoader — waiting, in railway terms.
//
//  Not a spinner. A track-circuit occupancy indication sliding along a panel
//  rail, with relay lamps stepping in sequence beneath it: what a control desk
//  actually shows you while something is being worked out down the line.
// ============================================================================

const W = 132;
const DASH = 20;

function SweepRail({ width = W, height = 14 }: { width?: number; height?: number }) {
  const reduced = useReducedMotion();
  const mid = height / 2;
  const cycle = width + DASH;
  // Sleeper ticks under the rail, evenly spaced along the segment
  const ticks = Array.from({ length: Math.floor(width / 11) }, (_, i) => 5 + i * 11);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {ticks.map((x) => (
        <line
          key={x}
          x1={x}
          y1={mid - 3.5}
          x2={x}
          y2={mid + 3.5}
          stroke="var(--rs-sleeper-major)"
          strokeWidth="1"
        />
      ))}
      <line
        x1="0"
        y1={mid}
        x2={width}
        y2={mid}
        stroke="var(--rs-rail)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.line
        x1="0"
        y1={mid}
        x2={width}
        y2={mid}
        stroke="var(--rs-flare)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${DASH} ${width}`}
        initial={{ strokeDashoffset: DASH }}
        animate={reduced ? { strokeDashoffset: DASH } : { strokeDashoffset: -width }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: (cycle / 100) * 1.15, repeat: Infinity, ease: 'linear' }
        }
      />
    </svg>
  );
}

const RELAY_ASPECTS = [
  'var(--rs-amber-core)',
  'var(--rs-amber-core)',
  'var(--rs-green-core)',
  'var(--rs-green-core)',
];

function RelayBank() {
  const reduced = useReducedMotion();
  return (
    <span className="flex items-center gap-1.5">
      {RELAY_ASPECTS.map((color, i) => (
        <motion.span
          key={i}
          className="block h-[7px] w-[7px] rounded-full"
          style={{ background: color }}
          initial={{ opacity: 0.22 }}
          animate={reduced ? { opacity: 0.5 } : { opacity: [0.22, 1, 0.22] }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }
          }
        />
      ))}
    </span>
  );
}

interface RelayLoaderProps {
  /** Mono caption above the rail — say what is being worked out. */
  label?: string;
  /** Second line, for solver detail. */
  detail?: string;
  /** `inline` is a bare 84px rail; `block` is the full centred panel. */
  variant?: 'inline' | 'block';
  className?: string;
}

export function RelayLoader({
  label,
  detail,
  variant = 'block',
  className = '',
}: RelayLoaderProps) {
  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-2.5 ${className}`}
        role="status"
        aria-label={label ?? 'Working'}
      >
        <SweepRail width={84} height={12} />
        {label && <span className="caption">{label}</span>}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}
      role="status"
      aria-label={label ?? 'Working'}
    >
      {label && <span className="caption text-muted">{label}</span>}
      <SweepRail />
      <RelayBank />
      {detail && (
        <span className="max-w-[22rem] text-center font-mono text-[11px] leading-relaxed text-dim">
          {detail}
        </span>
      )}
    </div>
  );
}

export { SweepRail };
