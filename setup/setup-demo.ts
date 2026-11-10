/**
 * Kasuwa investor-demo data for tenant "meridian" (Meridian Contact Solutions).
 *
 * Usage (from c:\dev\freelance\wfm-demo-video):
 *   npx tsx setup/setup-demo.ts                 # run every Phase 1 step in order
 *   npx tsx setup/setup-demo.ts auth queues     # run named steps only
 *   npx tsx setup/setup-demo.ts live            # pushLiveStatuses(now)
 *   npx tsx setup/setup-demo.ts grid            # (re)write northwind-staffing-grid.xlsx
 *
 * Every step reads/writes setup/demo-state.json and skips work that already exists
 * where the API makes that detectable. Never touches tenant demo-mtcrgkt9 except to
 * borrow its admin JWT for POST /auth/tenants.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export const SVC = {
  auth: 'http://localhost:4510',
  forecasting: 'http://localhost:4501',
  scheduling: 'http://localhost:4502',
  realtime: 'http://localhost:4503',
  portal: 'http://localhost:4504',
  vendor: 'http://localhost:4505',
  notification: 'http://localhost:4507',
  analytics: 'http://localhost:4508',
  admin: 'http://localhost:4509',
  workforce: 'http://localhost:4511',
} as const;

export const WEB_URL = 'http://localhost:3000';
export const PASSWORD = 'SecurePass123!';
export const TENANT_SLUG = 'meridian';
export const TENANT_NAME = 'Meridian Contact Solutions';
const DEV_TENANT = { slug: 'demo-mtcrgkt9', email: 'admin@demo-mtcrgkt9.test' };
// Shared across services (every apps/<svc>/.env).
export const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ??
  '7f5cf34e1cf1305c96d970ac1caadc631afe552232ddbb737c60237873b76decf85af0dc';

export const TODAY = '2026-10-22';
export const WEEK_START = '2026-10-19';
export const NEXT_WEEK_START = '2026-10-26';

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATE_PATH = join(HERE, 'demo-state.json');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export interface UserRec { id: string; email: string; name: string; roles: string[] }
export interface AgentRec {
  id: string; userId: string; email: string; firstName: string; lastName: string;
  site: string; group: 'brightline' | 'brightlineB' | 'harbor' | 'cobalt' | 'northwind';
  queues: string[]; channels: string[]; skills: string[]; vendor: string | null; startDate: string;
}
export interface DemoState {
  web: string;
  password: string;
  tenant: { id: string; slug: string; name: string };
  users: Record<string, UserRec>;
  sites: Record<string, string>;
  skills: Record<string, string>;
  queues: Record<string, string>;
  vendors: Record<string, { id: string; code: string; portalUserEmail: string | null }>;
  clients: Record<string, {
    id: string; campaignId: string; campaignName: string; contractId: string; preset: string;
    queueNames: string[]; teamId: string; teamName: string; templateIds: string[];
  }>;
  agents: AgentRec[];
  northwindAgentIds: string[];
  schedules: Record<string, { id: string; campaign: string; weekStart: string; status: string; slots: number }>;
  portal: Record<string, unknown>;
  activity: Record<string, unknown>;
  importWizard: Record<string, unknown>;
  notes: string[];
  [k: string]: unknown;
}

function emptyState(): DemoState {
  return {
    web: WEB_URL, password: PASSWORD,
    tenant: { id: '', slug: TENANT_SLUG, name: TENANT_NAME },
    users: {}, sites: {}, skills: {}, queues: {}, vendors: {}, clients: {}, agents: [],
    northwindAgentIds: [], schedules: {}, portal: {}, activity: {}, importWizard: {}, notes: [],
  };
}

export function loadState(): DemoState {
  if (!existsSync(STATE_PATH)) return emptyState();
  return { ...emptyState(), ...(JSON.parse(readFileSync(STATE_PATH, 'utf8')) as DemoState) };
}
export function saveState(s: DemoState): void {
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
export class HttpError extends Error {
  constructor(public status: number, public body: unknown, msg: string) { super(msg); }
}

interface ReqOpts { method?: string; body?: unknown; token?: string; tenantId?: string; internal?: boolean; raw?: boolean }

export async function call<T = any>(base: string, path: string, o: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (o.token) headers.Authorization = `Bearer ${o.token}`;
  if (o.tenantId) headers['x-tenant-id'] = o.tenantId;
  if (o.internal) headers['x-internal-key'] = INTERNAL_KEY;
  const method = o.method ?? (o.body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${base}${path}`, {
    method, headers, ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new HttpError(res.status, json,
      `${method} ${base}${path} -> ${res.status}: ${json?.error?.code ?? ''} ${json?.error?.message ?? text.slice(0, 300)}`);
  }
  return (o.raw ? json : json.data) as T;
}

/** Bound client for one user token in tenant meridian. */
export function client(token: string, tenantId: string) {
  return {
    token,
    postRaw: <T = any>(b: string, p: string, body: unknown = {}) => call<T>(b, p, { token, tenantId, body, raw: true }),
    get: <T = any>(b: string, p: string) => call<T>(b, p, { token, tenantId }),
    getRaw: <T = any>(b: string, p: string) => call<T>(b, p, { token, tenantId, raw: true }),
    post: <T = any>(b: string, p: string, body: unknown = {}) => call<T>(b, p, { token, tenantId, body }),
    put: <T = any>(b: string, p: string, body: unknown = {}) => call<T>(b, p, { token, tenantId, body, method: 'PUT' }),
    patch: <T = any>(b: string, p: string, body: unknown = {}) => call<T>(b, p, { token, tenantId, body, method: 'PATCH' }),
    del: <T = any>(b: string, p: string) => call<T>(b, p, { token, tenantId, method: 'DELETE' }),
  };
}
export type Client = ReturnType<typeof client>;

export function internal(tenantId: string) {
  return {
    get: <T = any>(b: string, p: string) => call<T>(b, p, { tenantId, internal: true }),
    put: <T = any>(b: string, p: string, body: unknown) => call<T>(b, p, { tenantId, internal: true, body, method: 'PUT' }),
    post: <T = any>(b: string, p: string, body: unknown) => call<T>(b, p, { tenantId, internal: true, body }),
  };
}

const tokenCache = new Map<string, string>();
export async function login(email: string, tenantSlug = TENANT_SLUG, password = PASSWORD): Promise<string> {
  const k = `${tenantSlug}|${email}`;
  const hit = tokenCache.get(k);
  if (hit) return hit;
  const r = await call<{ accessToken: string; user: { mustChangePassword: boolean } }>(
    SVC.auth, '/api/v1/auth/login', { body: { email, password, tenantSlug } });
  if (r.user.mustChangePassword) throw new Error(`${email} must change password`);
  tokenCache.set(k, r.accessToken);
  return r.accessToken;
}

