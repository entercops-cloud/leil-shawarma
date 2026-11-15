// Cloudflare Pages Function: serves every /api/* request with the same handler
// the Netlify function uses, backed by Workers KV instead of Netlify Blobs.
import { handle } from '../../netlify/lib/server';
import { kvStore, type KVNamespaceLike } from '../lib/kv-store';

interface Env {
  SITE_KV: KVNamespaceLike;
  MEDIA_KV: KVNamespaceLike;
  ADMIN_SETUP_CODE?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequest = async (ctx: PagesContext): Promise<Response> => {
  const env = ctx.env;
  if (!env.SITE_KV || !env.MEDIA_KV) {
    return new Response(
      JSON.stringify({
        error:
          'إعدادات Cloudflare ناقصة: اربط مساحتي KV باسم SITE_KV و MEDIA_KV في إعدادات المشروع.',
      }),
      { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } },
    );
  }

  return handle(ctx.request, {
    site: kvStore(env.SITE_KV),
    media: kvStore(env.MEDIA_KV),
    env: { ADMIN_SETUP_CODE: env.ADMIN_SETUP_CODE },
    // No SMS provider is connected, so customer accounts / loyalty stay off.
    otp: undefined,
    ip: ctx.request.headers.get('cf-connecting-ip') || 'unknown',
  });
};
