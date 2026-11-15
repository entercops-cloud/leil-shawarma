// ONE-TIME migration helper. Older versions of the site kept the owner's edits in this browser
// (localStorage / IndexedDB). On the owner's first sign-in this reads them once so they can be
// published to the server, and then wipes every legacy key. After that nothing is stored in the browser.
// (Safe to delete this file once the migration has been done.)

import type { MenuItem, FlashOffer, SiteCustomization } from '../types';

const LEGACY_LOCAL_KEYS = [
  'leil_shawarma_menu_items_v2',
  'leil_shawarma_flash_offers_v2',
  'leil_shawarma_site_customization_v1',
  'leil_shawarma_reviews_v2',
  'leil_shawarma_orders_v1',
  'leil_shawarma_loyalty_v1',
  'leil_shawarma_admin_session_v1',
  'leil_shawarma_media_library_v1',
  'leil_auth_users_v2',
  'leil_auth_lock_v1',
];
const LEGACY_SESSION_KEYS = ['leil_auth_session_v1', 'leil_auth_session_v2'];
const LEGACY_IDB = 'leil_shawarma_offline_store_v1';

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

async function legacyIdbExists(): Promise<boolean> {
  try {
    const list = await window.indexedDB.databases?.();
    return !!list?.some((d) => d.name === LEGACY_IDB); // if the browser can't list databases, skip (never create one)
  } catch {
    return false;
  }
}

async function readLegacyIdbMenu(): Promise<MenuItem[] | null> {
  // Opening a database that does not exist would CREATE an empty one, so check first.
  if (!window.indexedDB || !(await legacyIdbExists())) return null;
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(LEGACY_IDB);
      req.onupgradeneeded = () => req.transaction?.abort(); // safety net: never leave a new empty database behind
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains('keyval_store')) {
            db.close();
            return resolve(null);
          }
          const get = db.transaction('keyval_store', 'readonly').objectStore('keyval_store').get('menu_items');
          get.onsuccess = () => {
            db.close();
            resolve(Array.isArray(get.result) ? (get.result as MenuItem[]) : null);
          };
          get.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

export interface LegacyContent {
  menu?: MenuItem[];
  offers?: FlashOffer[];
  customization?: SiteCustomization;
}

/** Returns what an older version saved in this browser (or null if nothing). */
export async function readLegacyContent(): Promise<LegacyContent | null> {
  const idbMenu = await readLegacyIdbMenu();
  const menu = idbMenu && idbMenu.length > 0 ? idbMenu : readJson<MenuItem[]>('leil_shawarma_menu_items_v2');
  const offers = readJson<FlashOffer[]>('leil_shawarma_flash_offers_v2');
  const customization = readJson<SiteCustomization>('leil_shawarma_site_customization_v1');
  const found: LegacyContent = {};
  if (Array.isArray(menu) && menu.length > 0) found.menu = menu;
  if (Array.isArray(offers)) found.offers = offers;
  if (customization && typeof customization === 'object') found.customization = customization;
  return Object.keys(found).length > 0 ? found : null;
}

/** Removes every key older versions left behind (localStorage, sessionStorage, IndexedDB). */
export function clearLegacyStorage(): void {
  try {
    LEGACY_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
    LEGACY_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
    window.indexedDB?.deleteDatabase(LEGACY_IDB);
  } catch {
    /* ignore */
  }
}
