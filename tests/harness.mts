// Shared test harness: in-memory store + cookie-aware client around the real API handler.
import { handle, type Store, type OtpProvider } from '../netlify/lib/server.ts';

export const memStore = (): Store => {
  const j = new Map<string, any>();
  const b = new Map<string, any>();
  return {
    getJSON: async (k) => (j.has(k) ? JSON.parse(JSON.stringify(j.get(k))) : null),
    setJSON: async (k, v) => void j.set(k, JSON.parse(JSON.stringify(v))),
    getBlob: async (k) => b.get(k) ?? null,
    setBlob: async (k, d, c) => void b.set(k, { data: d, contentType: c }),
    del: async (k) => void j.delete(k),
    list: async (p) => [...j.keys()].filter((k) => k.startsWith(p)),
  };
};

export interface FakeOtp extends OtpProvider {
  sent: { phone: string; code: string }[];
}
export const fakeOtp = (): FakeOtp => {
  const codes = new Map<string, string>();
  const sent: { phone: string; code: string }[] = [];
  return {
    sent,
    async start(phone) {
      const code = String(100000 + Math.floor(Math.random() * 900000));
      codes.set(phone, code);
      sent.push({ phone, code });
    },
    async check(phone, code) {
      return codes.get(phone) === code;
    },
  };
};

export class World {
  site = memStore();
  media = memStore();
  clock = 1_700_000_000_000;
  otp = fakeOtp();
  env: { ADMIN_SETUP_CODE?: string } = { ADMIN_SETUP_CODE: 'SETUP-CODE-9' };
  otpEnabled = true;
  client(ip = '1.1.1.1') {
    return new Client(this, ip);
  }
}

export class Client {
  jar = new Map<string, string>();
  constructor(public w: World, public ip: string) {}
  async call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const h: Record<string, string> = { 'content-type': 'application/json', ...headers };
    if (method !== 'GET' && !('origin' in h)) h.origin = 'https://x.test';
    if (this.jar.size) h.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await handle(
      new Request('https://x.test' + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }),
      { site: this.w.site, media: this.w.media, env: this.w.env, otp: this.w.otpEnabled ? this.w.otp : undefined, ip: this.ip, now: () => this.w.clock }
    );
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      const val = pair.slice(i + 1);
      if (/Max-Age=0/i.test(sc) || val === '') this.jar.delete(name);
      else this.jar.set(name, val);
    }
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, body: ct.includes('json') ? await res.json() : null, headers: res.headers, setCookies, raw: res };
  }
}

let failures = 0;
export const check = (label: string, cond: boolean, detail?: unknown) => {
  if (cond) console.log('  ✓', label);
  else {
    failures++;
    console.log('  ✗ FAIL:', label, detail !== undefined ? JSON.stringify(detail) : '');
  }
};
export const section = (t: string) => console.log('\n' + t);
export const done = () => {
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};
