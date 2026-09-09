import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleAssignment, approveAssignment, rejectAssignment, ApprovalStatus } from '../services/api';
import { SIGNAL_STYLES } from './ui/vocabulary';
import { Lamp } from './ui/Lamp';
import { useReducedMotion } from '../theme/ThemeContext';

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  overridden: 'Overridden',
};

interface Props {
  assignment: ScheduleAssignment;
  onClose: () => void;
  onStatusChange: (id: number, status: ApprovalStatus) => void;
}

type ConfirmAction = 'approve' | 'reject' | null;

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="data mt-0.5 font-medium text-ink">{value ?? '—'}</div>
    </div>
  );
}

export function AssignmentDetailPanel({ assignment: a, onClose, onStatusChange }: Props) {
  const reduced = useReducedMotion();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sig = SIGNAL_STYLES[a.approval_status];

  async function executeAction(action: 'approve' | 'reject') {
    setLoading(true);
    setError(null);
    const newStatus: ApprovalStatus = action === 'approve' ? 'approved' : 'rejected';
    onStatusChange(a.id, newStatus);
    setConfirmAction(null);
    try {
      const updated = action === 'approve'
        ? await approveAssignment(a.id)
        : await rejectAssignment(a.id);
      onStatusChange(a.id, updated.approval_status);
    } catch (err: unknown) {
      onStatusChange(a.id, a.approval_status);
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  const d = a.defect;
  const s = a.section;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-30"
        style={{ background: 'var(--rs-overlay)' }}
        onClick={onClose}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Panel */}
      <motion.aside
        className="fixed bottom-0 right-0 top-0 z-40 flex w-[380px] flex-col overflow-y-auto border-l border-line bg-bg-alt shadow-raised"
        initial={reduced ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-2 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-mono text-[15px] font-semibold text-ink">{a.defect_id}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <Lamp color={sig.core} size={7} />
              <span className={`mark ${sig.mark}`}>{APPROVAL_LABEL[a.approval_status]}</span>
            </div>
          </div>
          <button
            id="panel-close"
            onClick={onClose}
            aria-label="Close panel"
            className="btn-quiet rounded p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded border border-signal-red-line bg-signal-red-fill px-3 py-2.5 text-[13px] leading-snug text-signal-red-text">
            <Lamp color="var(--rs-red-core)" size={7} />
            <span>{error}</span>
          </div>
        )}

        {/* Schedule info */}
        <div className="border-b border-line px-5 py-4">
          <h3 className="section-title mb-3">Schedule Details</h3>
          <div className="rule-double mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Day" value={String(a.day)} />
            <InfoRow label="Start Time" value={a.start_time} />
            <InfoRow label="End Time" value={a.end_time} />
            <InfoRow label="Machine" value={a.machine_id ?? '—'} />
            <InfoRow label="Block Section" value={a.block_section_id} />
            <InfoRow label="Department" value={a.department} />
          </div>
          {d && (
            <div className="mt-3 flex items-center gap-2">
              <span className="field-label">Priority Score</span>
              <span className="font-mono text-[13px] font-semibold text-brass">
                {a.predicted_priority_score?.toFixed(3) ?? '—'}
              </span>
            </div>
          )}
        </div>

        {/* Defect info */}
        {d && (
          <div className="border-b border-line px-5 py-4">
            <h3 className="section-title mb-3">Defect Info</h3>
            <div className="rule-double mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Defect Type" value={d.defect_type} />
              <InfoRow label="Days Overdue" value={`${d.days_overdue}d`} />
              <InfoRow label="Criticality" value={d.location_criticality} />
              <InfoRow label="Traffic Density" value={d.section_traffic_density?.toFixed(2)} />
              <InfoRow label="Ghat Section" value={d.is_ghat_section ? '✓ Yes' : 'No'} />
              <InfoRow label="Season Flag" value={d.season_restriction_flag ? '⚠ Yes' : 'No'} />
              <div className="col-span-2">
                <InfoRow label="Date Reported" value={d.date_reported} />
              </div>
            </div>
          </div>
        )}

        {/* Section info */}
        {s && (
          <div className="border-b border-line px-5 py-4">
            <h3 className="section-title mb-3">Block Section</h3>
            <div className="rule-double mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <InfoRow label="Route" value={`${s.from_station} → ${s.to_station}`} />
              </div>
              <InfoRow label="Branch" value={s.branch} />
              <InfoRow label="Category" value={s.line_category} />
              <InfoRow label="Electrified" value={s.electrified ? '✓ Yes' : 'No'} />
              <InfoRow label="Ghat Section" value={s.is_ghat_section ? '✓ Yes' : 'No'} />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {a.approval_status === 'pending_review' && (
          <div className="px-5 py-4">
            <p className="mb-3 font-mono text-[10px] uppercase leading-none tracking-[0.12em] text-muted">
              Operational Decision
            </p>
            <div className="flex gap-3">
              <button
                id="btn-approve"
                onClick={() => setConfirmAction('approve')}
                disabled={loading}
                className="btn-lamp-green flex-1 justify-center"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </button>
              <button
                id="btn-reject"
                onClick={() => setConfirmAction('reject')}
                disabled={loading}
                className="btn-lamp-red flex-1 justify-center"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          </div>
        )}

        {(a.approval_status === 'approved' || a.approval_status === 'rejected') && (
          <div className="px-5 py-4">
            <div
              className={`flex items-center gap-2 rounded border px-3 py-2.5 text-[13px] ${
                a.approval_status === 'approved'
                  ? 'border-signal-green-line bg-signal-green-fill text-signal-green-text'
                  : 'border-signal-red-line bg-signal-red-fill text-signal-red-text'
              }`}
            >
              <Lamp color={a.approval_status === 'approved' ? 'var(--rs-green-core)' : 'var(--rs-red-core)'} size={8} />
              This assignment has been {a.approval_status}.
            </div>
          </div>
        )}
      </motion.aside>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--rs-overlay)' }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="panel w-full max-w-sm"
              initial={reduced ? false : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 30 }}
            >
              <div className="border-b border-line bg-surface-2 px-5 py-4">
                <h3 className="section-title">
                  {confirmAction === 'approve' ? 'Approve Assignment?' : 'Reject Assignment?'}
                </h3>
              </div>
              <div className="p-5">
                <p className="text-[13px] leading-relaxed text-ink">
                  {confirmAction === 'approve'
                    ? `You are approving schedule assignment for ${a.defect_id}. This will lock it during any future reoptimization runs.`
                    : `You are rejecting schedule assignment for ${a.defect_id}. The work order will need to be rescheduled.`}
                </p>
                <p className="mt-3 rounded border border-signal-amber-line bg-signal-amber-fill px-3 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.09em] text-signal-amber-text">
                  This is an operational decision affecting track maintenance safety. Please confirm.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    id="confirm-cancel"
                    onClick={() => setConfirmAction(null)}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    id={`confirm-${confirmAction}`}
                    onClick={() => executeAction(confirmAction)}
                    disabled={loading}
                    className={`flex-1 justify-center ${confirmAction === 'approve' ? 'btn-lamp-green' : 'btn-lamp-red'}`}
                  >
                    {loading ? 'Processing…' : confirmAction === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
