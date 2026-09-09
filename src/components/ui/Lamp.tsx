import React from 'react';

// ============================================================================
//  Lamp — a physical indicator lamp on a control panel.
//
//  In dark mode the halo is real: an incandescent bulb behind a coloured lens.
//  In light mode --rs-glow is 0, so the halo collapses to nothing and the same
//  component reads as a solid printed dot on a route diagram. One component,
//  two materials — no theme branching anywhere.
//
//  The halo is a separate radial-gradient layer rather than a colour-mixed
//  box-shadow, so it needs no colour-function support at all.
// ============================================================================

export interface LampProps {
  /** Aspect colour — pass a --rs-* var, e.g. `var(--rs-green-core)`. */
  color: string;
  /** Lens diameter in px. 8 is the table/list default; 10–12 for headers. */
  size?: number;
  /** Slow breathing pulse. Reserve for a single unattended alarm at a time. */
  pulse?: boolean;
  /** Unlit lamp — the lens is present but dark. */
  off?: boolean;
  className?: string;
  title?: string;
}

export function Lamp({
  color,
  size = 8,
  pulse = false,
  off = false,
  className = '',
  title,
}: LampProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden="true"
    >
      {!off && (
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: -size * 0.85,
            background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
            opacity: `calc(0.5 * var(--rs-glow))`,
          }}
        />
      )}
      <span
        className={`lamp relative ${pulse && !off ? 'animate-lamp-pulse' : ''}`}
        style={{
          width: size,
          height: size,
          background: off ? 'var(--rs-surface-3)' : color,
          border: off ? '1px solid var(--rs-line-strong)' : 'none',
        }}
      />
    </span>
  );
}

// ── LampPip ─────────────────────────────────────────────────────────────────
//  A lamp with a label beside it, as used on a relay-panel legend and in list
//  rows. The label carries the meaning and the lamp reinforces it, so colour is
//  never the sole channel.

export interface LampPipProps extends Omit<LampProps, 'className'> {
  label: React.ReactNode;
  className?: string;
  /** Tint the label to the aspect colour instead of leaving it muted. */
  tinted?: boolean;
}

export function LampPip({ label, className = '', tinted = false, ...lamp }: LampPipProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Lamp {...lamp} />
      <span
        className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.11em]"
        style={{ color: tinted ? lamp.color : 'var(--rs-text-muted)' }}
      >
        {label}
      </span>
    </span>
  );
}
