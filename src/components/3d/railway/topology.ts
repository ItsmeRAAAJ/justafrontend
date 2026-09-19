// ============================================================================
//  Mumbai Division — schematic topology for the login scene.
//
//  World units are abstract (1 unit ≈ 6–8 km). The layout is a *schematic*,
//  not a map: CSMT sits far west, the trunk runs east to Kalyan Jn (KYN), and
//  the Y-junction fans out to Igatpuri (IGP, north-east ghat) and Karjat
//  (KJT, south-east ghat). Y is up; the network lies on the XZ plane.
// ============================================================================

import * as THREE from 'three';

export type BranchId = 'IGP' | 'KJT';

export interface StationNode {
  code: string;
  name: string;
  pos: [number, number, number];
  /** Junction / terminal nodes are drawn larger and always labelled. */
  major?: boolean;
}

/** CSMT → KYN (shared trunk). */
export const TRUNK: StationNode[] = [
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj T.', pos: [-10.5, 0, 1.2], major: true },
  { code: 'DR',   name: 'Dadar',                          pos: [-8.2, 0, 0.6] },
  { code: 'CLA',  name: 'Kurla',                          pos: [-6.0, 0, 0.1] },
  { code: 'TNA',  name: 'Thane',                          pos: [-3.4, 0, -0.3] },
  { code: 'DI',   name: 'Dombivli',                       pos: [-1.2, 0, -0.1] },
  { code: 'KYN',  name: 'Kalyan Jn',                      pos: [0.6, 0, 0], major: true },
];

/** KYN → IGP (north-east, up the Thal ghat). */
export const BRANCH_IGP: StationNode[] = [
  { code: 'TLA',  name: 'Titwala',  pos: [2.6, 0, -1.4] },
  { code: 'ASO',  name: 'Asangaon', pos: [4.8, 0, -2.6] },
  { code: 'KSRA', name: 'Kasara',   pos: [7.0, 0.35, -3.6] },
  { code: 'IGP',  name: 'Igatpuri', pos: [9.6, 0.9, -4.4], major: true },
];

/** KYN → KJT (south-east, towards the Bhor ghat). */
export const BRANCH_KJT: StationNode[] = [
  { code: 'ABH',  name: 'Ambernath', pos: [2.6, 0, 1.4] },
  { code: 'BUD',  name: 'Badlapur',  pos: [4.8, 0, 2.5] },
  { code: 'NRL',  name: 'Neral',     pos: [7.0, 0.2, 3.5] },
  { code: 'KJT',  name: 'Karjat',    pos: [9.6, 0.5, 4.3], major: true },
];

export const ALL_STATIONS: StationNode[] = [...TRUNK, ...BRANCH_IGP, ...BRANCH_KJT];

/** The junction the camera orbits. */
export const JUNCTION = new THREE.Vector3(...TRUNK[TRUNK.length - 1].pos);

function toCurve(nodes: StationNode[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    nodes.map((n) => new THREE.Vector3(...n.pos)),
    false,
    'centripetal',
    0.35,
  );
}

/**
 * Full routes from CSMT to each terminal. Each route shares the trunk points,
 * so the two curves overlap (to within a hair) between CSMT and KYN, which is
 * exactly what a train needs: it follows one continuous curve end to end.
 */
export const ROUTES: Record<BranchId, THREE.CatmullRomCurve3> = {
  IGP: toCurve([...TRUNK, ...BRANCH_IGP]),
  KJT: toCurve([...TRUNK, ...BRANCH_KJT]),
};

/** Curves used for *drawing* track — trunk once, then each branch from KYN. */
export const TRACK_SEGMENTS: { id: string; curve: THREE.CatmullRomCurve3 }[] = [
  { id: 'trunk', curve: toCurve(TRUNK) },
  { id: 'igp',   curve: toCurve([TRUNK[TRUNK.length - 2], TRUNK[TRUNK.length - 1], ...BRANCH_IGP]) },
  { id: 'kjt',   curve: toCurve([TRUNK[TRUNK.length - 2], TRUNK[TRUNK.length - 1], ...BRANCH_KJT]) },
];

/**
 * Sample a curve into two parallel rails plus sleeper transforms.
 * Rails are offset along the horizontal normal (tangent × up).
 */
export function railGeometry(curve: THREE.CatmullRomCurve3, gauge = 0.16, samples = 220) {
  const up = new THREE.Vector3(0, 1, 0);
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];
  const sleepers: { position: THREE.Vector3; rotationY: number }[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const n = new THREE.Vector3().crossVectors(tan, up).normalize();
    left.push(p.clone().addScaledVector(n, gauge / 2));
    right.push(p.clone().addScaledVector(n, -gauge / 2));
    if (i % 4 === 0) {
      sleepers.push({ position: p.clone(), rotationY: Math.atan2(tan.x, tan.z) });
    }
  }
  return { left, right, sleepers };
}

/** Read a scoped login token first, then fall back to the app root. */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const loginRoot = document.querySelector<HTMLElement>('[data-niyojan-login]');
  const v = getComputedStyle(loginRoot ?? document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
