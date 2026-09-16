import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSchedule, generateSchedule, ScheduleAssignment, ApprovalStatus } from '../services/api';
import { AssignmentDetailPanel } from '../components/AssignmentDetailPanel';
import { JunctionPlate, RailSlice, SlicePosition } from '../components/corridor/CorridorSchematic';
import { TrackCapsule } from '../components/corridor/TrackCapsule';
import { TrackBed, DayRuler } from '../components/corridor/TrackTimeline';
import { SolverTelemetry } from '../components/corridor/SolverTelemetry';
import {
  BRANCH_ORDER,
  BRANCH_LABELS,
  BRANCH_STATIONS,
  GUTTER_W,
  ROW_H,
  sectionLabel,
  sectionRank,
  isGhatPair,
  type BranchKey,
} from '../components/corridor/corridorTopology';
import { deptStyle, SIGNAL_STYLES, DEPT_LEGEND_ORDER, STATUS_LABELS } from '../components/ui/vocabulary';
import { Lamp } from '../components/ui/Lamp';
import { useReducedMotion } from '../theme/ThemeContext';

// ── Derived section info from the assignment records ──────────────────────────

interface SectionInfo {
  branch: BranchKey | string;
  fromStation?: string;
  toStation?: string;
  ghat: boolean;
  rank: number;
}

function deriveSectionInfo(assignments: ScheduleAssignment[]): Map<string, SectionInfo> {
  const map = new Map<string, SectionInfo>();
  for (const a of assignments) {
    if (map.has(a.block_section_id)) continue;
    const s = a.section;
    const branch = (s?.branch ?? 'trunk') as BranchKey | string;
    const fromStation = s?.from_station;
    const toStation = s?.to_station;
    const ghat = s?.is_ghat_section ?? isGhatPair(fromStation ?? '', toStation ?? '');
    const rank = sectionRank(branch, fromStation);
    map.set(a.block_section_id, { branch, fromStation, toStation, ghat, rank });
  }
  return map;
}

// ── Gutter label for one section row ─────────────────────────────────────────

interface GutterLabelProps {
  sectionId: string;
  info: SectionInfo;
  position: SlicePosition;
  active: boolean;
}

function GutterLabel({ sectionId, info, position, active }: GutterLabelProps) {
  const { from, to } = sectionLabel(sectionId, info.fromStation, info.toStation);
  return (
    <div
      className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line bg-bg-alt"
      style={{ width: GUTTER_W, height: ROW_H }}
    >
      <RailSlice
        branch={info.branch}
        position={position}
        fromStation={info.fromStation}
        toStation={info.toStation}
        ghat={info.ghat}
        active={active}
      />
      <div className="min-w-0 flex-1 pr-2">
        <div className="truncate font-display text-[11px] font-semibold uppercase leading-tight tracking-[0.07em] text-ink" title={`${from} → ${to}`}>
          {from}
        </div>
        {to && (
          <div className="truncate font-mono text-[9px] leading-none tracking-[0.06em] text-dim">
            → {to}
          </div>
        )}
      </div>
    </div>
  );
}

// ── One section row ───────────────────────────────────────────────────────────

interface SectionRowProps {
  sectionId: string;
  info: SectionInfo;
  assignments: ScheduleAssignment[];
  dayStart: number;
  daySpan: number;
  onSelect: (a: ScheduleAssignment) => void;
  selectedId: number | null;
  position: SlicePosition;
  revealOffset: number;
}

