import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { getAnalytics, getDefects, getSchedule, AnalyticsData, Defect, ScheduleAssignment } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useReducedMotion } from '../theme/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['Engineering', 'S&T', 'OHE'];

function deptColor(dept: string, alpha = 0.7): string {
  // Use CSS variables manually parsed for Chart.js
  switch (dept) {
    case 'Engineering': return `rgba(131, 197, 190, ${alpha})`; // approx rs-dept-eng
    case 'S&T':         return `rgba(233, 196, 106, ${alpha})`; // approx rs-dept-snt
    case 'OHE':         return `rgba(244, 162, 97, ${alpha})`; // approx rs-dept-trd
    default:            return `rgba(168, 168, 168, ${alpha})`;
  }
}

function StatCard({ label, value, sub, accent, index = 0 }: { label: string; value: string; sub?: string; accent?: string; index?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="panel-pad flex flex-col justify-between"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.3, delay: index * 0.05 }}
    >
      <div>
        <div className={`font-display text-4xl font-bold ${accent ?? 'text-ink'}`}>{value}</div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-dim">{label}</div>
      </div>
      {sub && <div className="mt-3 border-t border-line-soft pt-2 text-[12px] leading-tight text-muted">{sub}</div>}
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const reduced = useReducedMotion();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [a, d, s] = await Promise.all([getAnalytics(), getDefects(), getSchedule()]);
        setAnalytics(a);
        setDefects(d);
        setAssignments(s);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Department breakdown — computed client-side
  const deptBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; scheduled: number }> = {};
    for (const dept of DEPARTMENTS) counts[dept] = { total: 0, scheduled: 0 };
    for (const d of defects) {
      if (counts[d.department]) counts[d.department].total++;
      else counts[d.department] = { total: 1, scheduled: 0 };
    }
    for (const a of assignments) {
      if (counts[a.department]) counts[a.department].scheduled++;
      else counts[a.department] = { total: 0, scheduled: 1 };
    }
    return counts;
  }, [defects, assignments]);

  // Total scheduled work hours by department
  const deptHours = useMemo(() => {
    const hours: Record<string, number> = {};
    for (const a of assignments) {
      if (!a.start_time || !a.end_time) continue;
      const [sh, sm] = a.start_time.split(':').map(Number);
      const [eh, em] = a.end_time.split(':').map(Number);
      const dur = (eh + em / 60) - (sh + sm / 60);
      hours[a.department] = (hours[a.department] ?? 0) + dur;
    }
    return hours;
  }, [assignments]);

  // Top-quartile priority coverage
  const topQuartileAnalysis = useMemo(() => {
    if (defects.length === 0) return null;
    const sorted = [...defects].sort((a, b) => (b.predicted_priority_score ?? 0) - (a.predicted_priority_score ?? 0));
    const q1Count = Math.ceil(sorted.length * 0.25);
    const topQ = sorted.slice(0, q1Count);
    const scheduledIds = new Set(assignments.map(a => a.defect_id));
    const scheduledFromTopQ = topQ.filter(d => scheduledIds.has(d.defect_id)).length;
    const pct = q1Count > 0 ? Math.round((scheduledFromTopQ / q1Count) * 100) : 0;
    return { q1Count, scheduledFromTopQ, pct };
  }, [defects, assignments]);

  // Chart data
  const depts = Object.keys(deptBreakdown);

  // We read the current theme from the HTML tag to style Chart.js text
  const isDark = document.documentElement.dataset.theme === 'dark';
  const textColor = isDark ? '#8ca3be' : '#617489';
  const gridColor = isDark ? '#2a2f36' : '#e0e5eb';

  const barData = {
    labels: depts,
    datasets: [
      {
        label: 'Total Defects',
        data: depts.map(d => deptBreakdown[d].total),
        backgroundColor: depts.map(d => deptColor(d, 0.4)),
        borderColor: depts.map(d => deptColor(d, 1)),
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Scheduled',
        data: depts.map(d => deptBreakdown[d].scheduled),
        backgroundColor: depts.map(d => deptColor(d, 0.9)),
        borderColor: depts.map(d => deptColor(d, 1)),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, font: { family: 'IBM Plex Mono', size: 10 } } },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: textColor, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: gridColor } },
      y: { ticks: { color: textColor, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: gridColor } },
    },
  };

  const pieData = {
    labels: depts,
    datasets: [{
      data: depts.map(d => deptBreakdown[d].scheduled),
      backgroundColor: depts.map(d => deptColor(d, 0.8)),
      borderColor: isDark ? '#141210' : '#e9ecf0',
      borderWidth: 2,
    }],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: textColor, font: { family: 'IBM Plex Mono', size: 10 }, padding: 16 } },
    },
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted">
        <svg className="h-5 w-5 animate-spin text-brass" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="mt-1 font-mono text-[11px] text-muted">AI scheduling performance vs. the unscheduled baseline</p>
      </div>

      {error && (
        <div className="rounded border border-signal-red-line bg-signal-red-fill px-4 py-3 text-[13px] text-signal-red-text">
          {error}
        </div>
      )}

      {analytics && (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              index={0}
              label="% Scheduled"
              value={`${analytics.pct_scheduled.toFixed(1)}%`}
              sub={`${analytics.total_defects_scheduled} of ${analytics.total_defects_in_pool}`}
              accent={analytics.pct_scheduled > 70 ? 'text-signal-green-text' : analytics.pct_scheduled > 40 ? 'text-signal-amber-text' : 'text-signal-red-text'}
            />
            <StatCard index={1} label="Scheduled" value={String(analytics.total_defects_scheduled)} sub="assignments confirmed" />
            <StatCard index={2} label="Unscheduled" value={String(analytics.total_defects_unscheduled)} sub="in holding queue" />
            <StatCard
              index={3}
              label="Avg Score (Sched)"
              value={analytics.avg_score_scheduled.toFixed(3)}
              sub="AI priority score"
              accent="text-brass"
            />
            <StatCard
              index={4}
              label="Avg Score (Unsc)"
              value={analytics.avg_score_unscheduled.toFixed(3)}
              sub="AI priority score"
            />
            <StatCard
              index={5}
              label="AI Uplift"
              value={`+${((analytics.avg_score_scheduled - analytics.avg_score_unscheduled)).toFixed(3)}`}
              sub="scheduled vs. unscheduled"
              accent={analytics.avg_score_scheduled > analytics.avg_score_unscheduled ? 'text-signal-green-text' : 'text-signal-red-text'}
            />
          </div>

          {/* Top-quartile callout */}
          {topQuartileAnalysis && (
            <motion.div
              className="panel-pad border-brass-line bg-brass-soft"
              initial={reduced ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.4, delay: 0.2 }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="font-display text-5xl font-black text-brass">{topQuartileAnalysis.pct}%</div>
                <div>
                  <div className="section-title">Top-Quartile Priority Coverage</div>
                  <div className="mt-2 text-[13px] leading-relaxed text-ink">
                    {topQuartileAnalysis.scheduledFromTopQ} of {topQuartileAnalysis.q1Count} highest-priority defects are scheduled in this run.
                    Under ad-hoc manual scheduling, these would have competed for windows without systematic prioritization.
                    The AI scheduled <strong className="font-semibold text-brass">{topQuartileAnalysis.pct}%</strong> of the top-quartile pool.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Work hours by dept */}
          {Object.keys(deptHours).length > 0 && (
            <div className="panel-pad">
              <h2 className="section-title mb-4">Scheduled Work Hours by Department</h2>
              <div className="flex flex-wrap gap-6">
                {Object.entries(deptHours).map(([dept, hrs]) => (
                  <div key={dept} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          dept === 'Engineering' ? 'var(--rs-dept-eng-fill)' :
                          dept === 'S&T' ? 'var(--rs-dept-snt-fill)' :
                          'var(--rs-dept-trd-fill)'
                      }}
                    />
                    <span className="font-mono text-[13px] font-semibold text-ink">{dept}</span>
                    <span className="font-mono text-[13px] text-muted">{hrs.toFixed(1)} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="panel-pad lg:col-span-2">
              <h2 className="section-title mb-4">Defects by Department — Total vs. Scheduled</h2>
              <div className="rule-double mb-4" />
              <div style={{ height: '240px' }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
            <div className="panel-pad">
              <h2 className="section-title mb-4">Scheduled — Dept Mix</h2>
              <div className="rule-double mb-4" />
              <div style={{ height: '240px' }}>
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
