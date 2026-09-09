import { ScheduleAssignment, ApprovalStatus } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────

function timeToFloat(t: string): number {
  // e.g. "02:00" or "14:30"
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

const DEPT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Engineering: { bg: 'bg-blue-700/70', border: 'border-blue-500', text: 'text-blue-200' },
  'S&T':       { bg: 'bg-emerald-700/70', border: 'border-emerald-500', text: 'text-emerald-200' },
  OHE:         { bg: 'bg-orange-700/70', border: 'border-orange-500', text: 'text-orange-200' },
};

function deptColor(dept: string) {
  return DEPT_COLORS[dept] ?? { bg: 'bg-purple-700/70', border: 'border-purple-500', text: 'text-purple-200' };
}

interface StatusStyle {
  border: string;
  opacity: string;
  label: string;
  dot: string;
}

const STATUS_STYLES: Record<ApprovalStatus, StatusStyle> = {
  pending_review: { border: 'border-dashed border-amber-400/80', opacity: 'opacity-90', label: 'Pending', dot: 'bg-amber-400' },
  approved:       { border: 'border-2 border-emerald-400',        opacity: 'opacity-100', label: 'Approved', dot: 'bg-emerald-400' },
  rejected:       { border: 'border-2 border-red-500',            opacity: 'opacity-50',  label: 'Rejected', dot: 'bg-red-400' },
  overridden:     { border: 'border-2 border-purple-400',          opacity: 'opacity-85',  label: 'Overridden', dot: 'bg-purple-400' },
};

// ── Gantt Bar ────────────────────────────────────────────────

const DAY_HOURS = 24; // total hours in x-axis range per day

interface GanttBarProps {
  assignment: ScheduleAssignment;
  dayStart: number;
  daySpan: number;   // how many days are visible
  onClick: () => void;
  isSelected: boolean;
}

export function GanttBar({ assignment: a, dayStart, daySpan, onClick, isSelected }: GanttBarProps) {
  const col = deptColor(a.department);
  const statusStyle = STATUS_STYLES[a.approval_status];

  // Calculate position as percentage of total timeline width
  const totalHours = daySpan * DAY_HOURS;
  const startHour = (a.day - dayStart) * DAY_HOURS + timeToFloat(a.start_time);
  const endHour   = (a.day - dayStart) * DAY_HOURS + timeToFloat(a.end_time);
  const leftPct   = Math.max(0, (startHour / totalHours) * 100);
  const widthPct  = Math.max(0.5, ((endHour - startHour) / totalHours) * 100);

  // Don't render if outside visible range
  if (startHour >= totalHours || endHour <= 0) return null;

  const tooltip = `${a.defect_id} · Day ${a.day} ${a.start_time}–${a.end_time} · ${a.department} · ${statusStyle.label}`;

  return (
    <div
      className={`absolute top-1 bottom-1 rounded flex items-center overflow-hidden cursor-pointer transition-all
        ${col.bg} ${statusStyle.border} ${statusStyle.opacity}
        ${isSelected ? 'ring-2 ring-brand-400 ring-offset-1 ring-offset-rail-dark' : 'hover:ring-1 hover:ring-white/30'}
        ${a.approval_status === 'rejected' ? 'line-through' : ''}
      `}
      style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '4px' }}
      title={tooltip}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 px-1.5 overflow-hidden whitespace-nowrap">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
        <span className={`text-[10px] font-semibold truncate ${col.text}`}>{a.defect_id}</span>
      </div>
    </div>
  );
}
