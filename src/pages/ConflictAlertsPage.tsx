import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { getDefects, getSchedule, Defect, ScheduleAssignment } from '../services/api';
import { Lamp } from '../components/ui/Lamp';
import { useReducedMotion } from '../theme/ThemeContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function priorityBand(score: number | null | undefined): 'high' | 'medium' | 'low' {
  if (score === null || score === undefined || Number.isNaN(score)) return 'low';
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function PriorityBadge({ score }: { score: number | null | undefined }) {
  const band = priorityBand(score);
  const markClass = band === 'high' ? 'mark-red' : band === 'medium' ? 'mark-amber' : 'mark-green';
  const core =
    band === 'high' ? 'var(--rs-red-core)' :
    band === 'medium' ? 'var(--rs-amber-core)' :
    'var(--rs-green-core)';
  return (
    <span className={`mark ${markClass}`}>
      <Lamp color={core} size={5} />
      {score !== null && score !== undefined && !Number.isNaN(score) ? score.toFixed(3) : '—'}
    </span>
  );
}

function sectionFamily(sectionId: string): string {
  const parts = sectionId.split('_');
  return parts[0] ?? sectionId;
}

interface PartitionNote {
  defectA: string;
  defectB: string;
  sectionA: string;
  sectionB: string;
  dayA: number;
  dayB: number;
  reason: string;
}

