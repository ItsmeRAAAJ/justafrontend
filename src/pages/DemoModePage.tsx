import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { createDefect, reoptimize, getSchedule, getSections, DefectCreate, SolverResult, ScheduleAssignment, BlockSection } from '../services/api';
import { Lamp } from '../components/ui/Lamp';
import { useReducedMotion } from '../theme/ThemeContext';

// Pre-filled dramatic example: IMR-class defect on ghat section
// Section 36 = Kasara → Igatpuri (ghat section, high criticality)
const DEMO_DEFAULTS: DefectCreate = {
  defect_id: `DEMO-URGENT-${Date.now().toString().slice(-4)}`,
  department: 'Engineering',
  block_section_id: '36',
  defect_type: 'IMR',
  date_reported: new Date().toISOString().split('T')[0],
  days_overdue: 21,
  location_criticality: 'Critical',
  section_traffic_density: 0.92,
  is_ghat_section: true,
  season_restriction_flag: false,
};

type DemoStep = 'idle' | 'injecting' | 'injected' | 'solving' | 'done' | 'error';

export function DemoModePage() {
  const reduced = useReducedMotion();
  // F-5: load all block sections dynamically
  const [allSections, setAllSections] = useState<BlockSection[]>([]);
  useEffect(() => {
    getSections().then(setAllSections).catch(() => setAllSections([]));
  }, []);

interface BeforeAfterDiff {
  newDefectAssignment: ScheduleAssignment | null;
  approvedCountBefore: number;
  approvedCountAfter: number;
  newlyScheduled: string[];
  solverResult: SolverResult;
}

  const [form, setForm] = useState<DefectCreate>({ ...DEMO_DEFAULTS, defect_id: `DEMO-URGENT-${Date.now().toString().slice(-4)}` });
  const [step, setStep] = useState<DemoStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [injectedDefectId, setInjectedDefectId] = useState<string | null>(null);
  const [diff, setDiff] = useState<BeforeAfterDiff | null>(null);

  function set<K extends keyof DefectCreate>(key: K, value: DefectCreate[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function resetDemo() {
    setStep('idle');
    setError(null);
    setInjectedDefectId(null);
    setDiff(null);
    setForm({ ...DEMO_DEFAULTS, defect_id: `DEMO-URGENT-${Date.now().toString().slice(-4)}` });
  }

  async function handleInject() {
    setStep('injecting');
    setError(null);
    try {
      const created = await createDefect(form);
      setInjectedDefectId(created.defect_id);
      setStep('injected');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Injection failed');
      setStep('error');
    }
  }

  async function handleReoptimize() {
    if (!injectedDefectId) return;
    setStep('solving');
    setError(null);

    try {
      const beforeSchedule = await getSchedule();
      const approvedBefore = beforeSchedule.filter(a => a.approval_status === 'approved').length;
      const scheduledIdsBefore = new Set(beforeSchedule.map(a => a.defect_id));

      const result = await reoptimize(injectedDefectId);

      const afterSchedule = await getSchedule();
      const approvedAfter = afterSchedule.filter(a => a.approval_status === 'approved').length;
      const scheduledIdsAfter = new Set(afterSchedule.map(a => a.defect_id));

      const newlyScheduled = [...scheduledIdsAfter].filter(id => !scheduledIdsBefore.has(id));
      const newDefectAssignment = afterSchedule.find(a => a.defect_id === injectedDefectId) ?? null;

      setDiff({
        newDefectAssignment,
        approvedCountBefore: approvedBefore,
        approvedCountAfter: approvedAfter,
        newlyScheduled,
        solverResult: result,
      });
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reoptimization failed');
      setStep('error');
    }
  }

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span className={`mark ${ok ? 'mark-green' : 'mark-red'}`}>
      <Lamp color={ok ? 'var(--rs-green-core)' : 'var(--rs-red-core)'} size={5} />
      {ok ? 'PASS' : 'FAIL'}
    </span>
  );

  return (
    <div className="mx-auto max-w-4xl p-5 fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-brass-soft text-brass">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="page-title">Live What-If Scenario</h1>
          <p className="mt-1 font-mono text-[11px] text-muted">
            Inject a high-urgency defect and watch the AI reoptimize the schedule in real-time.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded border border-signal-red-line bg-signal-red-fill px-3 py-2.5 text-[13px] text-signal-red-text">
          <Lamp color="var(--rs-red-core)" size={7} />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Inject defect */}
      <motion.div
        className={`panel-pad mb-5 transition-opacity duration-300 ${step !== 'idle' && step !== 'injecting' ? 'opacity-50' : ''}`}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: step !== 'idle' && step !== 'injecting' ? 0.5 : 1, y: 0 }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[12px] font-bold text-bg ${injectedDefectId ? 'bg-signal-green-text' : 'bg-brass'}`}>
            {injectedDefectId ? '✓' : '1'}
          </div>
          <h2 className="section-title">Inject Urgent Defect</h2>
          {injectedDefectId && <span className="mark mark-green ml-auto"><Lamp color="var(--rs-green-core)" size={5} /> Injected</span>}
        </div>
        <div className="rule-double mb-4" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2">
            <label className="field-label" htmlFor="demo-defect-id">Defect ID</label>
            <input id="demo-defect-id" className="field" value={form.defect_id} onChange={e => set('defect_id', e.target.value)} disabled={!!injectedDefectId} />
          </div>
          <div className="col-span-2">
            <label className="field-label" htmlFor="demo-section">Block Section</label>
            <select
              id="demo-section"
              className="field"
              value={form.block_section_id}
              onChange={e => set('block_section_id', e.target.value)}
              disabled={!!injectedDefectId}
            >
              {allSections.length === 0
                ? <option value={form.block_section_id}>{form.block_section_id}</option>
                : allSections.map(s => (
                    <option key={s.section_id} value={s.section_id}>
                      {s.from_station} → {s.to_station} ({s.section_id})
                    </option>
                  ))
              }
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="demo-type">Defect Type</label>
            <input id="demo-type" className="field" value={form.defect_type} onChange={e => set('defect_type', e.target.value)} disabled={!!injectedDefectId} />
          </div>
          <div>
            <label className="field-label" htmlFor="demo-overdue">Days Overdue</label>
            <input id="demo-overdue" type="number" className="field" value={form.days_overdue} onChange={e => set('days_overdue', parseInt(e.target.value) || 0)} disabled={!!injectedDefectId} />
          </div>
          <div>
            <label className="field-label" htmlFor="demo-criticality">Criticality</label>
            <input id="demo-criticality" className="field" value={form.location_criticality} onChange={e => set('location_criticality', e.target.value)} disabled={!!injectedDefectId} />
          </div>
          <div>
            <label className="field-label" htmlFor="demo-density">Density</label>
            <input id="demo-density" type="number" step={0.01} className="field" value={form.section_traffic_density} onChange={e => set('section_traffic_density', parseFloat(e.target.value) || 0)} disabled={!!injectedDefectId} />
          </div>
          <div className="col-span-2 flex items-center gap-2.5 mt-2">
            <input id="demo-ghat" type="checkbox" className="check" checked={form.is_ghat_section} onChange={e => set('is_ghat_section', e.target.checked)} disabled={!!injectedDefectId} />
            <label htmlFor="demo-ghat" className="field-label mb-0 cursor-pointer">Ghat Section (Requires Banker)</label>
          </div>
          <div className="col-span-2 flex items-center gap-2.5 mt-2">
            <input id="demo-season" type="checkbox" className="check" checked={form.season_restriction_flag} onChange={e => set('season_restriction_flag', e.target.checked)} disabled={!!injectedDefectId} />
            <label htmlFor="demo-season" className="field-label mb-0 cursor-pointer">Season Restricted</label>
          </div>
        </div>

        {!injectedDefectId && (
          <div className="mt-5">
            <button
              id="btn-inject-defect"
              onClick={handleInject}
              disabled={step === 'injecting'}
              className="btn-brass"
            >
              {step === 'injecting' ? 'Injecting…' : '⚡ Inject Defect into System'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Step 2: Reoptimize */}
      {(step === 'injected' || step === 'solving' || step === 'done') && (
        <motion.div
          className={`panel-pad mb-5 transition-opacity duration-300 ${step === 'done' ? 'opacity-50' : ''}`}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: step === 'done' ? 0.5 : 1, y: 0 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[12px] font-bold text-bg ${step === 'done' ? 'bg-signal-green-text' : 'bg-brass'}`}>
              {step === 'done' ? '✓' : '2'}
            </div>
            <h2 className="section-title">Run AI Reoptimization</h2>
          </div>
          <div className="rule-double mb-4" />

          <p className="mb-4 text-[13px] leading-relaxed text-ink">
            The CP-SAT solver will now incorporate <strong className="font-mono text-brass">{injectedDefectId}</strong> into the schedule,
            keeping all previously <strong className="text-signal-green-text">approved</strong> assignments locked in place.
          </p>

          {step !== 'done' && (
            <button
              id="btn-reoptimize"
              onClick={handleReoptimize}
              disabled={step === 'solving'}
              className="btn-brass"
            >
              {step === 'solving' ? 'Solving… (CP-SAT running)' : '🚀 Reoptimize Now'}
            </button>
          )}
        </motion.div>
      )}

      {/* Step 3: Before/After results */}
      {step === 'done' && diff && (
        <motion.div
          className="space-y-5"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="panel-pad border-brass-line bg-brass-soft">
            <h3 className="section-title mb-4 text-brass">⚡ Solver Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-display text-4xl font-black text-brass">{diff.solverResult.solve_time.toFixed(2)}s</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">Solve Time</div>
              </div>
              <div>
                <div className="font-display text-4xl font-black text-signal-green-text">{diff.solverResult.status}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">Solver Status</div>
              </div>
            </div>
          </div>

          <div className="panel-pad">
            <h3 className="section-title mb-3">New Defect Outcome: <span className="font-mono text-brass">{injectedDefectId}</span></h3>
            <div className="rule-double mb-4" />
            
            {diff.newDefectAssignment ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <div className="field-label">Result</div>
                  <div className="mt-1"><span className="mark mark-green"><Lamp color="var(--rs-green-core)" size={5} /> Scheduled</span></div>
                </div>
                <div>
                  <div className="field-label">Day</div>
                  <div className="mt-1 font-mono text-[13px] font-semibold text-ink">{diff.newDefectAssignment.day}</div>
                </div>
                <div>
                  <div className="field-label">Time</div>
                  <div className="mt-1 font-mono text-[13px] font-semibold text-ink">{diff.newDefectAssignment.start_time} – {diff.newDefectAssignment.end_time}</div>
                </div>
                <div>
                  <div className="field-label">Section</div>
                  <div className="mt-1 font-mono text-[12px] text-muted">{diff.newDefectAssignment.block_section_id}</div>
                </div>
                <div>
                  <div className="field-label">Machine</div>
                  <div className="mt-1 font-mono text-[12px] text-muted">{diff.newDefectAssignment.machine_id ?? '—'}</div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-signal-amber-line bg-signal-amber-fill px-4 py-3 text-[13px] text-signal-amber-text">
                ⚠ New defect was not scheduled in this run — no compatible window available in the planning horizon.
                It has been added to the unscheduled pool and will be prioritized in the next optimization cycle.
              </div>
            )}
          </div>

          <div className="panel-pad">
            <h3 className="section-title mb-3">🔒 Approved Assignment Lock Guarantee</h3>
            <div className="rule-double mb-4" />
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-ink">{diff.approvedCountBefore}</div>
                <div className="mt-1 font-mono text-[10px] uppercase text-muted">Before</div>
              </div>
              <div className="font-display text-2xl text-dim">→</div>
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-ink">{diff.approvedCountAfter}</div>
                <div className="mt-1 font-mono text-[10px] uppercase text-muted">After</div>
              </div>
              <div className="ml-4 flex-1 border-l border-line-soft pl-6">
                <StatusBadge ok={diff.approvedCountBefore === diff.approvedCountAfter} />
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  {diff.approvedCountBefore === diff.approvedCountAfter
                    ? `All ${diff.approvedCountBefore} approved assignments are untouched. The CP-SAT solver respected every lock.`
                    : 'Approved count changed — investigate if any approved assignments were modified.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button id="btn-reset-demo" onClick={resetDemo} className="btn-quiet">
              ↺ Reset Scenario
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
