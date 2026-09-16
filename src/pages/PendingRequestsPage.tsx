import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getDefects, createDefect, getSections, Defect, DefectCreate, BlockSection } from '../services/api';
import { Lamp } from '../components/ui/Lamp';
import { PriorityGauge } from '../components/ui/PriorityGauge';
import { Reveal } from '../components/ui/Reveal';
import { useReducedMotion } from '../theme/ThemeContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function priorityBand(score: number | null): 'high' | 'medium' | 'low' {
  if (score === null) return 'low';
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function buildExplanation(d: Defect): string {
  const parts: string[] = [];
  const band = priorityBand(d.predicted_priority_score);
  parts.push(`${band.charAt(0).toUpperCase() + band.slice(1)} priority`);
  if (d.defect_type) parts.push(`${d.defect_type}-class`);
  if (d.days_overdue > 0) parts.push(`${d.days_overdue} days overdue`);
  if (d.is_ghat_section) parts.push('ghat section');
  if (d.location_criticality === 'High' || d.location_criticality === 'Critical')
    parts.push(`${d.location_criticality.toLowerCase()} criticality`);
  if (d.season_restriction_flag) parts.push('season-restricted');
  return parts.join(', ');
}

type SortKey = 'predicted_priority_score' | 'days_overdue' | 'department' | 'defect_type';
type SortDir = 'asc' | 'desc';

// ── Priority Badge ────────────────────────────────────────────────────────────

function PriorityBadge({ score }: { score: number | null }) {
  const band = priorityBand(score);
  const markClass = band === 'high' ? 'mark-red' : band === 'medium' ? 'mark-amber' : 'mark-green';
  const core =
    band === 'high' ? 'var(--rs-red-core)' :
    band === 'medium' ? 'var(--rs-amber-core)' :
    'var(--rs-green-core)';
  const label = band.charAt(0).toUpperCase() + band.slice(1);
  return (
    <span className={`mark ${markClass}`}>
      <Lamp color={core} size={5} />
      {label} {score !== null ? `(${score.toFixed(2)})` : '—'}
    </span>
  );
}

// ── Department Badge ──────────────────────────────────────────────────────────

