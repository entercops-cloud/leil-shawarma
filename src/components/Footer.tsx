import { Phone, MessageCircle, MapPin, Clock, ExternalLink, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { RESTAURANT_INFO } from '../data/menuData';
import { SiteCustomization } from '../types';
import { DEFAULT_SITE_CUSTOMIZATION } from '../utils/storage';

interface FooterProps {
  onOpenLocation: () => void;
  onOpenOrderHistory?: () => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminPanel: () => void;
  customization?: SiteCustomization;
  onOpenSiteCustomizer?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLocation,
  onOpenOrderHistory,
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminPanel,
  customization,
  onOpenSiteCustomizer,
}) => {
  const restaurantName = customization?.branding?.restaurantName || RESTAURANT_INFO.name;
  const restaurantNameEn = customization?.branding?.restaurantNameEn || RESTAURANT_INFO.nameEn;
  const footerAbout = customization?.texts?.footerAbout || 'مطعم شاورما ليل في خاراس، الخليل. نقدم لكم أشهى شاورما على السيخ بخلطة التوابل الخاصة واللحوم الطازجة يومياً.';
  const phone = customization?.texts?.phone || RESTAURANT_INFO.phone;
  const whatsapp = customization?.texts?.whatsapp || RESTAURANT_INFO.phoneIntl;
  const t = { ...DEFAULT_SITE_CUSTOMIZATION.texts, ...(customization?.texts || {}) };

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 relative transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-1 space-y-4">
            <div className="p-2 rounded-xl bg-white inline-block shadow-xs">
              <Logo
                size="md"
                showSubtitle={false}
                logoMode={customization?.branding?.logoMode}
                customImageUrl={customization?.branding?.customLogoUrl}
                customNavyColor="#18181B"
                customRedColor="#B91C1C"
              />
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              {footerAbout}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={RESTAURANT_INFO.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="صفحة فيسبوك"
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-200 transition-colors"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href={RESTAURANT_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="صفحة إنستغرام"
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-200 transition-colors"
              >
                <Globe className="w-4 h-4 text-pink-400" />
              </a>
              <a
                href="https://wa.me/970593965358"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="واتساب"
                className="w-8 h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-stone-800 pb-2">
              {t.footerMenuTitle}
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <a href="#category-chicken" className="hover:text-white transition-colors">
                  قسم دجاج (لفة، كماج، باجيت، عربي، باشكا، صحن)
                </a>
              </li>
              <li>
                <a href="#category-beef" className="hover:text-white transition-colors">
                  قسم لحم عجل بلدي
                </a>
              </li>
              <li>
                <a href="#category-mix" className="hover:text-white transition-colors">
                  ميكس دجاج & لحم
                </a>
              </li>
              <li>
                <a href="#category-lail-meals" className="hover:text-white transition-colors">
                  وجبات ليل (شاورما فرايز، بوكس ليل، بوكس عائلي)
                </a>
              </li>
              <li>
                <a href="#category-sides" className="hover:text-white transition-colors">
                  الاضافات والبطاطا والمقبلات
                </a>
              </li>
              <li>
                <a href="#category-drinks" className="hover:text-white transition-colors">
                  المشروبات والعصائر
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Hours & Service Area */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-stone-800 pb-2">
              {t.footerHoursTitle}
            </h4>
            <div className="space-y-2 text-xs text-stone-400">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">{t.footerHoursLabel}</span>
                  <span>{t.footerHours}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-800/60 border border-stone-800 mt-2 text-[11px] text-stone-300">
                <span className="text-emerald-400 font-semibold block mb-0.5">{t.footerDeliveryTitle}</span>
                <span>{t.footerDeliveryAreas}</span>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Location */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white border-b border-stone-800 pb-2">
              {t.footerContactTitle}
            </h4>
            <div className="space-y-2.5 text-xs text-stone-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-200 block">{RESTAURANT_INFO.address}</span>
                  <a
                    href={RESTAURANT_INFO.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-white inline-flex items-center gap-1 mt-1 text-[11px] underline underline-offset-2"
                  >
                    <span>{t.footerMapsLinkText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Phone className="w-4 h-4 text-stone-500 shrink-0" />
                <a
                  href={`tel:${phone}`}
                  className="font-mono tabular-nums text-white hover:text-stone-200 font-semibold"
                >
                  {phone}
                </a>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono tabular-nums text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  {whatsapp}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {restaurantName} · {restaurantNameEn}. {t.footerRights}</p>
          <div className="flex items-center gap-3">
            <span>{t.footerRegion}</span>
            <span>·</span>
            <button onClick={onOpenLocation} className="hover:text-stone-300 transition-colors">
              معلومات المطعم
            </button>
            {onOpenOrderHistory && (
              <>
                <span>·</span>
                <button
                  onClick={onOpenOrderHistory}
                  className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  تتبع طلباتي وسجل النقاط
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
