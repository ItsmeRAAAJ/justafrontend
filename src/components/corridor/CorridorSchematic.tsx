import { memo } from 'react';
import {
  BRANCH_LABELS,
  BRANCH_ROUTE,
  GAUGE,
  GUTTER_W,
  PLATE_H,
  RAIL_X,
  ROW_H,
  STATION_CODE,
  type BranchKey,
} from './corridorTopology';

// ============================================================================
//  The corridor schematic.
//
//  The schedule is drawn against a hand-authored diagram of the actual route:
//  a trunk down from Chhatrapati Shivaji Maharaj Terminus to Kalyan Junction,
//  where the through line continues to Igatpuri via Kasara and the Karjat line
//  diverges on a turnout. Every section row owns one vertical slice of that
//  diagram, so the rail is continuous down the page without any absolute
//  positioning: slice N's rail leaves at the same x that slice N+1 picks up.
//
//  Drawn once for both themes. Rails take --rs-rail, sleepers --rs-sleeper,
//  station bodies --rs-node — which means the same geometry reads as a lit
//  relay-panel diagram in the control room and as a printed route chart on
//  paper, with no branching on the active theme.
// ============================================================================

const SVG_W = 52;

/** Sleeper ticks crossing the rails, drawn every `step` px down the slice. */
function sleepers(x: number, height: number, step = 7, major = false) {
  const half = GAUGE / 2 + 3;
  const out = [];
  for (let y = step / 2; y < height; y += step) {
    out.push(
      <line
        key={y}
        x1={x - half}
        y1={y}
        x2={x + half}
        y2={y}
        stroke={major ? 'var(--rs-sleeper-major)' : 'var(--rs-sleeper)'}
        strokeWidth="1.5"
      />,
    );
  }
  return out;
}

/** The two running rails of a straight track. */
function StraightRails({
  x,
  from,
  to,
  active,
}: {
  x: number;
  from: number;
  to: number;
  active?: boolean;
}) {
  const stroke = active ? 'var(--rs-rail-strong)' : 'var(--rs-rail)';
  return (
    <>
      <line x1={x - GAUGE / 2} y1={from} x2={x - GAUGE / 2} y2={to} stroke={stroke} strokeWidth="1.4" />
      <line x1={x + GAUGE / 2} y1={from} x2={x + GAUGE / 2} y2={to} stroke={stroke} strokeWidth="1.4" />
    </>
  );
}

/** A station: a lozenge sitting astride the running line. */
function StationNode({
  x,
  y,
  major = false,
  active = false,
}: {
  x: number;
  y: number;
  major?: boolean;
  active?: boolean;
}) {
  const r = major ? 4.2 : 2.8;
  return (
    <>
      {major && (
        <circle
          cx={x}
          cy={y}
          r={r + 2.6}
          fill="none"
          stroke="var(--rs-accent-line)"
          strokeWidth="1"
        />
      )}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="var(--rs-node)"
        stroke={active ? 'var(--rs-accent)' : 'var(--rs-node-line)'}
        strokeWidth={major ? 1.6 : 1.2}
      />
    </>
  );
}

/** Buffer stop — the physical end of the line at a terminus. */
function BufferStop({ x, y, up }: { x: number; y: number; up: boolean }) {
  const d = up ? -1 : 1;
  return (
    <>
      <line
        x1={x - GAUGE / 2 - 2.5}
        y1={y}
        x2={x + GAUGE / 2 + 2.5}
        y2={y}
        stroke="var(--rs-rail-strong)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y + d * 3.5}
        stroke="var(--rs-rail-strong)"
        strokeWidth="1.4"
      />
    </>
  );
}

