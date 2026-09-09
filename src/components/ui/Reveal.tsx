import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../theme/ThemeContext';

// ============================================================================
//  Reveal — the one entrance gesture used across the product.
//
//  A short rise and fade, indexed so a list arrives in reading order rather
//  than all at once. Deliberately small (6px, 320ms): these are dense
//  operational pages and a big entrance would slow an official down. Capped so
//  a hundred-row register never makes the last row wait.
//
//  Under prefers-reduced-motion the content is simply present.
// ============================================================================

const STEP = 0.028;
const MAX_DELAY = 0.32;

interface RevealProps {
  children: React.ReactNode;
  /** Position in a sequence. Delay is index * 28ms, capped at 320ms. */
  index?: number;
  /** Extra delay ahead of the sequence, in seconds. */
  offset?: number;
  /** Travel distance in px. Negative rises from below (default). */
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'li' | 'tr' | 'section' | 'span';
}

export function Reveal({
  children,
  index = 0,
  offset = 0,
  y = 6,
  className = '',
  style,
  as = 'div',
}: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (reduced) {
    const Plain = as as 'div';
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        delay: offset + Math.min(index * STEP, MAX_DELAY),
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      {children}
    </Tag>
  );
}

/** Delay for a given index, for callers animating their own elements in step. */
export function revealDelay(index: number, offset = 0): number {
  return offset + Math.min(index * STEP, MAX_DELAY);
}
