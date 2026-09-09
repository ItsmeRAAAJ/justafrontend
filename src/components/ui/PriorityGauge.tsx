import { motion } from 'motion/react';
import { useReducedMotion } from '../../theme/ThemeContext';
import { BAND_STYLES, type Band } from './vocabulary';

// ============================================================================
//  PriorityGauge — a panel dial, not a progress bar.
//
//  A 270° swept arc on a recessed track, the way a pressure gauge or a load
//  meter is drawn on a control desk. The numeral in the centre is the value the
//  table already displays; the arc only visualises it.
//
//  NOTE ON SCALE (presentation only): the backing field arrives as either a
//  0–1 fraction or a 0–100 score depending on the source record. The arc
//  normalises defensively so the needle can never overshoot the dial. The
//  caller still owns the band and the displayed numeral — nothing here changes
//  what the page reports.
// ============================================================================

const SIZE = 34;
const R = 13;
const CX = SIZE / 2;
const CY = SIZE / 2;
const SWEEP = 270; // degrees of usable dial
const START = 135; // degrees clockwise from 12 o'clock, i.e. lower-left

function polar(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number) {
  const a = polar(fromDeg);
  const b = polar(toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

const TRACK = arcPath(START, START + SWEEP);
const CIRC = (SWEEP / 360) * 2 * Math.PI * R;

interface PriorityGaugeProps {
  /** Raw score as held on the record — 0–1 or 0–100, both handled. */
  score: number;
  /** Band decided by the caller's existing logic. Drives the aspect colour. */
  band: Band;
  /** Numeral to print in the dial. Defaults to the score rounded. */
  display?: string;
  /** Delay the sweep, so a list of gauges fills in sequence. */
  delay?: number;
}

export function PriorityGauge({ score, band, display, delay = 0 }: PriorityGaugeProps) {
  const reduced = useReducedMotion();
  const fraction = Math.max(0, Math.min(1, score > 1 ? score / 100 : score));
  const aspect = BAND_STYLES[band];
  const numeral = display ?? String(Math.round(score > 1 ? score : score * 100));

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
      title={`Priority ${numeral} · ${band}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {/* Recessed dial track */}
        <path
          d={TRACK}
          fill="none"
          stroke="var(--rs-line)"
          strokeWidth={3}
          strokeLinecap="butt"
        />
        {/* Swept value */}
        <motion.path
          d={TRACK}
          fill="none"
          stroke={aspect.color}
          strokeWidth={3}
          strokeLinecap="butt"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: reduced ? CIRC * (1 - fraction) : CIRC }}
          animate={{ strokeDashoffset: CIRC * (1 - fraction) }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }
          }
        />
      </svg>
      <span
        className="absolute font-mono text-[10px] font-semibold leading-none tracking-tight"
        style={{ color: aspect.color }}
      >
        {numeral}
      </span>
    </span>
  );
}
