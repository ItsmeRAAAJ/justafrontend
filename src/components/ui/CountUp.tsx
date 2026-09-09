import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useReducedMotion } from '../../theme/ThemeContext';

// ============================================================================
//  CountUp — a headline figure winding up to its value, like a mechanical
//  counter on a control desk settling after a reading.
//
//  Animates through a MotionValue rather than React state, so no frame of the
//  count causes a re-render. Under prefers-reduced-motion the final value is
//  printed immediately.
// ============================================================================

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CountUp({
  value,
  decimals = 0,
  duration = 0.9,
  delay = 0,
  prefix = '',
  suffix = '',
  className = '',
  style,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? value : 0);
  const text = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, {
      duration,
      delay,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => controls.stop();
  }, [value, reduced, duration, delay, mv]);

  return (
    <motion.span className={className} style={style}>
      {text}
    </motion.span>
  );
}
