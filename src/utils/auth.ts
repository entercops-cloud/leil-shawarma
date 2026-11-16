// Admin authentication client. Accounts, password hashes and sessions live on the SERVER
// (Netlify Function + Netlify Blobs). The browser keeps nothing: the session is an HttpOnly cookie.

export type Role = 'owner' | 'manager';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface ManagedUser extends AuthUser {
  createdAt: string;
  lastLogin?: string;
  disabled?: boolean;
}

export type Result = { ok: true } | { ok: false; error: string };

export const AUTH_EXPIRED_EVENT = 'leil-auth-expired';

// ---------- low-level request ----------
export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) {
    super(message);
  }
}

/**
 * Talks to /api. Sessions are HttpOnly cookies set by the server, so this code never sees or stores a token.
 * `staff: true` marks calls that need a staff session (a 401 then signs the UI out).
 */
export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; activity?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.activity) headers['x-activity'] = '1';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'تعذر الاتصال بالخادم.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && opts.auth) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new ApiError(res.status, data?.error || `خطأ في الخادم (${res.status}).`, data?.retryAfter);
  }
  return data as T;
}

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof Error ? e.message : 'تعذر تنفيذ العملية.',
});

// ---------- validation (UX only — the server enforces the same rules) ----------
export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

export function validateUsername(username: string): string | null {
  return /^[a-z0-9_.\-\u0600-\u06FF]{3,32}$/.test(normalizeUsername(username))
    ? null
    : 'اسم المستخدم من 3 إلى 32 حرفاً (حروف أو أرقام أو . _ -) بدون مسافات.';
}

export function validatePassword(password: string, username = ''): string | null {
  if (password.length < 8) return 'كلمة المرور يجب ألا تقل عن 8 أحرف.';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'يجب أن تحتوي كلمة المرور على حروف وأرقام.';
  const u = normalizeUsername(username);
  if (u && password.toLowerCase().includes(u)) return 'لا تضع اسم المستخدم داخل كلمة المرور.';
  return null;
}

export function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) score++;
  if (/\d/.test(password) && /[^\p{L}\d]/u.test(password)) score++;
  return Math.min(4, score);
}

// ---------- session (server-side; the browser only holds an HttpOnly cookie) ----------
/** The signed-in staff member, or null. */
export async function fetchMe(): Promise<AuthUser | null> {
  try {
    return (await api<{ user: AuthUser | null }>('/me')).user;
  } catch {
    return null;
  }
}

/** Tell the server the user is active (extends the 30-minute idle window). */
export async function pingActivity(): Promise<void> {
  try {
    await api('/me/ping', { method: 'POST', auth: true, body: {} });
  } catch {
    /* handled by the global auth-expired event */
  }
}

export async function logout(): Promise<void> {
  try {
    await api('/logout', { method: 'POST', body: {} });
  } catch {
    /* ignore */
  }
}

// ---------- public API ----------
export async function getStatus(): Promise<{ hasUsers: boolean; setupCodeRequired: boolean; verificationAvailable: boolean; customerLoginEnabled: boolean }> {
  return api('/status');
}

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string; lockedSeconds?: number };

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const data = await api<{ user: AuthUser }>('/login', {
      method: 'POST',
      body: { username: normalizeUsername(username), password },
    });
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: (e as Error).message, lockedSeconds: e instanceof ApiError ? e.retryAfter : undefined };
  }
}

export async function setupFirstOwner(
  username: string,
  displayName: string,
  password: string,
  setupCode = ''
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const err = validateUsername(username) || validatePassword(password, username);
  if (err) return { ok: false, error: err };
  try {
    const data = await api<{ user: AuthUser }>('/setup', {
      method: 'POST',
      body: { username, displayName, password, setupCode },
    });
    return { ok: true, user: data.user };
  } catch (e) {
    return fail(e);
  }
}

export async function listUsers(): Promise<ManagedUser[]> {
  return (await api<{ users: ManagedUser[] }>('/users', { auth: true })).users;
}

export async function addUser(username: string, displayName: string, password: string, role: Role): Promise<Result> {
  const err = validateUsername(username) || validatePassword(password, username);
  if (err) return { ok: false, error: err };
  try {
    await api('/users', { method: 'POST', auth: true, body: { username, displayName, password, role } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const patch = async (id: string, body: object): Promise<Result> => {
  try {
    await api(`/users/${id}`, { method: 'PATCH', auth: true, body });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
};

export const setUserRole = (id: string, role: Role) => patch(id, { role });
export const setUserDisabled = (id: string, disabled: boolean) => patch(id, { disabled });
export const resetUserPassword = (id: string, password: string) => patch(id, { password });

export async function deleteUser(id: string): Promise<Result> {
  try {
    await api(`/users/${id}`, { method: 'DELETE', auth: true });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changeOwnPassword(oldPassword: string, newPassword: string): Promise<Result> {
  const me = await fetchMe();
  const err = validatePassword(newPassword, me?.username);
  if (err) return { ok: false, error: err };
  try {
    await api('/me/password', { method: 'POST', auth: true, body: { oldPassword, newPassword } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