/** Rising-gradient chevrons: ghat section, banker locomotive territory. */
function GhatChevrons({ x, height }: { x: number; height: number }) {
  const cx = x + GAUGE / 2 + 8;
  return (
    <g stroke="var(--rs-amber)" strokeWidth="1.2" fill="none" strokeLinecap="round">
      {[0.3, 0.55, 0.8].map((f) => (
        <path key={f} d={`M ${cx - 3} ${height * f + 3} L ${cx} ${height * f - 1} L ${cx + 3} ${height * f + 3}`} />
      ))}
    </g>
  );
}

// ── One section row's slice of the corridor ─────────────────────────────────

export type SlicePosition = 'head' | 'mid' | 'tail' | 'only';

interface RailSliceProps {
  branch: BranchKey | string;
  position: SlicePosition;
  /** From-station name, drawn as the node at the top of the slice. */
  fromStation?: string;
  /** To-station name, drawn as a terminus node when this is the last slice. */
  toStation?: string;
  ghat?: boolean;
  active?: boolean;
}

export const RailSlice = memo(function RailSlice({
  branch,
  position,
  fromStation,
  toStation,
  ghat = false,
  active = false,
}: RailSliceProps) {
  const x = RAIL_X[branch as BranchKey] ?? RAIL_X.trunk;
  const isTail = position === 'tail' || position === 'only';
  const topIsTerminus =
    (position === 'head' || position === 'only') &&
    fromStation === 'Chhatrapati Shivaji Maharaj Terminus';
  const bottomIsTerminus = isTail && !!toStation && toStation in STATION_CODE && toStation !== 'Kalyan Junction';

  return (
    <svg
      width={SVG_W}
      height={ROW_H}
      viewBox={`0 0 ${SVG_W} ${ROW_H}`}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
      className="shrink-0"
    >
      {sleepers(x, ROW_H)}
      <StraightRails x={x} from={0} to={ROW_H} active={active} />
      {ghat && <GhatChevrons x={x} height={ROW_H} />}
      {topIsTerminus ? (
        <BufferStop x={x} y={1.5} up={false} />
      ) : (
        <StationNode x={x} y={0} major={fromStation === 'Kalyan Junction'} active={active} />
      )}
      {isTail &&
        (bottomIsTerminus ? (
          <BufferStop x={x} y={ROW_H - 1.5} up />
        ) : (
          <StationNode x={x} y={ROW_H} active={active} />
        ))}
    </svg>
  );
});

// ── The junction plate that heads each route group ──────────────────────────
//
//  Trunk: the line begins at a dead-end terminus, so it opens on a buffer stop.
//  Igatpuri: the through route at Kalyan Junction — rails run straight on, with
//  the diverging Karjat stub shown leaving to the right.
//  Karjat: the turnout itself — switch blades peeling off the through line, a
//  frog at the crossing, and the diverging rails carried out to their own
//  centre-line for the rows below.

