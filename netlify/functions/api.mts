import { getStore } from '@netlify/blobs';
import type { Context, Config } from '@netlify/functions';
import { handle, type Store } from '../lib/server';

// Netlify Blobs adapter (strong consistency so a write is visible to the very next read).
function blobStore(name: string): Store {
  const s = getStore({ name, consistency: 'strong' });
  return {
    getJSON: async (k) => ((await s.get(k, { type: 'json' })) as any) ?? null,
    setJSON: async (k, v) => {
      await s.setJSON(k, v as any);
    },
    getBlob: async (k) => {
      const r = await s.getWithMetadata(k, { type: 'arrayBuffer' });
      return r ? { data: r.data, contentType: String(r.metadata?.contentType || 'application/octet-stream') } : null;
    },
    setBlob: async (k, data, contentType) => {
      await s.set(k, data, { metadata: { contentType } });
    },
    del: async (k) => {
      await s.delete(k);
    },
    list: async (prefix) => (await s.list({ prefix })).blobs.map((b) => b.key),
  };
}

export default async (req: Request, context: Context): Promise<Response> =>
  handle(req, {
    site: blobStore('leil-site'),
    media: blobStore('leil-media'),
    env: { ADMIN_SETUP_CODE: process.env.ADMIN_SETUP_CODE },
    // No phone-verification provider is connected, so customer accounts / loyalty points stay unavailable.
    // To add one later, pass an object with start(phone) / check(phone, code) here as `otp`.
    otp: undefined,
    ip: context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown',
  });

export const config: Config = { path: '/api/*' };
