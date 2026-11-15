// Local server for end-to-end tests: serves the built site and the real API handler (in-memory storage, fake SMS).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handle } from '../netlify/lib/server.ts';
import { World } from './harness.mts';

const PORT = Number(process.env.PORT || 4173);
const DIST = path.resolve(process.argv[2] || 'dist');
const w = new World();
w.env.ADMIN_SETUP_CODE = 'E2E-SETUP-1';
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  if (url.pathname === '/__test/otp') {
    const last = w.otp.sent[w.otp.sent.length - 1];
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify(last ?? null));
  }
  if (url.pathname === '/__test/sms-off') { w.otpEnabled = false; return res.end('ok'); }
  if (url.pathname.startsWith('/api/')) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const r = await handle(
      new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method!) ? undefined : Buffer.concat(chunks) }),
      { site: w.site, media: w.media, env: w.env, otp: w.otpEnabled ? w.otp : undefined, ip: req.socket.remoteAddress || 'local', now: () => Date.now() }
    );
    res.statusCode = r.status;
    r.headers.forEach((v, k) => { if (k !== 'set-cookie') res.setHeader(k, v); });
    const sc = r.headers.getSetCookie?.() ?? [];
    if (sc.length) res.setHeader('set-cookie', sc);
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let file = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.setHeader('content-type', mime[path.extname(file)] || 'application/octet-stream');
  res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('e2e server on', PORT));