function TurnoutSVG({ branch }: { branch: BranchKey }) {
  const H = PLATE_H;
  const trunkX = RAIL_X.trunk;
  const g = GAUGE / 2;

  if (branch === 'trunk') {
    return (
      <svg width={SVG_W} height={H} viewBox={`0 0 ${SVG_W} ${H}`} style={{ overflow: 'visible' }} aria-hidden="true" className="shrink-0">
        {sleepers(trunkX, H)}
        <StraightRails x={trunkX} from={H * 0.42} to={H} />
        <BufferStop x={trunkX} y={H * 0.42} up={false} />
      </svg>
    );
  }

  if (branch === 'igatpuri_branch') {
    // Through route: rails continue, with the Karjat stub shown diverging away.
    const toe = H * 0.5;
    return (
      <svg width={SVG_W} height={H} viewBox={`0 0 ${SVG_W} ${H}`} style={{ overflow: 'visible' }} aria-hidden="true" className="shrink-0">
        {sleepers(trunkX, H)}
        <StraightRails x={trunkX} from={0} to={H} />
        {/* Diverging stub — the Karjat line leaving the junction */}
        <path
          d={`M ${trunkX + g} ${toe} C ${trunkX + g} ${toe + 8}, ${RAIL_X.karjat_branch - g} ${toe + 6}, ${RAIL_X.karjat_branch - g} ${H}`}
          fill="none"
          stroke="var(--rs-rail)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <StationNode x={trunkX} y={toe} major active={false} />
      </svg>
    );
  }

  // Karjat: the turnout proper.
  const toe = H * 0.34;
  const bx = RAIL_X.karjat_branch;
  return (
    <svg width={SVG_W} height={H} viewBox={`0 0 ${SVG_W} ${H}`} style={{ overflow: 'visible' }} aria-hidden="true" className="shrink-0">
      {sleepers(trunkX, H)}
      {/* Through line, continuing to Igatpuri, shown leaving the plate */}
      <StraightRails x={trunkX} from={0} to={toe + 6} />
      <path
        d={`M ${trunkX - g} ${toe + 6} L ${trunkX - g} ${H}`}
        stroke="var(--rs-rail)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      />
      <path
        d={`M ${trunkX + g} ${toe + 6} L ${trunkX + g} ${H}`}
        stroke="var(--rs-rail)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      />
      {/* Switch blades peeling off the through line onto the diverging route */}
      <path
        d={`M ${trunkX - g} ${toe} C ${trunkX - g} ${toe + 14}, ${bx - g} ${toe + 12}, ${bx - g} ${H}`}
        fill="none"
        stroke="var(--rs-rail-strong)"
        strokeWidth="1.5"
      />
      <path
        d={`M ${trunkX + g} ${toe} C ${trunkX + g} ${toe + 14}, ${bx + g} ${toe + 12}, ${bx + g} ${H}`}
        fill="none"
        stroke="var(--rs-rail-strong)"
        strokeWidth="1.5"
      />
      {/* Frog, where the diverging rail crosses the through rail */}
      <path
        d={`M ${trunkX + g} ${toe + 9} l 3 3 l -3 3 l -3 -3 Z`}
        fill="var(--rs-rail-strong)"
      />
      {/* Point machine — the hardware that throws the blades */}
      <rect
        x={trunkX - g - 9}
        y={toe - 2.5}
        width="5"
        height="5"
        rx="1"
        fill="var(--rs-accent-soft)"
        stroke="var(--rs-accent-line)"
        strokeWidth="1"
      />
      <StationNode x={trunkX} y={toe} major />
    </svg>
  );
}

interface JunctionPlateProps {
  branch: BranchKey | string;
  /** Number of section rows beneath this plate. */
  count: number;
}

export function JunctionPlate({ branch, count }: JunctionPlateProps) {
  const known = (['trunk', 'igatpuri_branch', 'karjat_branch'] as BranchKey[]).includes(
    branch as BranchKey,
  );
  const route = known ? BRANCH_ROUTE[branch as BranchKey] : undefined;

  return (
    <div
      className="sticky left-0 z-10 flex items-stretch border-b border-line-strong bg-surface-2"
      style={{ height: PLATE_H }}
    >
      <div className="flex shrink-0 items-stretch border-r border-line" style={{ width: GUTTER_W }}>
        {known ? (
          <TurnoutSVG branch={branch as BranchKey} />
        ) : (
          <div style={{ width: SVG_W }} />
        )}
        <div className="flex min-w-0 flex-col justify-center pr-3">
          <span className="font-display text-[13px] font-semibold uppercase leading-none tracking-[0.08em] text-brass">
            {known ? BRANCH_LABELS[branch as BranchKey] : branch}
          </span>
          {route && (
            <span className="mt-1 truncate font-mono text-[9px] uppercase leading-none tracking-[0.1em] text-dim">
              {route.head} — {route.tail}
              {route.via ? ` · ${route.via}` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 items-center px-3">
        <span className="caption">
          {count} section{count !== 1 ? 's' : ''} with work
        </span>
      </div>
    </div>
  );
}
