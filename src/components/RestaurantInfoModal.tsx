import React from 'react';
import { X, MapPin, Phone, MessageCircle, Clock, ExternalLink, Globe } from 'lucide-react';
import { RESTAURANT_INFO } from '../data/menuData';
import { Logo } from './Logo';

interface RestaurantInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RestaurantInfoModal: React.FC<RestaurantInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#0B192C] text-white relative overflow-hidden text-center">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white p-2 rounded-2xl shadow-lg mb-3">
              <Logo size="sm" showSubtitle={false} />
            </div>
            <h2 className="text-xl font-black">{RESTAURANT_INFO.name}</h2>
            <p className="text-xs text-red-400 font-bold tracking-widest">{RESTAURANT_INFO.nameEn}</p>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">{RESTAURANT_INFO.tagline}</p>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Working Hours */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-stone-900 block text-sm">ساعات العمل الرسمية:</span>
              <span className="text-stone-600 mt-0.5 block">{RESTAURANT_INFO.workingHours}</span>
              <span className="inline-block mt-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                ● نخدمكم طوال أيام الأسبوع
              </span>
            </div>
          </div>

          {/* Location & Address */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-stone-900 block text-sm">موقع المطعم:</span>
              <span className="text-stone-700 mt-0.5 block font-medium">{RESTAURANT_INFO.address}</span>
              <span className="text-stone-500 block text-[11px]">{RESTAURANT_INFO.city}</span>

              <a
                href={RESTAURANT_INFO.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 bg-[#0B192C] hover:bg-[#152e4f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                <span>فتح في خرائط Google</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Contact and Phone */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-stone-900 block text-sm">أرقام التواصل والطلبات:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors font-mono tabular-nums"
                >
                  <Phone className="w-3 h-3 text-red-400" />
                  <span>{RESTAURANT_INFO.phone}</span>
                </a>

                <a
                  href={`https://wa.me/970593965358`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>محادثة واتساب مباشرة</span>
                </a>
              </div>
            </div>
          </div>

          {/* Social Channels */}
          <div className="pt-2">
            <span className="font-bold text-stone-700 block mb-2">تابع شاورما ليل على وسائل التواصل:</span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={RESTAURANT_INFO.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors font-semibold"
              >
                <Globe className="w-4 h-4 text-blue-600" />
                <span>صفحة فيسبوك</span>
              </a>

              <a
                href={RESTAURANT_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100 transition-colors font-semibold"
              >
                <Globe className="w-4 h-4 text-pink-600" />
                <span>حساب إنستغرام</span>
              </a>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 text-left">
          <button
            onClick={onClose}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-xl font-bold transition-colors text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
