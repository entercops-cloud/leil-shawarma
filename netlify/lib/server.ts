// Server-side API for Leil Shawarma. Runs inside a Netlify Function.
// Everything (menu, settings, orders, reviews, customers, loyalty points, media, admin accounts) lives on the server.
// Storage is abstracted (Store) so the same logic is unit-testable and backed by Netlify Blobs in production.
// Sessions are HttpOnly cookies: nothing sensitive is ever readable by page JavaScript or kept in browser storage.

import { scrypt as _scrypt, randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;

export interface Store {
  getJSON<T = any>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  getBlob(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null>;
  setBlob(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

/** Optional SMS provider retained for installations that still use phone verification. */
export interface OtpProvider {
  start(phoneE164: string): Promise<void>;
  check(phoneE164: string, code: string): Promise<boolean>;
}

export interface Deps {
  site: Store;   // content, users, customers, orders, secrets, rate limits
  media: Store;  // uploaded images
  env: { ADMIN_SETUP_CODE?: string; OTP_DAILY_LIMIT?: string };
  otp?: OtpProvider;
  ip: string;
  now?: () => number;
}

type Role = 'owner' | 'manager';
interface UserRec {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  createdAt: string;
  lastLogin?: string;
  disabled?: boolean;
  salt: string;
  hash: string;
  tv: number; // token version: bump to invalidate every issued session
}

interface CustomerRec {
  phone: string; // digits only, e.g. 970593965358
  name?: string;
  points: number;
  totalSpent: number;
  ordersCount: number;
  tier: string;
  createdAt: string;
  lastLogin?: string;
  pinSalt?: string;
  pinHash?: string;
  tv: number;
}

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const ADMIN_IDLE_MS = 30 * 60 * 1000;
const ADMIN_MAX_MS = 8 * 60 * 60 * 1000;
const CUSTOMER_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_BODY = 6 * 1024 * 1024;
const MAX_CONTENT_JSON = 1_500_000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ADMIN_COOKIE = 'leil_admin';
const CUSTOMER_COOKIE = 'leil_cust';

// ---------- small helpers ----------
const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const b64url = (buf: Buffer) => buf.toString('base64url');

function safeEq(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());
}

interface Out {
  cookies: string[];
}

function mkResponse(data: unknown, status: number, cookies: string[], extra: Record<string, string> = {}): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extra,
  });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(JSON.stringify(data), { status, headers });
}

const cookieStr = (name: string, value: string, maxAgeSec: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`;
const clearCookie = (name: string) => `${name}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function parseCookies(h: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (h || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

// ---------- validation ----------
const COMMON = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'qwertyui', 'admin123', 'admin1234',
  'leil2026', 'leil1234', 'leil123', '11111111', '00000000', 'iloveyou', 'abc12345', 'welcome1',
]);
const normUser = (u: string) => String(u ?? '').trim().toLowerCase();

function validateUsername(u: string): string | null {
  return /^[a-z0-9_.\-\u0600-\u06FF]{3,32}$/.test(normUser(u))
    ? null
    : 'اسم المستخدم من 3 إلى 32 حرفاً (حروف أو أرقام أو . _ -) بدون مسافات.';
}

function validatePassword(p: string, username = ''): string | null {
  if (typeof p !== 'string' || p.length < 8) return 'كلمة المرور يجب ألا تقل عن 8 أحرف.';
  if (p.length > 128) return 'كلمة المرور طويلة جداً.';
  if (!/\p{L}/u.test(p) || !/\d/.test(p)) return 'يجب أن تحتوي كلمة المرور على حروف وأرقام.';
  const u = normUser(username);
  if (u && p.toLowerCase().includes(u)) return 'لا تضع اسم المستخدم داخل كلمة المرور.';
  if (COMMON.has(p.toLowerCase())) return 'كلمة المرور هذه شائعة وسهلة التخمين.';
  return null;
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltHex, 'hex'), 64, SCRYPT);
  return key.toString('hex');
}


// ---------- signed session tokens (stored only in HttpOnly cookies) ----------
async function getSecret(site: Store): Promise<string> {
  let s = await site.getJSON<{ v: string }>('secret');
  if (!s) {
    await site.setJSON('secret', { v: randomBytes(32).toString('hex') });
    s = await site.getJSON<{ v: string }>('secret'); // re-read: if two requests raced, everyone uses the stored one
  }
  return s!.v;
}

interface TokenPayload {
  k: 'a' | 'c'; // admin | customer
  uid: string;
  tv: number;
  iat: number;
  exp: number;
}

async function signToken(site: Store, p: TokenPayload): Promise<string> {
  const payload = b64url(Buffer.from(JSON.stringify(p)));
  const sig = b64url(createHmac('sha256', await getSecret(site)).update(payload).digest());
  return `${payload}.${sig}`;
}