function SectionRow({
  sectionId, info, assignments, dayStart, daySpan,
  onSelect, selectedId, position, revealOffset,
}: SectionRowProps) {
  const hasSelected = assignments.some(a => a.id === selectedId);
  return (
    <div
      className={`flex border-b border-line-soft transition-colors duration-100 ${hasSelected ? 'bg-brass-soft' : 'hover:bg-surface-2/50'}`}
      style={{ height: ROW_H }}
    >
      <GutterLabel sectionId={sectionId} info={info} position={position} active={hasSelected} />
      <div className="relative flex-1 overflow-hidden">
        <TrackBed daySpan={daySpan} />
        {assignments.map((a, i) => (
          <TrackCapsule
            key={a.id}
            assignment={a}
            dayStart={dayStart}
            daySpan={daySpan}
            onClick={() => onSelect(a)}
            isSelected={selectedId === a.id}
            revealIndex={revealOffset + i}
          />
        ))}
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function ScheduleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface-2 px-4 py-2">
      <span className="caption mr-1">Department</span>
      {DEPT_LEGEND_ORDER.map((dept) => {
        const s = deptStyle(dept);
        return (
          <div key={dept} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.solid }} />
            <span className="font-mono text-[10px] leading-none text-muted">{dept}</span>
          </div>
        );
      })}
      <span className="mx-2 text-line-strong">|</span>
      <span className="caption mr-1">Status</span>
      {(Object.entries(SIGNAL_STYLES) as [ApprovalStatus, typeof SIGNAL_STYLES[ApprovalStatus]][]).map(([status, sig]) => (
        <div key={status} className="flex items-center gap-1.5">
          <Lamp color={sig.core} size={7} />
          <span className="font-mono text-[10px] leading-none text-muted">{sig.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SchedulePage() {
  const reduced = useReducedMotion();
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignment | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'full'>('week');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [ganttSearch, setGanttSearch] = useState('');

  async function fetchSchedule() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSchedule();
      setAssignments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSchedule(); }, []);

  // F-4 FIX: 30-second auto-refresh so multi-user approvals/rejections
  // made by colleagues are visible without a manual Refresh click.
  // The interval is paused when the browser tab is hidden to avoid
  // unnecessary background requests.
  useEffect(() => {
    const POLL_MS = 30_000;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && !generating) {
        fetchSchedule();
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [generating]); // re-run if generating state changes

  async function handleGenerate() {
    setGenerating(true);
    setGenerateMsg(null);
    setError(null);
    try {
      const res = await generateSchedule();
      setGenerateMsg(`Solver status: ${res.status} · Solved in ${res.solve_time.toFixed(2)}s · ${res.assignments.length} assignments created`);
      await fetchSchedule();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  }

  // Compute day range
  const { dayStart, daySpan } = useMemo(() => {
    if (assignments.length === 0) return { dayStart: 1, daySpan: viewMode === 'week' ? 7 : 14 };
    const days = assignments.map(a => a.day);
    const min = Math.min(...days);
    const max = Math.max(...days);
    const span = viewMode === 'week' ? 7 : Math.min(max - min + 1, 30);
    return { dayStart: min, daySpan: span };
  }, [assignments, viewMode]);

  // Filter and group by branch → section
  const grouped = useMemo(() => {
    const q = ganttSearch.trim().toLowerCase();
    const statusFiltered = statusFilter === 'all'
      ? assignments
      : assignments.filter(a => a.approval_status === statusFilter);

    // Apply defect-ID search on top of status filter
    const filtered = q === ''
      ? statusFiltered
      : statusFiltered.filter(a => a.defect_id.toLowerCase().includes(q));

    const sectionInfoMap = deriveSectionInfo(filtered);

    const bySectionBranch: Record<string, { info: SectionInfo; assignments: ScheduleAssignment[] }> = {};
    for (const a of filtered) {
      const sec = a.block_section_id;
      const info = sectionInfoMap.get(sec) ?? {
        branch: a.section?.branch ?? 'trunk',
        fromStation: a.section?.from_station,
        toStation: a.section?.to_station,
        ghat: false,
        rank: 9999,
      };
      if (!bySectionBranch[sec]) bySectionBranch[sec] = { info, assignments: [] };
      bySectionBranch[sec].assignments.push(a);
    }

    const byBranch: Record<string, { section: string; info: SectionInfo; assignments: ScheduleAssignment[] }[]> = {};
    for (const [sec, { info, assignments: asns }] of Object.entries(bySectionBranch)) {
      const branch = info.branch;
      if (!byBranch[branch]) byBranch[branch] = [];
      byBranch[branch].push({ section: sec, info, assignments: asns });
    }

    // Sort sections by their running order within each branch
    for (const branch of Object.keys(byBranch)) {
      byBranch[branch].sort((a, b) => a.info.rank - b.info.rank);
    }

    return byBranch;
  }, [assignments, statusFilter, ganttSearch]);

  function handleStatusChange(id: number, status: ApprovalStatus) {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, approval_status: status } : a));
    if (selectedAssignment?.id === id) {
      setSelectedAssignment(prev => prev ? { ...prev, approval_status: status } : null);
    }
  }

  const totalAssignments = assignments.length;
  const approvedCount = assignments.filter(a => a.approval_status === 'approved').length;
  const pendingCount = assignments.filter(a => a.approval_status === 'pending_review').length;

  // Compute row positions for slices
  function getSlicePosition(rows: { section: string }[], idx: number): SlicePosition {
    if (rows.length === 1) return 'only';
    if (idx === 0) return 'head';
    if (idx === rows.length - 1) return 'tail';
    return 'mid';
  }

  // Running count for reveal stagger
  let revealCounter = 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 border-b border-line bg-bg-alt px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Schedule / Gantt</h1>
            <p className="mt-1 font-mono text-[11px] text-muted">
              {totalAssignments} assignments · {approvedCount} approved · {pendingCount} pending review
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Defect ID search */}
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                id="search-gantt-defect"
                type="text"
                className="field w-48 pl-8 pr-7 text-[12px]"
                placeholder="Search Defect ID…"
                value={ganttSearch}
                onChange={e => setGanttSearch(e.target.value)}
              />
              {ganttSearch && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  onClick={() => setGanttSearch('')}
                  title="Clear"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {ganttSearch.trim() !== '' && (
              <span className="font-mono text-[11px] text-muted">
                {Object.values(grouped).flat().reduce((n, r) => n + r.assignments.length, 0)} match{Object.values(grouped).flat().reduce((n, r) => n + r.assignments.length, 0) !== 1 ? 'es' : ''}
              </span>
            )}

            {/* View toggle */}
            <div className="flex items-center rounded border border-line bg-surface p-0.5">
              {(['week', 'full'] as const).map(mode => (
                <button
                  key={mode}
                  id={`view-${mode}`}
                  onClick={() => setViewMode(mode)}
                  className={`relative rounded-sm px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.07em] transition-colors duration-150 ${
                    viewMode === mode
                      ? 'bg-surface-2 text-ink shadow-panel'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {mode === 'week' ? 'Week' : 'Full Horizon'}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ApprovalStatus | 'all')}
              className="field w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="overridden">Overridden</option>
            </select>

            <button
              id="btn-refresh"
              onClick={fetchSchedule}
              disabled={loading}
              className="btn-ghost gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            <button
              id="btn-generate"
              onClick={handleGenerate}
              disabled={generating || loading}
              className="btn-brass gap-1.5"
            >
              {generating ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Solving…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Schedule
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status messages */}
        <AnimatePresence>
          {generateMsg && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="mt-3 flex items-center gap-2 rounded border border-signal-green-line bg-signal-green-fill px-3 py-2 text-[13px] text-signal-green-text"
            >
              <Lamp color="var(--rs-green-core)" size={8} />
              {generateMsg}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="mt-3 flex items-center gap-2 rounded border border-signal-red-line bg-signal-red-fill px-3 py-2 text-[13px] text-signal-red-text"
            >
              <Lamp color="var(--rs-red-core)" size={8} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <ScheduleLegend />

      {/* Gantt body */}
      <div className="gantt-container flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <SolverTelemetry label="Loading schedule data…" />
          </div>
        ) : generating ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <SolverTelemetry
              label="Setting route — CP-SAT solver running"
              detail="The optimizer is finding the best assignment for all priority-ranked defects while keeping approved slots locked."
            />
          </div>
        ) : assignments.length === 0 ? (
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex h-64 flex-col items-center justify-center gap-4 text-muted"
          >
            <svg className="h-12 w-12 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[13px]">No schedule generated yet. Click Generate Schedule to run the AI optimizer.</p>
            <button id="btn-generate-empty" onClick={handleGenerate} className="btn-brass">
              Generate Schedule Now
            </button>
          </motion.div>
        ) : (
          <div style={{ minWidth: `${GUTTER_W + daySpan * 120}px` }}>
            <DayRuler dayStart={dayStart} daySpan={daySpan} />

            {BRANCH_ORDER.filter(b => grouped[b]).map((branch) => {
              const rows = grouped[branch];
              return (
                <div key={branch}>
                  <JunctionPlate branch={branch} count={rows.length} />
                  {rows.map(({ section, info, assignments: asns }, idx) => {
                    const position = getSlicePosition(rows, idx);
                    const thisOffset = revealCounter;
                    revealCounter += asns.length;
                    return (
                      <SectionRow
                        key={section}
                        sectionId={section}
                        info={info}
                        assignments={asns}
                        dayStart={dayStart}
                        daySpan={daySpan}
                        onSelect={a => setSelectedAssignment(a)}
                        selectedId={selectedAssignment?.id ?? null}
                        position={position}
                        revealOffset={thisOffset}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Sections not in known branches */}
            {Object.keys(grouped).filter(b => !BRANCH_ORDER.includes(b as BranchKey)).map(branch => {
              const rows = grouped[branch];
              return (
                <div key={branch}>
                  <JunctionPlate branch={branch} count={rows.length} />
                  {rows.map(({ section, info, assignments: asns }, idx) => {
                    const position = getSlicePosition(rows, idx);
                    const thisOffset = revealCounter;
                    revealCounter += asns.length;
                    return (
                      <SectionRow
                        key={section}
                        sectionId={section}
                        info={info}
                        assignments={asns}
                        dayStart={dayStart}
                        daySpan={daySpan}
                        onSelect={setSelectedAssignment}
                        selectedId={selectedAssignment?.id ?? null}
                        position={position}
                        revealOffset={thisOffset}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedAssignment && (
          <AssignmentDetailPanel
            assignment={selectedAssignment}
            onClose={() => setSelectedAssignment(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
