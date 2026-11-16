// Defaults and pure helper functions only.
// Nothing here reads or writes browser storage: all real data (menu, offers, settings, orders, reviews,
// customers, loyalty points, images, admin accounts) lives on the server.

import { Review, MenuItem, LoyaltySettings, FlashOffer, SiteCustomization } from '../types';
import { MENU_ITEMS as INITIAL_MENU_ITEMS, RESTAURANT_INFO, HERO_IMAGE } from '../data/menuData';
import arabiMealImg from '../assets/images/shawarma_arabi_meal_1791041625052.jpg';
import familyBoxImg from '../assets/images/leil_family_box_1791041634511.jpg';

export { INITIAL_MENU_ITEMS };

export function calculateItemRating(itemId: string, reviews: Review[]) {
  const itemReviews = reviews.filter((r) => r.itemId === itemId);
  if (itemReviews.length === 0) {
    return { average: 5.0, count: 0 }; // Default baseline
  }
  const sum = itemReviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Number((sum / itemReviews.length).toFixed(1));
  return { average, count: itemReviews.length };
}

// --- MENU STORAGE HELPERS WITH INDEXEDDB & SAFE QUOTA PROTECTION ---

export function calculateTier(points: number): 'عادي' | 'برونزي' | 'فضي' | 'ذهبي' {
  if (points >= 500) return 'ذهبي';
  if (points >= 250) return 'فضي';
  if (points >= 100) return 'برونزي';
  return 'عادي';
}

export function calculateOrderPoints(
  subtotalAfterDiscount: number,
  deliveryFee: number,
  settings: LoyaltySettings
): number {
  if (!settings.enabled) return 0;
  const base = Math.max(0, subtotalAfterDiscount) + (settings.includeDeliveryFee ? Math.max(0, deliveryFee) : 0);
  return Math.floor(base * Math.max(0, settings.pointsPerShekel));
}

export const DEFAULT_SITE_CUSTOMIZATION: SiteCustomization = {
  branding: {
    restaurantName: RESTAURANT_INFO.name,
    restaurantNameEn: RESTAURANT_INFO.nameEn,
    tagline: RESTAURANT_INFO.tagline,
    logoMode: 'vector',
    customLogoUrl: '',
    logoSubtitle: 'شاورما على أصولها',
    heroBackgroundImage: '',
  },
  colors: {
    primaryNavy: '#18181B', // Architectural charcoal / Zinc 900
    primaryNavyDark: '#09090B',
    accentRed: '#B91C1C', // Refined European bistro crimson
    accentRedHover: '#991B1B',
    accentGold: '#D97706', // Warm amber / bronze
    bgSurface: '#FAFAF9', // Clean warm porcelain / stone European canvas
  },
  texts: {
    headerNotice: 'أهلاً بكم في شاورما ليل · خدمة وتوصيل بأعلى معايير الجودة 🌯',
    heroHeadline: 'شاورما ليل · الطعم الأصيل بلمسة عصرية راقية',
    heroSubheadline: 'نحضر لك يومياً أشهى سيخ شاورما دجاج ولحم عجل طازج بأسرار التتبيلة الخاصة، مع خبز الصاج والطابون المحمص ومقبلات ليل الغنية.',
    heroBadge: 'تحضير طازج على أصول الشواء',
    heroButtonText: 'تصفح قائمة الطعام',
    flashOffersTitle: 'عروض خاصة ومختارة',
    flashOffersSubtitle: 'عروض موسمية حصرية للمذاق الاستثنائي بأسعار مميزة',
    menuHeading: 'قائمة طعام شاورما ليل',
    workingHours: RESTAURANT_INFO.workingHours,
    deliveryTime: RESTAURANT_INFO.deliveryTime,
    locationShort: 'الخليل - خاراس',
    locationFull: RESTAURANT_INFO.address,
    phone: RESTAURANT_INFO.phone,
    whatsapp: RESTAURANT_INFO.phoneIntl,
    footerAbout: 'مطعم شاورما ليل - الخيار الأول لعشاق الشاورما الحقيقية في بلدة خاراس ومحافظة الخليل. جودة عالية ومكونات طازجة يومياً وفق أعلى معايير الضيافة.',
    footerMenuTitle: 'قائمة الطعام',
    footerHoursTitle: 'ساعات العمل والخدمة',
    footerHoursLabel: 'يومياً بدون عطل:',
    footerHours: '12:00 ظهراً - 1:00 ليلاً',
    footerDeliveryTitle: 'مناطق التوصيل السريع:',
    footerDeliveryAreas: 'خاراس، صوريف، نوبا، حاسين، بيت أولا، وحلحول.',
    footerContactTitle: 'العنوان والاتصال',
    footerMapsLinkText: 'عرض الموقع على Google Maps',
    footerRegion: 'الخليل - خاراس - فلسطين',
    footerRights: 'جميع الحقوق محفوظة.',
  },
  sectionsVisibility: {
    showHeroBanner: true,
    showFlashOffers: true,
    showSearchBar: true,
    showCategoryNav: true,
    showRatingsOnCards: true,
    showFloatingCart: true,
  },
  payments: {
    cardEnabled: false,
    walletEnabled: false,
    walletLabel: 'محفظة إلكترونية (جوال باي / PalPay)',
    walletInstructions: 'بعد تأكيد الطلب سنرسل لك تعليمات التحويل على واتساب، ويبدأ التحضير بعد وصول المبلغ.',
  },
  loyalty: {
    enabled: true, // customer accounts & loyalty points are available by default; the owner can switch them off
    pointsPerShekel: 1,
    awardOn: 'completed',
    includeDeliveryFee: false,
    redeemPoints: 50,
    redeemDiscount: 5,
  },
  ordering: {
    minOrder: 0, // طلب مفتوح: بدون حد أدنى
    deliveryRegions: [
      { id: 'r1', name: 'خاراس - داخل البلدة', fee: 4 },
      { id: 'r2', name: 'خاراس - أطراف البلدة ومزارع', fee: 6 },
      { id: 'r3', name: 'صوريف', fee: 10 },
      { id: 'r4', name: 'نوبا', fee: 10 },
      { id: 'r5', name: 'حاسين / حتّا', fee: 10 },
      { id: 'r6', name: 'بيت أولا', fee: 12 },
      { id: 'r7', name: 'حلحول', fee: 20 },
      { id: 'r8', name: 'الخليل - المركز', fee: 25 },
    ],
  },
  bottomBar: {
    enabled: true,
    mode: 'cart_only',
    text: 'طلبك الحالي',
    buttonText: 'إتمام الطلب',
    emptyText: 'شاورما ليل · أشهى سيخ شاورما يصلك ساخناً',
    emptyButtonText: 'اطلب الآن',
    showPhoneQuickAction: true,
    showWhatsappQuickAction: true,
  },
};