export async function adminClient(s: DemoState): Promise<Client> {
  return client(await login('admin@meridian.test'), s.tenant.id);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dow(iso: string): number { return new Date(`${iso}T00:00:00.000Z`).getUTCDay(); }
export function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
/** Deterministic PRNG so re-runs produce the same curves. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hhmmToMin(s: string): number { const [h, m] = s.split(':').map(Number); return h! * 60 + m!; }
function log(...a: unknown[]): void { console.log(...a); }
async function tryCall<T>(f: () => Promise<T>): Promise<T | HttpError> {
  try { return await f(); } catch (e) { if (e instanceof HttpError) return e; throw e; }
}
function list<T = any>(x: any): T[] { return Array.isArray(x) ? x : (x?.items ?? x?.rows ?? x?.data ?? []); }

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------
export const STAFF_USERS = [
  { key: 'admin', email: 'admin@meridian.test', firstName: 'Dana', lastName: 'Okafor', roles: ['ADMIN'] },
  { key: 'analyst', email: 'analyst@meridian.test', firstName: 'Priya', lastName: 'Raman', roles: ['WFM_ANALYST'] },
  { key: 'supervisor', email: 'supervisor@meridian.test', firstName: 'Marcus', lastName: 'Bell', roles: ['SUPERVISOR'] },
  { key: 'vendor', email: 'vendor@atlasbpo.test', firstName: 'Leo', lastName: 'Hart', roles: ['VENDOR'] },
] as const;

export const QUEUES = [
  { name: 'Voice – Northwind', channel: 'VOICE', slaTargetSeconds: 20, slaTargetPercent: 80, ahtSeconds: 330, shrinkagePercent: 30, concurrency: 1 },
  { name: 'Voice – Brightline', channel: 'VOICE', slaTargetSeconds: 60, slaTargetPercent: 80, ahtSeconds: 300, shrinkagePercent: 15, concurrency: 1 },
  { name: 'Chat – Brightline', channel: 'CHAT', slaTargetSeconds: 120, slaTargetPercent: 80, ahtSeconds: 480, shrinkagePercent: 15, concurrency: 2 },
  { name: 'Email – Cobalt', channel: 'EMAIL', slaTargetSeconds: 14400, slaTargetPercent: 90, ahtSeconds: 360, shrinkagePercent: 20, concurrency: 1 },
  { name: 'Voice – Harbor', channel: 'VOICE', slaTargetSeconds: 30, slaTargetPercent: 80, ahtSeconds: 420, shrinkagePercent: 30, concurrency: 1 },
] as const;

type G = AgentRec['group'];
/** [first, last, site, group, skills, vendor, startDate] */
const ROSTER: Array<[string, string, string, G, string[], string | null, string]> = [
  // Brightline Care A (10) — Voice + Chat Brightline
  ['Amara', 'Nwosu', 'Lagos', 'brightline', ['English', 'Billing'], null, '2022-03-14'],
  ['Chinedu', 'Okeke', 'Lagos', 'brightline', ['English', 'Tech Support'], null, '2019-08-05'],
  ['Funmilayo', 'Adeyemi', 'Lagos', 'brightline', ['English', 'Billing'], null, '2021-01-18'],
  ['Tunde', 'Bakare', 'Lagos', 'brightline', ['English', 'Tech Support'], null, '2023-06-26'],
  ['Maria', 'Santos', 'Manila', 'brightline', ['English', 'Billing'], 'Atlas BPO', '2020-02-10'],
  ['Jose', 'Dela Cruz', 'Manila', 'brightline', ['English', 'Tech Support'], 'Atlas BPO', '2022-09-12'],
  ['Angelica', 'Reyes', 'Manila', 'brightline', ['English'], 'Atlas BPO', '2024-04-01'],
  ['Kevin', 'Brooks', 'Austin', 'brightline', ['English', 'Tech Support'], null, '2018-11-19'],
  ['Sofia', 'Martinez', 'Austin', 'brightline', ['English', 'Spanish', 'Billing'], null, '2021-07-07'],
  ['Diego', 'Hernandez', 'Austin', 'brightline', ['English', 'Spanish'], null, '2025-01-13'],
  // Brightline Care B (5) — second Brightline crew so the 07–22 two-queue day can be covered
  ['Oluwaseun', 'Ajayi', 'Lagos', 'brightlineB', ['English', 'Billing'], null, '2021-10-04'],
  ['Bea', 'Castillo', 'Manila', 'brightlineB', ['English', 'Tech Support'], 'Atlas BPO', '2022-05-30'],
  ['Joshua', 'Ramos', 'Manila', 'brightlineB', ['English'], 'Atlas BPO', '2024-01-22'],
  ['Hannah', 'Wright', 'Austin', 'brightlineB', ['English', 'Billing'], null, '2020-03-16'],
  ['Lucia', 'Fernandez', 'Austin', 'brightlineB', ['English', 'Spanish'], null, '2023-08-14'],
  // Harbor Health Patient Line (5)
  ['Jasmine', 'Carter', 'Austin', 'harbor', ['English'], null, '2019-04-22'],
  ['Ngozi', 'Eze', 'Lagos', 'harbor', ['English'], 'Summit Connect', '2022-02-07'],
  ['Paolo', 'Villanueva', 'Manila', 'harbor', ['English'], 'Summit Connect', '2023-10-02'],
  ['Camila', 'Torres', 'Austin', 'harbor', ['English', 'Spanish'], null, '2020-12-01'],
  ['Ibrahim', 'Musa', 'Lagos', 'harbor', ['English'], 'Summit Connect', '2024-08-19'],
  // Cobalt Retail Order Support (4)
  ['Kayode', 'Adebayo', 'Lagos', 'cobalt', ['English', 'Billing'], 'Summit Connect', '2021-05-17'],
  ['Liza', 'Mendoza', 'Manila', 'cobalt', ['English', 'Billing'], 'Summit Connect', '2022-11-28'],
  ['Ryan', 'Mitchell', 'Austin', 'cobalt', ['English'], null, '2019-09-09'],
  ['Valentina', 'Rojas', 'Austin', 'cobalt', ['English', 'Spanish'], null, '2023-03-06'],
  // Northwind-eligible, no team yet (9)
  ['Emeka', 'Obi', 'Lagos', 'northwind', ['English', 'Tech Support'], null, '2020-06-15'],
  ['Aisha', 'Bello', 'Lagos', 'northwind', ['English'], null, '2022-01-10'],
  ['Ifeoma', 'Chukwu', 'Lagos', 'northwind', ['English', 'Billing'], null, '2024-02-12'],
  ['Rafael', 'Aquino', 'Manila', 'northwind', ['English'], 'Atlas BPO', '2021-08-23'],
  ['Kristine', 'Bautista', 'Manila', 'northwind', ['English', 'Billing'], 'Atlas BPO', '2023-05-15'],
  ['Carlo', 'Navarro', 'Manila', 'northwind', ['English', 'Tech Support'], 'Atlas BPO', '2025-03-03'],
  ['Tyler', 'Johnson', 'Austin', 'northwind', ['English'], null, '2019-02-25'],
  ['Brianna', 'Davis', 'Austin', 'northwind', ['English', 'Tech Support'], null, '2022-07-18'],
  ['Mateo', 'Gonzalez', 'Austin', 'northwind', ['English', 'Spanish'], null, '2024-10-07'],
];

const GROUP_QUEUES: Record<G, { queues: string[]; channels: string[] }> = {
  brightline: { queues: ['Voice – Brightline', 'Chat – Brightline'], channels: ['VOICE', 'CHAT'] },
  brightlineB: { queues: ['Voice – Brightline', 'Chat – Brightline'], channels: ['VOICE', 'CHAT'] },
  harbor: { queues: ['Voice – Harbor'], channels: ['VOICE'] },
  cobalt: { queues: ['Email – Cobalt'], channels: ['EMAIL'] },
  northwind: { queues: ['Voice – Northwind'], channels: ['VOICE'] },
};

function agentEmail(first: string, last: string): string {
  return `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@meridian.test';
}

// ---------------------------------------------------------------------------
// Phase 1.1 — tenant + staff users
// ---------------------------------------------------------------------------
async function bootstrapUser(s: DemoState, token: string | undefined, u: {
  email: string; firstName: string; lastName: string; roles: readonly string[];
}): Promise<void> {
  const r = await tryCall(() => call(SVC.auth, '/api/v1/auth/users/bootstrap', {
    token, tenantId: s.tenant.id,
    body: { email: u.email, password: PASSWORD, firstName: u.firstName, lastName: u.lastName, roles: u.roles, tenantId: s.tenant.id },
  }));
  if (r instanceof HttpError && r.status !== 409) throw r;
}

async function listAllUsers(admin: Client): Promise<any[]> {
  const out: any[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await admin.get<any[]>(SVC.auth, `/api/v1/auth/users?limit=100&offset=${offset}`);
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

export async function phaseAuth(s: DemoState): Promise<void> {
  try {
    const r = await call<any>(SVC.auth, '/api/v1/auth/login', { body: { email: 'admin@meridian.test', password: PASSWORD, tenantSlug: TENANT_SLUG } });
    s.tenant.id = r.user.tenantId;
    log(`tenant meridian exists (${s.tenant.id})`);
  } catch {
    const devToken = await login(DEV_TENANT.email, DEV_TENANT.slug);
    const t = await tryCall(() => call<any>(SVC.auth, '/api/v1/auth/tenants', { token: devToken, body: { name: TENANT_NAME, slug: TENANT_SLUG } }));
    if (t instanceof HttpError) {
      if (t.status !== 409 || !s.tenant.id) throw t;
    } else {
      s.tenant.id = t.id;
      log(`created tenant ${t.slug} ${t.id}`);
    }
    saveState(s);
    const a = STAFF_USERS[0];
    // Unauthenticated bootstrap works on an empty tenant in dev; otherwise borrow the dev admin JWT.
    const first = await tryCall(() => bootstrapUser(s, undefined, a));
    if (first instanceof HttpError) await bootstrapUser(s, devToken, a);
  }
  const adminToken = await login('admin@meridian.test');
  for (const u of STAFF_USERS.slice(1)) await bootstrapUser(s, adminToken, u);
  await refreshUsers(s);
  log('users:', Object.keys(s.users).join(', '));
}

export async function refreshUsers(s: DemoState): Promise<any[]> {
  const admin = await adminClient(s);
  const users = await listAllUsers(admin);
  for (const u of STAFF_USERS) {
    const found = users.find((x) => x.email === u.email);
    if (found) s.users[u.key] = { id: found.id, email: u.email, name: `${u.firstName} ${u.lastName}`, roles: [...u.roles] };
  }
  saveState(s);
  return users;
}

// ---------------------------------------------------------------------------
// Phase 1.10 — feature flag
// ---------------------------------------------------------------------------
export async function phaseFlags(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  await admin.put(SVC.admin, '/api/v1/admin/feature-flags/desktop_activity', {
    isEnabled: true, description: 'Desktop activity evidence (demo)',
  });
  const eff = await admin.get(SVC.admin, '/api/v1/admin/feature-flags/effective');
  log('effective flags', JSON.stringify(eff));
}

// ---------------------------------------------------------------------------
// Phase 1.2 — sites + skills
// ---------------------------------------------------------------------------
export async function phaseSitesSkills(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const sites = list(await admin.get(SVC.workforce, '/api/v1/sites'));
  for (const [name, code] of [['Lagos', 'LOS'], ['Manila', 'MNL'], ['Austin', 'AUS']] as const) {
    const hit = sites.find((x: any) => x.name === name);
    s.sites[name] = hit ? hit.id : (await admin.post(SVC.workforce, '/api/v1/sites', { name, code })).id;
  }
  const skills = list(await admin.get(SVC.workforce, '/api/v1/skills'));
  for (const name of ['English', 'Spanish', 'Billing', 'Tech Support']) {
    const hit = skills.find((x: any) => x.name === name);
    s.skills[name] = hit ? hit.id : (await admin.post(SVC.workforce, '/api/v1/skills', { name })).id;
  }
  log('sites', s.sites, 'skills', s.skills);
}

// ---------------------------------------------------------------------------
// Phase 1.3 — queues + interval volume actuals
// ---------------------------------------------------------------------------
function gauss(x: number, mu: number, sd: number): number { return Math.exp(-((x - mu) ** 2) / (2 * sd * sd)); }
/** Relative arrival shape over the 07:00–22:00 day; ~1.0 at the late-morning peak. */
export function dayCurve(hour: number): number {
  return 0.18 + 0.78 * gauss(hour, 10.75, 1.6) + 0.42 * gauss(hour, 13.0, 0.7) + 0.55 * gauss(hour, 15.5, 1.8) + 0.62 * gauss(hour, 19.5, 1.3);
}
const DOW_MULT = [0.52, 1.12, 1.05, 1.0, 0.98, 0.94, 0.63]; // Sun..Sat

export function volumeFor(queue: string, date: string, slotStartMin: number, weekIdx: number, r: () => number) {
  const peak: Record<string, number> = { 'Voice – Brightline': 5, 'Chat – Brightline': 4.5, 'Voice – Harbor': 7, 'Email – Cobalt': 9, 'Voice – Northwind': 12 };
  const aht: Record<string, number> = { 'Voice – Brightline': 300, 'Chat – Brightline': 480, 'Voice – Harbor': 420, 'Email – Cobalt': 360, 'Voice – Northwind': 330 };
  const hour = (slotStartMin + 15) / 60;
  const base = (peak[queue] ?? 10) * dayCurve(hour) * DOW_MULT[dow(date)]! * (1 + 0.012 * weekIdx);
  const volume = Math.max(0, Math.round(base * (0.9 + r() * 0.2)));
  const load = base / (peak[queue] ?? 10);
  return {
    volume,
    averageHandleTimeSeconds: Math.round((aht[queue] ?? 300) * (0.92 + r() * 0.16)),
    slaAttainmentPercent: Math.round(Math.min(97, Math.max(58, 90 - load * 14 + (r() - 0.5) * 10)) * 10) / 10,
  };
}

export async function phaseQueues(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const existing = list(await admin.get(SVC.forecasting, '/api/v1/queues'));
  for (const q of QUEUES) {
    const hit = existing.find((x: any) => x.name === q.name);
    s.queues[q.name] = hit ? hit.id : (await admin.post(SVC.forecasting, '/api/v1/queues', { ...q, timezone: 'UTC' })).id;
  }
  saveState(s);
  log('queues', s.queues);

  // 8 full weeks + current week to date for Brightline (forecast + Model Accuracy);
  // 4 weeks for Harbor/Cobalt so Analytics has something per queue.
  const now = Date.now();
  const plan: Array<[string, string]> = [
    ['Voice – Brightline', '2026-08-24'], ['Chat – Brightline', '2026-08-24'],
    ['Voice – Harbor', '2026-09-21'], ['Email – Cobalt', '2026-09-21'],
  ];
  for (const [qName, from] of plan) {
    const r = rng(qName.length * 7919);
    const intervals: any[] = [];
    for (let d = from, wi = 0; d <= TODAY; d = addDays(d, 1)) {
      wi = Math.floor((Date.parse(d) - Date.parse(from)) / (7 * 864e5));
      for (let m = 7 * 60; m < 22 * 60; m += 30) {
        const start = new Date(`${d}T00:00:00.000Z`).getTime() + m * 60000;
        const end = start + 30 * 60000;
        const v = volumeFor(qName, d, m, wi, r);
        if (end > now) continue;
        intervals.push({ intervalStart: new Date(start).toISOString(), intervalEnd: new Date(end).toISOString(), ...v });
      }
    }
    const res = await admin.post(SVC.forecasting, '/api/v1/forecast/volume-actuals', { queueId: s.queues[qName], intervals });
    log(`actuals ${qName}: ${intervals.length} intervals`, JSON.stringify(res));
  }
}

// ---------------------------------------------------------------------------
// Phase 1.7a — vendors (before agents: agents carry vendorId)
// ---------------------------------------------------------------------------
export async function phaseVendors(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const vendors = list(await admin.get(SVC.vendor, '/api/v1/vendors'));
  const specs = [
    { name: 'Atlas BPO', code: 'ATL', contactEmail: 'vendor@atlasbpo.test', contactName: 'Leo Hart', portalUserId: s.users.vendor?.id ?? null },
    { name: 'Summit Connect', code: 'SUM', contactEmail: 'ops@summitconnect.test', contactName: 'Rosa Delgado', portalUserId: null },
  ];
  for (const v of specs) {
    const hit = vendors.find((x: any) => x.name === v.name);
    const row = hit ? await admin.put(SVC.vendor, `/api/v1/vendors/${hit.id}`, v) : await admin.post(SVC.vendor, '/api/v1/vendors', v);
    s.vendors[v.name] = { id: row.id, code: v.code, portalUserEmail: v.portalUserId ? v.contactEmail : null };
  }
  log('vendors', s.vendors);
}

// ---------------------------------------------------------------------------
// Phase 1.5 — clients / campaigns / contracts / presets / teams / templates
// ---------------------------------------------------------------------------
interface ClientSpec {
  key: string; client: string; code: string; campaign: string; preset: 'sla' | 'headcount' | 'workload' | 'interval_compliance';
  shrinkage: number; queues: Array<{ name: string; planningUnit?: string }>; team: string;
  templates: Array<{ name: string; startTime: string; lengthMinutes: number; daysOfWeek: number[] }>;
}
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
export const CLIENT_SPECS: ClientSpec[] = [
  {
    key: 'brightline', client: 'Brightline Telecom', code: 'BLT', campaign: 'Customer Care', preset: 'sla', shrinkage: 15,
    queues: [{ name: 'Voice – Brightline' }, { name: 'Chat – Brightline' }], team: 'Brightline Care A',
    templates: [
      { name: 'Early 07:00–15:00', startTime: '07:00', lengthMinutes: 480, daysOfWeek: ALL_DAYS },
      { name: 'Day 09:00–17:00', startTime: '09:00', lengthMinutes: 480, daysOfWeek: ALL_DAYS },
      { name: 'Mid 12:00–20:00', startTime: '12:00', lengthMinutes: 480, daysOfWeek: ALL_DAYS },
      { name: 'Late 14:00–22:00', startTime: '14:00', lengthMinutes: 480, daysOfWeek: ALL_DAYS },
    ],
  },
  {
    key: 'harbor', client: 'Harbor Health', code: 'HRB', campaign: 'Patient Line', preset: 'headcount', shrinkage: 30,
    queues: [{ name: 'Voice – Harbor' }], team: 'Harbor Patient Line',
    templates: [
      { name: 'Clinic open 08:00–16:00', startTime: '08:00', lengthMinutes: 480, daysOfWeek: [1, 2, 3, 4, 5, 6] },
      { name: 'Clinic close 12:00–20:00', startTime: '12:00', lengthMinutes: 480, daysOfWeek: WEEKDAYS },
    ],
  },
  {
    key: 'cobalt', client: 'Cobalt Retail', code: 'CBR', campaign: 'Order Support', preset: 'workload', shrinkage: 20,
    queues: [{ name: 'Email – Cobalt', planningUnit: 'daily_hours_pool' }], team: 'Cobalt Order Desk',
    templates: [
      { name: 'Back office 08:00–16:00', startTime: '08:00', lengthMinutes: 480, daysOfWeek: WEEKDAYS },
      { name: 'Back office 10:00–18:00', startTime: '10:00', lengthMinutes: 480, daysOfWeek: WEEKDAYS },
    ],
  },
];

/** Harbor contracted seat blocks (UTC). */
const HARBOR_PATTERNS = [
  { name: 'Weekday open', daysOfWeek: WEEKDAYS, startTime: '08:00', endTime: '16:00', seats: 2 },
  { name: 'Weekday close', daysOfWeek: WEEKDAYS, startTime: '12:00', endTime: '20:00', seats: 2 },
  { name: 'Saturday clinic', daysOfWeek: [6], startTime: '08:00', endTime: '16:00', seats: 1 },
];

export async function ensureClientCampaign(admin: Client, name: string, code: string, campaign: string): Promise<{ clientId: string; campaignId: string }> {
  const clients = list(await admin.get(SVC.forecasting, '/api/v1/clients?status=all'));
  let c = clients.find((x: any) => x.name === name);
  if (!c) c = await admin.post(SVC.forecasting, '/api/v1/clients', { name, code });
  else if (!c.isActive) c = await admin.patch(SVC.forecasting, `/api/v1/clients/${c.id}`, { isActive: true });
  const camps = list(await admin.get(SVC.forecasting, `/api/v1/campaigns?clientId=${c.id}&status=all`));
  let k = camps.find((x: any) => x.name === campaign);
  if (!k) k = await admin.post(SVC.forecasting, '/api/v1/campaigns', { clientId: c.id, name: campaign });
  else if (!k.isActive) k = await admin.patch(SVC.forecasting, `/api/v1/campaigns/${k.id}`, { isActive: true });
  return { clientId: c.id, campaignId: k.id };
}

export async function ensureContract(admin: Client, campaignId: string, body: Record<string, unknown>): Promise<string> {
  const contracts = list(await admin.get(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts`));
  if (contracts.length) return contracts[0].id;
  return (await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts`, body)).id;
}

export async function contractConfig(admin: Client, campaignId: string, contractId: string): Promise<any> {
  return admin.get(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts/${contractId}`);
}

