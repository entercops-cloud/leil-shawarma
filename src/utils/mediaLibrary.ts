import { HERO_IMAGE } from '../data/menuData';
import { api } from './auth';

import chickenWrapImg from '../assets/images/shawarma_chicken_wrap_1791041603153.jpg';
import beefPlatterImg from '../assets/images/shawarma_beef_platter_1791041615785.jpg';
import arabiMealImg from '../assets/images/shawarma_arabi_meal_1791041625052.jpg';
import familyBoxImg from '../assets/images/leil_family_box_1791041634511.jpg';

export interface MediaImage {
  id: string;
  name: string;
  url: string;
  size?: string;
  createdAt: string;
  isPreset?: boolean;
}

export const PRESET_MEDIA: MediaImage[] = [
  {
    id: 'preset-hero',
    name: 'بانر ليل الرئيسي (سيخ ومقبلات)',
    url: HERO_IMAGE,
    size: 'عالي الدقة',
    createdAt: '2026-10-01',
    isPreset: true,
  },
  {
    id: 'preset-chicken',
    name: 'شاورما دجاج صاج مقرمشة',
    url: chickenWrapImg,
    size: 'عالي الدقة',
    createdAt: '2026-10-01',
    isPreset: true,
  },
  {
    id: 'preset-beef',
    name: 'صحن شاورما لحم عجل فاخر',
    url: beefPlatterImg,
    size: 'عالي الدقة',
    createdAt: '2026-10-01',
    isPreset: true,
  },
  {
    id: 'preset-arabi',
    name: 'وجبة عربي دجاج كلاسيك وبطاطا',
    url: arabiMealImg,
    size: 'عالي الدقة',
    createdAt: '2026-10-01',
    isPreset: true,
  },
  {
    id: 'preset-box',
    name: 'بوكس ليل الملكي العائلي',
    url: familyBoxImg,
    size: 'عالي الدقة',
    createdAt: '2026-10-01',
    isPreset: true,
  },
];

// The uploaded images live on the server (admin only). This is just an in-memory copy of that list.
let uploadedCache: MediaImage[] = [];

export function getMediaLibrary(): MediaImage[] {
  return [...uploadedCache, ...PRESET_MEDIA];
}

/** Loads the uploaded-images list from the server. */
export async function refreshMediaLibrary(): Promise<MediaImage[]> {
  try {
    const { items } = await api<{ items: { id: string; url: string; name: string; size?: string; createdAt: string }[] }>('/media', { auth: true });
    uploadedCache = items.map((i) => ({ id: i.id, name: i.name, url: i.url, size: i.size, createdAt: new Date(i.createdAt).toLocaleDateString('ar-PS'), isPreset: false }));
  } catch {
    /* keep whatever we had */
  }
  return getMediaLibrary();
}

export async function deleteMediaImageFromStorage(id: string): Promise<void> {
  await api(`/media/${id}`, { method: 'DELETE', auth: true });
  uploadedCache = uploadedCache.filter((i) => i.id !== id);
}

/**
 * Compresses an image (max 1000px, JPEG 0.85) and uploads it to the server library.
 * Returns the image with its permanent /api/media/... URL.
 */
export function processImageFile(file: File): Promise<MediaImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('الملف ليس صورة صالحة'));

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1000;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('فشل معالجة الكانفاس'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const name = file.name.replace(/\.[^/.]+$/, '');

        try {
          const up = await api<{ url: string; id: string; item: { id: string; url: string; name: string; size?: string; createdAt: string } }>('/media', {
            method: 'POST',
            auth: true,
            body: { dataUrl, library: true, name },
          });
          const newImage: MediaImage = {
            id: up.item.id,
            name: up.item.name,
            url: up.item.url,
            size: up.item.size,
            createdAt: new Date(up.item.createdAt).toLocaleDateString('ar-PS'),
            isPreset: false,
          };
          uploadedCache = [newImage, ...uploadedCache.filter((i) => i.id !== newImage.id)];
          resolve(newImage);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('فشل رفع الصورة إلى الخادم'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Downloads an image to customer/admin device
 */
export function downloadImage(url: string, filename: string) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename || 'shawarma-leil'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Download error:', e);
  }
}
