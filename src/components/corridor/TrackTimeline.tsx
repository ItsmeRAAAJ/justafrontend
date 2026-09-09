import type { CSSProperties } from 'react';
import { GUTTER_W } from './corridorTopology';

// ============================================================================
//  The timeline, drawn as the track it represents.
//
//  A row's lane is a length of running line: two rails at the vertical centre,
//  sleepers ticking across it every three hours, and heavier sleepers on the
//  day boundaries. Capsules sit on this bed, so a possession reads as time
//  occupied on a track rather than a bar in a chart.
//
//  The bed is pure CSS gradients sized in percentages, which means it stays
//  registered with the capsules at any span or container width, and both themes
//  get it from --rs-sleeper / --rs-rail without any branching.
// ============================================================================

/** Sleeper spacing: eight per day is one every three hours. */
const TICKS_PER_DAY = 8;

export function trackBedStyle(daySpan: number): CSSProperties {
  const minor = `calc(100% / ${Math.max(1, daySpan * TICKS_PER_DAY)})`;
  const major = `calc(100% / ${Math.max(1, daySpan)})`;
  return {
    backgroundImage: [
      `repeating-linear-gradient(90deg, var(--rs-sleeper-major) 0 1px, transparent 1px ${major})`,
      `repeating-linear-gradient(90deg, var(--rs-sleeper) 0 1px, transparent 1px ${minor})`,
    ].join(', '),
  };
}

/**
 * One row's length of track: sleepers across the full height, two running rails
 * through the middle. Sits behind the capsules, decorative only.
 */
export function TrackBed({ daySpan }: { daySpan: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0" style={trackBedStyle(daySpan)} />
      <div
        className="absolute inset-x-0"
        style={{ top: 'calc(50% - 3.5px)', height: 1.4, background: 'var(--rs-rail)' }}
      />
      <div
        className="absolute inset-x-0"
        style={{ top: 'calc(50% + 2.1px)', height: 1.4, background: 'var(--rs-rail)' }}
      />
    </div>
  );
}

// ── Day ruler ───────────────────────────────────────────────────────────────
//
//  The header of a working timetable: the horizon divided into days, each day
//  divided into six-hour marks. Sticky so it stays put while the corridor
//  scrolls beneath it.

const HOUR_MARKS = ['00', '06', '12', '18'];

export function DayRuler({ dayStart, daySpan }: { dayStart: number; daySpan: number }) {
  const days = Array.from({ length: daySpan }, (_, i) => dayStart + i);
  return (
    <div className="sticky top-0 z-20 flex border-b border-line-strong bg-surface-2">
      <div
        className="flex shrink-0 items-end border-r border-line px-3 pb-1.5 pt-2"
        style={{ width: GUTTER_W }}
      >
        <span className="caption">Block Section</span>
      </div>
      <div className="flex flex-1">
        {days.map((d) => (
          <div key={d} className="flex-1 border-r border-line-soft last:border-r-0">
            <div className="px-2 pt-1.5 text-center">
              <span className="font-display text-[12px] font-semibold uppercase leading-none tracking-[0.09em] text-ink">
                Day {d}
              </span>
            </div>
            <div className="mt-1 flex">
              {HOUR_MARKS.map((h) => (
                <div
                  key={h}
                  className="flex-1 border-l border-line-soft pb-1 pl-1 first:border-l-0 first:pl-0 first:text-left"
                >
                  <span className="font-mono text-[8px] leading-none tracking-[0.06em] text-dim">
                    {h}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