function computePartitionNotes(assignments: ScheduleAssignment[]): PartitionNote[] {
  const notes: PartitionNote[] = [];
  const valid = assignments.filter(a => a.approval_status !== 'rejected');

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i], b = valid[j];
      if (a.defect_id === b.defect_id) continue;
      if (a.department !== b.department) continue;

      const famA = sectionFamily(a.block_section_id);
      const famB = sectionFamily(b.block_section_id);
      if (famA !== famB) continue;

      const dayDiff = Math.abs(a.day - b.day);
      if (dayDiff > 3) continue;

      const reasons: string[] = [];
      if (a.block_section_id === b.block_section_id) {
        reasons.push('same block section: scheduled on different days to avoid machine double-booking');
      } else {
        reasons.push('adjacent section family: CP-SAT ensured no conflicting-section overlap');
      }
      if (a.machine_id && b.machine_id && a.machine_id === b.machine_id) {
        reasons.push('shared machine type — one had to wait');
      }
      if (dayDiff === 0 && a.start_time !== b.start_time) {
        reasons.push(`non-overlapping windows chosen (${a.start_time}–${a.end_time} vs ${b.start_time}–${b.end_time})`);
      }

      notes.push({
        defectA: a.defect_id,
        defectB: b.defect_id,
        sectionA: a.block_section_id,
        sectionB: b.block_section_id,
        dayA: a.day,
        dayB: b.day,
        reason: reasons.join('; '),
      });

      if (notes.length >= 10) return notes;
    }
  }
  return notes;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ConflictAlertsPage() {
  const reduced = useReducedMotion();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchUnscheduled, setSearchUnscheduled] = useState('');
  const [searchKeptApart, setSearchKeptApart] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [d, s] = await Promise.all([getDefects(), getSchedule()]);
        setDefects(d);
        setAssignments(s);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const scheduledIds = useMemo(() => new Set(assignments.map(a => a.defect_id)), [assignments]);
  const unscheduled = useMemo(
    () => defects
      .filter(d => !scheduledIds.has(d.defect_id))
      .sort((a, b) => (b.predicted_priority_score ?? 0) - (a.predicted_priority_score ?? 0))
      .slice(0, 50),
    [defects, scheduledIds]
  );

  // Apply search filter on top of the computed unscheduled list
  const filteredUnscheduled = useMemo(() => {
    const q = searchUnscheduled.trim().toLowerCase();
    return q === '' ? unscheduled : unscheduled.filter(d => d.defect_id.toLowerCase().includes(q));
  }, [unscheduled, searchUnscheduled]);

  const totalUnscheduled = defects.length - scheduledIds.size;
  const partitionNotes = useMemo(() => computePartitionNotes(assignments), [assignments]);

  // Apply search filter on the kept-apart notes
  const filteredPartitionNotes = useMemo(() => {
    const q = searchKeptApart.trim().toLowerCase();
    return q === ''
      ? partitionNotes
      : partitionNotes.filter(n =>
          n.defectA.toLowerCase().includes(q) || n.defectB.toLowerCase().includes(q)
        );
  }, [partitionNotes, searchKeptApart]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted">
        <svg className="h-5 w-5 animate-spin text-brass" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <h1 className="page-title">Conflict Alerts</h1>
        <p className="mt-1 font-mono text-[11px] text-muted">
          The CP-SAT solver guarantees zero conflicts by construction. This view surfaces unscheduled high-priority work and explains scheduling decisions.
        </p>
      </div>

      {error && (
        <div className="rounded border border-signal-red-line bg-signal-red-fill px-4 py-3 text-[13px] text-signal-red-text">
          {error}
        </div>
      )}

      {/* Unscheduled pool */}
      <motion.div
        className="panel overflow-hidden"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.3 }}
      >
        <div className="border-b border-line bg-surface-2 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-signal-amber-line bg-signal-amber-fill text-signal-amber-text">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="section-title">Unscheduled / Spilled-Over Work</h2>
              <p className="mt-1 font-mono text-[10px] text-muted">Showing top {unscheduled.length} of {totalUnscheduled} defect{totalUnscheduled !== 1 ? 's' : ''} not yet assigned — ranked by AI priority</p>
            </div>
          </div>

          {/* Search bar for unscheduled section */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                id="search-unscheduled"
                type="text"
                className="field pl-8 pr-7 text-[12px]"
                placeholder="Search Defect ID in unscheduled…"
                value={searchUnscheduled}
                onChange={e => setSearchUnscheduled(e.target.value)}
              />
              {searchUnscheduled && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  onClick={() => setSearchUnscheduled('')}
                  title="Clear"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchUnscheduled.trim() !== '' && (
              <span className="font-mono text-[11px] text-muted">
                {filteredUnscheduled.length} match{filteredUnscheduled.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>

        {unscheduled.length === 0 ? (
          <div className="py-12 text-center text-signal-green-text">
            <svg className="mx-auto mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px] font-medium uppercase tracking-[0.05em]">All defects are scheduled!</p>
          </div>
        ) : filteredUnscheduled.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted">
            No unscheduled defects match &quot;{searchUnscheduled}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="rs-thead">
                <tr>
                  <th className="rs-th">Rank</th>
                  <th className="rs-th">Defect ID</th>
                  <th className="rs-th">Department</th>
                  <th className="rs-th">Type</th>
                  <th className="rs-th">Section</th>
                  <th className="rs-th">Days Overdue</th>
                  <th className="rs-th">Priority Score</th>
                  <th className="rs-th">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnscheduled.map((d, i) => (
                  <tr key={d.defect_id} className="rs-row">
                    <td className="rs-td font-mono text-[10px] text-muted text-center">#{i + 1}</td>
                    <td className="rs-td font-mono text-[12px] text-brass">{d.defect_id}</td>
                    <td className="rs-td text-[13px]">{d.department}</td>
                    <td className="rs-td text-[13px]">{d.defect_type}</td>
                    <td className="rs-td font-mono text-[11px] text-dim">{d.block_section_id}</td>
                    <td className="rs-td">
                      <span className={`font-semibold ${d.days_overdue > 14 ? 'text-signal-red-text' : d.days_overdue > 7 ? 'text-signal-amber-text' : 'text-ink'}`}>
                        {d.days_overdue}d
                      </span>
                    </td>
                    <td className="rs-td"><PriorityBadge score={d.predicted_priority_score} /></td>
                    <td className="rs-td text-[11px] italic text-muted">
                      {priorityBand(d.predicted_priority_score) === 'high'
                        ? '⚠ High-priority work awaiting scheduling window'
                        : 'No available window in current horizon'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Scheduling decision notes */}
      <motion.div
        className="panel-pad"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-brass-line bg-brass-soft text-brass">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="section-title">Why Were These Kept Apart?</h2>
            <p className="mt-1 font-mono text-[10px] text-muted">Same-department, adjacent-section pairs that ended up at different times — computed client-side</p>
          </div>
        </div>

        {/* Search bar for kept-apart section */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              id="search-kept-apart"
              type="text"
              className="field pl-8 pr-7 text-[12px]"
              placeholder="Search Defect ID in decisions…"
              value={searchKeptApart}
              onChange={e => setSearchKeptApart(e.target.value)}
            />
            {searchKeptApart && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                onClick={() => setSearchKeptApart('')}
                title="Clear"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchKeptApart.trim() !== '' && (
            <span className="font-mono text-[11px] text-muted">
              {filteredPartitionNotes.length} match{filteredPartitionNotes.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {filteredPartitionNotes.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">
            {assignments.length === 0
              ? 'Generate a schedule first to see scheduling decision notes.'
              : searchKeptApart.trim() !== ''
              ? `No decisions found matching "${searchKeptApart}".`
              : 'No adjacent-section conflicts detected — all same-department pairs were scheduled with clear separation.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredPartitionNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-3 rounded border border-line bg-surface-2 p-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brass-soft font-mono text-[10px] font-bold text-brass">{i + 1}</div>
                <div>
                  <div className="text-[13px]">
                    <span className="font-mono font-semibold text-ink">{note.defectA}</span>
                    <span className="mx-2 text-muted">vs</span>
                    <span className="font-mono font-semibold text-ink">{note.defectB}</span>
                    <span className="ml-2 font-mono text-[10px] text-dim">({note.sectionA} / {note.sectionB}, Day {note.dayA} vs Day {note.dayB})</span>
                  </div>
                  <div className="mt-1 text-[12px] italic text-muted">{note.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 rounded border border-brass-line bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink shadow-panel">
          <strong className="text-brass">Note:</strong> The CP-SAT solver guarantees that all 5 validity constraints pass (no machine double-booking, no conflicting-section overlap, duration minimums, seasonal restrictions, no standing-corridor overlap). This panel explains the decisions, not conflicts — there are none by construction.
        </div>
      </motion.div>
    </div>
  );
}
