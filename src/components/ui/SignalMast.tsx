import { motion } from 'motion/react';
import { useReducedMotion } from '../../theme/ThemeContext';

// ============================================================================
//  SignalMast — a multiple-aspect colour light signal.
//
//  Aspects run top-to-bottom green / yellow / red, as on the Central Railway
//  main line. Exactly one lens is lit; the other two are dark glass. This is the
//  product's single strongest confirmation gesture, so it is used once per page
//  at most — the Lock Guarantee verdict, and nowhere else.
// ============================================================================

export type Aspect = 'green' | 'amber' | 'red' | 'off';

const LENSES: { key: Exclude<Aspect, 'off'>; core: string; label: string }[] = [
  { key: 'green', core: 'var(--rs-green-core)', label: 'Clear' },
  { key: 'amber', core: 'var(--rs-amber-core)', label: 'Caution' },
  { key: 'red', core: 'var(--rs-red-core)', label: 'Stop' },
];

interface SignalMastProps {
  aspect: Aspect;
  /** Lens diameter. The head and mast scale from this. */
  size?: number;
  className?: string;
}

export function SignalMast({ aspect, size = 15, className = '' }: SignalMastProps) {
  const reduced = useReducedMotion();
  const gap = Math.round(size * 0.42);
  const padX = Math.round(size * 0.38);
  const headW = size + padX * 2;
  const headH = size * 3 + gap * 2 + padX * 2;

  return (
    <span
      className={`inline-flex flex-col items-center ${className}`}
      role="img"
      aria-label={
        aspect === 'off' ? 'Signal off' : `Signal at ${LENSES.find((l) => l.key === aspect)?.label}`
      }
    >
      {/* Signal head — a cast housing with a hooded lens stack */}
      <span
        className="flex flex-col items-center rounded-[3px] border"
        style={{
          width: headW,
          height: headH,
          gap,
          padding: padX,
          background: 'var(--rs-surface-3)',
          borderColor: 'var(--rs-line-strong)',
          boxShadow: 'var(--rs-inset)',
        }}
      >
        {LENSES.map((lens) => {
          const lit = aspect === lens.key;
          return (
            <span
              key={lens.key}
              className="relative flex items-center justify-center"
              style={{ width: size, height: size }}
            >
              {/* Halo — present only in the control room (--rs-glow) */}
              {lit && (
                <motion.span
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    inset: -size * 0.8,
                    background: `radial-gradient(circle, ${lens.core} 0%, transparent 66%)`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.85, 0.55] }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }
                  }
                />
              )}
              {/* Lens */}
              <motion.span
                className="relative rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: lit ? lens.core : 'var(--rs-surface-2)',
                  border: `1px solid ${lit ? lens.core : 'var(--rs-line)'}`,
                }}
                initial={false}
                animate={lit && !reduced ? { scale: [0.82, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </span>
          );
        })}
      </span>
      {/* Mast */}
      <span
        style={{
          width: 2,
          height: size * 1.5,
          background: 'var(--rs-line-strong)',
        }}
      />
      {/* Base plate */}
      <span
        style={{
          width: size * 1.1,
          height: 3,
          background: 'var(--rs-line-strong)',
          borderRadius: 1,
        }}
      />
    </span>
  );
}