function DeptBadge({ dept }: { dept: string }) {
  const cls =
    dept === 'Engineering' ? 'border-[var(--rs-dept-eng-fill)] bg-[var(--rs-dept-eng-fill)] text-[var(--rs-dept-eng)]' :
    dept === 'S&T' ? 'border-[var(--rs-dept-snt-fill)] bg-[var(--rs-dept-snt-fill)] text-[var(--rs-dept-snt)]' :
    'border-[var(--rs-dept-trd-fill)] bg-[var(--rs-dept-trd-fill)] text-[var(--rs-dept-trd)]';
  return (
    <span className={`mark ${cls}`}>{dept}</span>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="ml-1 text-dim opacity-40">↕</span>;
  return <span className="ml-1 text-brass">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

// ── Add Defect Modal ──────────────────────────────────────────────────────────

const DEPARTMENTS = ['Engineering', 'S&T', 'OHE'];
const DEFECT_TYPES = ['IMR', 'PMR', 'CMR', 'Signal', 'Track', 'OHE'];
const CRITICALITIES = ['Low', 'Medium', 'High', 'Critical'];

// F-1: useSections hook — fetches all block sections from the API once
function useSections(): { sections: BlockSection[]; loading: boolean } {
  const [sections, setSections] = useState<BlockSection[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getSections()
      .then(setSections)
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);
  return { sections, loading };
}

function AddDefectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (d: Defect) => void }) {
  const reduced = useReducedMotion();
  const { sections: allSections, loading: sectionsLoading } = useSections();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<DefectCreate>({
    defect_id: `DEF-${Date.now().toString().slice(-6)}`,
    department: 'Engineering',
    block_section_id: 'KYN_THAL',
    defect_type: 'IMR',
    date_reported: today,
    days_overdue: 5,
    location_criticality: 'High',
    section_traffic_density: 0.75,
    is_ghat_section: false,
    season_restriction_flag: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof DefectCreate>(key: K, value: DefectCreate[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const created = await createDefect(form);
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create defect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--rs-overlay)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="panel w-full max-w-lg overflow-y-auto shadow-raised"
        style={{ maxHeight: '90vh' }}
        initial={reduced ? false : { opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-4">
          <h2 className="section-title">Add New Defect</h2>
          <button id="modal-close" onClick={onClose} className="btn-quiet rounded p-1">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded border border-signal-red-line bg-signal-red-fill px-3 py-2.5 text-[13px] text-signal-red-text">
              <Lamp color="var(--rs-red-core)" size={7} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="field-label" htmlFor="new-defect-id">Defect ID</label>
              <input id="new-defect-id" className="field" value={form.defect_id}
                onChange={e => set('defect_id', e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="new-dept">Department</label>
              <select id="new-dept" className="field" value={form.department}
                onChange={e => set('department', e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="new-type">Defect Type</label>
              <select id="new-type" className="field" value={form.defect_type}
                onChange={e => set('defect_type', e.target.value)}>
                {DEFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="new-section">Block Section</label>
              <select id="new-section" className="field" value={form.block_section_id}
                onChange={e => set('block_section_id', e.target.value)}>
                {sectionsLoading
                  ? <option>Loading sections…</option>
                  : allSections.map(s => (
                      <option key={s.section_id} value={s.section_id}>
                        {s.from_station} → {s.to_station} ({s.section_id})
                      </option>
                    ))
                }
              </select>
            </div>
            <div>
              <label className="field-label">Date Reported</label>
              <input type="date" className="field" value={form.date_reported}
                onChange={e => set('date_reported', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Days Overdue</label>
              <input type="number" className="field" min={0} value={form.days_overdue}
                onChange={e => set('days_overdue', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="field-label">Location Criticality</label>
              <select className="field" value={form.location_criticality}
                onChange={e => set('location_criticality', e.target.value)}>
                {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Traffic Density (0–1)</label>
              <input type="number" className="field" step={0.01} min={0} max={1}
                value={form.section_traffic_density}
                onChange={e => set('section_traffic_density', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-2.5">
              <input type="checkbox" id="ghat" className="check" checked={form.is_ghat_section}
                onChange={e => set('is_ghat_section', e.target.checked)} />
              <label htmlFor="ghat" className="field-label mb-0 cursor-pointer">Ghat Section</label>
            </div>
            <div className="flex items-center gap-2.5">
              <input type="checkbox" id="season" className="check" checked={form.season_restriction_flag}
                onChange={e => set('season_restriction_flag', e.target.checked)} />
              <label htmlFor="season" className="field-label mb-0 cursor-pointer">Season Restricted</label>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button id="submit-defect" type="submit" disabled={loading} className="btn-brass flex-1 justify-center">
                {loading ? 'Creating…' : 'Create Defect'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PendingRequestsPage() {
  const reduced = useReducedMotion();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDept, setFilterDept] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterMinDays, setFilterMinDays] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [sortKey, setSortKey] = useState<SortKey>('predicted_priority_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showAdd, setShowAdd] = useState(false);

  const fetchDefects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDefects({
        department: filterDept || undefined,
        block_section_id: filterSection || undefined,
        min_days_overdue: filterMinDays ? parseInt(filterMinDays) : undefined,
        search: debouncedSearch || undefined,
      });
      setDefects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load defects');
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterSection, filterMinDays, debouncedSearch]);

  useEffect(() => { fetchDefects(); }, [fetchDefects]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...defects]
    .sort((a, b) => {
      let va: string | number = a[sortKey] ?? 0;
      let vb: string | number = b[sortKey] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  function handleDefectCreated(d: Defect) {
    setDefects(prev => [d, ...prev]);
  }

  const { sections: allSections } = useSections();
  const sectionIds = allSections.map(s => s.section_id);
  const highCount = sorted.filter(d => priorityBand(d.predicted_priority_score) === 'high').length;

  return (
    <div className="flex flex-col p-5 gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Pending Requests</h1>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {defects.length} defect{defects.length !== 1 ? 's' : ''} in pool · sorted by AI priority score
          </p>
        </div>
        <button id="btn-add-defect" onClick={() => setShowAdd(true)} className="btn-brass shrink-0">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Defect
        </button>
      </div>

      {/* Filter panel */}
      <div className="panel-pad">
        <div className="section-title mb-3">Filters</div>
        <div className="rule-double mb-4" />
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-36">
            <label className="field-label" htmlFor="filter-dept">Department</label>
            <select id="filter-dept" className="field" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="min-w-40">
            <label className="field-label" htmlFor="filter-section">Block Section</label>
            <select id="filter-section" className="field" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
              <option value="">All Sections</option>
          {sectionIds.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-36">
            <label className="field-label" htmlFor="filter-days">Min Days Overdue</label>
            <input
              id="filter-days" type="number" className="field" min={0} placeholder="0"
              value={filterMinDays} onChange={e => setFilterMinDays(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button id="btn-apply-filter" onClick={fetchDefects} className="btn-brass">Apply</button>
            <button
              id="btn-clear-filter"
              onClick={() => { setFilterDept(''); setFilterSection(''); setFilterMinDays(''); }}
              className="btn-quiet"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded border border-signal-red-line bg-signal-red-fill px-3 py-2.5 text-[13px] text-signal-red-text">
          <Lamp color="var(--rs-red-core)" size={7} />
          <span>{error}</span>
        </div>
      )}

      {/* Defect ID Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            id="search-defect-id"
            type="text"
            className="field pl-8 pr-8"
            placeholder="Search by Defect ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery.trim() !== '' && (
          <span className="font-mono text-[11px] text-muted">
            {sorted.length} match{sorted.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="rs-thead">
              <tr>
                <th className="rs-th">Defect ID</th>
                <th className="rs-th-sort cursor-pointer" onClick={() => handleSort('department')}>
                  Department <SortIcon col="department" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="rs-th-sort cursor-pointer" onClick={() => handleSort('defect_type')}>
                  Type <SortIcon col="defect_type" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="rs-th">Block Section</th>
                <th className="rs-th-sort cursor-pointer" onClick={() => handleSort('days_overdue')}>
                  Days Overdue <SortIcon col="days_overdue" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="rs-th-sort cursor-pointer" onClick={() => handleSort('predicted_priority_score')}>
                  Priority <SortIcon col="predicted_priority_score" sortKey={sortKey} sortDir={sortDir} />
                </th>
                <th className="rs-th">AI Explanation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="rs-td py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brass" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading defects…
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="rs-td py-12 text-center text-muted">
                    No defects found. Adjust filters or add a new defect.
                  </td>
                </tr>
              ) : (
                sorted.map((d, idx) => (
                  <motion.tr
                    key={d.defect_id}
                    className="rs-row"
                    initial={reduced ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reduced ? { duration: 0 } : {
                      duration: 0.25,
                      delay: Math.min(idx * 0.015, 0.3),
                    }}
                  >
                    {/* Left-edge accent bar by department */}
                    <td className="rs-td font-mono text-[12px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-5 w-[3px] shrink-0 rounded-full"
                          style={{
                            background:
                              d.department === 'Engineering' ? 'var(--rs-dept-eng)' :
                              d.department === 'S&T' ? 'var(--rs-dept-snt)' :
                              'var(--rs-dept-trd)',
                          }}
                        />
                        <span className="text-brass">{d.defect_id}</span>
                      </div>
                    </td>
                    <td className="rs-td">
                      <DeptBadge dept={d.department} />
                    </td>
                    <td className="rs-td text-ink">{d.defect_type}</td>
                    <td className="rs-td font-mono text-[11px] text-muted">{d.block_section_id}</td>
                    <td className="rs-td">
                      <span className={`font-semibold ${
                        d.days_overdue > 14 ? 'text-signal-red-text' :
                        d.days_overdue > 7 ? 'text-signal-amber-text' :
                        'text-ink'
                      }`}>
                        {d.days_overdue}d
                      </span>
                    </td>
                    <td className="rs-td">
                      <PriorityBadge score={d.predicted_priority_score} />
                    </td>
                    <td className="rs-td max-w-xs">
                      <span className="font-mono text-[10px] italic text-muted">{buildExplanation(d)}</span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && sorted.length > 0 && (
          <div className="border-t border-line-soft px-4 py-2 font-mono text-[10px] text-muted">
            {sorted.length} result{sorted.length !== 1 ? 's' : ''}
            {highCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-signal-red-text">
                <Lamp color="var(--rs-red-core)" size={5} />
                {highCount} high-priority
              </span>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddDefectModal onClose={() => setShowAdd(false)} onCreated={handleDefectCreated} />
        )}
      </AnimatePresence>
    </div>
  );
}
