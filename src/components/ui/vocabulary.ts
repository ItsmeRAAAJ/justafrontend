// ============================================================================
//  Shared visual vocabulary — department identity and approval-signal styling.
//  Pure presentation: no data is transformed, only how it is drawn.
// ============================================================================

import type { ApprovalStatus } from '../../services/api';

/**
 * Department colour is grounded in the physical material each department owns:
 *   Engineering (P.Way) → drawing-office blue (engineering drawings, blueprints)
 *   S&T                 → verdigris (oxidised signal cable, GI cable trough)
 *   TRD                 → copper (the OHE contact wire)
 * All three sit off the red/amber/green hues so a capsule's department fill can
 * never be misread as its approval status.
 */
export interface DeptStyle {
  /** Solid hue — accent bars, legend swatches, chart series. */
  solid: string;
  /** Tinted field — capsule and badge backgrounds. */
  fill: string;
  /** Legible text on `fill`. */
  text: string;
}

const DEPT_STYLES: Record<string, DeptStyle> = {
  Engineering: {
    solid: 'var(--rs-dept-eng)',
    fill: 'var(--rs-dept-eng-fill)',
    text: 'var(--rs-dept-eng-text)',
  },
  'S&T': {
    solid: 'var(--rs-dept-snt)',
    fill: 'var(--rs-dept-snt-fill)',
    text: 'var(--rs-dept-snt-text)',
  },
  TRD: {
    solid: 'var(--rs-dept-trd)',
    fill: 'var(--rs-dept-trd-fill)',
    text: 'var(--rs-dept-trd-text)',
  },
  // Retained so the legend keeps working for deployments that label traction
  // distribution as OHE rather than TRD.
  OHE: {
    solid: 'var(--rs-dept-trd)',
    fill: 'var(--rs-dept-trd-fill)',
    text: 'var(--rs-dept-trd-text)',
  },
};

const DEPT_FALLBACK: DeptStyle = {
  solid: 'var(--rs-dept-other)',
  fill: 'var(--rs-dept-other-fill)',
  text: 'var(--rs-dept-other-text)',
};

export function deptStyle(department: string): DeptStyle {
  return DEPT_STYLES[department] ?? DEPT_FALLBACK;
}

/** Departments shown in the schedule legend, in reporting order. */
export const DEPT_LEGEND_ORDER = ['Engineering', 'S&T', 'TRD'] as const;

// ── Approval status → signal aspect ────────────────────────────────────────
//
//   pending_review → amber   (caution: authority not yet granted)
//   approved       → green   (clear to proceed)
//   rejected       → red     (stop)
//   overridden     → brass   (authority granted by written order, not by signal —
//                             the paper-authority act, so it takes the hardware
//                             accent rather than a lamp aspect)

export interface SignalStyle {
  /** Solid aspect colour. */
  color: string;
  /** Lamp core, used as the illuminated centre of an indicator. */
  core: string;
  /** Tinted field. */
  fill: string;
  /** Border colour. */
  line: string;
  /** Franking-mark class from index.css. */
  mark: string;
  label: string;
  /** Border treatment on a schedule capsule. */
  capsuleBorder: 'dashed' | 'solid' | 'double';
}

export const SIGNAL_STYLES: Record<ApprovalStatus, SignalStyle> = {
  pending_review: {
    color: 'var(--rs-amber)',
    core: 'var(--rs-amber-core)',
    fill: 'var(--rs-amber-fill)',
    line: 'var(--rs-amber-line)',
    mark: 'mark-amber',
    label: 'Pending',
    capsuleBorder: 'dashed',
  },
  approved: {
    color: 'var(--rs-green)',
    core: 'var(--rs-green-core)',
    fill: 'var(--rs-green-fill)',
    line: 'var(--rs-green-line)',
    mark: 'mark-green',
    label: 'Approved',
    capsuleBorder: 'solid',
  },
  rejected: {
    color: 'var(--rs-red)',
    core: 'var(--rs-red-core)',
    fill: 'var(--rs-red-fill)',
    line: 'var(--rs-red-line)',
    mark: 'mark-red',
    label: 'Rejected',
    capsuleBorder: 'solid',
  },
  overridden: {
    color: 'var(--rs-accent)',
    core: 'var(--rs-accent-strong)',
    fill: 'var(--rs-accent-soft)',
    line: 'var(--rs-accent-line)',
    mark: 'mark-brass',
    label: 'Overridden',
    capsuleBorder: 'double',
  },
};

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  overridden: 'Overridden',
};

// ── Priority band → signal aspect ──────────────────────────────────────────

export type Band = 'high' | 'medium' | 'low';

export const BAND_STYLES: Record<Band, { color: string; core: string; mark: string }> = {
  high: { color: 'var(--rs-red)', core: 'var(--rs-red-core)', mark: 'mark-red' },
  medium: { color: 'var(--rs-amber)', core: 'var(--rs-amber-core)', mark: 'mark-amber' },
  low: { color: 'var(--rs-green)', core: 'var(--rs-green-core)', mark: 'mark-green' },
};
