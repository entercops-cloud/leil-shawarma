import React from 'react';
import { Clock, MessageCircle, Phone, ArrowDown, Sparkles } from 'lucide-react';
import { HERO_IMAGE, RESTAURANT_INFO } from '../data/menuData';
import { SiteCustomization } from '../types';

interface HeroBannerProps {
  onExploreMenu: () => void;
  onOpenWhatsapp: () => void;
  customization?: SiteCustomization;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreMenu,
  onOpenWhatsapp,
  customization,
}) => {
  const headline = customization?.texts?.heroHeadline || 'شاورما ليل · الطعم الأصيل بلمسة عصرية راقية';
  const subheadline = customization?.texts?.heroSubheadline || 'نحضر لك يومياً أشهى سيخ شاورما دجاج ولحم عجل طازج بأسرار التتبيلة الخاصة، مع خبز الصاج والطابون المحمص ومقبلات ليل الغنية.';
  const badgeText = customization?.texts?.heroBadge || 'تحضير طازج على أصول الشواء';
  const buttonText = customization?.texts?.heroButtonText || 'تصفح قائمة الطعام';
  const deliveryTime = customization?.texts?.deliveryTime || RESTAURANT_INFO.deliveryTime;
  const phone = customization?.texts?.phone || RESTAURANT_INFO.phone;

  const heroBg = customization?.branding?.heroBackgroundImage?.trim() || HERO_IMAGE;

  return (
    <section className="relative bg-stone-900 text-white overflow-hidden transition-colors border-b border-stone-800">
      {/* Background Hero Image with refined dark scrim */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="شاورما ليل الشهية"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-30 transform scale-102 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-950/40" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-16 md:py-20 flex flex-col items-start gap-4 sm:gap-5">
        {/* Subtle Brand Kicker */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-stone-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>خاراس · الخليل</span>
          <span className="text-white/30">·</span>
          <span className="text-stone-200">{badgeText}</span>
        </div>

        {/* Hero Title */}
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight sm:leading-[1.2] tracking-tight text-white">
            {headline}
          </h1>
          <p className="mt-2.5 sm:mt-3.5 text-xs sm:text-base text-stone-300 leading-relaxed max-w-2xl font-normal">
            {subheadline}
          </p>
        </div>

        {/* Clean Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 sm:gap-x-4 text-xs text-stone-300 py-1 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>توصيل سريع: {deliveryTime}</span>
          </div>
          <span className="text-stone-600 hidden sm:inline">·</span>
          <span className="text-stone-300">دجاج ولحم بلدي طازج يومياً</span>
          <span className="text-stone-600 hidden sm:inline">·</span>
          <span className="text-emerald-400 font-semibold">دفع نقداً أو بطاقة</span>
        </div>

        {/* Action Buttons: Fluid & Responsive */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2 sm:pt-3 w-full sm:w-auto">
          <button
            onClick={onExploreMenu}
            className="flex items-center justify-center gap-2 bg-white hover:bg-stone-100 text-stone-950 px-5 sm:px-6 py-3 rounded-2xl font-bold shadow-sm active:scale-95 transition-all text-xs sm:text-sm"
          >
            <span>{buttonText}</span>
            <ArrowDown className="w-4 h-4 text-stone-600" />
          </button>

          <button
            onClick={onOpenWhatsapp}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-bold active:scale-95 transition-all text-xs sm:text-sm shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>طلب عبر واتساب</span>
          </button>

          <a
            href={`tel:${phone}`}
            className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-stone-200 px-4 py-3 rounded-2xl font-medium transition-colors text-xs sm:text-sm border border-white/15"
          >
            <Phone className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-mono tabular-nums">{phone}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
