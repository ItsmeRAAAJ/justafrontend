import { Lamp } from './Lamp';
import { SIGNAL_STYLES } from './vocabulary';
import type { ApprovalStatus } from '../../services/api';

// ============================================================================
//  StampBadge — an approval state rendered as a franking mark.
//
//  Square-cornered, letterspaced mono with a lamp aspect beside it. On paper it
//  reads as a rubber stamp on a permit; in the control room the lamp lights and
//  it reads as an indication. Text always states the status, so the mark is
//  legible without colour vision.
// ============================================================================

interface StampBadgeProps {
  status: ApprovalStatus;
  /** Override the label — e.g. the shorter "Pending" inside a dense table. */
  label?: string;
  /** Slow pulse on the lamp. Use for a single item demanding attention. */
  pulse?: boolean;
  className?: string;
}

export function StampBadge({ status, label, pulse = false, className = '' }: StampBadgeProps) {
  const s = SIGNAL_STYLES[status];
  return (
    <span className={`mark ${s.mark} ${className}`}>
      <Lamp color={s.core} size={6} pulse={pulse} />
      {label ?? s.label}
    </span>
  );
}
