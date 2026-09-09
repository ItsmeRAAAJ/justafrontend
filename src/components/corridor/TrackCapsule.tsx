import { motion } from 'motion/react';
import { ScheduleAssignment } from '../../services/api';
import { deptStyle, SIGNAL_STYLES } from '../ui/vocabulary';
import { Lamp } from '../ui/Lamp';
import { useReducedMotion } from '../../theme/ThemeContext';

// ============================================================================
//  TrackCapsule — one granted block occupation, drawn on the track.
//
//  Reading order, outside in:
//    left edge bar  → which department owns the possession
//    fill           → the same department, held back so text stays legible
//    border         → approval status, exactly as before: dashed = pending,
//                     solid = decided, double = overridden by written order
//    lamp + id      → the aspect and the defect the work belongs to
//
//  Hover sends a flare down the capsule in --rs-flare, which is a travelling
//  light in the control room and an ink wash on paper — one gesture, two
//  materials, no theme branching.
// ============================================================================

function timeToFloat(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

const DAY_HOURS = 24;

const BORDER_STYLE: Record<string, { width: number; style: string }> = {
  dashed: { width: 1, style: 'dashed' },
  solid: { width: 1.5, style: 'solid' },
  double: { width: 3, style: 'double' },
};

interface TrackCapsuleProps {
  assignment: ScheduleAssignment;
  dayStart: number;
  daySpan: number;
  onClick: () => void;
  isSelected: boolean;
  /** Row position, used only to stagger the entrance. */
  revealIndex?: number;
}

export function TrackCapsule({
  assignment: a,
  dayStart,
  daySpan,
  onClick,
  isSelected,
  revealIndex = 0,
}: TrackCapsuleProps) {
  const reduced = useReducedMotion();
  const dept = deptStyle(a.department);
  const sig = SIGNAL_STYLES[a.approval_status];
  const border = BORDER_STYLE[sig.capsuleBorder];

  // Position maths unchanged: percentage of the visible span.
  const totalHours = daySpan * DAY_HOURS;
  const startHour = (a.day - dayStart) * DAY_HOURS + timeToFloat(a.start_time);
  const endHour = (a.day - dayStart) * DAY_HOURS + timeToFloat(a.end_time);
  const leftPct = Math.max(0, (startHour / totalHours) * 100);
  const widthPct = Math.max(0.5, ((endHour - startHour) / totalHours) * 100);

  if (startHour >= totalHours || endHour <= 0) return null;

  const rejected = a.approval_status === 'rejected';
  const tooltip = `${a.defect_id} · Day ${a.day} ${a.start_time}–${a.end_time} · ${a.department} · ${sig.label}`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={isSelected}
      className="group absolute top-1/2 flex items-center overflow-hidden rounded-sm text-left"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        minWidth: '5px',
        height: 22,
        marginTop: -11,
        background: dept.fill,
        borderStyle: border.style,
        borderWidth: border.width,
        borderColor: sig.line,
        opacity: rejected ? 0.62 : 1,
        boxShadow: isSelected
          ? `0 0 0 2px var(--rs-accent), var(--rs-shadow-raised)`
          : 'var(--rs-shadow-panel)',
      }}
      initial={reduced ? false : { opacity: 0, scaleX: 0.55 }}
      animate={{ opacity: rejected ? 0.62 : 1, scaleX: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              duration: 0.4,
              delay: Math.min(revealIndex * 0.022, 0.4),
              ease: [0.2, 0.8, 0.2, 1],
            }
      }
      whileHover={reduced ? undefined : 'hover'}
      variants={{ rest: {}, hover: { y: -1 } }}
    >
      {/* Department edge — who holds the possession */}
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: dept.solid }}
        aria-hidden="true"
      />
      {/* Flare: light down the rail in the control room, ink wash on paper */}
      {!reduced && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background: `linear-gradient(90deg, transparent, var(--rs-flare), transparent)`,
            opacity: 0.42,
          }}
          variants={{ rest: { x: '-160%' }, hover: { x: '360%' } }}
          initial="rest"
          transition={{ duration: 0.62, ease: [0.2, 0.8, 0.2, 1] }}
          aria-hidden="true"
        />
      )}
      <span className="relative flex min-w-0 items-center gap-1 pl-[7px] pr-1.5">
        <Lamp color={sig.core} size={5} />
        <span
          className={`truncate font-mono text-[10px] font-semibold leading-none tracking-tight ${
            rejected ? 'line-through' : ''
          }`}
          style={{ color: dept.text }}
        >
          {a.defect_id}
        </span>
      </span>
    </motion.button>
  );
}
