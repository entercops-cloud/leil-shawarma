export interface MenuItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number; // in ILS / Shekel
  categoryId: string;
  subCategory?: string; // Sub-category (e.g. ساندويشات صاج, وجبات فردية, صحون, بوكسات)
  image: string;
  badge?: string;
  isPopular?: boolean;
  calories?: number;
  isAvailable?: boolean;
  options?: {
    sizes?: { name: string; priceDelta: number }[];
    breads?: string[];
    sauces?: string[];
    extras?: { id: string; name: string; price: number }[];
    removals?: string[];
  };
}

export interface Review {
  id: string;
  itemId: string;
  userName: string;
  rating: number; // 1 - 5
  comment?: string;
  createdAt: string;
}

export interface ItemRatingSummary {
  average: number;
  count: number;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  subCategories?: string[]; // Defined list of sub-categories for this section
}

export interface CartItemOption {
  size?: string;
  bread?: string;
  extras?: string[];
  removals?: string[];
  notes?: string;
  unitPrice: number;
}

export interface CartItem {
  cartItemId: string; // unique ID including customization
  menuItem: MenuItem;
  quantity: number;
  options: CartItemOption;
  totalPrice: number;
  offerId?: string; // set when the item was added from a flash offer
}

export interface CustomerOrderInfo {
  fullName: string;
  phoneNumber: string;
  orderType: 'delivery' | 'pickup';
  address: string;
  neighborhood: string;
  notes: string;
  paymentMethod: 'cash' | 'card' | 'jawwal_pay';
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

export interface PlacedOrder {
  orderId: string;
  createdAt: string;
  createdAtIso?: string;
  timestamp?: number;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: CustomerOrderInfo;
  estimatedTime: string;
  pointsEarned?: number;     // points this order will give (credited per loyalty settings)
  pointsAwarded?: boolean;   // true once the points were actually credited
  pointsRedeemed?: number;   // points the customer spent on this order
  pointsRefunded?: boolean;  // redeemed points returned after cancellation
  pointsDiscount?: number;
  status?: OrderStatus;
  statusUpdatedAt?: string;
  trackKey?: string;                                   // secret used by the customer's device to follow the status
  paymentStatus?: 'on_delivery' | 'unpaid' | 'paid';   // for the future online-payment step
}

export interface LoyaltyAccount {
  points: number;
  totalSpent: number;
  ordersCount: number;
  tier: 'عادي' | 'برونزي' | 'فضي' | 'ذهبي';
}

export interface AdminUser {
  username: string;
  name: string;
  isLoggedIn: boolean;
}

export interface FlashOffer {
  id: string;
  title: string;
  badge: string; // e.g. "عرض محدود 🔥", "خصم خاص ⚡"
  description: string;
  discountPercentage: number; // e.g. 20 (20%)
  targetItemId: string; // id of meal in menu
  originalPrice: number;
  discountedPrice: number;
  endsAt: string; // ISO string
  isActive: boolean;
  image?: string;
}

export interface DeliveryRegion {
  id: string;
  name: string;
  fee: number; // 0 = free delivery
}

export interface LoyaltySettings {
  enabled: boolean;            // false = no points are earned at all
  pointsPerShekel: number;     // points earned per 1 ₪ (can be fractional, e.g. 0.5)
  awardOn: 'completed' | 'placed'; // when points are credited
  includeDeliveryFee: boolean; // count the delivery fee when calculating points
}

export interface SiteCustomization {
  branding: {
    restaurantName: string;
    restaurantNameEn: string;
    tagline: string;
    logoMode: 'vector' | 'image';
    customLogoUrl: string;
    logoSubtitle: string;
    heroBackgroundImage?: string; // Custom background image for entry/hero section
  };
  colors: {
    primaryNavy: string;      // default: #0B192C
    primaryNavyDark: string;  // default: #060D17
    accentRed: string;        // default: #E61C24
    accentRedHover: string;   // default: #c7121a
    accentGold: string;       // default: #F59E0B
    bgSurface: string;        // default: #F8FAFC
  };
  texts: {
    headerNotice: string;
    heroHeadline: string;
    heroSubheadline: string;
    heroBadge: string;
    heroButtonText: string;
    flashOffersTitle: string;
    flashOffersSubtitle: string;
    menuHeading: string;
    workingHours: string;
    deliveryTime: string;
    locationShort: string;
    locationFull: string;
    phone: string;
    whatsapp: string;
    footerAbout: string;
    footerMenuTitle: string;
    footerHoursTitle: string;
    footerHoursLabel: string;
    footerHours: string;
    footerDeliveryTitle: string;
    footerDeliveryAreas: string;
    footerContactTitle: string;
    footerMapsLinkText: string;
    footerRegion: string;
    footerRights: string;
  };
  sectionsVisibility: {
    showHeroBanner: boolean;
    showFlashOffers: boolean;
    showSearchBar: boolean;
    showCategoryNav: boolean;
    showRatingsOnCards: boolean;
    showFloatingCart: boolean;
  };
  payments: {
    cardEnabled: boolean;        // electronic card payment (needs a real gateway to take money)
    walletEnabled: boolean;      // manual e-wallet payment (Jawwal Pay / PalPay ...)
    walletLabel: string;
    walletInstructions: string;
  };
  loyalty: LoyaltySettings;
  ordering: {
    minOrder: number; // 0 = open order (no minimum)
    deliveryRegions: DeliveryRegion[];
  };
  bottomBar?: {
    enabled?: boolean;
    mode?: 'cart_only' | 'always_visible';
    text?: string;
    buttonText?: string;
    emptyText?: string;
    emptyButtonText?: string;
    showPhoneQuickAction?: boolean;
    showWhatsappQuickAction?: boolean;
  };
}
