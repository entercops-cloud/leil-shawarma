import React, { useState, useEffect } from 'react';
import { Flame, X, ArrowLeft, Truck, Award } from 'lucide-react';

interface AnnouncementBarProps {
  onActionClick?: () => void;
  accentColor?: string;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  onActionClick,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  const announcements = [
    {
      id: 'offer-1',
      icon: <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      tag: 'عروض حصرية',
      text: 'خصم 20% على وجبات شاورما العربي العائلية · استمتع بالنكهة الطازجة اليوم',
      cta: 'تصفح العرض',
    },
    {
      id: 'offer-2',
      icon: <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      tag: 'خدمة التوصيل',
      text: 'توصيل مجاني وسريع في بلدة خاراس والمناطق المجاورة للطلبات فوق 60 ₪',
      cta: 'اطلب الآن',
    },
    {
      id: 'offer-3',
      icon: <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
      tag: 'برنامج الولاء',
      text: 'اكسب نقاطاً مع كل طلب واستبدلها بوجبات ومشروبات مجانية',
      cta: 'اكتشف المزيد',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (!isVisible) return null;

  const current = announcements[currentIdx];

  const handleCtaClick = () => {
    if (onActionClick) {
      onActionClick();
    } else {
      const menuEl = document.getElementById('menu');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <aside 
      aria-label="إعلانات العروض الخاصة"
      className="relative z-50 bg-stone-900 text-stone-200 text-xs border-b border-stone-800 py-2 px-3 sm:px-6 select-none transition-colors"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Left side: Ticker Content */}
        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-stone-300 text-[11px] font-semibold shrink-0">
            {current.icon}
            <span className="text-white font-bold">{current.tag}</span>
            <span className="text-stone-500">·</span>
          </div>

          <div className="overflow-hidden truncate">
            <p className="text-stone-300 text-[11px] sm:text-xs font-normal truncate">
              {current.text}
            </p>
          </div>
        </div>

        {/* Right side: European Minimalist CTA & Dismiss */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCtaClick}
            className="flex items-center gap-1 text-[11px] font-semibold text-stone-100 hover:text-white bg-stone-800 hover:bg-stone-700 px-3 py-1 rounded-lg transition-colors border border-stone-700 whitespace-nowrap active:scale-95"
          >
            <span>{current.cta}</span>
            <ArrowLeft className="w-3 h-3 rtl:rotate-0" />
          </button>

          <button
            type="button"
            onClick={() => setIsVisible(false)}
            aria-label="إغلاق الإعلان"
            className="text-stone-400 hover:text-stone-200 p-1 rounded hover:bg-stone-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
