// Cloudflare KV adapter for the shared server store interface.
// The app only needs JSON documents plus small binary blobs (menu images),
// which KV handles natively (metadata carries the content type).
import type { Store } from '../../netlify/lib/server';

/** Minimal structural type for a KV binding, so this file type-checks without workers-types. */
export interface KVNamespaceLike {
  get(key: string, type: 'json'): Promise<unknown>;
  getWithMetadata<M = unknown>(
    key: string,
    type: 'arrayBuffer',
  ): Promise<{ value: ArrayBuffer | null; metadata: M | null }>;
  put(key: string, value: string | ArrayBuffer, options?: { metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
  }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export function kvStore(kv: KVNamespaceLike): Store {
  return {
    async getJSON<T = unknown>(key: string): Promise<T | null> {
      const value = await kv.get(key, 'json');
      return (value as T) ?? null;
    },
    async setJSON(key: string, value: unknown): Promise<void> {
      await kv.put(key, JSON.stringify(value));
    },
    async getBlob(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
      const res = await kv.getWithMetadata<{ contentType?: string }>(key, 'arrayBuffer');
      if (!res || !res.value) return null;
      return { data: res.value, contentType: res.metadata?.contentType || 'application/octet-stream' };
    },
    async setBlob(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
      await kv.put(key, data, { metadata: { contentType } });
    },
    async del(key: string): Promise<void> {
      await kv.delete(key);
    },
    async list(prefix: string): Promise<string[]> {
      const keys: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await kv.list({ prefix, cursor });
        keys.push(...page.keys.map((k) => k.name));
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return keys;
    },
  };
}
