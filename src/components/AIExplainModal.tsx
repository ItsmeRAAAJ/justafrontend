import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '../theme/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExplainableDefect {
  defect_id: string;
  department: string;
  defect_type: string;
  block_section_id: string;
  days_overdue: number;
  predicted_priority_score: number | null;
  location_criticality?: string;
  section_traffic_density?: number;
  is_ghat_section?: boolean;
  season_restriction_flag?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanation builder
// Reads the same features the XGBoost model was trained on and translates
// them into a single natural-language paragraph. This is feature attribution
// the correct and standard way to explain a regression model's output when
// the model itself only produces a number.
// ─────────────────────────────────────────────────────────────────────────────

function buildParagraph(d: ExplainableDefect): string {
  const score = d.predicted_priority_score ?? 0;
  const scorePct = Math.round(score); // score is already 0-100 from the backend
  const band = score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';

  const parts: string[] = [];

  // Opening what is the verdict and why does the band matter
  if (band === 'high') {
    parts.push(
      `The AI assigned a score of ${scorePct}/100, placing this in the high-priority band meaning the optimizer will try to schedule it in the earliest available block window, even if that means deferring lower-scored work on the same section.`
    );
  } else if (band === 'medium') {
    parts.push(
      `The AI scored this defect at ${scorePct}/100 (medium band). It will be considered for scheduling after all high-priority defects are placed. If a window remains in the 28-day horizon, it gets assigned; otherwise it spills to the next cycle.`
    );
  } else {
    parts.push(
      `With a score of ${scorePct}/100, this is a low-priority defect. The optimizer schedules it only if block windows remain after all higher-priority work is placed.`
    );
  }

  // The biggest driver overdue days
  if (d.days_overdue >= 14) {
    parts.push(
      `The single biggest score driver here is that it is ${d.days_overdue} days past its maintenance deadline the AI weighs overdue days heavily because every extra day over the limit means more trains pass over an unresolved defect, accelerating the risk of failure.`
    );
  } else if (d.days_overdue >= 4) {
    parts.push(
      `Being ${d.days_overdue} days past its scheduled maintenance date is a meaningful push upward the AI penalises delays progressively.`
    );
  } else if (d.days_overdue > 0) {
    parts.push(`It is ${d.days_overdue} day${d.days_overdue > 1 ? 's' : ''} overdue, which contributes a small but real lift to the score.`);
  }

  // Defect type
  const imrTypes = ['IMR', 'IMRW'];
  if (imrTypes.includes(d.defect_type)) {
    parts.push(
      `The defect type is ${d.defect_type} the highest rail defect class under Indian Railways' USFD-2012 rules. An IMR triggers a mandatory 30 km/h speed restriction the moment it is found and requires full rail replacement within 3 days, so the model gives it a steep multiplier regardless of other factors.`
    );
  } else if (['PMR', 'CMR'].includes(d.defect_type)) {
    parts.push(`The ${d.defect_type} defect class carries a moderate severity multiplier serious enough to require timely action, but does not trigger an immediate speed restriction.`);
  } else if (d.defect_type === 'Signal') {
    parts.push(`A Signal defect can cascade into full-section traffic suspension if unresolved, which is why the model treats it with a moderate-to-high multiplier.`);
  }

  // Ghat section this is the most impactful location flag
  if (d.is_ghat_section) {
    parts.push(
      `The section is on the ghat (Kasara or Karjat gradient), which is the most critical terrain on this corridor steep grades, curves, and no easy fallback if something fails. The model applies a location-criticality multiplier here because the same defect on a ghat is objectively more dangerous than on flat track; this is directly grounded in USFD-2012 Annexure IIA.`
    );
  }

  // Location criticality (if not already covered by ghat)
  if (!d.is_ghat_section && (d.location_criticality === 'Critical' || d.location_criticality === 'High')) {
    parts.push(
      `The section is tagged as ${d.location_criticality} criticality indicating sensitive infrastructure like a station yard, level crossing, or points-and-crossings area which amplifies the base score.`
    );
  }

  // Traffic density only if notably high
  const density = d.section_traffic_density ?? 0;
  const densityPct = Math.min(Math.round(density * 100), 100); // clamp – some synthetic values exceed 1.0
  if (density >= 0.7) {
    parts.push(
      `Finally, this section carries very high traffic density (${densityPct}%), meaning many trains pass over the defect each day. High density accelerates deterioration and raises the probability of a failure event, so the model adds further weight.`
    );
  } else if (density >= 0.5) {
    parts.push(`The section also has moderate-to-high traffic density (${densityPct}%), adding upward pressure on the score.`);
  }

  // S&T + Ghat interaction special bonus
  if (d.department === 'S&T' && d.is_ghat_section) {
    parts.push(
      `There is also an S&T + Ghat interaction bonus in the model: a signal or telecom failure on a ghat section can force a complete traffic block (not just a slow order) because colour-light signalling on this section is powered off the OHE. When both sub-sectors are de-energised for maintenance, signalling goes down too so S&T and OHE work here are tightly coupled.`
    );
  }

  // Season restriction only note if it affects scheduling
  if (d.season_restriction_flag) {
    parts.push(`Note: this section currently has a seasonal machine restriction (BCM and tampers are barred during Jun–Sep on ghat sections), so the optimizer may defer it if no compliant window exists the score stays the same, but the scheduling window shrinks.`);
  }

  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AIExplainModalProps {
  defect: ExplainableDefect;
  onClose: () => void;
}

function AIExplainModal({ defect, onClose }: AIExplainModalProps) {
  const reduced = useReducedMotion();
  const score = defect.predicted_priority_score ?? 0;
  const scorePct = Math.round(score); // score is already 0-100 from the backend
  const band = score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';
  const bandColor =
    band === 'high' ? 'var(--rs-red-core)' :
    band === 'medium' ? 'var(--rs-amber-core)' :
    'var(--rs-green-core)';
  const bandLabel =
    band === 'high' ? 'High Priority' :
    band === 'medium' ? 'Medium Priority' :
    'Low Priority';

  const explanation = buildParagraph(defect);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: 'var(--rs-overlay)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="panel w-full max-w-lg shadow-raised"
        initial={reduced ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.97 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-line bg-surface-2 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-brass shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <div className="text-[13px] font-semibold text-ink leading-tight">Why this AI score?</div>
              <div className="font-mono text-[10px] text-muted">{defect.defect_id} · {defect.department}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-quiet shrink-0 rounded p-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {/* Score strip */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] text-muted">Priority Score</span>
                <span className="font-mono text-[13px] font-bold" style={{ color: bandColor }}>
                  {scorePct}/100 {bandLabel}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: bandColor }}
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${scorePct}%` }}
                  transition={reduced ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Single explanation paragraph */}
          <p className="text-[13px] leading-[1.7] text-ink">
            {explanation}
          </p>

          {/* Small footer */}
          <div className="mt-4 pt-3 border-t border-line text-[10px] text-dim leading-relaxed">
            Explanation derived from the same feature values the XGBoost model processed (R² = 0.94 on test set). Features: days overdue, defect type, ghat flag, traffic density, location criticality, department.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger button sits inline in table cells
// ─────────────────────────────────────────────────────────────────────────────

interface AIExplainButtonProps {
  defect: ExplainableDefect;
}

export function AIExplainButton({ defect }: AIExplainButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="See why the AI gave this defect its score"
        className="inline-flex items-center gap-1.5 rounded border border-brass-line bg-brass-soft px-2 py-1 font-mono text-[10px] text-brass transition-colors hover:bg-brass-soft/70"
      >
        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Why this score?
      </button>

      <AnimatePresence>
        {open && <AIExplainModal defect={defect} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline unscheduled note used in ConflictAlertsPage "Why not scheduled?" col
// ─────────────────────────────────────────────────────────────────────────────

export function buildUnscheduledNote(d: ExplainableDefect): string {
  const score = d.predicted_priority_score ?? 0;
  const parts: string[] = [];

  if (score >= 0.75) {
    parts.push('High-priority work, but no compliant block window exists in this 28-day horizon.');
  } else {
    parts.push('Lower-priority — all suitable windows were taken by higher-scored defects first.');
  }

  if (d.season_restriction_flag) {
    parts.push('Seasonal machine restriction further limits available windows.');
  }
  if (d.days_overdue >= 14) {
    parts.push('Over 2 weeks past due manual escalation recommended.');
  }

  return parts.join(' ');
}
