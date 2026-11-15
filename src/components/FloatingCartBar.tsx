import React from 'react';
import { ShoppingBag, ArrowLeft, Phone, MessageCircle, Utensils } from 'lucide-react';
import { SiteCustomization } from '../types';
import { RESTAURANT_INFO } from '../data/menuData';

interface FloatingCartBarProps {
  itemCount: number;
  totalPrice: number;
  onOpenCart: () => void;
  customization?: SiteCustomization;
  onExploreMenu?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  itemCount,
  totalPrice,
  onOpenCart,
  customization,
  onExploreMenu,
}) => {
  // Check section visibility toggle
  const isVisibleBySection = customization?.sectionsVisibility?.showFloatingCart !== false;
  const isEnabledByBottomBar = customization?.bottomBar?.enabled !== false;

  if (!isVisibleBySection || !isEnabledByBottomBar) {
    return null;
  }

  const mode = customization?.bottomBar?.mode || 'cart_only';
  const cartLabel = customization?.bottomBar?.text || 'طلبك الحالي';
  const checkoutButtonText = customization?.bottomBar?.buttonText || 'إتمام الطلب';

  const emptyLabel = customization?.bottomBar?.emptyText || 'شاورما ليل · أشهى سيخ شاورما يصلك ساخناً';
  const emptyButtonText = customization?.bottomBar?.emptyButtonText || 'تصفح المنيو واطلب';
  const showPhone = customization?.bottomBar?.showPhoneQuickAction !== false;
  const showWhatsapp = customization?.bottomBar?.showWhatsappQuickAction !== false;

  const phone = customization?.texts?.phone || RESTAURANT_INFO.phone;
  const whatsapp = customization?.texts?.whatsapp || RESTAURANT_INFO.phoneIntl;

  // Case 1: Cart has items -> Show interactive Order summary
  if (itemCount > 0) {
    return (
      <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onOpenCart}
          className="w-full bg-stone-900/95 hover:bg-stone-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-stone-800 flex items-center justify-between gap-3 active:scale-[0.98] transition-all group"
        >
          {/* Left: Cart icon + Count */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5 text-stone-200" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-stone-300 block">
                {cartLabel} ({itemCount} {itemCount === 1 ? 'صنف' : 'أصناف'})
              </span>
              <span className="text-base font-bold text-white font-mono tabular-nums">
                {totalPrice} ₪
              </span>
            </div>
          </div>

          {/* Right: Checkout CTA button */}
          <div className="flex items-center gap-1.5 bg-white group-hover:bg-stone-100 text-stone-950 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors">
            <span>{checkoutButtonText}</span>
            <ArrowLeft className="w-4 h-4 rtl:rotate-0" />
          </div>
        </button>
      </div>
    );
  }

  // Case 2: Cart is empty, but "always_visible" mode is selected by admin
  if (mode === 'always_visible') {
    return (
      <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="w-full bg-stone-900/95 text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl backdrop-blur-md border border-stone-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-stone-200 truncate">
              {emptyLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {showPhone && (
              <a
                href={`tel:${phone}`}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors"
                title="اتصال هاتفي سريع"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {showWhatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white transition-colors shadow-xs"
                title="طلب مباشر عبر واتساب"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                if (onExploreMenu) {
                  onExploreMenu();
                } else {
                  const el = document.getElementById('menu');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>{emptyButtonText}</span>
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
