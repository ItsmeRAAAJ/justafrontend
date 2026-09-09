// ============================================================================
//  Corridor topology — Mumbai Division, Central Railway.
//
//  Transcribed from services/ai-engine/data/processed/block_sections.csv, which
//  is the same fixed topology the solver plans against: 46 block sections over
//  a trunk from Chhatrapati Shivaji Maharaj Terminus to Kalyan Junction, where
//  the route forks into the Igatpuri line via Kasara and the Karjat line.
//
//  This module holds geography and drawing geometry only. Nothing here fetches,
//  filters or decides anything — it exists so the schedule view can be drawn as
//  a real corridor instead of an anonymous stack of rows.
// ============================================================================

export type BranchKey = 'trunk' | 'igatpuri_branch' | 'karjat_branch';

/** Station ladder, in running order down each route. */
export const BRANCH_STATIONS: Record<BranchKey, string[]> = {
  trunk: [
    'Chhatrapati Shivaji Maharaj Terminus',
    'Masjid',
    'Sandhurst Road',
    'Byculla',
    'Chinchpokli',
    'Currey Road',
    'Parel',
    'Dadar',
    'Matunga',
    'Sion',
    'Kurla',
    'Vidyavihar',
    'Ghatkopar',
    'Vikhroli',
    'Kanjurmarg',
    'Bhandup',
    'Nahur',
    'Mulund',
    'Thane',
    'Kalwa',
    'Mumbra',
    'Diva',
    'Dombivli',
    'Thakurli',
    'Kalyan Junction',
  ],
  igatpuri_branch: [
    'Kalyan Junction',
    'Shahad',
    'Ambivli',
    'Titwala',
    'Khadavli',
    'Vasind',
    'Asangaon',
    'Atgaon',
    'Thansit',
    'Khardi',
    'Umbermali',
    'Kasara',
    'Igatpuri',
  ],
  karjat_branch: [
    'Kalyan Junction',
    'Thansit',
    'Vithalwadi',
    'Ulhasnagar',
    'Ambarnath',
    'Badlapur',
    'Vangani',
    'Shelu',
    'Neral',
    'Bhivpuri Road',
    'Karjat',
  ],
};

export const BRANCH_LABELS: Record<BranchKey, string> = {
  trunk: 'Trunk Line',
  igatpuri_branch: 'Igatpuri Branch',
  karjat_branch: 'Karjat Branch',
};

/** Where each route runs and ends — printed on the junction plate. */
export const BRANCH_ROUTE: Record<BranchKey, { head: string; tail: string; via?: string }> = {
  trunk: { head: 'C.S.M.T.', tail: 'Kalyan Jn' },
  igatpuri_branch: { head: 'Kalyan Jn', tail: 'Igatpuri', via: 'via Kasara' },
  karjat_branch: { head: 'Kalyan Jn', tail: 'Karjat', via: 'via Ambarnath' },
};

export const BRANCH_ORDER: BranchKey[] = ['trunk', 'igatpuri_branch', 'karjat_branch'];

/** Ghat sections: rising gradient, banker locomotive territory. */
const GHAT_PAIRS = new Set(['Kasara→Igatpuri', 'Bhivpuri Road→Karjat', 'Neral→Bhivpuri Road']);

export function isGhatPair(from: string, to: string): boolean {
  return GHAT_PAIRS.has(`${from}→${to}`);
}

// ── Display names ──────────────────────────────────────────────────────────

const SHORT_NAMES: Record<string, string> = {
  'Chhatrapati Shivaji Maharaj Terminus': 'C.S.M.T.',
  'Kalyan Junction': 'Kalyan Jn',
  'Sandhurst Road': 'Sandhurst Rd',
  'Currey Road': 'Currey Rd',
  'Bhivpuri Road': 'Bhivpuri Rd',
};

export function shortStation(name: string): string {
  return SHORT_NAMES[name] ?? name;
}

/** The four route-defining points, the only codes printed in the schematic. */
export const STATION_CODE: Record<string, string> = {
  'Chhatrapati Shivaji Maharaj Terminus': 'CSMT',
  'Kalyan Junction': 'KYN',
  Igatpuri: 'IGP',
  Karjat: 'KJT',
};

// ── Row ordering ───────────────────────────────────────────────────────────

/**
 * Position of a section along its route, used to order the schedule rows so the
 * corridor reads top-to-bottom in running order rather than in whatever order
 * the records happened to arrive. Unknown stations sort to the end, keeping
 * their relative order.
 */
export function sectionRank(branch: string, fromStation: string | undefined): number {
  if (!fromStation) return Number.MAX_SAFE_INTEGER;
  const ladder = BRANCH_STATIONS[branch as BranchKey];
  if (!ladder) return Number.MAX_SAFE_INTEGER;
  const i = ladder.indexOf(fromStation);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

// ── Fallback label for synthetic section ids (e.g. KYN_THAL) ───────────────

const CODE_NAMES: Record<string, string> = {
  CST: 'C.S.M.T.',
  CSMT: 'C.S.M.T.',
  KYN: 'Kalyan Jn',
  THAL: 'Thansit',
  KJT: 'Karjat',
  ROHA: 'Roha',
  IGP: 'Igatpuri',
  KHED: 'Khed',
  KSRA: 'Kasara',
  TNA: 'Thane',
  DI: 'Dombivli',
};

/**
 * Best available human label for a row. Prefers the section record shipped with
 * the assignment; falls back to splitting an `A_B` section id; otherwise prints
 * the id as given. Never invents geography that is not already in the id.
 */
export function sectionLabel(
  sectionId: string,
  from?: string,
  to?: string,
): { from: string; to: string; exact: boolean } {
  if (from && to) return { from: shortStation(from), to: shortStation(to), exact: true };
  const parts = sectionId.split('_');
  if (parts.length === 2) {
    return {
      from: CODE_NAMES[parts[0]] ?? parts[0],
      to: CODE_NAMES[parts[1]] ?? parts[1],
      exact: false,
    };
  }
  return { from: sectionId, to: '', exact: false };
}

// ── Drawing geometry ───────────────────────────────────────────────────────

/** Width of the corridor gutter beside the timeline. */
export const GUTTER_W = 212;
/** Height of one section row. Every rail slice is drawn to this height. */
export const ROW_H = 40;
/** Height of a junction plate (branch header). */
export const PLATE_H = 46;

/** Centre-line of each route within the gutter. The Karjat line diverges right. */
export const RAIL_X: Record<BranchKey, number> = {
  trunk: 20,
  igatpuri_branch: 20,
  karjat_branch: 38,
};

/** Gauge between the two running rails, in px, as drawn. */
export const GAUGE = 7;
