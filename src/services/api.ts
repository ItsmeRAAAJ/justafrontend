// ============================================================
//  Rail Samanvay — typed API client
//  Attaches JWT to every request, redirects on 401.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────

export type ApprovalStatus = 'pending_review' | 'approved' | 'rejected' | 'overridden';
export type UserRole = 'depot_incharge' | 'tpc' | 'coa_official' | 'divisional_controller';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
}

export interface Defect {
  defect_id: string;
  department: string;
  block_section_id: string;
  defect_type: string;
  date_reported: string;
  days_overdue: number;
  location_criticality: string;
  section_traffic_density: number;
  is_ghat_section: boolean;
  season_restriction_flag: boolean;
  predicted_priority_score: number | null;
}

export interface DefectCreate {
  defect_id: string;
  department: string;
  block_section_id: string;
  defect_type: string;
  date_reported: string;
  days_overdue: number;
  location_criticality: string;
  section_traffic_density: number;
  is_ghat_section: boolean;
  season_restriction_flag: boolean;
}

export interface BlockSection {
  section_id: string;
  from_station: string;
  to_station: string;
  branch: string;
  is_ghat_section: boolean;
  electrified: boolean;
  line_category: string;
}

export interface ScheduleAssignment {
  id: number;
  defect_id: string;
  block_section_id: string;
  day: number;
  start_time: string;
  end_time: string;
  machine_id: string | null;
  predicted_priority_score: number | null;
  department: string;
  approval_status: ApprovalStatus;
  defect: Defect;
  section: BlockSection;
}

export interface AnalyticsData {
  total_defects_in_pool: number;
  total_defects_scheduled: number;
  total_defects_unscheduled: number;
  pct_scheduled: number;
  avg_score_scheduled: number;
  avg_score_unscheduled: number;
}

export interface SolverResult {
  status: string;
  solve_time: number;
  assignments: {
    defect_id: string;
    block_section_id: string;
    window_id: string;
    day: number;
    start_time: string;
    end_time: string;
    machine_id: string | null;
    predicted_priority_score: number | null;
    department: string;
  }[];
  unscheduled: string[];
}

export interface DefectFilter {
  department?: string;
  block_section_id?: string;
  min_days_overdue?: number;
}

// ── Token helpers ────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('rs_token');
}

export function setToken(token: string): void {
  localStorage.setItem('rs_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('rs_token');
  localStorage.removeItem('rs_user');
}

export function getStoredUser(): { username: string; role: UserRole } | null {
  const raw = localStorage.getItem('rs_user');
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export function setStoredUser(user: { username: string; role: UserRole }): void {
  localStorage.setItem('rs_user', JSON.stringify(user));
}

// ── Core fetch wrapper ───────────────────────────────────────

type ApiError = { detail: string };

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    // Network error — backend unreachable
    throw new Error('NETWORK_ERROR');
  }

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errDetail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as ApiError;
      errDetail = body.detail ?? errDetail;
    } catch { /* ignore */ }
    throw new Error(errDetail);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthResponse> {
  const form = new FormData();
  form.append('username', username);
  form.append('password', password);
  return request<AuthResponse>('/api/auth/login', { method: 'POST', body: form });
}

// ── Defects ──────────────────────────────────────────────────

export async function getDefects(filter: DefectFilter = {}): Promise<Defect[]> {
  const params = new URLSearchParams();
  if (filter.department) params.set('department', filter.department);
  if (filter.block_section_id) params.set('block_section_id', filter.block_section_id);
  if (filter.min_days_overdue != null) params.set('min_days_overdue', String(filter.min_days_overdue));
  const qs = params.toString() ? `?${params}` : '';
  return request<Defect[]>(`/api/defects/${qs}`);
}

export async function createDefect(data: DefectCreate): Promise<Defect> {
  return request<Defect>('/api/defects/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Schedule ─────────────────────────────────────────────────

export async function getSchedule(): Promise<ScheduleAssignment[]> {
  return request<ScheduleAssignment[]>('/api/schedule/');
}

export async function generateSchedule(): Promise<SolverResult> {
  return request<SolverResult>('/api/schedule/generate', { method: 'POST' });
}

export async function approveAssignment(id: number): Promise<ScheduleAssignment> {
  return request<ScheduleAssignment>(`/api/schedule/${id}/approve`, { method: 'POST' });
}

export async function rejectAssignment(id: number): Promise<ScheduleAssignment> {
  return request<ScheduleAssignment>(`/api/schedule/${id}/reject`, { method: 'POST' });
}

export async function reoptimize(newDefectId: string): Promise<SolverResult> {
  return request<SolverResult>('/api/schedule/reoptimize', {
    method: 'POST',
    body: JSON.stringify({ new_defect_id: newDefectId }),
  });
}

// ── Analytics ────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/api/analytics/');
}
