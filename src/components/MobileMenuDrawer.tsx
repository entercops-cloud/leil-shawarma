import React from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Award,
  ChevronLeft,
} from 'lucide-react';
import { Logo } from './Logo';
import { RESTAURANT_INFO, CATEGORIES } from '../data/menuData';
import { SiteCustomization } from '../types';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLocation: () => void;
  onOpenCart: () => void;
  onOpenOrderHistory?: () => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminPanel: () => void;
  onOpenSiteCustomizer?: () => void;
  loyaltyPoints?: number;
  showLoyalty?: boolean;
  customization?: SiteCustomization;
  delayedOrdersCount?: number;
  onSelectCategory?: (categoryId: string) => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  onOpenLocation,
  onOpenCart,
  onOpenOrderHistory,
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminPanel,
  onOpenSiteCustomizer,
  loyaltyPoints = 0,
  showLoyalty = false,
  customization,
  delayedOrdersCount = 0,
  onSelectCategory,
}) => {
  if (!isOpen) return null;

  const restaurantName = customization?.branding?.restaurantName || RESTAURANT_INFO.name;
  const restaurantNameEn = customization?.branding?.restaurantNameEn || RESTAURANT_INFO.nameEn;
  const workingHours = customization?.texts?.workingHours || RESTAURANT_INFO.workingHours;
  const phone = customization?.texts?.phone || RESTAURANT_INFO.phone;
  const address = customization?.texts?.locationShort || RESTAURANT_INFO.address;

  const handleCategoryClick = (catId: string) => {
    onClose();
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      const el = document.getElementById(`category-${catId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with clean blur */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-xs w-full bg-white border-l border-stone-200 text-stone-900 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 z-10">
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-xl bg-white border border-stone-200 shadow-xs">
                <Logo
                  size="sm"
                  showSubtitle={false}
                  logoMode={customization?.branding?.logoMode}
                  customImageUrl={customization?.branding?.customLogoUrl}
                  customNavyColor="#18181B"
                  customRedColor="#B91C1C"
                />
              </div>
              <div>
                <span className="font-bold text-sm block leading-tight text-stone-900">
                  {restaurantName}
                </span>
                <span className="text-[10px] text-stone-400 font-mono tracking-wider uppercase block">
                  {restaurantNameEn}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Working status */}
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
            <div className="flex items-center gap-1.5 font-medium text-stone-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>مفتوح للطلبات</span>
            </div>
            <span className="text-[11px] font-mono text-stone-500">{workingHours}</span>
          </div>
        </div>

        {/* Drawer Nav Items */}
        <div className="p-4 flex-1 space-y-5 overflow-y-auto">
          {/* Quick Category Jump */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              أقسام قائمة الطعام
            </span>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-stone-100 text-stone-700 hover:text-stone-900 text-xs font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-stone-400 rtl:rotate-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              خدمات ومعلومات
            </span>
            <div className="space-y-1.5">
              {showLoyalty && (
<button
                onClick={() => {
                  onClose();
                  onOpenCart();
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>نقاط الولاء والمكافآت</span>
                </div>
                <span className="font-mono">{loyaltyPoints} نقطة</span>
              </button>
              )}

              {onOpenOrderHistory && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenOrderHistory();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200 text-xs font-bold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>تتبع طلباتي السابقة</span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-medium">سجل الحساب</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onOpenLocation();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-stone-100 text-stone-700 hover:text-stone-900 text-xs font-medium"
              >
                <MapPin className="w-4 h-4 text-stone-500" />
                <span>{address}</span>
              </button>

              <a
                href={`tel:${phone}`}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-stone-100 text-stone-700 hover:text-stone-900 text-xs font-medium"
              >
                <Phone className="w-4 h-4 text-stone-500" />
                <span dir="ltr" className="font-mono">{phone}</span>
              </a>

              <a
                href="https://wa.me/970593965358"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-semibold transition-colors border border-emerald-100"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>طلب سريع واستفسار عبر واتساب</span>
              </a>
            </div>
          </div>
        </div>

        {/* Drawer Customer Footer */}
        <div className="p-4 border-t border-stone-200/80 bg-stone-50/70 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>أوقات الخدمة</span>
            </span>
            <span className="font-mono">{workingHours}</span>
          </div>

          <p className="text-[11px] text-center text-stone-400 pt-1 border-t border-stone-200/60 leading-relaxed">
            {restaurantName} · شاورما على الأصول
            <br />
            <span className="text-[10px] text-stone-400">خاراس · الشارع العام</span>
          </p>
        </div>
      </div>
    </div>
  );
};