export async function ensureTemplates(admin: Client, campaignId: string, specs: ClientSpec['templates']): Promise<string[]> {
  const existing = list(await admin.get(SVC.scheduling, `/api/v1/shift-templates?campaignId=${campaignId}`))
    .filter((t: any) => t.campaignId === campaignId);
  const ids: string[] = [];
  for (const t of specs) {
    const hit = existing.find((x: any) => x.name === t.name);
    ids.push(hit ? hit.id : (await admin.post(SVC.scheduling, '/api/v1/shift-templates', { campaignId, ...t, isActive: true })).id);
  }
  return ids;
}

export async function phaseClients(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  for (const spec of CLIENT_SPECS) {
    const { clientId, campaignId } = await ensureClientCampaign(admin, spec.client, spec.code, spec.campaign);
    const contractId = await ensureContract(admin, campaignId, {
      effectiveFrom: '2026-09-01', intervalMinutes: 30, timezone: 'UTC', weekStartDay: 'MONDAY',
      requirementLock: 'locked', shrinkagePercent: spec.shrinkage,
    });
    for (const q of spec.queues) {
      await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/queues`, { queueId: s.queues[q.name], ...(q.planningUnit ? { planningUnit: q.planningUnit } : {}) });
      if (q.planningUnit) await admin.patch(SVC.forecasting, `/api/v1/campaigns/${campaignId}/queues/${s.queues[q.name]}`, { planningUnit: q.planningUnit });
    }
    const cfg = await contractConfig(admin, campaignId, contractId);
    const sources = list(cfg.sources ?? cfg.requirementSources ?? []);
    if (sources.length === 0) {
      await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts/${contractId}/preset`, { preset: spec.preset });
      log(`  ${spec.client}: preset ${spec.preset} applied`);
    }
    if (spec.key === 'harbor') {
      const pats = list(await admin.get(SVC.forecasting, `/api/v1/campaigns/${campaignId}/shift-patterns`));
      for (const p of HARBOR_PATTERNS) {
        if (!pats.find((x: any) => x.name === p.name)) {
          await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/shift-patterns`, { ...p, timezone: 'UTC' });
        }
      }
    }
    const teams = list(await admin.get(SVC.workforce, `/api/v1/teams?campaignId=${campaignId}`));
    let team = teams.find((t: any) => t.name === spec.team);
    if (!team) {
      team = await admin.post(SVC.workforce, '/api/v1/teams', {
        name: spec.team, timezone: 'UTC', campaignId, queueIds: spec.queues.map((q) => s.queues[q.name]),
      });
    }
    let teamBId: string | undefined;
    if (spec.key === 'brightline') {
      const tb = teams.find((t: any) => t.name === 'Brightline Care B') ?? await admin.post(SVC.workforce, '/api/v1/teams', {
        name: 'Brightline Care B', timezone: 'UTC', campaignId, queueIds: spec.queues.map((q) => s.queues[q.name]),
      });
      teamBId = tb.id;
    }
    const templateIds = await ensureTemplates(admin, campaignId, spec.templates);
    s.clients[spec.key] = {
      id: clientId, campaignId, campaignName: spec.campaign, contractId, preset: spec.preset,
      queueNames: spec.queues.map((q) => q.name), teamId: team.id, teamName: spec.team, templateIds,
      ...(teamBId ? { teamBId, teamBName: 'Brightline Care B' } : {}),
    };
    saveState(s);
    log(`  ${spec.client} ok`, JSON.stringify(s.clients[spec.key]));
  }
}

// ---------------------------------------------------------------------------
// Phase 1.4 — agents (+ AGENT logins, leave balances)
// ---------------------------------------------------------------------------
async function listAllAgents(admin: Client): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  for (;;) {
    const r = await admin.getRaw<any>(SVC.workforce, `/api/v1/agents?limit=200${cursor ? `&cursor=${cursor}` : ''}`);
    out.push(...list(r.data));
    cursor = r.meta?.nextCursor ?? undefined;
    if (!cursor || !r.meta?.hasMore) break;
  }
  return out;
}

export async function phaseAgents(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const token = await login('admin@meridian.test');
  for (const [first, last] of ROSTER) {
    await bootstrapUser(s, token, { email: agentEmail(first, last), firstName: first, lastName: last, roles: ['AGENT'] });
  }
  const users = await refreshUsers(s);
  const existing = await listAllAgents(admin);
  const teamFor: Record<G, string | null> = {
    brightline: s.clients.brightline?.teamId ?? null, brightlineB: (s.clients.brightline as any)?.teamBId ?? null, harbor: s.clients.harbor?.teamId ?? null,
    cobalt: s.clients.cobalt?.teamId ?? null, northwind: null,
  };
  const out: AgentRec[] = [];
  for (const [first, last, site, group, skills, vendor, startDate] of ROSTER) {
    const email = agentEmail(first, last);
    const user = users.find((u) => u.email === email);
    if (!user) throw new Error(`no auth user for ${email}`);
    const gq = GROUP_QUEUES[group];
    const body = {
      email, firstName: first, lastName: last, displayName: `${first} ${last}`, role: 'STANDARD', status: 'ACTIVE',
      siteId: s.sites[site], vendorId: vendor ? s.vendors[vendor]!.id : null, timezone: 'UTC', contractedHoursPerWeek: group.startsWith('brightline') ? 48 : 45,
      userId: user.id, startDate, channels: gq.channels, queueIds: gq.queues.map((q) => s.queues[q]),
      teamIds: teamFor[group] ? [teamFor[group]] : [], skillIds: skills.map((k) => s.skills[k]),
    };
    const hit = existing.find((a: any) => a.email === email);
    const row = hit ? await admin.patch(SVC.workforce, `/api/v1/agents/${hit.id}`, body) : await admin.post(SVC.workforce, '/api/v1/agents', body);
    out.push({ id: row.id, userId: user.id, email, firstName: first, lastName: last, site, group, queues: gq.queues, channels: gq.channels, skills, vendor, startDate });
  }
  s.agents = out;
  s.northwindAgentIds = out.filter((a) => a.group === 'northwind').map((a) => a.id);
  saveState(s);
  log(`agents: ${out.length}`);

  // Leave balances (T-112: time off fails closed without a row).
  const int = internal(s.tenant.id);
  const year = 2026;
  for (const a of out) {
    for (const [leaveType, totalDays] of [['ANNUAL', 25], ['SICK', 10], ['PERSONAL', 5], ['UNPAID', 30]] as const) {
      const used = leaveType === 'ANNUAL' ? 6 + (a.firstName.length % 7) : leaveType === 'SICK' ? a.lastName.length % 4 : 0;
      await int.put(SVC.portal, '/internal/v1/leave-balances', { agentId: a.id, leaveType, year, totalDays, usedDays: used, pendingDays: 0 });
    }
  }
  log('leave balances ok');
}

// ---------------------------------------------------------------------------
// Phase 1.6 — business rules
// ---------------------------------------------------------------------------
export const RULES = [
  { name: 'Minimum rest between shifts', description: 'At least 11 hours between the end of one shift and the start of the next.', ruleConfig: { type: 'rest', value: '11', unit: 'hours', operator: 'min' } },
  { name: 'Maximum consecutive working days', description: 'No more than 6 working days in a row.', ruleConfig: { type: 'consecutive', value: '6', unit: 'days', operator: 'max' } },
  { name: 'Maximum hours per day', description: 'No agent is scheduled more than 10 hours in a day.', ruleConfig: { type: 'daily_hours', value: '10', unit: 'hours', operator: 'max' } },
  { name: 'Weekly overtime cap', description: 'At most 8 overtime hours per agent per week.', ruleConfig: { type: 'overtime', value: '8', unit: 'hours', operator: 'max' } },
  { name: 'Time-off auto-approve', description: 'Auto-approve time off when the coverage shortfall stays within 5%.', ruleConfig: { type: 'timeoff_auto_approve', value: '5', unit: 'percent', operator: 'max' } },
];

export async function phaseRules(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  // Listing first seeds the tenant defaults (break/lunch/relief…) — must happen before any POST.
  let rules = list(await admin.get(SVC.scheduling, '/api/v1/business-rules'));
  for (const r of RULES) {
    const hit = rules.find((x: any) => x.ruleConfig?.type === r.ruleConfig.type) ?? rules.find((x: any) => x.name === r.name);
    const body = { ...r, isActive: true };
    const res = await tryCall(() => hit ? admin.put(SVC.scheduling, `/api/v1/business-rules/${hit.id}`, body) : admin.post(SVC.scheduling, '/api/v1/business-rules', body));
    if (res instanceof HttpError) {
      // operator not accepted on every type — retry without it
      const { operator: _o, ...rc } = r.ruleConfig;
      const b2 = { ...body, ruleConfig: rc };
      hit ? await admin.put(SVC.scheduling, `/api/v1/business-rules/${hit.id}`, b2) : await admin.post(SVC.scheduling, '/api/v1/business-rules', b2);
    }
  }
  rules = list(await admin.get(SVC.scheduling, '/api/v1/business-rules'));
  log(rules.map((r: any) => `${r.isActive ? '+' : '-'} ${r.name} ${JSON.stringify(r.ruleConfig)}`).join('\n'));
}

// ---------------------------------------------------------------------------
// Phase 1.8a — demand: forecast runs (SLA), workload volumes (Cobalt)
// ---------------------------------------------------------------------------
export async function phaseDemand(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const runs = list(await admin.get(SVC.forecasting, '/api/v1/forecast/runs'));
  const bl = s.clients.brightline!;
  const want: Array<{ queue: string; modelType: string; from: string; to: string; campaign: boolean }> = [];
  for (const q of bl.queueNames) {
    // Back-test windows first (Model Accuracy: MAPE over fully-actualised weeks) …
    want.push({ queue: q, modelType: 'MOVING_AVERAGE', from: '2026-10-05', to: '2026-10-18', campaign: false });
    want.push({ queue: q, modelType: 'SEASONAL_NAIVE', from: '2026-10-05', to: '2026-10-18', campaign: false });
    // … then the planning run the scheduler reads (stamped with the campaign's SLA source).
    want.push({ queue: q, modelType: 'SEASONAL_NAIVE', from: WEEK_START, to: addDays(NEXT_WEEK_START, 13), campaign: true });
  }
  // Runs supersede each other per queue, so the planning run must be the newest one.
  // Skip the whole queue when it already is.
  for (const qn of bl.queueNames) {
    const qid = s.queues[qn];
    const latest = runs.filter((r: any) => r.queueId === qid).sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (!process.env.FORCE_RUNS && latest && latest.status === 'COMPLETED' && String(latest.forecastStartDate).startsWith(WEEK_START)) { log(`  ${qn}: planning run present`); continue; }
    for (const w of want.filter((x) => x.queue === qn)) {
      const r = await admin.post(SVC.forecasting, '/api/v1/forecast/runs', {
        queueId: qid, modelType: w.modelType, forecastFrom: w.from, forecastTo: w.to, intervalMinutes: 30,
        ...(w.campaign ? { campaignId: bl.campaignId } : {}),
      });
      log(`  run ${w.queue} ${w.modelType} ${w.from}: ${r.status} mape=${r.mape}`);
      if (r.status !== 'COMPLETED') throw new Error(`forecast run not completed: ${JSON.stringify(r).slice(0, 400)}`);
    }
  }

  // Cobalt: planned work items per weekday, current week + next 2 weeks.
  const cb = s.clients.cobalt!;
  const vols: any[] = [];
  const r = rng(42);
  for (let d = WEEK_START; d <= addDays(NEXT_WEEK_START, 11); d = addDays(d, 1)) {
    const wd = dow(d);
    if (wd === 0 || wd === 6) continue;
    const base = [0, 128, 118, 112, 110, 104, 0][wd]!;
    vols.push({ queueId: s.queues['Email – Cobalt'], period: 'day', periodStart: d, items: Math.round(base * (0.95 + r() * 0.1)) });
  }
  await admin.put(SVC.forecasting, `/api/v1/campaigns/${cb.campaignId}/workload/volumes`, { volumes: vols });
  const prev = await admin.get(SVC.forecasting, `/api/v1/campaigns/${cb.campaignId}/workload/preview?from=${WEEK_START}&to=${addDays(WEEK_START, 6)}`);
  log('  cobalt workload preview', JSON.stringify(prev).slice(0, 600));
}

// ---------------------------------------------------------------------------
// Phase 1.8b — schedules (Generate exactly like the UI, then publish)
// ---------------------------------------------------------------------------
export async function generateAndPublish(
  admin: Client, s: DemoState, key: string, campaignId: string, queueIds: string[], weekStart: string, name: string,
  opts: { publish?: boolean; lunchMinutes?: number } = {},
): Promise<{ id: string; status: string; slots: number; warnings: unknown[] }> {
  const all = list(await admin.get(SVC.scheduling, '/api/v1/schedules'));
  let sch = all.find((x: any) => x.campaignId === campaignId && String(x.weekStartDate).startsWith(weekStart) && x.status !== 'ARCHIVED');
  let warnings: unknown[] = [];
  if (sch && process.env.RESET_SCHEDULES) {
    if (sch.status === 'PUBLISHED') await admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/unpublish`, { reason: 'demo data reset' });
    await admin.del(SVC.scheduling, `/api/v1/schedules/${sch.id}`);
    sch = undefined;
  }
  if (!sch) {
    sch = await admin.post(SVC.scheduling, '/api/v1/schedules', { name, weekStartDate: weekStart, weekEndDate: addDays(weekStart, 6), campaignId });
  }
  if (sch.status === 'DRAFT') {
    const slotsBefore = list(await admin.get(SVC.scheduling, `/api/v1/schedules/${sch.id}/shift-slots`));
    if (slotsBefore.length === 0) {
      // UI: agentIds = every ACTIVE agent; queueIds = campaign's linked queues; the visible week.
      const agentIds = (await listAllAgents(admin)).filter((a: any) => a.status === 'ACTIVE').map((a: any) => a.id);
      const res = await admin.postRaw<any>(SVC.scheduling, `/api/v1/schedules/${sch.id}/generate`, {
        agentIds, queueIds, rangeStart: weekStart, rangeEnd: addDays(weekStart, 6), campaignId,
        ...(opts.lunchMinutes ? { lunchMinutes: opts.lunchMinutes } : {}),
      });
      warnings = res.meta?.warnings ?? [];
    }
    if (opts.publish !== false) {
      const p = await tryCall(() => admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/publish`, { campaignId }));
      if (p instanceof HttpError) {
        log(`  publish with compliance gate refused (${p.message.slice(0, 160)}); publishing without campaign gate`);
        await admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/publish`, {});
      }
    }
  }
  const after = list(await admin.get(SVC.scheduling, '/api/v1/schedules')).find((x: any) => x.id === sch.id);
  const slots = list(await admin.get(SVC.scheduling, `/api/v1/schedules/${sch.id}/shift-slots`));
  s.schedules[`${key}:${weekStart}`] = { id: sch.id, campaign: key, weekStart, status: after?.status ?? sch.status, slots: slots.length };
  saveState(s);
  log(`  ${key} ${weekStart}: ${after?.status} slots=${slots.length} warnings=${warnings.length}`,
    JSON.stringify(warnings.reduce((m: Record<string, number>, w: any) => { m[w.ruleType] = (m[w.ruleType] ?? 0) + 1; return m; }, {})));
  if (process.env.SHOW_WARNINGS) for (const w of warnings as any[]) if (w.ruleType !== 'UNDER_COVERAGE') log('   ', w.ruleType, w.date, w.message?.slice(0, 220));
  if (process.env.SHOW_UNDER) for (const w of warnings as any[]) if (w.ruleType === 'UNDER_COVERAGE') log('   ', w.date, w.message?.replace(/queue \S+ /, '').slice(0, 60));
  return { id: sch.id, status: after?.status, slots: slots.length, warnings };
}