async function readToken(site: Store, raw: string | undefined, kind: 'a' | 'c', now: number): Promise<TokenPayload | null> {
  const m = /^([A-Za-z0-9_\-]+)\.([A-Za-z0-9_\-]+)$/.exec(raw || '');
  if (!m) return null;
  const expected = b64url(createHmac('sha256', await getSecret(site)).update(m[1]).digest());
  if (!safeEq(m[2], expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')) as TokenPayload;
    if (p.k !== kind || !p.uid || now > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

const publicUser = (u: UserRec) => ({ id: u.id, username: u.username, displayName: u.displayName, role: u.role });
const managedUser = (u: UserRec) => ({ ...publicUser(u), createdAt: u.createdAt, lastLogin: u.lastLogin, disabled: !!u.disabled });

// ---------- phone numbers ----------
const asciiDigits = (value: unknown) => String(value ?? '')
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

/** Returns digits like "970593965358" for Palestinian mobiles (+970 / +972 prefixes), or null. */
function normalizePhone(raw: unknown): string | null {
  let p = asciiDigits(raw).replace(/[\s\-().]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^0\d{9}$/.test(p)) p = '+970' + p.slice(1); // 0593965358 -> +970593965358
  else if (/^970\d{9}$/.test(p) || /^972\d{9}$/.test(p)) p = '+' + p;
  return /^\+(970|972)\d{9}$/.test(p) ? p.slice(1) : null;
}

const tierOf = (points: number) => (points >= 500 ? 'ذهبي' : points >= 250 ? 'فضي' : points >= 100 ? 'برونزي' : 'عادي');

const publicCustomer = (c: CustomerRec) => ({
  phone: c.phone,
  name: c.name,
  points: c.points,
  totalSpent: c.totalSpent,
  ordersCount: c.ordersCount,
  tier: c.tier,
});

async function loadCustomer(d: Deps, phone: string): Promise<CustomerRec | null> {
  return d.site.getJSON<CustomerRec>(`cust:${phone}`);
}
async function saveCustomer(d: Deps, c: CustomerRec): Promise<void> {
  c.points = Math.max(0, Math.round(c.points));
  c.tier = tierOf(c.points);
  await d.site.setJSON(`cust:${c.phone}`, c);
}

// ---------- brute-force throttling ----------
interface Lock {
  fails: number;
  lockedUntil: number;
}

async function lockFor(d: Deps, key: string): Promise<Lock> {
  return (await d.site.getJSON<Lock>(key)) ?? { fails: 0, lockedUntil: 0 };
}

async function checkLocks(d: Deps, keys: string[]): Promise<number> {
  const now = (d.now ?? Date.now)();
  let wait = 0;
  for (const k of keys) {
    const l = await lockFor(d, k);
    if (l.lockedUntil > now) wait = Math.max(wait, Math.ceil((l.lockedUntil - now) / 1000));
  }
  return wait;
}

async function registerFail(d: Deps, key: string, capMs: number): Promise<void> {
  const now = (d.now ?? Date.now)();
  const l = await lockFor(d, key);
  l.fails += 1;
  if (l.fails >= 5) l.lockedUntil = now + Math.min(capMs, 30_000 * 2 ** (l.fails - 5));
  await d.site.setJSON(key, l);
}

async function clearLocks(d: Deps, keys: string[]): Promise<void> {
  for (const k of keys) await d.site.del(k);
}

// ---------- content validation ----------
function hasDataUrl(v: unknown): boolean {
  if (typeof v === 'string') return v.startsWith('data:');
  if (Array.isArray(v)) return v.some(hasDataUrl);
  if (v && typeof v === 'object') return Object.values(v as object).some(hasDataUrl);
  return false;
}

function validateContent(b: any): string | null {
  if (!b || typeof b !== 'object') return 'بيانات غير صالحة.';
  const { menu, offers, customization } = b;
  if (!Array.isArray(menu) || menu.length > 500) return 'قائمة الطعام غير صالحة.';
  for (const it of menu) {
    if (!it || typeof it.id !== 'string' || typeof it.name !== 'string' || typeof it.categoryId !== 'string') return 'صنف غير صالح في القائمة.';
    if (typeof it.price !== 'number' || !Number.isFinite(it.price) || it.price < 0) return `سعر غير صالح للصنف ${it.name}.`;
    if (typeof it.image !== 'string') return `صورة غير صالحة للصنف ${it.name}.`;
  }
  if (!Array.isArray(offers) || offers.length > 100) return 'العروض غير صالحة.';
  if (!customization || typeof customization !== 'object' || !customization.branding || !customization.colors || !customization.texts) {
    return 'إعدادات الموقع غير صالحة.';
  }
  if (hasDataUrl(b)) return 'يجب رفع الصور قبل الحفظ.';
  if (JSON.stringify(b).length > MAX_CONTENT_JSON) return 'حجم البيانات كبير جداً.';
  return null;
}

// ---------- media ----------
function sniffImage(bytes: Buffer, mime: string): boolean {
  switch (mime) {
    case 'image/png': return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/jpeg': return bytes[0] === 0xff && bytes[1] === 0xd8;
    case 'image/gif': return bytes.subarray(0, 3).toString('ascii') === 'GIF';
    case 'image/webp': return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'image/svg+xml': return /<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'));
    default: return false;
  }
}



const ORDER_STATUSES = ['pending', 'preparing', 'completed', 'cancelled'] as const;
const PAYMENT_STATUSES = ['on_delivery', 'unpaid', 'paid'] as const;
const cleanText = (v: unknown, max: number) =>
  String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

async function rateLimit(d: Deps, key: string, max: number, windowMs: number): Promise<number> {
  const now = (d.now ?? Date.now)();
  const r = (await d.site.getJSON<{ count: number; start: number }>(key)) ?? { count: 0, start: now };
  if (now - r.start > windowMs) {
    r.count = 0;
    r.start = now;
  }
  if (r.count >= max) return Math.ceil((r.start + windowMs - now) / 1000);
  r.count += 1;
  await d.site.setJSON(key, r);
  return 0;
}

// ---------- loyalty settlement (server-side, so points can't be forged) ----------
interface LoyaltySettings {
  enabled?: boolean;
  awardOn?: 'completed' | 'placed';
}

/** Credits points on completion (once) and reverses / refunds on cancellation. Mutates order + customer. */
function settleLoyalty(order: any, c: CustomerRec, prev: string, next: string, s: LoyaltySettings): void {
  if (next === 'completed' && prev !== 'completed' && !order.pointsAwarded && s.enabled && s.awardOn !== 'placed') {
    c.points += order.pointsEarned || 0;
    c.totalSpent += order.total || 0;
    c.ordersCount += 1;
    order.pointsAwarded = true;
  }
  if (next === 'cancelled' && prev !== 'cancelled') {
    if (order.pointsAwarded) {
      c.points = Math.max(0, c.points - (order.pointsEarned || 0));
      c.totalSpent = Math.max(0, c.totalSpent - (order.total || 0));
      c.ordersCount = Math.max(0, c.ordersCount - 1);
      order.pointsAwarded = false;
    }
    if (order.pointsRedeemed && !order.pointsRefunded) {
      c.points += order.pointsRedeemed;
      order.pointsRefunded = true;
    }
  }
}

interface PricedOrder {
  items: any[];
  subtotal: number;
  error?: string;
}

/** Re-computes every price from the PUBLISHED menu so a customer can't tamper with totals. */
function priceItems(rawItems: any, menu: any[], offers: any[], now: number): PricedOrder {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 40) return { items: [], subtotal: 0, error: 'السلة فارغة أو غير صالحة.' };
  const items: any[] = [];
  let subtotal = 0;
  for (const raw of rawItems) {
    const qty = Number(raw?.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return { items: [], subtotal: 0, error: 'كمية غير صالحة.' };
    const menuId = String(raw?.menuItem?.id ?? '');
    const meal = menu.find((m) => m.id === menuId);
    if (!meal) return { items: [], subtotal: 0, error: 'أحد الأصناف لم يعد متوفراً في القائمة. حدّث الصفحة وأعد المحاولة.' };
    if (meal.isAvailable === false) return { items: [], subtotal: 0, error: `الصنف «${meal.name}» غير متوفر حالياً.` };
    const o = raw?.options ?? {};

    let unit: number;
    let stored: any;
    let options: any;
    if (raw?.offerId) {
      const offer = offers.find((x) => x.id === raw.offerId);
      if (!offer || !offer.isActive || offer.targetItemId !== meal.id || new Date(offer.endsAt).getTime() < now) {
        return { items: [], subtotal: 0, error: 'انتهى العرض الخاص. أزله من السلة وأعد المحاولة.' };
      }
      unit = Number(offer.discountedPrice);
      stored = { ...meal, name: `${meal.name} [${offer.badge}]`, price: unit };
      options = { size: 'عرض خاص', bread: Array.isArray(meal.options?.breads) && meal.options.breads.length > 0 ? String(meal.options.breads[0]) : undefined, extras: [], removals: [], notes: cleanText(o.notes, 200), unitPrice: unit };
    } else {
      unit = Number(meal.price);
      const size = o.size ? String(o.size) : undefined;
      if (size) {
        const found = meal.options?.sizes?.find((s: any) => s.name === size);
        if (!found) return { items: [], subtotal: 0, error: 'حجم غير صالح.' };
        unit += Number(found.priceDelta) || 0;
      }
      const extras: string[] = Array.isArray(o.extras) ? o.extras.map(String) : [];
      for (const id of new Set(extras)) {
        const ext = meal.options?.extras?.find((e: any) => e.id === id);
        if (!ext) return { items: [], subtotal: 0, error: 'إضافة غير صالحة.' };
        unit += Number(ext.price) || 0;
      }
      const availableBreads: string[] = Array.isArray(meal.options?.breads)
        ? meal.options.breads.map(String)
        : [];
      const requestedBread = o.bread ? String(o.bread) : undefined;

      if (
        requestedBread &&
        availableBreads.length > 0 &&
        !availableBreads.includes(requestedBread)
      ) {
        return { items: [], subtotal: 0, error: 'نوع الخبز غير صالح.' };
      }

      // Items without bread options ignore stale/default bread values from the browser
      const bread =
        requestedBread && availableBreads.includes(requestedBread)
          ? requestedBread
          : undefined;
      const removals: string[] = Array.isArray(o.removals) ? o.removals.map(String).slice(0, 20) : [];
      options = { size, bread, extras, removals, notes: cleanText(o.notes, 200), unitPrice: unit };
      stored = meal;
    }
    if (!Number.isFinite(unit) || unit < 0) return { items: [], subtotal: 0, error: 'سعر غير صالح.' };
    const totalPrice = Math.round(unit * qty * 100) / 100;
    subtotal += totalPrice;
    items.push({ cartItemId: cleanText(raw?.cartItemId, 120) || `${meal.id}-${items.length}`, menuItem: stored, quantity: qty, options, totalPrice });
  }
  return { items, subtotal: Math.round(subtotal * 100) / 100 };
}

async function newOrderId(d: Deps): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const id = `LEIL-${10000 + (randomBytes(4).readUInt32BE(0) % 90000)}`;
    if (!(await d.site.getJSON(`order:${id}`))) return id;
  }
  return `LEIL-${Date.now()}`;
}

// ---------- reviews ----------
function sanitizeReview(r: any) {
  const rating = Number(r?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  const itemId = cleanText(r?.itemId, 80);
  if (!itemId) return null;
  const comment = cleanText(r?.comment, 500);
  return { itemId, rating, userName: cleanText(r?.userName, 40) || 'زبون شاورما ليل', comment: comment || undefined };
}


// ---------- main handler ----------
export async function handle(req: Request, d: Deps): Promise<Response> {
  const out: Out = { cookies: [] };
  const res = await route(req, d, out);
  for (const c of out.cookies) res.headers.append('set-cookie', c);
  return res;
}

async function route(req: Request, d: Deps, out: Out): Promise<Response> {
  const now = (d.now ?? Date.now)();
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  const json = (data: unknown, status = 200, extra: Record<string, string> = {}) => mkResponse(data, status, [], extra);
  const err = (status: number, message: string, extra: Record<string, unknown> = {}) => mkResponse({ error: message, ...extra }, status, []);
  const cookies = parseCookies(req.headers.get('cookie'));

  // CSRF: every state-changing request must come from this same site.
  let body: any = null;
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = req.headers.get('origin');
    const site = req.headers.get('sec-fetch-site');
    const sameOrigin = origin ? origin === url.origin : site === 'same-origin' || site === 'none';
    if (!sameOrigin) return err(403, 'طلب مرفوض.');
    const len = Number(req.headers.get('content-length') || 0);
    if (len > MAX_BODY) return err(413, 'الطلب كبير جداً.');
    try {
      const text = await req.text();
      if (text.length > MAX_BODY) return err(413, 'الطلب كبير جداً.');
      body = text ? JSON.parse(text) : {};
    } catch {
      return err(400, 'صيغة الطلب غير صحيحة.');
    }
  }

  const ip = sha256(d.ip).slice(0, 16);
  const ipKey = `rl:ip:${ip}`;

  // ----- who is calling? -----
  const getAdmin = async (): Promise<{ user: UserRec; payload: TokenPayload } | null> => {
    const p = await readToken(d.site, cookies[ADMIN_COOKIE], 'a', now);
    if (!p) return null;
    const users = (await d.site.getJSON<UserRec[]>('users')) ?? [];
    const u = users.find((x) => x.id === p.uid);
    if (!u || u.disabled || u.tv !== p.tv) return null;
    return { user: u, payload: p };
  };
  const issueAdminCookie = async (u: UserRec, iat = now) => {
    const exp = Math.min(iat + ADMIN_MAX_MS, now + ADMIN_IDLE_MS);
    const token = await signToken(d.site, { k: 'a', uid: u.id, tv: u.tv, iat, exp });
    out.cookies.push(cookieStr(ADMIN_COOKIE, token, (exp - now) / 1000));
  };
  const issueCustomerCookie = async (c: CustomerRec) => {
    const token = await signToken(d.site, { k: 'c', uid: c.phone, tv: c.tv, iat: now, exp: now + CUSTOMER_TTL_MS });
    out.cookies.push(cookieStr(CUSTOMER_COOKIE, token, CUSTOMER_TTL_MS / 1000));
  };
  const getCustomer = async (): Promise<CustomerRec | null> => {
    const p = await readToken(d.site, cookies[CUSTOMER_COOKIE], 'c', now);
    if (!p) return null;
    const c = await loadCustomer(d, p.uid);
    return c && c.tv === p.tv ? c : null;
  };

  // ===== public =====
  if (method === 'GET' && path === '/status') {
    const users = (await d.site.getJSON<UserRec[]>('users')) ?? [];
    const loyaltyOn = !!(await d.site.getJSON<any>('content'))?.customization?.loyalty?.enabled;
    return json({
      hasUsers: users.length > 0,
      setupCodeRequired: !!d.env.ADMIN_SETUP_CODE,
      verificationAvailable: true, // customers use their server-checked PIN
      customerLoginEnabled: loyaltyOn,
    });
  }

  if (method === 'GET' && path === '/content') return json({ content: (await d.site.getJSON('content')) ?? null });

  const mediaMatch = /^\/media\/([a-f0-9]{32})$/.exec(path);
  if (method === 'GET' && mediaMatch) {
    const m = await d.media.getBlob(mediaMatch[1]);
    if (!m) return err(404, 'غير موجود.');
    return new Response(m.data, {
      status: 200,
      headers: {
        'content-type': m.contentType,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  }

  // ----- reviews -----
  if (method === 'GET' && path === '/reviews') return json({ reviews: (await d.site.getJSON<any[]>('reviews')) ?? [] });

  if (method === 'POST' && path === '/reviews') {
    const wait = await rateLimit(d, `rl:rev:${ip}`, 6, 60 * 60_000);
    if (wait > 0) return err(429, 'تقييمات كثيرة خلال فترة قصيرة. حاول لاحقاً.', { retryAfter: wait });
    const clean = sanitizeReview(body);
    if (!clean) return err(400, 'بيانات التقييم غير صالحة.');
    const content = await d.site.getJSON<any>('content');
    if (content && !content.menu.some((m: any) => m.id === clean.itemId)) return err(400, 'الصنف غير موجود.');
    const review = { id: `rev-${now}-${randomBytes(3).toString('hex')}`, ...clean, createdAt: new Date(now).toISOString() };
    const list = (await d.site.getJSON<any[]>('reviews')) ?? [];
    await d.site.setJSON('reviews', [review, ...list].slice(0, 2000));
    return json({ review });
  }

  // ----- customer accounts (phone + customer PIN) -----
  // PIN login is available when the owner has enabled customer accounts and loyalty.
  const accountsOn = async () => !!(await d.site.getJSON<any>('content'))?.customization?.loyalty?.enabled;

  if (method === 'POST' && path === '/customer/pin') {
    if (!(await accountsOn())) return err(503, 'تسجيل الزبائن غير مفعّل حالياً.');
    const phone = normalizePhone(body?.phone);
    const mode = body?.mode === 'register' ? 'register' : body?.mode === 'login' ? 'login' : '';
    const pin = asciiDigits(body?.pin);
    const name = cleanText(body?.name, 60);
    if (!phone || !mode || !/^\d{6}$/.test(pin) || (mode === 'register' && name.length < 2)) {
      return err(400, 'أدخل رقم جوال صحيحاً ورقم PIN من 6 أرقام، وأدخل اسمك عند إنشاء الحساب.');
    }
    if (mode === 'register' && new Set(['000000', '111111', '123456', '654321', '123123', '121212']).has(pin)) {
      return err(400, 'اختر PIN مختلفاً عن الأرقام المتكررة أو المتسلسلة.');
    }

    if (mode === 'register') {
      const ipWait = await rateLimit(d, `rl:customer-pin-reg-ip:${ip}`, 10, 60 * 60_000);
      const phoneWait = await rateLimit(d, `rl:customer-pin-reg-phone:${phone}`, 3, 60 * 60_000);
      if (ipWait > 0 || phoneWait > 0) return err(429, 'محاولات إنشاء الحساب كثيرة. حاول لاحقاً.', { retryAfter: Math.max(ipWait, phoneWait) });
    }

    const phoneKey = `rl:customer-pin:${phone}`;
    const customerIpKey = `rl:customer-pin-ip:${ip}`;
    const lockKeys = [customerIpKey, phoneKey];
    const wait = await checkLocks(d, lockKeys);
    if (wait > 0) return err(429, 'محاولات كثيرة. حاول لاحقاً.', { retryAfter: wait });

    let c = await loadCustomer(d, phone);
    if (mode === 'register') {
      if (c?.pinHash) return err(409, 'يوجد حساب بهذا الرقم. اختر تسجيل الدخول.');
      if (!c) {
        c = {
          phone,
          points: 0,
          totalSpent: 0,
          ordersCount: 0,
          tier: 'عادي',
          createdAt: new Date(now).toISOString(),
          tv: 1,
        };
      }
      c.name = name;
      c.pinSalt = randomBytes(16).toString('hex');
      c.pinHash = await hashPassword(pin, c.pinSalt);
      c.tv = c.tv || 1;
    } else {
      const salt = c?.pinSalt ?? '00'.repeat(16);
      const candidate = await hashPassword(pin, salt);
      if (!c?.pinHash || !c.pinSalt || !safeEq(candidate, c.pinHash)) {
        await registerFail(d, customerIpKey, 15 * 60_000);
        await registerFail(d, phoneKey, 15 * 60_000);
        const retryAfter = await checkLocks(d, lockKeys);
        return err(401, 'رقم الجوال أو PIN غير صحيح.', retryAfter > 0 ? { retryAfter } : {});
      }
    }

    c.lastLogin = new Date(now).toISOString();
    await saveCustomer(d, c);
    await clearLocks(d, lockKeys);
    await issueCustomerCookie(c);
    return json({ customer: publicCustomer(c) });
  }

  if (method === 'POST' && path === '/customer/otp/start') {
    if (!d.otp || !(await accountsOn())) return err(503, 'تسجيل الزبائن غير مفعّل حالياً.');
    const phone = normalizePhone(body?.phone);
    if (!phone) return err(400, 'أدخل رقم جوال فلسطيني صحيح (مثال: 0593965358).');
    const day = new Date(now).toISOString().slice(0, 10);
    const waitIp = await rateLimit(d, `rl:otpip:${ip}`, 10, 60 * 60_000);
    const waitPhone = await rateLimit(d, `rl:otpph:${phone}`, 3, 60 * 60_000);
    if (waitIp > 0 || waitPhone > 0) return err(429, 'تم إرسال رموز كثيرة. حاول لاحقاً.', { retryAfter: Math.max(waitIp, waitPhone) });
    const dailyCap = Math.max(1, Number(d.env.OTP_DAILY_LIMIT) || 100); // hard cap on verification messages per day (cost control)
    if ((await rateLimit(d, `rl:otpday:${day}`, dailyCap, 24 * 60 * 60_000)) > 0) return err(429, 'الخدمة مشغولة حالياً. حاول لاحقاً.');
    try {
      await d.otp.start('+' + phone);
    } catch {
      return err(502, 'تعذر إرسال رمز التحقق الآن. حاول لاحقاً.');
    }
    return json({ ok: true });
  }

  if (method === 'POST' && path === '/customer/otp/verify') {
    if (!d.otp || !(await accountsOn())) return err(503, 'تسجيل الزبائن غير مفعّل حالياً.');
    const phone = normalizePhone(body?.phone);
    const code = String(body?.code ?? '').trim();
    if (!phone || !/^\d{4,10}$/.test(code)) return err(400, 'بيانات غير صالحة.');
    const wait = await rateLimit(d, `rl:otpchk:${phone}`, 10, 60 * 60_000);
    if (wait > 0) return err(429, 'محاولات كثيرة. حاول لاحقاً.', { retryAfter: wait });
    let ok = false;
    try {
      ok = await d.otp.check('+' + phone, code);
    } catch {
      return err(502, 'تعذر التحقق الآن. حاول لاحقاً.');
    }
    if (!ok) return err(401, 'رمز التحقق غير صحيح أو منتهي.');
    let c = await loadCustomer(d, phone);
    if (!c) c = { phone, points: 0, totalSpent: 0, ordersCount: 0, tier: 'عادي', createdAt: new Date(now).toISOString(), tv: 1 };
    c.lastLogin = new Date(now).toISOString();
    await saveCustomer(d, c);
    await issueCustomerCookie(c);
    return json({ customer: publicCustomer(c) });
  }

  if (method === 'GET' && path === '/customer/me') {
    const c = await getCustomer();
    return json({ customer: c ? publicCustomer(c) : null });
  }

  if (method === 'POST' && path === '/customer/logout') {
    out.cookies.push(clearCookie(CUSTOMER_COOKIE));
    return json({ ok: true });
  }

  if (method === 'GET' && path === '/customer/orders') {
    const c = await getCustomer();
    if (!c) return err(401, 'سجّل الدخول برقم جوالك أولاً.');
    const keys = (await d.site.list(`ocust:${c.phone}:`)).sort().reverse().slice(0, 50);
    const orders = await Promise.all(keys.map((k) => d.site.getJSON<any>(`order:${k.split(':')[3]}`)));
    return json({ orders: orders.filter(Boolean) });
  }

  // ----- place an order (guest, or verified customer for loyalty) -----
  if (method === 'POST' && path === '/orders') {
    const wait = await rateLimit(d, `rl:ord:${ip}`, 30, 10 * 60_000);
    if (wait > 0) return err(429, 'طلبات كثيرة خلال فترة قصيرة. حاول بعد قليل أو اتصل بالمطعم.', { retryAfter: wait });
    const content = await d.site.getJSON<any>('content');
    if (!content) return err(503, 'الموقع قيد الإعداد حالياً.');
    const cust = content.customization ?? {};

    const c = body?.customer ?? {};
    const fullName = cleanText(c.fullName, 60);
    const phoneRaw = String(c.phoneNumber ?? '').replace(/[\s\-()]/g, '');
    if (fullName.length < 2) return err(400, 'يرجى إدخال اسم صحيح.');
    if (!/^\+?\d{9,15}$/.test(phoneRaw)) return err(400, 'رقم الهاتف غير صالح.');
    const orderType = c.orderType === 'pickup' ? 'pickup' : c.orderType === 'delivery' ? 'delivery' : null;
    if (!orderType) return err(400, 'نوع الطلب غير صالح.');
    const paymentMethod = c.paymentMethod;
    const pay = cust.payments ?? {};
    if (!(paymentMethod === 'cash' || (paymentMethod === 'card' && pay.cardEnabled) || (paymentMethod === 'jawwal_pay' && pay.walletEnabled))) {
      return err(400, 'طريقة الدفع غير متاحة حالياً.');
    }

    const priced = priceItems(body?.items, content.menu, content.offers ?? [], now);
    if (priced.error) return err(400, priced.error);

    const minOrder = Number(cust.ordering?.minOrder) || 0;
    if (minOrder > 0 && priced.subtotal < minOrder) return err(400, `الحد الأدنى للطلب ${minOrder} ₪.`);

    let deliveryFee = 0;
    let neighborhood = '';
    let address = '';
    if (orderType === 'delivery') {
      address = cleanText(c.address, 200);
      neighborhood = cleanText(c.neighborhood, 80);
      if (address.length < 3) return err(400, 'يرجى تحديد تفاصيل العنوان.');
      const region = (cust.ordering?.deliveryRegions ?? []).find((r: any) => r.name === neighborhood);
      if (!region) return err(400, 'منطقة التوصيل غير صالحة.');
      deliveryFee = Number(region.fee) || 0;
    }

    // Loyalty: only a verified customer whose verified number matches the order can earn/spend points.
    const loy = cust.loyalty ?? {};
    const account = await getCustomer();
    const orderPhone = normalizePhone(phoneRaw);
    const linked = !!account && !!orderPhone && account.phone === orderPhone;
    const redeemed = Number(body?.pointsRedeemed) || 0;
    if (redeemed !== 0 && redeemed !== 50 && redeemed !== 100) return err(400, 'عدد النقاط غير صالح.');
    if (redeemed > 0) {
      if (!linked) return err(400, 'سجّل الدخول برقم جوالك لاستخدام نقاط الولاء.');
      if (account!.points < redeemed) return err(400, 'رصيد النقاط غير كافٍ.');
    }
    const pointsDiscount = redeemed === 50 ? 5 : redeemed === 100 ? 12 : 0;
    const discount = Math.min(pointsDiscount, priced.subtotal);
    const afterDiscount = Math.max(0, priced.subtotal - discount);
    const total = Math.round((afterDiscount + deliveryFee) * 100) / 100;
    const pointsEarned =
      linked && loy.enabled
        ? Math.floor((afterDiscount + (loy.includeDeliveryFee ? deliveryFee : 0)) * Math.max(0, Number(loy.pointsPerShekel) || 0))
        : 0;

    const orderId = await newOrderId(d);
    const order: any = {
      orderId,
      createdAt: new Date(now).toLocaleDateString('ar-PS', { hour: '2-digit', minute: '2-digit', hour12: true }),
      createdAtIso: new Date(now).toISOString(),
      timestamp: now,
      status: 'pending',
      items: priced.items,
      subtotal: priced.subtotal,
      deliveryFee,
      total,
      customer: { fullName, phoneNumber: phoneRaw, orderType, address, neighborhood, notes: cleanText(c.notes, 300), paymentMethod },
      estimatedTime: orderType === 'delivery' ? '25 - 35 دقيقة' : '15 - 20 دقيقة',
      pointsEarned,
      pointsDiscount: discount > 0 ? discount : undefined,
      pointsRedeemed: discount > 0 ? redeemed : undefined,
      pointsAwarded: false,
      paymentStatus: paymentMethod === 'cash' ? 'on_delivery' : 'unpaid',
      customerPhone: linked ? account!.phone : undefined,
    };

    if (linked) {
      account!.points -= discount > 0 ? redeemed : 0; // redeemed points are spent immediately
      if (!account!.name) account!.name = fullName;
      if (loy.enabled && loy.awardOn === 'placed') {
        account!.points += pointsEarned;
        account!.totalSpent += total;
        account!.ordersCount += 1;
        order.pointsAwarded = true;
      }
      await saveCustomer(d, account!);
      await d.site.setJSON(`ocust:${account!.phone}:${String(now).padStart(13, '0')}:${orderId}`, 1);
    }
    await d.site.setJSON(`order:${orderId}`, order);
    await d.site.setJSON(`oidx:${String(now).padStart(13, '0')}:${orderId}`, 1);
    return json({ order, customer: linked ? publicCustomer(account!) : null });
  }

  // ----- guest order tracking: order number + the phone number used on the order -----
  if (method === 'GET' && path === '/orders/lookup') {
    const wait = await rateLimit(d, `rl:lkp:${ip}`, 60, 10 * 60_000);
    if (wait > 0) return err(429, 'محاولات كثيرة. حاول لاحقاً.', { retryAfter: wait });
    const id = String(url.searchParams.get('orderId') || '').toUpperCase();
    const phone = normalizePhone(url.searchParams.get('phone'));
    if (!/^LEIL-\d{5,13}$/.test(id) || !phone) return err(400, 'بيانات غير صالحة.');
    const o = await d.site.getJSON<any>(`order:${id}`);
    if (!o || normalizePhone(o.customer?.phoneNumber) !== phone) return err(404, 'لم نجد طلباً بهذه البيانات.');
    return json({ orderId: o.orderId, status: o.status, statusUpdatedAt: o.statusUpdatedAt, paymentStatus: o.paymentStatus, estimatedTime: o.estimatedTime, total: o.total });
  }

  // ===== admin login / setup =====
  if (method === 'POST' && path === '/setup') {
    const users = (await d.site.getJSON<UserRec[]>('users')) ?? [];
    if (users.length > 0) return err(409, 'تم إعداد حساب المدير مسبقاً.');
    const wait = await checkLocks(d, [ipKey]);
    if (wait > 0) return err(429, 'محاولات كثيرة. حاول لاحقاً.', { retryAfter: wait });
    if (d.env.ADMIN_SETUP_CODE && (typeof body?.setupCode !== 'string' || !safeEq(body.setupCode, d.env.ADMIN_SETUP_CODE))) {
      await registerFail(d, ipKey, 15 * 60_000);
      return err(403, 'رمز الإعداد غير صحيح.');
    }
    const e = validateUsername(body.username) || validatePassword(body.password, body.username);
    if (e) return err(400, e);
    const salt = randomBytes(16).toString('hex');
    const rec: UserRec = {
      id: `u_${randomBytes(8).toString('hex')}`,
      username: normUser(body.username),
      displayName: String(body.displayName || body.username).trim().slice(0, 40),
      role: 'owner',
      createdAt: new Date(now).toISOString(),
      salt,
      hash: await hashPassword(body.password, salt),
      tv: 1,
    };
    await d.site.setJSON('users', [rec]);
    await clearLocks(d, [ipKey]);
    await issueAdminCookie(rec);
    return json({ user: publicUser(rec) });
  }

  if (method === 'POST' && path === '/login') {
    const username = normUser(body?.username);
    const password = typeof body?.password === 'string' ? body.password : '';
    const userKey = `rl:user:${sha256(username).slice(0, 16)}`;
    const wait = await checkLocks(d, [ipKey, userKey]);
    if (wait > 0) return err(429, 'محاولات كثيرة. حاول مجدداً بعد قليل.', { retryAfter: wait });
    const users = (await d.site.getJSON<UserRec[]>('users')) ?? [];
    const u = users.find((x) => x.username === username);
    const candidate = await hashPassword(password.slice(0, 256), u?.salt ?? '00'.repeat(16));
    const ok = !!u && !u.disabled && safeEq(candidate, u.hash);
    if (!ok) {
      await registerFail(d, ipKey, 15 * 60_000);
      await registerFail(d, userKey, 5 * 60_000);
      const w = await checkLocks(d, [ipKey, userKey]);
      return err(401, 'بيانات الدخول غير صحيحة.', w > 0 ? { retryAfter: w } : {});
    }
    await clearLocks(d, [ipKey, userKey]);
    u!.lastLogin = new Date(now).toISOString();
    await d.site.setJSON('users', users.map((x) => (x.id === u!.id ? u! : x)));
    await issueAdminCookie(u!);
    return json({ user: publicUser(u!) });
  }

  if (method === 'POST' && path === '/logout') {
    out.cookies.push(clearCookie(ADMIN_COOKIE));
    return json({ ok: true });
  }

  // "Am I signed in?" never errors, so the page can ask on load.
  if (method === 'GET' && path === '/me') {
    const a = await getAdmin();
    return json({ user: a ? publicUser(a.user) : null });
  }

  // ===== everything below needs a staff session =====
  const auth = await getAdmin();
  if (!auth) {
    out.cookies.push(clearCookie(ADMIN_COOKIE));
    return err(401, 'غير مصرّح. سجّل الدخول مجدداً.');
  }
  const me = auth.user;
  const isOwner = me.role === 'owner';
  // Sliding idle timeout: refreshed only by real user actions (writes or an explicit activity ping), not by background polling.
  if (method !== 'GET' || req.headers.get('x-activity') === '1') await issueAdminCookie(me, auth.payload.iat);

  if (method === 'POST' && path === '/me/ping') return json({ ok: true });

  if (method === 'PUT' && path === '/content') {
    const e = validateContent(body);
    if (e) return err(400, e);
    const content = { menu: body.menu, offers: body.offers, customization: body.customization, updatedAt: new Date(now).toISOString(), updatedBy: me.username };
    await d.site.setJSON('content', content);
    return json({ ok: true, updatedAt: content.updatedAt });
  }

  // ----- media library -----
  if (method === 'POST' && path === '/media') {
    const m = /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(String(body?.dataUrl || ''));
    if (!m) return err(400, 'صيغة الصورة غير مدعومة.');
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return err(413, 'حجم الصورة غير مقبول (الحد 3MB).');
    if (!sniffImage(bytes, m[1])) return err(400, 'محتوى الملف لا يطابق نوع الصورة.');
    const id = sha256(bytes).slice(0, 32);
    await d.media.setBlob(id, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, m[1]);
    const result: any = { url: `/api/media/${id}`, id };
    if (body?.library === true) {
      const index = (await d.site.getJSON<any[]>('media-index')) ?? [];
      let item = index.find((x) => x.id === id);
      if (!item) {
        item = { id, url: result.url, name: cleanText(body?.name, 80) || 'صورة مرفوعة', size: `${Math.round(bytes.length / 1024)} KB`, createdAt: new Date(now).toISOString() };
        await d.site.setJSON('media-index', [item, ...index].slice(0, 500));
      }
      result.item = item;
    }
    return json(result);
  }

  if (method === 'GET' && path === '/media') return json({ items: (await d.site.getJSON<any[]>('media-index')) ?? [] });

  const delMedia = /^\/media\/([a-f0-9]{32})$/.exec(path);
  if (method === 'DELETE' && delMedia) {
    // Removed from the library list only; the file stays so published pages that use it keep working.
    const index = (await d.site.getJSON<any[]>('media-index')) ?? [];
    await d.site.setJSON('media-index', index.filter((x) => x.id !== delMedia[1]));
    return json({ ok: true });
  }

  // ----- orders (staff) -----
  if (method === 'GET' && path === '/orders') {
    const limit = Math.min(300, Math.max(1, Number(url.searchParams.get('limit')) || 150));
    const keys = (await d.site.list('oidx:')).sort().reverse().slice(0, limit);
    const orders = await Promise.all(keys.map((k) => d.site.getJSON<any>(`order:${k.split(':')[2]}`)));
    return json({ orders: orders.filter(Boolean) });
  }

  const ordMatch = /^\/orders\/(LEIL-\d{5,13})$/.exec(path);
  if (method === 'PATCH' && ordMatch) {
    const o = await d.site.getJSON<any>(`order:${ordMatch[1]}`);
    if (!o) return err(404, 'الطلب غير موجود.');
    if (body?.status !== undefined) {
      if (!ORDER_STATUSES.includes(body.status)) return err(400, 'حالة غير صالحة.');
      const prev = o.status || 'pending';
      o.status = body.status;
      o.statusUpdatedAt = new Date(now).toISOString();
      if (o.customerPhone) {
        const c = await loadCustomer(d, o.customerPhone);
        if (c) {
          const content = await d.site.getJSON<any>('content');
          settleLoyalty(o, c, prev, body.status, content?.customization?.loyalty ?? {});
          await saveCustomer(d, c);
        }
      }
    }
    if (body?.paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.includes(body.paymentStatus)) return err(400, 'حالة دفع غير صالحة.');
      o.paymentStatus = body.paymentStatus;
    }
    await d.site.setJSON(`order:${o.orderId}`, o);
    return json({ order: o });
  }

  // ----- reviews (staff) -----
  const revMatch = /^\/reviews\/([A-Za-z0-9_\-]{3,60})$/.exec(path);
  if (revMatch && (method === 'PATCH' || method === 'DELETE')) {
    const list = (await d.site.getJSON<any[]>('reviews')) ?? [];
    const rev = list.find((r) => r.id === revMatch[1]);
    if (!rev) return err(404, 'التقييم غير موجود.');
    if (method === 'DELETE') {
      await d.site.setJSON('reviews', list.filter((r) => r.id !== rev.id));
      return json({ ok: true });
    }
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return err(400, 'تقييم غير صالح.');
    rev.rating = rating;
    rev.comment = cleanText(body?.comment, 500) || undefined;
    await d.site.setJSON('reviews', list);
    return json({ review: rev });
  }

  // ----- customers & loyalty balance (staff) -----
  if (path === '/customers') {
    const phone = normalizePhone(url.searchParams.get('phone'));
    if (!phone) return err(400, 'أدخل رقم جوال فلسطيني صحيح.');
    const c = await loadCustomer(d, phone);
    return json({ customer: c ? publicCustomer(c) : null });
  }
  const custMatch = /^\/customers\/(97[02]\d{9})$/.exec(path);
  if (method === 'PATCH' && custMatch) {
    const c = await loadCustomer(d, custMatch[1]);
    if (!c) return err(404, 'لا يوجد زبون مسجّل بهذا الرقم.');
    const pts = Number(body?.points);
    if (!Number.isInteger(pts) || pts < 0 || pts > 100000) return err(400, 'عدد نقاط غير صالح.');
    c.points = pts;
    await saveCustomer(d, c);
    return json({ customer: publicCustomer(c) });
  }

  // ----- own password -----
  if (method === 'POST' && path === '/me/password') {
    const users = (await d.site.getJSON<UserRec[]>('users')) ?? [];
    const rec = users.find((x) => x.id === me.id)!;
    const old = await hashPassword(String(body?.oldPassword ?? ''), rec.salt);
    if (!safeEq(old, rec.hash)) return err(403, 'كلمة المرور الحالية غير صحيحة.');
    const e = validatePassword(body?.newPassword, rec.username);
    if (e) return err(400, e);
    rec.salt = randomBytes(16).toString('hex');
    rec.hash = await hashPassword(body.newPassword, rec.salt);
    rec.tv += 1; // signs out every other session of this account
    await d.site.setJSON('users', users);
    await issueAdminCookie(rec, auth.payload.iat);
    return json({ ok: true });
  }

  // ----- owner-only: user management -----
  if (path === '/users' || path.startsWith('/users/')) {
    if (!isOwner) return err(403, 'هذه العملية متاحة للمالك فقط.');
    const users = (await d.site.getJSON<UserRec[]>('users')) ?? [];
    const activeOwners = (list: UserRec[]) => list.filter((u) => u.role === 'owner' && !u.disabled).length;

    if (method === 'GET' && path === '/users') return json({ users: users.map(managedUser) });

    if (method === 'POST' && path === '/users') {
      const e = validateUsername(body?.username) || validatePassword(body?.password, body?.username);
      if (e) return err(400, e);
      if (users.some((u) => u.username === normUser(body.username))) return err(409, 'اسم المستخدم مستخدم مسبقاً.');
      const role: Role = body.role === 'owner' ? 'owner' : 'manager';
      const salt = randomBytes(16).toString('hex');
      users.push({
        id: `u_${randomBytes(8).toString('hex')}`,
        username: normUser(body.username),
        displayName: String(body.displayName || body.username).trim().slice(0, 40),
        role,
        createdAt: new Date(now).toISOString(),
        salt,
        hash: await hashPassword(body.password, salt),
        tv: 1,
      });
      await d.site.setJSON('users', users);
      return json({ ok: true });
    }

    const idm = /^\/users\/(u_[a-f0-9]{16})$/.exec(path);
    if (idm) {
      const target = users.find((u) => u.id === idm[1]);
      if (!target) return err(404, 'المستخدم غير موجود.');

      if (method === 'DELETE') {
        if (target.id === me.id) return err(400, 'لا يمكنك حذف حسابك.');
        const rest = users.filter((u) => u.id !== target.id);
        if (activeOwners(rest) === 0) return err(400, 'يجب أن يبقى مالك فعّال واحد على الأقل.');
        await d.site.setJSON('users', rest);
        return json({ ok: true });
      }

      if (method === 'PATCH') {
        if (typeof body?.role === 'string') {
          if (target.id === me.id) return err(400, 'لا يمكنك تغيير صلاحية حسابك.');
          target.role = body.role === 'owner' ? 'owner' : 'manager';
          target.tv += 1;
        }
        if (typeof body?.disabled === 'boolean') {
          if (target.id === me.id) return err(400, 'لا يمكنك إيقاف حسابك.');
          target.disabled = body.disabled;
          target.tv += 1;
        }
        if (typeof body?.password === 'string') {
          const e = validatePassword(body.password, target.username);
          if (e) return err(400, e);
          target.salt = randomBytes(16).toString('hex');
          target.hash = await hashPassword(body.password, target.salt);
          target.tv += 1;
        }
        if (activeOwners(users) === 0) return err(400, 'يجب أن يبقى مالك فعّال واحد على الأقل.');
        await d.site.setJSON('users', users);
        return json({ ok: true });
      }
    }
  }

  return err(404, 'غير موجود.');
}
