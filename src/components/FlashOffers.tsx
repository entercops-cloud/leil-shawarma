import React, { useState, useEffect } from 'react';
import { Clock, ShoppingBag, ArrowLeft, Settings, Check, Sparkles } from 'lucide-react';
import { FlashOffer, MenuItem } from '../types';
import { HERO_IMAGE } from '../data/menuData';

interface FlashOffersProps {
  offers: FlashOffer[];
  menuItems: MenuItem[];
  onClaimOffer: (offer: FlashOffer, targetMenuItem?: MenuItem) => void;
  isAdmin?: boolean;
  onManageOffers?: () => void;
  customTitle?: string;
  customSubtitle?: string;
}

export const FlashOffers: React.FC<FlashOffersProps> = ({
  offers,
  menuItems,
  onClaimOffer,
  isAdmin = false,
  onManageOffers,
  customTitle,
  customSubtitle,
}) => {
  const activeOffers = offers.filter((o) => o.isActive);

  // Time remaining state for countdown timers
  const [now, setNow] = useState(Date.now());
  const [addedOfferId, setAddedOfferId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (endsAtStr: string) => {
    const target = new Date(endsAtStr).getTime();
    const diff = Math.max(0, target - now);

    if (diff <= 0) return 'انتهى العرض';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleAddOffer = (offer: FlashOffer) => {
    const targetItem = menuItems.find((m) => m.id === offer.targetItemId);
    onClaimOffer(offer, targetItem);
    setAddedOfferId(offer.id);
    setTimeout(() => setAddedOfferId(null), 1800);
  };

  if (activeOffers.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {customTitle || 'عروض خاصة ومختارة'}
            </h2>
            <span className="bg-red-50 text-red-700 border border-red-200/80 text-[11px] font-semibold px-2 py-0.5 rounded-md">
              لفترة محدودة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {customSubtitle || 'خصومات حصرية لفترة محدودة - استمتع بألذ شاورما بأسعار استثنائية'}
          </p>
        </div>

        {/* Admin Quick Manage Button */}
        {isAdmin && onManageOffers && (
          <button
            onClick={onManageOffers}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3 py-1.5 rounded-xl transition-all"
            title="إدارة العروض ونسب الخصم"
          >
            <Settings className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">تحكم بالعروض</span>
          </button>
        )}
      </div>

      {/* Admin Notice if all offers are disabled */}
      {activeOffers.length === 0 && isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-900 text-xs mb-4">
          <p className="font-bold">العروض الخاصة متوقفة حالياً.</p>
          <p className="text-[11px] text-amber-700 mt-1">
            بصفتك مديراً، يمكنك تفعيل العروض وتحديد نسب الخصم من لوحة التحكم في أي وقت.
          </p>
          {onManageOffers && (
            <button
              onClick={onManageOffers}
              className="mt-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 py-1.5 rounded-xl text-xs"
            >
              تفعيل وإدارة العروض الآن
            </button>
          )}
        </div>
      )}

      {/* Flash Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeOffers.map((offer) => {
          const targetItem = menuItems.find((m) => m.id === offer.targetItemId);
          const displayImage = offer.image || targetItem?.image || HERO_IMAGE;
          const isAdded = addedOfferId === offer.id;
          const countdownText = formatCountdown(offer.endsAt);

          return (
            <div
              key={offer.id}
              className="overflow-hidden rounded-2xl sm:rounded-3xl bg-white text-stone-900 p-4 sm:p-5 border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-stone-300 flex flex-col justify-between group transition-all"
            >
              {/* Badge & Timer Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-red-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                  <span>{offer.badge}</span>
                  {typeof offer.discountPercentage === 'number' && offer.discountPercentage > 0 && (
                    <span className="bg-white/20 px-1 py-0.2 rounded font-mono text-[10px]">
                      -{offer.discountPercentage}%
                    </span>
                  )}
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200/80 text-[11px] font-mono text-stone-700">
                  <Clock className="w-3 h-3 text-stone-500" />
                  <span dir="ltr">{countdownText}</span>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex items-start gap-4 my-2">
                {/* Meal Image */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-stone-200 bg-stone-100">
                  <img
                    src={displayImage}
                    alt={offer.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                  />
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-stone-900 leading-snug line-clamp-2">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {offer.description}
                  </p>

                  {/* Price Tag */}
                  <div className="flex items-baseline gap-2 mt-2.5">
                    <span className="text-lg sm:text-xl font-bold text-stone-900 font-mono tabular-nums">
                      {offer.discountedPrice} ₪
                    </span>
                    <span className="text-xs text-stone-400 line-through font-mono">
                      {offer.originalPrice} ₪
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      (توفير {Math.max(0, (offer.savings ?? (offer.originalPrice - offer.discountedPrice)))} ₪)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <span className="text-[11px] text-stone-500 flex items-center justify-center sm:justify-start gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>سعر خاص متاح للطلب الآن</span>
                </span>

                <button
                  onClick={() => handleAddOffer(offer)}
                  disabled={isAdded}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs ${
                    isAdded
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>تمت الإضافة!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>اطلب العرض ({offer.discountedPrice} ₪)</span>
                      <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