export async function phaseSchedules(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const q = (names: string[]) => names.map((n) => s.queues[n]!);
  const bl = s.clients.brightline!, hb = s.clients.harbor!, cb = s.clients.cobalt!;
  await generateAndPublish(admin, s, 'brightline', bl.campaignId, q(bl.queueNames), WEEK_START, 'Brightline Customer Care — wk 43');
  await generateAndPublish(admin, s, 'brightline', bl.campaignId, q(bl.queueNames), NEXT_WEEK_START, 'Brightline Customer Care — wk 44');
  await generateAndPublish(admin, s, 'harbor', hb.campaignId, q(hb.queueNames), WEEK_START, 'Harbor Patient Line — wk 43');
  await generateAndPublish(admin, s, 'cobalt', cb.campaignId, q(cb.queueNames), WEEK_START, 'Cobalt Order Support — wk 43');
}

/** Copy the generated current week into the 3 previous weeks and publish (history for vendor trend/analytics). */
export async function phaseHistory(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  for (const key of ['brightline', 'harbor', 'cobalt']) {
    const src = s.schedules[`${key}:${WEEK_START}`];
    if (!src) continue;
    for (const back of [1, 2, 3]) {
      const target = addDays(WEEK_START, -7 * back);
      const label = ({ brightline: 'Brightline Customer Care', harbor: 'Harbor Patient Line', cobalt: 'Cobalt Order Support' } as Record<string, string>)[key];
      const wantName = `${label} — wk ${43 - back}`;
      const all = list(await admin.get(SVC.scheduling, '/api/v1/schedules'));
      let sch = all.find((x: any) => x.campaignId === s.clients[key]!.campaignId && String(x.weekStartDate).startsWith(target) && x.status !== 'ARCHIVED');
      if (!sch) {
        const r = await admin.post(SVC.scheduling, `/api/v1/schedules/${src.id}/copy`, { targetWeekStartDate: target, sourceWeekStartDate: WEEK_START, name: wantName });
        sch = r.schedule ?? r;
      }
      if (sch.name !== wantName) {
        if (sch.status === 'PUBLISHED') { await admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/unpublish`, { reason: 'rename for demo' }); sch.status = 'DRAFT'; }
        await admin.patch(SVC.scheduling, `/api/v1/schedules/${sch.id}`, { name: wantName });
      }
      if (sch.status !== 'PUBLISHED') await admin.post(SVC.scheduling, `/api/v1/schedules/${sch.id}/publish`, {});
      s.schedules[`${key}:${target}`] = { id: sch.id, campaign: key, weekStart: target, status: 'PUBLISHED', slots: -1 };
      log(`  ${key} ${target} published (copy)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 1.7b — vendor headcount + performance
// ---------------------------------------------------------------------------
export async function phaseVendorData(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const plan: Array<{ vendor: string; queue: string; committed: number }> = [
    { vendor: 'Atlas BPO', queue: 'Voice – Brightline', committed: 3 },
    { vendor: 'Atlas BPO', queue: 'Chat – Brightline', committed: 3 },
    { vendor: 'Summit Connect', queue: 'Voice – Harbor', committed: 3 },
    { vendor: 'Summit Connect', queue: 'Email – Cobalt', committed: 2 },
  ];
  const r = rng(7);
  for (const vName of Object.keys(s.vendors)) {
    const vid = s.vendors[vName]!.id;
    const existing = list(await admin.get(SVC.vendor, `/api/v1/vendors/${vid}/headcount`));
    for (const p of plan.filter((x) => x.vendor === vName)) {
      for (let i = 7; i >= 0; i--) {
        const week = addDays(WEEK_START, -7 * i);
        const short = r() < 0.3 ? 1 : 0;
        const committed = p.committed + (i > 5 ? -1 : 0);
        const body = { committedAgents: committed, actualAgents: Math.max(1, committed - short), ...(short ? { notes: 'One agent on sick leave' } : {}) };
        const hit = existing.find((h: any) => h.queueId === s.queues[p.queue] && String(h.weekStartDate).startsWith(week));
        if (hit) await admin.put(SVC.vendor, `/api/v1/vendors/${vid}/headcount/${hit.id}`, body);
        else await admin.post(SVC.vendor, `/api/v1/vendors/${vid}/headcount`, { queueId: s.queues[p.queue], weekStartDate: week, ...body });
      }
    }
    const perf = list(await admin.get(SVC.vendor, `/api/v1/vendors/${vid}/performance`));
    for (let i = 8; i >= 1; i--) {
      const start = addDays(WEEK_START, -7 * i);
      if (perf.find((x: any) => String(x.periodStart).startsWith(start))) continue;
      const trend = (8 - i) * 0.6;
      await admin.post(SVC.vendor, `/api/v1/vendors/${vid}/performance`, {
        periodStart: start, periodEnd: addDays(start, 6),
        adherencePercent: Math.round((vName === 'Atlas BPO' ? 89 : 86) + trend * 0.5 + r() * 3),
        slaAttainmentPercent: Math.round((vName === 'Atlas BPO' ? 78 : 74) + trend + r() * 4),
        averageHandleTimeSeconds: Math.round((vName === 'Atlas BPO' ? 318 : 402) - trend * 3 + r() * 20),
        qualityScore: Math.round((vName === 'Atlas BPO' ? 88 : 84) + r() * 6),
        headcountFulfillmentPercent: Math.round(90 + r() * 9),
      });
    }
    const hc = list(await admin.get(SVC.vendor, `/api/v1/vendors/${vid}/headcount`));
    log(`  ${vName}: ${hc.length} headcount rows; c/s/a by week`, hc.map((h: any) => `${String(h.weekStartDate).slice(5, 10)}:${h.committedAgents}/${h.scheduledAgents}/${h.actualAgents}`).join(' '));
  }
}

// ---------------------------------------------------------------------------
// SQL (last resort, tenant meridian only)
// ---------------------------------------------------------------------------
export function sql(db: string, query: string): string {
  return execFileSync('docker', ['exec', 'wfm_postgres', 'psql', '-U', 'wfm', '-d', db, '-At', '-c', query], { encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// Phase 1.9 — agent portal content + inbox items
// ---------------------------------------------------------------------------
export function agentByName(s: DemoState, first: string): AgentRec {
  const a = s.agents.find((x) => x.firstName === first);
  if (!a) throw new Error(`agent ${first} not in state`);
  return a;
}

async function slotsFor(admin: Client, s: DemoState, agentId: string): Promise<any[]> {
  const out: any[] = [];
  for (const k of [`brightline:${WEEK_START}`, `brightline:${NEXT_WEEK_START}`]) {
    const sch = s.schedules[k];
    if (sch) out.push(...list(await admin.get(SVC.scheduling, `/api/v1/schedules/${sch.id}/shift-slots`)));
  }
  return out.filter((x) => x.agentId === agentId);
}

export async function phasePortal(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  const sup = client(await login('supervisor@meridian.test'), s.tenant.id);
  const amara = agentByName(s, 'Amara');
  const chinedu = agentByName(s, 'Chinedu');
  const amaraClient = client(await login(amara.email), s.tenant.id);

  // --- VTO offer overlapping Amara's next-week Tuesday shift --------------------------
  const amaraSlots = await slotsFor(admin, s, amara.id);
  const work = amaraSlots.filter((x) => x.slotType === 'WORK' && String(x.date).slice(0, 10) > TODAY)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const vtoSlot = work.find((x) => String(x.date).startsWith('2026-10-27')) ?? work[0];
  if (!vtoSlot) throw new Error('Amara has no future WORK slot');
  const vtoDate = String(vtoSlot.date).slice(0, 10);
  const endH = Number(String(vtoSlot.endTime).slice(0, 2));
  const vtoStart = `${String(endH - 2).padStart(2, '0')}:00`, vtoEnd = `${String(endH).padStart(2, '0')}:00`;
  const offers = list(await admin.get(SVC.scheduling, '/api/v1/vto-offers'));
  let vto = offers.find((o: any) => o.offerType === 'VTO' && String(o.date).startsWith(vtoDate) && o.status !== 'CLOSED');
  if (!vto) {
    vto = await sup.post(SVC.scheduling, '/api/v1/vto-offers', {
      offerType: 'VTO', queueId: vtoSlot.queueId, date: `${vtoDate}T00:00:00.000Z`, startTime: vtoStart, endTime: vtoEnd,
      maxSlots: 3, expiresAt: `${vtoDate}T${String(endH - 3).padStart(2, '0')}:00:00.000Z`,
    });
  }
  const claimable = list(await amaraClient.get(SVC.portal, '/api/v1/portal/vto-offers'));
  log(`  VTO ${vto.id} ${vtoDate} ${vtoStart}-${vtoEnd}; claimable for Amara: ${claimable.length}`);

  // --- Incoming swap: Chinedu (late) ↔ Amara (early) on the same day -----------------
  const chSlots = await slotsFor(admin, s, chinedu.id);
  let swapPair: [any, any] | null = null;
  for (const aw of [...work.filter((x) => String(x.date) >= NEXT_WEEK_START), ...work]) {
    const cw = chSlots.find((x) => x.slotType === 'WORK' && x.date === aw.date && x.startTime !== aw.startTime);
    if (cw) { swapPair = [cw, aw]; break; }
  }
  const swaps = list(await admin.get(SVC.scheduling, `/api/v1/shift-swaps?agentId=${amara.id}`));
  let swap = swaps.find((x: any) => x.status === 'PENDING' && x.targetAgentId === amara.id);
  if (!swap && swapPair) {
    const chClient = client(await login(chinedu.email), s.tenant.id);
    swap = await chClient.post(SVC.scheduling, '/api/v1/shift-swaps', {
      targetAgentId: amara.id, requestingSlotId: swapPair[0].id, targetSlotId: swapPair[1].id,
      notes: 'School run that afternoon — could you take my late shift and I take your early one?',
    });
  }
  if (swap && swap.requestingAgentId !== chinedu.id) {
    // Known bug: scheduling stores the requester's auth user id, not the agent id, which breaks
    // the requester's name and Accept. Re-point it at Chinedu's workforce agent (meridian only).
    sql('wfm_scheduling', `update shift_swaps set requesting_agent_id='${chinedu.id}' where id='${swap.id}' and tenant_id='${s.tenant.id}'`);
  }
  log(`  swap ${swap?.id} on ${swapPair?.[1]?.date}`);

  // --- Time off (auto-approve rule paused so the requests stay PENDING) --------------
  const rules = list(await admin.get(SVC.scheduling, '/api/v1/business-rules'));
  const auto = rules.find((r: any) => r.ruleConfig?.type === 'timeoff_auto_approve');
  const setAuto = async (on: boolean) => auto && admin.put(SVC.scheduling, `/api/v1/business-rules/${auto.id}`, {
    name: auto.name, description: auto.description, isActive: on, ruleConfig: auto.ruleConfig,
  });
  const existingTo = list(await admin.get(SVC.scheduling, '/api/v1/timeoff-requests'));
  const toPlan = [
    { who: 'Amara', leaveType: 'ANNUAL', startDate: '2026-11-13', endDate: '2026-11-13', notes: "My sister's wedding in Enugu", approve: true },
    { who: 'Amara', leaveType: 'PERSONAL', startDate: '2026-12-23', endDate: '2026-12-24', notes: 'Travelling home for Christmas', approve: false },
    { who: 'Kevin', leaveType: 'ANNUAL', startDate: '2026-11-02', endDate: '2026-11-04', notes: 'Family visit', approve: false },
    { who: 'Maria', leaveType: 'PERSONAL', startDate: '2026-10-30', endDate: '2026-10-30', notes: 'Moving apartment', approve: false },
    { who: 'Sofia', leaveType: 'ANNUAL', startDate: '2026-11-09', endDate: '2026-11-11', notes: 'Long weekend trip', approve: false },
  ];
  await setAuto(false);
  try {
    for (const t of toPlan) {
      const ag = agentByName(s, t.who);
      let row = existingTo.find((x: any) => x.agentId === ag.id && String(x.startDate).startsWith(t.startDate));
      if (!row) {
        const c = client(await login(ag.email), s.tenant.id);
        row = await c.post(SVC.scheduling, '/api/v1/timeoff-requests', { leaveType: t.leaveType, startDate: t.startDate, endDate: t.endDate, notes: t.notes });
      }
      if (t.approve && row.status === 'PENDING') row = await sup.put(SVC.scheduling, `/api/v1/timeoff-requests/${row.id}/approve`, {});
      log(`  time off ${t.who} ${t.startDate}: ${row.status}`);
    }
  } finally {
    await setAuto(true);
  }

  // --- Schedule exceptions ------------------------------------------------------------
  const exc = list(await admin.get(SVC.scheduling, '/api/v1/schedule-exceptions'));
  const exPlan = [
    { who: 'Kevin', by: 'supervisor', reasonCode: 'SYSTEM_ISSUE', startAt: `${TODAY}T07:00:00.000Z`, endAt: `${TODAY}T07:25:00.000Z`, notes: 'Softphone would not register after the Windows update' },
    { who: 'Maria', by: 'supervisor', reasonCode: 'MANAGER_APPROVED', startAt: `${TODAY}T15:00:00.000Z`, endAt: `${TODAY}T15:30:00.000Z`, notes: 'Coaching session with team lead' },
    { who: 'Tunde', by: 'self', reasonCode: 'EARLY_LEAVE', startAt: `${TODAY}T21:00:00.000Z`, endAt: `${TODAY}T22:00:00.000Z`, notes: 'Doctor appointment' },
    { who: 'Jose', by: 'self', reasonCode: 'LATE_START', startAt: `2026-10-23T14:00:00.000Z`, endAt: `2026-10-23T14:30:00.000Z`, notes: 'Typhoon traffic — will log in late' },
  ];
  for (const e of exPlan) {
    const ag = agentByName(s, e.who);
    if (exc.find((x: any) => x.agentId === ag.id && x.notes === e.notes)) continue;
    const c = e.by === 'supervisor' ? sup : client(await login(ag.email), s.tenant.id);
    const row = await c.post(SVC.scheduling, '/api/v1/schedule-exceptions', { agentId: ag.id, reasonCode: e.reasonCode, startAt: e.startAt, endAt: e.endAt, notes: e.notes });
    log(`  exception ${e.who} ${e.reasonCode}: ${row.status}`);
  }

  s.portal = {
    persona: { name: 'Amara Nwosu', email: amara.email, agentId: amara.id, userId: amara.userId, team: 'Brightline Care A' },
    vtoOffer: { id: vto.id, date: vtoDate, startTime: vtoStart, endTime: vtoEnd, queueId: vtoSlot.queueId },
    incomingSwap: swap ? { id: swap.id, from: `${chinedu.firstName} ${chinedu.lastName}`, date: swapPair?.[1]?.date, theirShift: `${swapPair?.[0]?.startTime}-${swapPair?.[0]?.endTime}`, herShift: `${swapPair?.[1]?.startTime}-${swapPair?.[1]?.endTime}` } : null,
    timeOff: toPlan.map((t) => ({ who: t.who, startDate: t.startDate, endDate: t.endDate, leaveType: t.leaveType, expected: t.approve ? 'APPROVED' : 'PENDING' })),
    exceptions: exPlan.map((e) => ({ who: e.who, reasonCode: e.reasonCode, startAt: e.startAt, status: e.by === 'supervisor' ? 'APPROVED' : 'PENDING' })),
  };
}

// ---------------------------------------------------------------------------
// Phase 1.11 — desktop activity (simulated Windows collector)
// ---------------------------------------------------------------------------
export const APP_CLASSES: Array<{ applicationId: string; category: string; rationale: string }> = [
  { applicationId: 'softphone.exe', category: 'productive', rationale: 'Contact-centre softphone' },
  { applicationId: 'crm-console.exe', category: 'productive', rationale: 'Customer CRM' },
  { applicationId: 'zendesk.exe', category: 'productive', rationale: 'Ticketing' },
  { applicationId: 'knowledge-base.exe', category: 'productive', rationale: 'Internal knowledge base' },
  { applicationId: 'excel.exe', category: 'productive', rationale: 'Reporting / trackers' },
  { applicationId: 'slack.exe', category: 'neutral', rationale: 'Team chat' },
  { applicationId: 'teams.exe', category: 'neutral', rationale: 'Meetings and chat' },
  { applicationId: 'outlook.exe', category: 'neutral', rationale: 'Email' },
  { applicationId: 'youtube.com', category: 'non_productive', rationale: 'Video streaming' },
  { applicationId: 'news-reader.exe', category: 'non_productive', rationale: 'News sites' },
];
// spotify.exe deliberately left unclassified.

const WORK_MIX: Array<[string, number]> = [
  ['softphone.exe', 34], ['crm-console.exe', 26], ['zendesk.exe', 14], ['knowledge-base.exe', 7], ['excel.exe', 3],
  ['slack.exe', 6], ['teams.exe', 4], ['outlook.exe', 3], ['spotify.exe', 1], ['youtube.com', 1.2], ['news-reader.exe', 0.8],
];

function pick(r: () => number, mix: Array<[string, number]>): string {
  const total = mix.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of mix) { x -= w; if (x <= 0) return k; }
  return mix[0]![0];
}

/** Deterministic UUID (v4-shaped) from a string — makes event ids idempotent across re-runs. */
export function detUuid(seed: string): string {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

interface DeviceCred { deviceId: string; secret: string; machine: string; forAgent: string | null }

async function deviceToken(s: DemoState, d: DeviceCred): Promise<string> {
  const r = await call<any>(SVC.analytics, '/api/v1/device/token', { body: { tenant_id: s.tenant.id, device_id: d.deviceId, device_secret: d.secret } });
  return r.access_token;
}

async function postBatches(token: string, envs: any[], sess: any[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const items: Array<['e' | 's', any]> = [...sess.map(({ collector_instance_id: _c, ...x }) => ['s', x] as ['s', any]), ...envs.map((x) => ['e', x] as ['e', any])];
  for (let i = 0; i < items.length; i += 180) {
    const chunk = items.slice(i, i + 180);
    const body = {
      schema_version: '1.1', batch_id: randomUUID(), agent_version: '1.4.2', policy_version: 'p1',
      events: chunk.filter(([k]) => k === 'e').map(([, v]) => v), session_events: chunk.filter(([k]) => k === 's').map(([, v]) => v),
    };
    const r = await call<any>(SVC.analytics, '/api/v1/device/activity/batches', { token, body });
    for (const o of r.outcomes) { const k = o.status + (o.rejection_reason ? `:${o.rejection_reason}` : ''); counts[k] = (counts[k] ?? 0) + 1; }
  }
  return counts;
}

export async function ensureDevices(s: DemoState, machines: Array<{ machine: string; forAgent: string | null }>): Promise<Record<string, DeviceCred>> {
  const admin = await adminClient(s);
  const devs = ((s.activity.devices as Record<string, DeviceCred>) ??= {});
  const missing = machines.filter((m) => !devs[m.machine]);
  if (missing.length) {
    const toks = list(await admin.post(SVC.analytics, '/api/v1/activity/enrollment-tokens', { label: 'Demo floor PCs', expires_in_days: 7, count: missing.length }));
    for (const [i, m] of missing.entries()) {
      const r = await call<any>(SVC.analytics, '/api/v1/device/enroll', { body: { token: toks[i].token, machine: { name: m.machine, os: 'windows', collector_version: '1.4.2' } } });
      devs[m.machine] = { deviceId: r.device_id, secret: r.device_secret, machine: m.machine, forAgent: m.forAgent };
      saveState(s);
    }
  }
  return devs;
}

function subjectFor(a: { email: string; firstName: string; lastName: string }, n: number) {
  return { windows_sid: `S-1-5-21-3623811015-3361044348-30300820-${1100 + n}`, windows_upn: a.email, windows_sam: `MERIDIAN\\${a.firstName}.${a.lastName}`.toLowerCase().replace(/\s+/g, '') };
}

/**
 * Simulate one UTC day of collector telemetry for the mapped agents, following their
 * published shifts. Buckets after `cutoff` (default now) are not sent. Idempotent:
 * event ids/sequences are derived from (agent, date, minute).
 */
export async function simulateDesktopDay(s: DemoState, date: string, cutoff = new Date()): Promise<void> {
  const int = internal(s.tenant.id);
  const people = (s.activity.agents as string[]).map((id) => s.agents.find((a) => a.id === id)!);
  const devs = s.activity.devices as Record<string, DeviceCred>;
  const from = `${date}T00:00:00.000Z`, to = `${addDays(date, 1)}T00:00:00.000Z`;
  const slots = list(await int.get(SVC.scheduling, `/internal/v1/shift-slots?agentIds=${people.map((p) => p.id).join(',')}&from=${from}&to=${to}`));
  const conflictAgent = s.activity.conflictAgent as string, gapAgent = s.activity.gapAgent as string;

  for (const p of people) {
    const mine = slots.filter((x: any) => x.agentId === p.id);
    const work = mine.find((x: any) => x.slotType === 'WORK');
    if (!work) continue;
    const dev = Object.values(devs).find((d) => d.forAgent === p.id && !d.machine.includes('-LT'))!;
    const subject = subjectFor(p, s.agents.findIndex((a) => a.id === p.id));
    const r = rng(createHash('md5').update(p.id + date).digest().readUInt32LE(0));
    const instance = detUuid(`${dev.deviceId}:${date}:instance`);
    const boot = `${dev.machine}:${date.replace(/-/g, '')}0640`;
    const base = { subject, boot_id: boot, session_id: '2', collector_instance_id: instance };
    const t0 = Date.parse(work.startAt), t1 = Date.parse(work.endAt);
    const pauses = mine.filter((x: any) => x.slotType === 'BREAK' || x.slotType === 'LUNCH').map((x: any) => [Date.parse(x.startAt), Date.parse(x.endAt)] as [number, number]);
    const envs: any[] = [], sess: any[] = [];
    const sessEvt = (type: string, at: number) => { if (at <= cutoff.getTime()) sess.push({ event_id: detUuid(`${p.id}:${date}:${type}:${at}`), ...base, type, occurred_at: new Date(at).toISOString() }); };
    const lateBy = Math.floor(r() * 4);
    sessEvt('logon', t0 - (3 - lateBy) * 60000);
    for (const [a, b] of pauses) { if (r() < 0.75) { sessEvt('lock', a + 30000); sessEvt('unlock', b - 60000); } }
    sessEvt('logoff', t1 + 2 * 60000);

    let app = 'softphone.exe', left = 0;
    // A short mid-shift idle stretch for everyone, a long "network drop" gap for one agent.
    const idleAt = t0 + Math.floor((2 + r() * 4) * 3600000);
    const idleLen = (4 + Math.floor(r() * 6)) * 60000;
    const gapAt = t0 + 3.2 * 3600000;
    for (let t = t0 - (3 - lateBy) * 60000; t < t1 + 60000; t += 60000) {
      if (t + 60000 > cutoff.getTime()) break;
      if (p.id === gapAgent && t >= gapAt && t < gapAt + 42 * 60000) continue; // no evidence → unknown
      const pause = pauses.find(([a, b]) => t >= a && t < b);
      let slices: any[];
      if (pause) {
        // most breaks are locked; every third one is spent browsing
        slices = Math.floor(pause[0] / 60000) % 3 === 0
          ? [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: r() < 0.6 ? 'youtube.com' : 'news-reader.exe', state: 'active' }]
          : [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: null, state: 'locked' }];
      } else if (t >= idleAt && t < idleAt + idleLen) {
        slices = [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: 'crm-console.exe', state: 'inactive' }];
      } else {
        if (left <= 0) { app = pick(r, WORK_MIX); left = app.endsWith('.com') || app === 'spotify.exe' ? 1 + Math.floor(r() * 3) : 2 + Math.floor(r() * 12); }
        left--;
        const cut = r() < 0.35 ? 10000 + Math.floor(r() * 40000) : 0;
        if (cut) {
          const other = app === 'softphone.exe' ? 'crm-console.exe' : 'softphone.exe';
          slices = [{ start_offset_ms: 0, end_offset_ms: cut, application_id: app, state: 'active' }, { start_offset_ms: cut, end_offset_ms: 60000, application_id: other, state: 'active' }];
        } else {
          slices = [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: app, state: r() < 0.04 ? 'inactive' : 'active' }];
        }
      }
      envs.push({
        event_id: detUuid(`${p.id}:${date}:${t}`), ...base, sequence: Math.floor((t - Date.parse(from)) / 60000),
        bucket_start: new Date(t).toISOString(), bucket_end: new Date(t + 60000).toISOString(), coarsened: false, slices,
      });
    }
    const counts = await postBatches(await deviceToken(s, dev), envs, sess);
    log(`  ${date} ${p.firstName} ${p.lastName} @${dev.machine}: ${envs.length} buckets, ${sess.length} session events`, JSON.stringify(counts));

    if (p.id === conflictAgent) {
      // A laptop signed in as the same person claims activity while the desk PC reports locked.
      const lt = Object.values(devs).find((d) => d.forAgent === p.id && d.machine.includes('-LT'))!;
      const winStart = t0 + 5 * 3600000, winEnd = winStart + 25 * 60000;
      const lbase = { subject, boot_id: `${lt.machine}:${date.replace(/-/g, '')}1100`, session_id: '1', collector_instance_id: detUuid(`${lt.deviceId}:${date}:instance`) };
      const lenvs: any[] = [], denvs: any[] = [];
      for (let t = winStart; t < winEnd && t + 60000 <= cutoff.getTime(); t += 60000) {
        const seq = Math.floor((t - Date.parse(from)) / 60000);
        lenvs.push({ event_id: detUuid(`${lt.deviceId}:${date}:${t}`), ...lbase, sequence: seq,
          bucket_start: new Date(t).toISOString(), bucket_end: new Date(t + 60000).toISOString(), coarsened: false,
          slices: [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: 'slack.exe', state: 'active' }] });
        denvs.push({ event_id: detUuid(`${p.id}:${date}:conflictlock:${t}`), ...base, session_id: '3', sequence: 100000 + seq,
          bucket_start: new Date(t).toISOString(), bucket_end: new Date(t + 60000).toISOString(), coarsened: false,
          slices: [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: null, state: 'locked' }] });
      }
      const ls = [{ event_id: detUuid(`${lt.deviceId}:${date}:logon`), ...lbase, type: 'logon', occurred_at: new Date(winStart - 60000).toISOString() }];
      if (lenvs.length) log(`   conflict via ${lt.machine}`, JSON.stringify(await postBatches(await deviceToken(s, lt), lenvs, ls)), JSON.stringify(await postBatches(await deviceToken(s, dev), denvs, [])));
    }
  }

  // Unassigned sign-in: a temp login nobody has mapped yet.
  const ua = devs['MNL-WS-0219'];
  if (ua) {
    const subj = { windows_sid: 'S-1-5-21-3623811015-3361044348-30300820-1999', windows_upn: 'temp.trainee04@meridian.test', windows_sam: 'meridian\\temp.trainee04' };
    const ub = { subject: subj, boot_id: `MNL-WS-0219:${date.replace(/-/g, '')}0800`, session_id: '2', collector_instance_id: detUuid(`${ua.deviceId}:${date}:instance`) };
    const st = Date.parse(`${date}T09:12:00.000Z`);
    const envs: any[] = [];
    for (let t = st; t < st + 50 * 60000 && t + 60000 <= cutoff.getTime(); t += 60000) {
      envs.push({ event_id: detUuid(`ua:${date}:${t}`), ...ub, sequence: Math.floor((t - Date.parse(from)) / 60000), bucket_start: new Date(t).toISOString(), bucket_end: new Date(t + 60000).toISOString(), coarsened: false,
        slices: [{ start_offset_ms: 0, end_offset_ms: 60000, application_id: (t / 60000) % 7 ? 'knowledge-base.exe' : 'crm-console.exe', state: 'active' }] });
    }
    const sess = st <= cutoff.getTime() ? [{ event_id: detUuid(`ua:${date}:logon`), ...ub, type: 'logon', occurred_at: new Date(st - 60000).toISOString() }] : [];
    if (envs.length || sess.length) log('  unassigned sign-in', JSON.stringify(await postBatches(await deviceToken(s, ua), envs, sess)));
  }
}

/** Health ping for every simulated device so the Devices tab shows them as recently seen. */
export async function pingDevices(s: DemoState): Promise<void> {
  const devs = (s.activity.devices ?? {}) as Record<string, DeviceCred>;
  for (const d of Object.values(devs)) {
    const p = d.forAgent ? s.agents.find((a) => a.id === d.forAgent) : null;
    const tok = await deviceToken(s, d);
    await call(SVC.analytics, '/api/v1/device/health', { token: tok, body: {
      schema_version: '1.1', collector_instance_id: detUuid(`${d.deviceId}:health`), reported_at: new Date().toISOString(),
      collector_version: '1.4.2', policy_version: 'p1', queue_depth: 0, queue_bytes: 0, losses: 0, clock_skew_ms: 12,
      sessions: p ? [{ subject: subjectFor(p, s.agents.findIndex((a) => a.id === p.id)), state: 'active' }] : [], warnings: [],
    } });
  }
  log(`  pinged ${Object.keys(devs).length} devices`);
}

export async function phaseActivity(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  // Classifications, then backdate them so yesterday is classified too (resolver ignores future versions).
  await admin.put(SVC.analytics, '/api/v1/activity/classifications', { items: APP_CLASSES.map((c) => ({ ...c, scope: 'tenant', campaignId: null })) });
  sql('wfm_analytics', `update application_classifications set effective_from='2026-09-01' where tenant_id='${s.tenant.id}'`);
  await admin.put(SVC.analytics, '/api/v1/activity/settings', { callApplicationIds: ['softphone.exe'], graceMinutes: 10 });

  // Every agent with a published shift yesterday or today gets a desk PC — otherwise their
  // rows show 100% "unknown" and raise exceptions. Brightline (incl. Amara) is the showcase.
  const int = internal(s.tenant.id);
  const slots = list(await int.get(SVC.scheduling, `/internal/v1/shift-slots?agentIds=${s.agents.map((a) => a.id).join(',')}&from=${addDays(TODAY, -1)}T00:00:00.000Z&to=${addDays(TODAY, 1)}T00:00:00.000Z`));
  const chosen = s.agents.filter((a) => slots.some((x: any) => x.agentId === a.id && x.slotType === 'WORK'));
  if (!chosen.find((a) => a.firstName === 'Amara')) throw new Error('Amara not working today');
  s.activity.agents = chosen.map((a) => a.id);
  s.activity.conflictAgent = (chosen.find((a) => a.firstName === 'Jose') ?? chosen[1]!).id;
  s.activity.gapAgent = (chosen.find((a) => a.firstName === 'Tunde') ?? chosen[2]!).id;
  await admin.post(SVC.analytics, '/api/v1/activity/identities/bulk', {
    identities: chosen.map((a) => ({ agentId: a.id, kind: 'windows_upn', value: a.email })),
  });
  const sitePrefix: Record<string, string> = { Lagos: 'LOS', Manila: 'MNL', Austin: 'AUS' };
  const devs0 = (s.activity.devices ?? {}) as Record<string, DeviceCred>;
  const machines = chosen.map((a) => {
    const had = Object.values(devs0).find((d) => d.forAgent === a.id && !d.machine.includes('-LT'));
    return { machine: had?.machine ?? `${sitePrefix[a.site]}-WS-${String(301 + s.agents.findIndex((x) => x.id === a.id) * 7).padStart(4, '0')}`, forAgent: a.id };
  });
  const conflict = chosen.find((a) => a.id === s.activity.conflictAgent)!;
  machines.push({ machine: `${sitePrefix[conflict.site]}-LT-0388`, forAgent: conflict.id });
  machines.push({ machine: 'MNL-WS-0219', forAgent: null });
  await ensureDevices(s, machines);
  saveState(s);
  for (const d of [addDays(TODAY, -1), TODAY]) await simulateDesktopDay(s, d);
  await pingDevices(s);
}

// ---------------------------------------------------------------------------
// Phase 1.12 — real-time board
// ---------------------------------------------------------------------------
/**
 * Push a believable live floor for `now` (default: the real clock). Agents whose published
 * WORK/BREAK/LUNCH slot covers `now` get a status matching their schedule, except 3 who are
 * deliberately out of adherence; 2 off-shift agents show OFFLINE. Earlier contacts are
 * back-filled so Queue Metrics show a small backlog. ~40 POSTs, a couple of seconds.
 *
 * Adherence is judged by realtime-service against the REAL clock, so call this while
 * real UTC time is inside operating hours (07:00–22:00) or the board will look red.
 */
export async function pushLiveStatuses(s: DemoState = loadState(), now: Date = new Date(), scheduleAt: Date = now): Promise<{ scheduled: number; posted: number; outOfAdherence: string[] }> {
  const admin = await adminClient(s);
  const int = internal(s.tenant.id);
  const ids = s.agents.map((a) => a.id).join(',');
  const from = new Date(scheduleAt.getTime() - 14 * 3600000).toISOString(), to = new Date(scheduleAt.getTime() + 3600000).toISOString();
  const slots = list(await int.get(SVC.scheduling, `/internal/v1/shift-slots?agentIds=${ids}&from=${from}&to=${to}`));
  const t = now.getTime(), ts = scheduleAt.getTime();
  const covering = (a: AgentRec, types: string[]) => slots.find((x: any) => x.agentId === a.id && types.includes(x.slotType) && Date.parse(x.startAt) <= ts && Date.parse(x.endAt) > ts);
  const onShift = s.agents.map((a) => ({ a, work: covering(a, ['WORK']), pause: covering(a, ['BREAK', 'LUNCH']), meet: covering(a, ['MEETING', 'TRAINING']) })).filter((x) => x.work);
  if (onShift.length === 0) log(`  WARNING: nobody is scheduled at ${scheduleAt.toISOString()} — only OFFLINE statuses will be posted`);
  const r = rng(Math.floor(t / 60000));
  const ago = (sec: number) => new Date(t - sec * 1000).toISOString();
  const channelOf = (qid: string) => QUEUES.find((q) => s.queues[q.name] === qid)?.channel ?? 'VOICE';
  const events: Array<{ agentId: string; status: string; queueId: string | null; contactId?: string | null; occurredAt: string }> = [];
  const out: string[] = [];
  // Pick 3 working (not on break) agents to be out of adherence, never Amara.
  const free = onShift.filter((x) => !x.pause && !x.meet && x.a.firstName !== 'Amara');
  const blFree = free.filter((x) => x.a.group.startsWith('brightline'));
  const candidates = blFree.length >= 4 ? blFree : free;
  const rogue = new Map<string, string>();
  const rogueStatuses = ['ON_BREAK', 'OFFLINE', 'IN_MEETING'];
  const shuffled = [...candidates].sort(() => r() - 0.5);
  for (const c of shuffled.slice(0, Math.min(3, Math.max(0, candidates.length - 2)))) rogue.set(c.a.id, rogueStatuses[rogue.size]!);
  const backlog: Record<string, number> = {};
  for (const { a, work, pause, meet } of onShift) {
    const qid: string = work.queueId;
    const ch = channelOf(qid);
    let status: string;
    let since: number;
    if (rogue.has(a.id)) { status = rogue.get(a.id)!; since = 300 + Math.floor(r() * 600); out.push(`${a.firstName} ${a.lastName} (${status})`); }
    else if (pause) { status = 'ON_BREAK'; since = Math.max(30, Math.floor((ts - Date.parse(pause.startAt)) / 1000)); }
    else if (meet) { status = meet.slotType === 'TRAINING' ? 'TRAINING' : 'IN_MEETING'; since = Math.floor((ts - Date.parse(meet.startAt)) / 1000); }
    else {
      const x = r();
      status = x < 0.62 ? (ch === 'VOICE' ? 'ON_CALL' : 'ON_CHAT') : 'AVAILABLE';
      since = status === 'AVAILABLE' ? 10 + Math.floor(r() * 90) : 20 + Math.floor(r() * 100);
    }
    since = Math.min(since, 1700);
    const busy = status === 'ON_CALL' || status === 'ON_CHAT';
    // Earlier handled contact for most agents (contactsToday, distinct contacts → backlog).
    if (status !== 'OFFLINE' && channelOf(qid) !== 'EMAIL' && (backlog[qid] ?? 0) < (channelOf(qid) === 'VOICE' ? 3 : 2) && r() < 0.45) {
      const earlier = Math.min(1750, since + 120 + Math.floor(r() * 600));
      events.push({ agentId: a.id, status: ch === 'VOICE' ? 'ON_CALL' : 'ON_CHAT', queueId: qid, contactId: `c-${a.id.slice(0, 8)}-e${Math.floor(t / 1800000)}`, occurredAt: ago(earlier) });
      backlog[qid] = (backlog[qid] ?? 0) + 1;
    }
    events.push({ agentId: a.id, status, queueId: status === 'OFFLINE' ? null : qid, contactId: busy ? `c-${a.id.slice(0, 8)}-l${Math.floor(t / 1800000)}` : null, occurredAt: ago(since) });
  }
  // Off-shift people: anyone still showing an online status from an earlier push logs off,
  // plus two who just finished their shift.
  const board = list(await admin.get(SVC.realtime, '/api/v1/realtime/agents'));
  const offShift = s.agents.filter((a) => !onShift.find((x) => x.a.id === a.id));
  const stale = offShift.filter((a) => board.find((b: any) => b.agentId === a.id && b.status !== 'OFFLINE'));
  const off = [...new Set([...stale, ...offShift.filter((a) => a.group !== 'northwind').slice(0, 2)])];
  for (const a of off) events.push({ agentId: a.id, status: 'OFFLINE', queueId: null, contactId: null, occurredAt: ago(stale.includes(a) ? 20 : 600 + Math.floor(r() * 900)) });

  events.sort((p, q) => p.occurredAt.localeCompare(q.occurredAt));
  for (const e of events) await admin.post(SVC.realtime, '/api/v1/realtime/agent-status', e);
  log(`  live: ${onShift.length} on shift, ${events.length} events posted; out of adherence: ${out.join(', ') || 'none'}`);
  return { scheduled: onShift.length, posted: events.length, outOfAdherence: out };
}

export async function phaseLive(s: DemoState): Promise<void> {
  // LIVE_SCHEDULE_AT lets you test outside operating hours: statuses follow the schedule at that
  // instant but are timestamped now (adherence will then read as broken — expected).
  const at = process.env.LIVE_SCHEDULE_AT;
  await pushLiveStatuses(s, new Date(), at ? new Date(at) : undefined);
  const admin = await adminClient(s);
  const agents = list(await admin.get(SVC.realtime, '/api/v1/realtime/agents'));
  const queues = list(await admin.get(SVC.realtime, '/api/v1/realtime/queues'));
  const adh = await admin.get(SVC.realtime, '/api/v1/realtime/adherence');
  log(`  board: ${agents.length} agents; statuses ${JSON.stringify(agents.reduce((m: any, x: any) => { m[x.status] = (m[x.status] ?? 0) + 1; return m; }, {}))}`);
  for (const q of queues) log(`   queue ${q.queueName}: online ${q.agentsOnline} avail ${q.agentsAvailable} onCall ${q.agentsOnCall} waiting ${q.contactsWaiting} avgWait ${q.averageWaitSeconds} prod ${q.productiveAgentPercent} ${q.status}`);
  log(`  adherence ${JSON.stringify(adh)}`);
}

// ---------------------------------------------------------------------------
// Phase 3 — Northwind interval-compliance staffing grid (.xlsx)
// ---------------------------------------------------------------------------
export const GRID_PATH = join(HERE, 'northwind-staffing-grid.xlsx');
export const NORTHWIND_QUEUE = 'Voice – Northwind';
export const GRID_FROM = '2026-10-19';
export const GRID_TO = '2026-11-08';

/** Wizard choices that read northwind-staffing-grid.xlsx (same layout as scripts/demo/voice-w35-demo.xlsx). */
export const IMPORT_WIZARD = {
  file: GRID_PATH,
  gridName: 'Northwind Voice — staffing grid',
  profile: {
    id: 'northwind-voice-15m', label: 'Northwind — 15-min interval headcount', sheet: 0, sheetName: 'Sheet1',
    orientation: 'long', orientationLabel: 'Long / tidy (one queue per row)', headerRow: 1, dataStartRow: 2,
    intervalMinutes: 15, timezone: 'UTC',
    dateEncoding: 'iso_string', dateEncodingLabel: 'ISO string',
    timeEncoding: 'hh_mm_string', timeEncodingLabel: 'HH:MM string',
    requirementBasis: 'as_supplied', requirementBasisLabel: 'As supplied',
    columns: { date: 'Date', interval: 'Interval', queue: 'Queue', requirement: 'Requirement' },
    queues: [NORTHWIND_QUEUE],
  },
  notes: [
    'Interval minutes must be changed from the 30 default to 15.',
    'Queue name in the file is "Voice – Northwind" with an EN DASH (U+2013); pick it from "Queues to import" (the campaign must already have the queue linked), do not tick "My file labels queues differently".',
    'The contract must be 15-minute, timezone UTC, preset Interval compliance, effective on/before 2026-10-26 (grid covers 2026-10-19..2026-11-08).',
  ],
} as const;

/** 0.7 → weekday peaks of 6–7, which 9 agents on 5×8.5h can staff; 1.0 → peaks of 8–9 (needs ~13 agents). */
export const NW_PEAK_SCALE = Number(process.env.NW_PEAK_SCALE ?? '0.7');
const NW_DOW = [0, 1.1, 1.0, 1.0, 0.98, 0.95, 0]; // Sun..Sat — Northwind runs a Mon–Fri desk
export function northwindRequirement(date: string, minute: number): number {
  const h = (minute + 7.5) / 60;
  const week = Math.floor((Date.parse(date) - Date.parse(GRID_FROM)) / (7 * 864e5));
  const k = NW_PEAK_SCALE;
  const v = (0.9 + k * (7.4 * gauss(h, 10.5, 0.95) + 1.6 * gauss(h, 13.0, 0.5) + 2.2 * gauss(h, 15.5, 1.1) + 3.4 * gauss(h, 19.1, 0.85)))
    * NW_DOW[dow(date)]! * (1 + 0.02 * week);
  if (NW_DOW[dow(date)] === 0) return 0;
  return Math.max(h < 8 || h >= 21.5 ? 1 : 2, Math.round(v));
}

export async function buildNorthwindGrid(path = GRID_PATH, queueName = NORTHWIND_QUEUE): Promise<string> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(['Date', 'Interval', 'Queue', 'Requirement']);
  let rows = 0;
  for (let d = GRID_FROM; d <= GRID_TO; d = addDays(d, 1)) {
    for (let m = 7 * 60; m < 22 * 60; m += 15) {
      ws.addRow([d, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, queueName, northwindRequirement(d, m)]);
      rows++;
    }
  }
  ws.getColumn(1).width = 12; ws.getColumn(2).width = 10; ws.getColumn(3).width = 20; ws.getColumn(4).width = 13;
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(path);
  log(`  wrote ${path} (${rows} rows)`);
  return path;
}

export async function phaseGrid(s: DemoState): Promise<void> {
  await buildNorthwindGrid();
  s.importWizard = { ...IMPORT_WIZARD, profile: { ...IMPORT_WIZARD.profile } } as unknown as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Phase 2 — Northwind (on-camera client) helpers
// ---------------------------------------------------------------------------
export const NORTHWIND_TEMPLATES = [
  { name: 'Early 07:00–15:30', startTime: '07:00', lengthMinutes: 510, daysOfWeek: WEEKDAYS },
  { name: 'Day 09:00–17:30', startTime: '09:00', lengthMinutes: 510, daysOfWeek: WEEKDAYS },
  { name: 'Mid 11:30–20:00', startTime: '11:30', lengthMinutes: 510, daysOfWeek: WEEKDAYS },
  { name: 'Late 13:30–22:00', startTime: '13:30', lengthMinutes: 510, daysOfWeek: WEEKDAYS },
];

/**
 * Call after the Northwind campaign exists (created on camera). Creates team
 * "Northwind Voice A" in that campaign with the 9 Northwind-eligible agents and the four
 * 8.5h shift templates (breaks + lunch are placed by the tenant's break/lunch rules at
 * Generate time — templates carry no break fields). Also links "Voice – Northwind" to the
 * campaign if it is not linked yet (idempotent). Safe to re-run.
 */
export async function prepareNorthwindForGenerate(campaignId: string, s: DemoState = loadState(), opts: { teamName?: string; queueId?: string; agentIds?: string[] } = {}): Promise<{ teamId: string; templateIds: string[]; agentIds: string[] }> {
  const admin = await adminClient(s);
  const queueId = opts.queueId ?? s.queues[NORTHWIND_QUEUE]!;
  const agentIds = opts.agentIds ?? s.northwindAgentIds;
  const teamName = opts.teamName ?? 'Northwind Voice A';
  const linked = list(await admin.get(SVC.forecasting, `/api/v1/campaigns/${campaignId}/queues`));
  if (!linked.find((l: any) => (l.queueId ?? l.id) === queueId)) await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/queues`, { queueId });
  const teams = list(await admin.get(SVC.workforce, `/api/v1/teams?campaignId=${campaignId}`));
  const team = teams.find((t: any) => t.name === teamName) ?? await admin.post(SVC.workforce, '/api/v1/teams', { name: teamName, timezone: 'UTC', campaignId, queueIds: [queueId] });
  await admin.post(SVC.workforce, '/api/v1/agents/bulk', { agentIds, addTeamIds: [team.id], addQueueIds: [queueId] });
  const templateIds = await ensureTemplates(admin, campaignId, NORTHWIND_TEMPLATES);
  log(`  Northwind prepared: team ${team.id} (${agentIds.length} agents), ${templateIds.length} templates`);
  return { teamId: team.id, templateIds, agentIds };
}

/**
 * Optional, after the preset is applied: the Interval compliance preset installs a
 * zero-tolerance `interval_match` BREACH policy, so Publish (which sends campaignId)
 * will refuse almost any generated roster. This swaps it for the same check at
 * severity "warning" with ±1 agent tolerance so Publish succeeds on camera.
 */
export async function relaxNorthwindCompliance(campaignId: string, s: DemoState = loadState()): Promise<void> {
  const admin = await adminClient(s);
  const contracts = list(await admin.get(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts`));
  for (const c of contracts) {
    const cfg = await contractConfig(admin, campaignId, c.id);
    for (const p of list(cfg.policies).filter((x: any) => x.kind === 'interval_match' && x.severity === 'breach')) {
      await admin.del(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts/${c.id}/policies/${p.id}`);
      await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts/${c.id}/policies`, {
        kind: 'interval_match', severity: 'warning', config: { toleranceMode: 'absolute', toleranceUnder: 1, toleranceOver: 1 },
      });
      log(`  relaxed interval_match on contract ${c.id}`);
    }
  }
}

/** Mirror of the on-camera flow, via API: client → campaign → contract → preset → link → import → commit. */
export async function setupIntervalComplianceCampaign(s: DemoState, o: {
  client: string; campaign: string; queueId: string; queueName: string; gridFile: string; effectiveFrom?: string;
}): Promise<{ clientId: string; campaignId: string; contractId: string; gridId: string; versionId: string; job: any }> {
  const admin = await adminClient(s);
  const { clientId, campaignId } = await ensureClientCampaign(admin, o.client, null as unknown as string, o.campaign);
  const contractId = await ensureContract(admin, campaignId, {
    effectiveFrom: o.effectiveFrom ?? '2026-10-19', intervalMinutes: 15, timezone: 'UTC', weekStartDay: 'MONDAY', requirementLock: 'locked', shrinkagePercent: 0,
  });
  await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/queues`, { queueId: o.queueId });
  const cfg = await contractConfig(admin, campaignId, contractId);
  if (list(cfg.sources).length === 0) await admin.post(SVC.forecasting, `/api/v1/campaigns/${campaignId}/contracts/${contractId}/preset`, { preset: 'interval_compliance' });
  const p = IMPORT_WIZARD.profile;
  const grid = await admin.post(SVC.forecasting, '/api/v1/requirement-grids', { campaignId, name: IMPORT_WIZARD.gridName });
  const profiles = list(await admin.get(SVC.forecasting, '/api/v1/import-profiles'));
  const nextVersion = 1 + Math.max(0, ...profiles.filter((x: any) => x.profileId === p.id).map((x: any) => Number(x.version)));
  const profile = await admin.post(SVC.forecasting, '/api/v1/import-profiles', {
    campaignId, profileId: p.id, version: nextVersion,
    document: {
      id: p.id, version: 1, label: p.label, sheet: p.sheet, orientation: p.orientation, headerRow: p.headerRow, dataStartRow: p.dataStartRow,
      intervalMinutes: p.intervalMinutes, requirementBasis: p.requirementBasis, timezone: p.timezone, dateEncoding: p.dateEncoding,
      timeEncoding: p.timeEncoding, scope: { queues: [o.queueName] },
      columns: Object.fromEntries(Object.entries(p.columns).map(([k, v]) => [k, { by: 'header', value: v }])),
    },
  });
  const staged = await admin.post(SVC.forecasting, `/api/v1/requirement-grids/${grid.id}/imports`, {
    importProfileId: profile.id, filename: 'northwind-staffing-grid.xlsx', fileBase64: readFileSync(o.gridFile).toString('base64'),
  });
  const es = staged.job?.errorSummary ?? {};
  log(`  staged: canCommit=${staged.canCommit} job=${staged.job?.status} rows=${Array.isArray(es.stagedRows) ? es.stagedRows.length : es.stagedRows} rejections=${es.rejections?.length ?? 0} warnings=${JSON.stringify(es.warnings ?? []).slice(0, 300)}`);
  if (!staged.canCommit) throw new Error('import cannot be committed');
  const committed = await admin.post(SVC.forecasting, `/api/v1/requirement-grid-versions/${staged.version.id}/commit`, {});
  log(`  committed: ${JSON.stringify(committed).slice(0, 300)}`);
  return { clientId, campaignId, contractId, gridId: grid.id, versionId: staged.version.id, job: staged.job };
}

/**
 * Phase 3 verification on a throwaway copy: a separate queue that is ALSO named
 * "Voice – Northwind" (so the real file imports unchanged) in client "Test Client",
 * team + templates via prepareNorthwindForGenerate, Generate for week 2026-10-26,
 * then everything is removed/archived again.
 */
export async function testImportAndGenerate(s: DemoState): Promise<void> {
  const admin = await adminClient(s);
  if (!existsSync(GRID_PATH)) await buildNorthwindGrid();
  const tq = await admin.post(SVC.forecasting, '/api/v1/queues', { name: NORTHWIND_QUEUE, channel: 'VOICE', slaTargetSeconds: 20, slaTargetPercent: 80, ahtSeconds: 330, shrinkagePercent: 30, timezone: 'UTC' });
  let campaignId = '', clientId = '', teamId = '', scheduleId = '';
  const result: Record<string, unknown> = { throwawayQueueId: tq.id };
  try {
    const r = await setupIntervalComplianceCampaign(s, { client: 'Test Client', campaign: 'Test Campaign', queueId: tq.id, queueName: NORTHWIND_QUEUE, gridFile: GRID_PATH });
    campaignId = r.campaignId; clientId = r.clientId;
    const es = r.job?.errorSummary ?? {};
    result.import = { canCommit: true, gridId: r.gridId, stagedRows: Array.isArray(es.stagedRows) ? es.stagedRows.length : es.stagedRows, rejections: es.rejections?.length ?? 0, warnings: es.warnings?.length ?? 0 };
    const reqs = list(await admin.get(SVC.forecasting, `/api/v1/requirement-grids/${r.gridId}/requirements?asOf=${new Date().toISOString()}&queueId=${tq.id}`));
    result.requirementRows = reqs.length;
    const prep = await prepareNorthwindForGenerate(campaignId, s, { teamName: 'Test Team', queueId: tq.id });
    teamId = prep.teamId;
    const g = await generateAndPublish(admin, s, 'testclient', campaignId, [tq.id], NEXT_WEEK_START, 'Test — wk 44', { publish: false });
    scheduleId = g.id;
    result.generate = { slots: g.slots, warnings: (g.warnings as any[]).reduce((m: Record<string, number>, w: any) => { m[w.ruleType] = (m[w.ruleType] ?? 0) + 1; return m; }, {}) };
    // Coverage summary vs the grid (Mon 2026-10-26)
    const slots = list(await admin.get(SVC.scheduling, `/api/v1/schedules/${scheduleId}/shift-slots`));
    const mon = slots.filter((x: any) => String(x.date).startsWith(NEXT_WEEK_START));
    const perAgent = new Set(slots.filter((x: any) => x.slotType === 'WORK').map((x: any) => x.agentId)).size;
    result.coverageMonday = { workSlots: mon.filter((x: any) => x.slotType === 'WORK').length, agentsUsedInWeek: perAgent };
    const pub = await tryCall(() => admin.post(SVC.scheduling, `/api/v1/schedules/${scheduleId}/compliance/evaluate`, { campaignId }));
    result.complianceEvaluate = pub instanceof HttpError ? pub.message.slice(0, 300) : JSON.stringify(pub).slice(0, 300);
  } finally {
    // Cleanup — leave tenant meridian as it was.
    if (scheduleId) await tryCall(() => admin.del(SVC.scheduling, `/api/v1/schedules/${scheduleId}`));
    delete s.schedules[`testclient:${NEXT_WEEK_START}`];
    await tryCall(() => admin.post(SVC.workforce, '/api/v1/agents/bulk', { agentIds: s.northwindAgentIds, removeQueueIds: [tq.id], ...(teamId ? { removeTeamIds: [teamId] } : {}) }));
    if (teamId) await tryCall(() => admin.del(SVC.workforce, `/api/v1/teams/${teamId}`));
    if (campaignId) {
      for (const t of list(await admin.get(SVC.scheduling, `/api/v1/shift-templates?campaignId=${campaignId}`)).filter((x: any) => x.campaignId === campaignId)) await tryCall(() => admin.del(SVC.scheduling, `/api/v1/shift-templates/${t.id}`));
      await tryCall(() => admin.del(SVC.forecasting, `/api/v1/campaigns/${campaignId}/queues/${tq.id}`));
      await tryCall(() => admin.del(SVC.forecasting, `/api/v1/campaigns/${campaignId}`));
    }
    if (clientId) await tryCall(() => admin.del(SVC.forecasting, `/api/v1/clients/${clientId}`));
    await tryCall(() => admin.del(SVC.forecasting, `/api/v1/queues/${tq.id}`));
    s.testImport = result;
    saveState(s);
    log('  test import result', JSON.stringify(result, null, 1));
  }
}

// ---------------------------------------------------------------------------
// Summary block in demo-state.json for the recording scripts
// ---------------------------------------------------------------------------
export async function phaseSummary(s: DemoState): Promise<void> {
  const nw = s.agents.filter((a) => a.group === 'northwind');
  s.logins = {
    url: WEB_URL, tenantSlug: TENANT_SLUG, tenantId: s.tenant.id, password: PASSWORD,
    note: 'Login sends x-tenant-id or tenantSlug; all users were created via /users/bootstrap so none must change password.',
    admin: 'admin@meridian.test (Dana Okafor, ADMIN)',
    analyst: 'analyst@meridian.test (Priya Raman, WFM_ANALYST)',
    supervisor: 'supervisor@meridian.test (Marcus Bell, SUPERVISOR)',
    vendor: 'vendor@atlasbpo.test (Leo Hart, VENDOR → Atlas BPO portal)',
    agentPersona: 'amara.nwosu@meridian.test (Amara Nwosu, AGENT, Brightline Care A)',
    agents: s.agents.map((a) => a.email),
  };
  s.northwindOnCamera = {
    client: 'Northwind Delivery', campaign: '(any name, e.g. "Delivery Support")',
    contract: { effectiveFrom: '2026-10-19 (any date on/before 2026-10-26)', intervalMinutes: 15, timezone: 'UTC', weekStartDay: 'MONDAY', shrinkagePercent: 'any (grid is as-supplied)', preset: 'interval_compliance (Interval compliance)' },
    queue: { link: NORTHWIND_QUEUE, queueId: s.queues[NORTHWIND_QUEUE], planningUnit: 'interval_headcount (default)' },
    order: [
      '1. Create client Northwind Delivery → campaign → contract (15-min, UTC) → apply Interval compliance preset',
      '2. Link queue "Voice – Northwind" to the campaign (must happen before the import: the wizard scope lists linked queue names)',
      '3. Import northwind-staffing-grid.xlsx with importWizard choices → Preview (1260 rows, 0 rejections) → Commit',
      '4. Off camera: prepareNorthwindForGenerate(campaignId) (team "Northwind Voice A" + 9 agents + 4 Mon–Fri templates); optionally relaxNorthwindCompliance(campaignId) before Publish',
      '5. Scheduling → scope Northwind campaign → week of 2026-10-26 → Generate (≈180 slots, 9 agents, Mon–Fri; ~7 minor under-coverage intervals Monday evening)',
    ],
    agents: nw.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, site: a.site })),
  };
  s.howTo = {
    pushLiveStatuses: "import { pushLiveStatuses } from './setup/setup-demo.ts'; await pushLiveStatuses();  // or: npx tsx setup/setup-demo.ts live",
    prepareNorthwindForGenerate: "await prepareNorthwindForGenerate('<northwind campaignId>')  // or: NORTHWIND_CAMPAIGN_ID=<id> [RELAX_COMPLIANCE=1] npx tsx setup/setup-demo.ts northwind",
    refreshDesktopActivityForAnotherDay: "await simulateDesktopDay(loadState(), 'YYYY-MM-DD'); await pingDevices(loadState())",
  };
}

//@@PHASES@@

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const STEPS: Record<string, (s: DemoState) => Promise<unknown>> = {
  auth: phaseAuth,
  flags: phaseFlags,
  sites: phaseSitesSkills,
  queues: phaseQueues,
  vendors: phaseVendors,
  clients: phaseClients,
  agents: phaseAgents,
  rules: phaseRules,
  demand: phaseDemand,
  schedules: phaseSchedules,
  history: phaseHistory,
  vendordata: phaseVendorData,
  portal: phasePortal,
  activity: phaseActivity,
  grid: phaseGrid,
  summary: phaseSummary,
  live: phaseLive,
  testimport: testImportAndGenerate,
  northwind: async (st) => {
    const id = process.env.NORTHWIND_CAMPAIGN_ID;
    if (!id) throw new Error('set NORTHWIND_CAMPAIGN_ID');
    await prepareNorthwindForGenerate(id, st);
    if (process.env.RELAX_COMPLIANCE) await relaxNorthwindCompliance(id, st);
  },
  //@@STEPS@@
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const names = args.length ? args : Object.keys(STEPS).filter((k) => !['northwind', 'testimport'].includes(k));
  const s = loadState();
  for (const n of names) {
    const f = STEPS[n];
    if (!f) throw new Error(`unknown step ${n}; known: ${Object.keys(STEPS).join(' ')}`);
    log(`\n=== ${n}`);
    await f(s);
    saveState(s);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
