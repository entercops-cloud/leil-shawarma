import React from 'react';
import { Phone, ShoppingBag, MapPin, Search, Lock, ShieldCheck, Plus, Award, Palette, AlertTriangle, Menu, Clock } from 'lucide-react';
import { Logo } from './Logo';
import { RESTAURANT_INFO } from '../data/menuData';
import { SiteCustomization } from '../types';

interface HeaderProps {
  cartItemCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenLocation: () => void;
  onOpenOrderHistory?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminPanel: () => void;
  onAddNewItem: () => void;
  loyaltyPoints?: number;
  showLoyalty?: boolean;
  customization?: SiteCustomization;
  onOpenSiteCustomizer?: () => void;
  delayedOrdersCount?: number;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartItemCount,
  cartTotal,
  onOpenCart,
  onOpenLocation,
  onOpenOrderHistory,
  searchQuery,
  onSearchChange,
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminPanel,
  onAddNewItem,
  loyaltyPoints = 0,
  showLoyalty = false,
  customization,
  onOpenSiteCustomizer,
  delayedOrdersCount = 0,
  onOpenMobileMenu,
}) => {
  const restaurantName = customization?.branding?.restaurantName || RESTAURANT_INFO.name;
  const restaurantNameEn = customization?.branding?.restaurantNameEn || RESTAURANT_INFO.nameEn;
  const headerNotice = customization?.texts?.headerNotice || `مفتوح الآن (${customization?.texts?.workingHours || RESTAURANT_INFO.workingHours})`;
  const showSearch = customization?.sectionsVisibility?.showSearchBar !== false;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      {/* Top micro bar with subtle European styling */}
      <div className="border-b border-stone-200/70 text-xs py-1.5 px-4 bg-stone-50/80 text-stone-600">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{headerNotice}</span>
            </span>
            <span className="hidden md:flex items-center gap-1 text-stone-500">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>{customization?.texts?.locationShort || RESTAURANT_INFO.address}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {showLoyalty && (
            <button
              onClick={onOpenCart}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-colors text-[11px] shadow-2xs"
              title="رصيد نقاط الولاء - اضغط لاستبدال النقاط في السلة"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono tabular-nums">{loyaltyPoints}</span>
              <span className="hidden xs:inline">نقطة</span>
            </button>
            )}

            {/* Direct Phone Call Link */}
            <a
              href={`tel:${customization?.texts?.phone || RESTAURANT_INFO.phone}`}
              className="flex items-center gap-1.5 text-stone-700 hover:text-red-700 transition-colors font-mono tabular-nums font-semibold bg-white border border-stone-200/80 px-2.5 py-1 rounded-xl shadow-2xs text-[11px]"
            >
              <Phone className="w-3 h-3 text-stone-500" />
              <span dir="ltr">{customization?.texts?.phone || RESTAURANT_INFO.phone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark & Logo */}
        <a href="#menu" className="flex items-center gap-3 group">
          <div className="p-1 rounded-xl border border-stone-200/80 bg-white shadow-2xs transition-transform group-hover:scale-105">
            <Logo
              size="sm"
              showSubtitle={false}
              logoMode={customization?.branding?.logoMode}
              customImageUrl={customization?.branding?.customLogoUrl}
              customNavyColor="#18181B"
              customRedColor="#B91C1C"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-black tracking-tight text-stone-900 flex items-center gap-2">
              <span>{restaurantName}</span>
              <span className="text-xs font-semibold text-stone-400 tracking-wider font-mono uppercase">
                {restaurantNameEn}
              </span>
            </span>
            <span className="text-[11px] text-stone-500 truncate max-w-[180px] sm:max-w-none">
              {customization?.branding?.tagline || RESTAURANT_INFO.tagline}
            </span>
          </div>
        </a>

        {/* Zone 2: European Minimalist Search Box */}
        {showSearch && (
          <div className="hidden lg:flex items-center flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث عن وجبة، ساندويش، مقبلات..."
                className="w-full bg-stone-100/80 hover:bg-stone-100 focus:bg-white text-stone-900 placeholder-stone-400 text-xs rounded-xl pr-9 pl-8 py-2.5 border border-stone-200 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Zone 3: Navigation Links & Cart Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenOrderHistory && (
            <button
              onClick={onOpenOrderHistory}
              className="hidden md:flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100/90 px-3 py-2 rounded-xl border border-amber-200/90 font-bold transition-colors shadow-2xs"
              title="تتبع حالة طلبك السابقة واستعلام نقاط الولاء برقم الهاتف"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{showLoyalty ? 'تتبع طلباتي ونقاطي' : 'تتبع طلباتي'}</span>
            </button>
          )}

          <button
            onClick={onOpenLocation}
            className="hidden sm:flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors border border-stone-200/80 font-medium"
          >
            <MapPin className="w-3.5 h-3.5 text-stone-500" />
            <span>الفروع والموقع</span>
          </button>

          {/* Cart Button: Clean European Black CTA with subtle counter */}
          <button
            onClick={onOpenCart}
            aria-label="عرض عربة التسوق"
            className="relative flex items-center gap-2.5 active:scale-95 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-xs transition-all"
          >
            <div className="relative">
              <ShoppingBag className="w-4.5 h-4.5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </div>
            <div className="flex flex-col text-right leading-tight">
              <span className="text-[10px] font-medium text-stone-300 hidden sm:inline">السلة</span>
              <span className="text-xs font-black tabular-nums whitespace-nowrap">
                {cartTotal > 0 ? `${cartTotal} ₪` : '0 ₪'}
              </span>
            </div>
          </button>

          {/* Mobile Menu Hamburger Button */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="فتح القائمة الرئيسية للجوال"
              className="lg:hidden p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors border border-stone-200 flex items-center justify-center active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar Row */}
      {showSearch && (
        <div className="lg:hidden px-4 pb-3 pt-0.5">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن وجبة، ساندويش، مقبلات..."
              className="w-full bg-stone-100/90 focus:bg-white text-stone-900 placeholder-stone-400 text-xs rounded-2xl pr-9 pl-8 py-2.5 border border-stone-200/90 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-300 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
