import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowLeft, Award, Sparkles, Check } from 'lucide-react';
import { CartItem, LoyaltyAccount, LoyaltySettings } from '../types';
import { DEFAULT_SITE_CUSTOMIZATION, calculateOrderPoints } from '../utils/storage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: () => void;
  subtotal: number;
  loyaltyAccount: LoyaltyAccount | null; // null = not signed in
  customerLoginEnabled?: boolean;
  onOpenCustomerLogin?: () => void;
  pointsToRedeem: number;
  onToggleRedeemPoints: (points: number) => void;
  minOrder?: number; // 0 / undefined = open order, no minimum
  loyalty?: LoyaltySettings;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  subtotal,
  loyaltyAccount,
  customerLoginEnabled = false,
  onOpenCustomerLogin,
  pointsToRedeem,
  onToggleRedeemPoints,
  minOrder = 0,
  loyalty = DEFAULT_SITE_CUSTOMIZATION.loyalty,
}) => {
  if (!isOpen) return null;

  const isMinOrderMet = subtotal >= minOrder;
  const remainingForMin = Math.max(0, minOrder - subtotal);

  // Discount from points (configurable)
  const redeemPointsReq = Math.max(1, Math.round(loyalty.redeemPoints || 50));
  const redeemDiscountVal = Math.max(0, Number(loyalty.redeemDiscount ?? 5));
  const canRedeem = !!loyaltyAccount && loyaltyAccount.points >= redeemPointsReq && redeemDiscountVal > 0;
  const discountAmount = pointsToRedeem > 0 && pointsToRedeem === redeemPointsReq ? redeemDiscountVal : 0;
  const finalSubtotal = Math.max(0, subtotal - discountAmount);

  const tierColors = {
    عادي: 'bg-stone-100 text-stone-700 border-stone-300',
    برونزي: 'bg-amber-100 text-amber-800 border-amber-300',
    فضي: 'bg-slate-200 text-slate-800 border-slate-300',
    ذهبي: 'bg-yellow-100 text-yellow-900 border-yellow-400',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-stone-200" />
              <h2 className="font-bold text-base">سلة طلبات شاورما ليل</h2>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-mono tabular-nums">
                {items.length} أصناف
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق السلة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!loyaltyAccount && customerLoginEnabled && loyalty.enabled && (
              <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] text-amber-950 font-semibold leading-snug">
                    سجّل دخولك برقم جوالك لتجميع نقاط الولاء واستبدالها بخصم.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenCustomerLogin}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shrink-0"
                >
                  تسجيل الدخول
                </button>
              </div>
            )}

            {loyaltyAccount && (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl relative overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-amber-950">
                        رصيد نقاط الولاء لديك:
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${tierColors[loyaltyAccount.tier]}`}>
                        مستوى {loyaltyAccount.tier}
                      </span>
                    </div>
                    <span className="text-sm font-black text-amber-800 font-mono tabular-nums">
                      {loyaltyAccount.points} نقطة
                    </span>
                    <span className="text-[11px] text-stone-500 mr-1.5">
                      (إجمالي الطلبات: {loyaltyAccount.ordersCount})
                    </span>
                  </div>
                </div>

                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              </div>

              {/* Redemption Options */}
              {canRedeem ? (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-700">
                    يمكنك استبدال {redeemPointsReq} نقطة بخصم {redeemDiscountVal} ₪ فوري!
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleRedeemPoints(pointsToRedeem === redeemPointsReq ? 0 : redeemPointsReq)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      pointsToRedeem === redeemPointsReq
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-amber-400 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {pointsToRedeem === redeemPointsReq ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>تم تطبيق خصم {redeemDiscountVal} ₪</span>
                      </>
                    ) : (
                      <span>استبدل الآن (-{redeemDiscountVal} ₪)</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-stone-500">
                  <span>تبقى لك {Math.max(0, redeemPointsReq - loyaltyAccount.points)} نقطة للحصول على خصم {redeemDiscountVal} ₪. {loyalty.enabled ? (loyalty.pointsPerShekel === 1 ? 'تكسب نقطة مع كل 1 ₪ بعد اكتمال طلبك.' : `تكسب ${loyalty.pointsPerShekel} نقطة مع كل 1 ₪ بعد اكتمال طلبك.`) : ''}</span>
                </div>
              )}
            </div>
            )}

            {items.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-stone-800 text-base">سلتك فارغة حالياً</h3>
                <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                  تصفح وجبات شاورما ليل وأضف ما يعجبك بضغطة زر واحدة واكسب نقاط الولاء.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl transition-colors"
                >
                  العودة للمنيو
                </button>
              </div>
            ) : (
              <>
                {/* Minimum order notice */}
                {!isMinOrderMet && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                    <span>الحد الأدنى للطلب: {minOrder} ₪</span>
                    <span className="font-bold">متبقي: {remainingForMin} ₪</span>
                  </div>
                )}

                {/* Items list */}
                <div className="space-y-3">
                  {items.map((cartItem) => (
                    <div
                      key={cartItem.cartItemId}
                      className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex gap-3 items-start"
                    >
                      {/* Image Thumbnail */}
                      <img
                        src={cartItem.menuItem.image}
                        alt={cartItem.menuItem.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />

                      {/* Info & Customization breakdown */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1">
                            {cartItem.menuItem.name}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(cartItem.cartItemId)}
                            className="text-stone-400 hover:text-red-600 transition-colors p-1"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Options summary */}
                        <div className="mt-1 text-[11px] text-stone-500 space-y-0.5">
                          {cartItem.options.size && (
                            <span className="inline-block mr-1 bg-stone-200/70 px-1.5 py-0.5 rounded text-stone-700">
                              {cartItem.options.size}
                            </span>
                          )}
                          {cartItem.options.bread && (
                            <span className="inline-block mr-1 bg-stone-200/70 px-1.5 py-0.5 rounded text-stone-700">
                              {cartItem.options.bread}
                            </span>
                          )}
                          {cartItem.options.notes && (
                            <p className="text-[10px] text-red-600 font-medium">
                              ملاحظة: {cartItem.options.notes}
                            </p>
                          )}
                        </div>

                        {/* Bottom Row: Stepper & Price */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center border border-stone-300 bg-white rounded-lg shadow-2xs">
                            <button
                              onClick={() =>
                                onUpdateQuantity(cartItem.cartItemId, cartItem.quantity - 1)
                              }
                              className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-r-lg"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold font-mono tabular-nums">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() =>
                                onUpdateQuantity(cartItem.cartItemId, cartItem.quantity + 1)
                              }
                              className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-l-lg"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="font-mono tabular-nums font-black text-sm text-stone-900">
                            {cartItem.totalPrice} ₪
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer with totals, points discount and Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>المجموع الفرعي للوجبات:</span>
                <span className="font-mono tabular-nums font-bold text-stone-900">
                  {subtotal} ₪
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    خصم نقاط الولاء المستبدلة:
                  </span>
                  <span className="font-mono tabular-nums">-{discountAmount} ₪</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>رسوم التوصيل المقدرة:</span>
                <span>تحدد حسب المنطقة عند الدفع</span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-base font-black text-stone-900">
                <div>
                  <span>المجموع بعد الخصم:</span>
                  <span className="block text-[11px] font-normal text-amber-700">
                    {loyaltyAccount && calculateOrderPoints(finalSubtotal, 0, loyalty) > 0
                      ? `+ ستحصل على ${calculateOrderPoints(finalSubtotal, 0, loyalty)} نقطة ولاء ${loyalty.awardOn === 'completed' ? 'بعد اكتمال الطلب واستلامه' : 'عند تأكيد الطلب'}`
                      : ''}
                  </span>
                </div>
                <span className="text-xl font-black text-red-600 font-mono tabular-nums">
                  {finalSubtotal} ₪
                </span>
              </div>

              <button
                onClick={onProceedToCheckout}
                disabled={!isMinOrderMet}
                className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <span>متابعة إتمام الطلب</span>
                <ArrowLeft className="w-4 h-4 rtl:rotate-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
