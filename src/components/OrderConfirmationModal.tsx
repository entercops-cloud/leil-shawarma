import React from 'react';
import { CheckCircle2, Phone, MessageCircle, MapPin, Clock, ArrowRight, Share2 } from 'lucide-react';
import { PlacedOrder } from '../types';
import { RESTAURANT_INFO } from '../data/menuData';

interface OrderConfirmationModalProps {
  order: PlacedOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  onTrackOrder?: (phone: string) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  isOpen,
  onClose,
  onNewOrder,
  onTrackOrder,
}) => {
  if (!isOpen || !order) return null;

  const handleOpenWhatsapp = () => {
    const text = encodeURIComponent(
      `مرحباً مطعم شاورما ليل، أستفسر عن حالة طلبي رقم #${order.orderId}`
    );
    window.open(`https://wa.me/970593965358?text=${text}`, '_blank');
  };

  const handleShareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: `طلب شاورما ليل #${order.orderId}`,
        text: `طلبت وجبات شاورما ليل الشهية بقيمة ${order.total} ₪! رقم الطلب: #${order.orderId}`,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col">
        {/* Top Success Header */}
        <div className="p-6 bg-stone-900 text-white text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-3 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 mb-2">
              تم تأكيد الطلب بنجاح
            </span>

            <h2 className="text-2xl font-black">شكراً لك يا {order.customer.fullName}!</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              فريق شاورما ليل بدأ تجهيز طلبك الساخن الآن بأعلى معايير الجودة.
            </p>

            <div className="mt-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 flex items-center gap-3">
              <span className="text-xs text-slate-300">رقم الطلب:</span>
              <span className="font-mono text-base font-black text-amber-300">
                #{order.orderId}
              </span>
            </div>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[50vh]">
          {/* Status timeline */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-red-600" />
                الوقت المتوقع للوصول:
              </span>
              <span className="font-bold text-red-600 font-mono">
                {order.estimatedTime}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>طريقة الاستلام:</span>
              <span className="font-medium text-stone-900">
                {order.customer.orderType === 'delivery'
                  ? `🛵 توصيل إلى ${order.customer.neighborhood}`
                  : '🏪 استلام شخصي من المطعم (خاراس)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>طريقة الدفع:</span>
              <span className="font-medium text-stone-900">
                {order.customer.paymentMethod === 'cash'
                  ? '💵 الدفع نقداً عند الاستلام'
                  : '💳 بطاقة ائتمانية مدفوعة'}
              </span>
            </div>
          </div>

          {/* Itemized summary */}
          <div>
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">
              ملخص الوجبات المطلوبة:
            </h4>
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white text-xs">
              {order.items.map((item) => (
                <div key={item.cartItemId} className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-600">
                      {item.quantity}x
                    </span>
                    <span className="font-medium text-stone-900">{item.menuItem.name}</span>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-stone-800">
                    {item.totalPrice} ₪
                  </span>
                </div>
              ))}
              <div className="p-2.5 bg-stone-50 flex items-center justify-between font-black text-stone-900">
                <span>الإجمالي المدفوع:</span>
                <span className="text-sm text-red-600 font-mono tabular-nums">
                  {order.total} ₪
                </span>
              </div>
            </div>
          </div>

          {/* Direct Contact Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={`https://wa.me/970593965358?text=${encodeURIComponent(
                `مرحباً مطعم شاورما ليل، أستفسر عن حالة طلبي رقم #${order.orderId}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>متابعة عبر واتساب</span>
            </a>

            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="flex items-center justify-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white p-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              <Phone className="w-4 h-4 text-red-400" />
              <span>اتصال بالمطعم</span>
            </a>
          </div>

          {/* Google maps link */}
          <a
            href={RESTAURANT_INFO.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 p-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors w-full"
          >
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>الاتجاهات إلى المطعم على خرائط جوجل (خاراس - بجانب مطبعة إسلام حلاحله)</span>
          </a>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleShareOrder}
            className="flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 p-2 rounded-lg"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">مشاركة الطلب</span>
          </button>

          <div className="flex items-center gap-2">
            {onTrackOrder && (
              <button
                onClick={() => {
                  onClose();
                  onTrackOrder(order.customer.phoneNumber);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors"
              >
                تتبع طلبي وسجل نقاطي
              </button>
            )}

            <button
              onClick={onNewOrder}
              className="flex items-center justify-center gap-2 bg-[#E61C24] hover:bg-[#cf151c] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all"
            >
              <span>طلب وجبة جديدة</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