export function normalizeCustomization(parsed: any): SiteCustomization {
  const loadedColors = { ...DEFAULT_SITE_CUSTOMIZATION.colors, ...(parsed.colors || {}) };
  
  // Automatically modernize any legacy dark-mode or pitch-black background to the clean European warm stone palette
  if (
    loadedColors.bgSurface === '#080C14' || 
    loadedColors.bgSurface === '#060A12' || 
    loadedColors.bgSurface === '#0B1220' ||
    loadedColors.bgSurface === '#0B192C' ||
    !loadedColors.bgSurface
  ) {
    loadedColors.bgSurface = '#FAFAF9';
    loadedColors.primaryNavy = '#18181B';
    loadedColors.accentRed = '#B91C1C';
  }
  return {
    branding: { ...DEFAULT_SITE_CUSTOMIZATION.branding, ...(parsed.branding || {}) },
    colors: loadedColors,
    texts: { ...DEFAULT_SITE_CUSTOMIZATION.texts, ...(parsed.texts || {}) },
    sectionsVisibility: (({ showBlueprintButton: _legacy, ...rest }) => rest)({ ...DEFAULT_SITE_CUSTOMIZATION.sectionsVisibility, ...(parsed.sectionsVisibility || {}) }) as SiteCustomization['sectionsVisibility'],
    payments: { ...DEFAULT_SITE_CUSTOMIZATION.payments, ...(parsed.payments || {}) },
    loyalty: {
      ...DEFAULT_SITE_CUSTOMIZATION.loyalty,
      ...(parsed.loyalty || {}),
      redeemPoints: Math.max(1, Math.round(Number(parsed.loyalty?.redeemPoints ?? DEFAULT_SITE_CUSTOMIZATION.loyalty.redeemPoints) || DEFAULT_SITE_CUSTOMIZATION.loyalty.redeemPoints)),
      redeemDiscount: Math.max(0, Number(parsed.loyalty?.redeemDiscount ?? DEFAULT_SITE_CUSTOMIZATION.loyalty.redeemDiscount) || 0),
    },
    ordering: {
      minOrder: Number.isFinite(parsed.ordering?.minOrder) ? Math.max(0, parsed.ordering.minOrder) : DEFAULT_SITE_CUSTOMIZATION.ordering.minOrder,
      deliveryRegions:
        Array.isArray(parsed.ordering?.deliveryRegions) && parsed.ordering.deliveryRegions.length > 0
          ? parsed.ordering.deliveryRegions
          : DEFAULT_SITE_CUSTOMIZATION.ordering.deliveryRegions,
    },
    bottomBar: { ...DEFAULT_SITE_CUSTOMIZATION.bottomBar, ...(parsed.bottomBar || {}) },
  };
}

export const DEFAULT_FLASH_OFFERS: FlashOffer[] = [
  {
    id: 'offer-arabi-flash',
    title: 'عرض البرق: وجبة عربي دجاج + بطاطا وثومية ومخللات',
    badge: 'عرض البرق ⚡',
    description: 'وجبة شاورما دجاج مقطعة ومحمرة مع البطاطا المقلية والثومية والمخللات بخصم فوري خاص!',
    discountPercentage: 15,
    targetItemId: 'chk-arabi',
    originalPrice: 20,
    discountedPrice: 17,
    savings: 3,
    endsAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    isActive: true,
    image: arabiMealImg,
  },
  {
    id: 'offer-box-flash',
    title: 'عرض اللمة: بوكس ليل (10 قطع عربي + بطاطا وسلطات وكولا 1.25 لتر)',
    badge: 'خصم العائلة 🔥',
    description: '10 قطع شاورما عربي مع بطاطا وسلطات مشكل وصوصات متنوعة وزجاجة كولا 1.25 لتر بسعر توفيري!',
    discountPercentage: 14,
    targetItemId: 'leil-box',
    originalPrice: 80,
    discountedPrice: 69,
    savings: 11,
    endsAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    isActive: true,
    image: familyBoxImg,
  },
];
