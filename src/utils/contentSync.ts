// Shared site content (menu, offers, customization): read by everyone, written by signed-in admins.
// Images are uploaded to the server first so published content only contains small /api/media/... URLs.

import { api } from './auth';
import type { MenuItem, FlashOffer, SiteCustomization } from '../types';

export interface SiteContent {
  menu: MenuItem[];
  offers: FlashOffer[];
  customization: SiteCustomization;
  updatedAt?: string;
}

/** SiteContent = loaded, null = server reachable but nothing published yet, undefined = server unreachable. */
export async function fetchContent(): Promise<SiteContent | null | undefined> {
  try {
    const { content } = await api<{ content: SiteContent | null }>('/content');
    return content ?? null;
  } catch {
    return undefined;
  }
}

const uploadCache = new Map<string, string>();
const BUNDLED_ASSET = /^\/assets\/[^?#]+\.(png|jpe?g|webp|gif|svg)$/i;
const MIME_BY_EXT: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    r.readAsDataURL(blob);
  });

async function uploadImage(src: string): Promise<string> {
  const cached = uploadCache.get(src);
  if (cached) return cached;

  let dataUrl = src;
  if (!src.startsWith('data:')) {
    // image bundled with the site: copy it to permanent storage so a future rebuild can't break the link
    const res = await fetch(src);
    if (!res.ok) throw new Error('تعذر قراءة صورة من الموقع.');
    const blob = await res.blob();
    const ext = src.split('.').pop()!.toLowerCase();
    dataUrl = await blobToDataUrl(blob.type.startsWith('image/') ? blob : new Blob([blob], { type: MIME_BY_EXT[ext] || 'image/jpeg' }));
  }
  const { url } = await api<{ url: string }>('/media', { method: 'POST', auth: true, body: { dataUrl } });
  uploadCache.set(src, url);
  return url;
}

async function mapStrings<T>(value: T): Promise<T> {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') || BUNDLED_ASSET.test(value)) return (await uploadImage(value)) as unknown as T;
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) out.push(await mapStrings(v));
    return out as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = await mapStrings(v);
    return out as T;
  }
  return value;
}

/** Uploads any local images, publishes the content, and returns it with the permanent image URLs. */
export async function pushContent(c: SiteContent): Promise<SiteContent> {
  const prepared = await mapStrings({ menu: c.menu, offers: c.offers, customization: c.customization });
  await api('/content', { method: 'PUT', auth: true, body: prepared });
  return prepared;
}
