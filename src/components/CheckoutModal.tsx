import React, { useState } from 'react';
import { X, Send, CreditCard, Smartphone, Banknote, ShieldCheck, MapPin, Phone, User, CheckCircle2, Sparkles } from 'lucide-react';
import { CartItem, CustomerOrderInfo, PlacedOrder, DeliveryRegion, LoyaltySettings, SiteCustomization } from '../types';
import { DEFAULT_SITE_CUSTOMIZATION, calculateOrderPoints } from '../utils/storage';
import { submitOrder } from '../utils/serverData';
import { ApiError } from '../utils/auth';
import type { CustomerAccount } from '../utils/customerAuth';
import { RESTAURANT_INFO } from '../data/menuData';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  pointsDiscount?: number;
  pointsRedeemed?: number;
  onOrderPlaced: (order: PlacedOrder, customer: CustomerAccount | null) => void;
  customer?: CustomerAccount | null; // verified customer (loyalty), if signed in
  deliveryRegions?: DeliveryRegion[];
  loyalty?: LoyaltySettings;
  payments?: SiteCustomization['payments'];
}


export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  pointsDiscount = 0,
  pointsRedeemed = 0,
  onOrderPlaced,
  customer = null,
  deliveryRegions,
  loyalty = DEFAULT_SITE_CUSTOMIZATION.loyalty,
  payments = DEFAULT_SITE_CUSTOMIZATION.payments,
}) => {
  const REGIONS: { name: string; fee: number }[] =
    deliveryRegions && deliveryRegions.length > 0
      ? deliveryRegions
      : [{ name: 'التوصيل', fee: RESTAURANT_INFO.defaultDeliveryFee }];
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const toLocalPhone = (digits: string) => (digits.startsWith('970') ? '0' + digits.slice(3) : '+' + digits);
  const [fullName, setFullName] = useState(customer?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(customer ? toLocalPhone(customer.phone) : '');
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].name);
  const [detailedAddress, setDetailedAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'jawwal_pay'>('cash');

  // Card details state for electronic simulation
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Calculate delivery fee
  const deliveryFee = orderType === 'delivery' 
    ? (REGIONS.find((r) => r.name === selectedRegion)?.fee ?? REGIONS[0].fee)
    : 0;
  
  const finalSubtotal = Math.max(0, subtotal - pointsDiscount);
  const grandTotal = finalSubtotal + deliveryFee;
  const newPointsEarned = calculateOrderPoints(finalSubtotal, deliveryFee, loyalty);

  // Handle form submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال اسم العميل الكريم');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح للتواصل (مثال: 0593965358)');
      return;
    }

    if (orderType === 'delivery' && !detailedAddress.trim()) {
      setErrorMsg('يرجى تحديد تفاصيل العنوان أو معلم قريب لتسريع التوصيل');
      return;
    }

    if (paymentMethod === 'card' && (!cardNumber || cardNumber.length < 15)) {
      setErrorMsg('يرجى إدخال بيانات بطاقة ائتمانية صالحة');
      return;
    }

    setIsSubmitting(true);

    const orderId = `LEIL-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ar-PS', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const customerInfo: CustomerOrderInfo = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      orderType,
      address: detailedAddress.trim(),
      neighborhood: selectedRegion,
      notes: notes.trim(),
      paymentMethod,
    };

    const newOrder: PlacedOrder = {
      orderId,
      createdAt: formattedDate,
      createdAtIso: now.toISOString(),
      timestamp: now.getTime(),
      status: 'pending',
      items,
      subtotal,
      deliveryFee,
      total: grandTotal,
      customer: customerInfo,
      estimatedTime: orderType === 'delivery' ? '25 - 35 دقيقة' : '15 - 20 دقيقة',
      pointsEarned: newPointsEarned,
      pointsDiscount: pointsDiscount > 0 ? pointsDiscount : undefined,
      pointsRedeemed: pointsRedeemed > 0 ? pointsRedeemed : undefined,
      pointsAwarded: false,
    };

    // Send the order to the server: it re-prices everything from the published menu and returns the official order.
    let fo: PlacedOrder = newOrder;
    let accountAfter: CustomerAccount | null = null;
    try {
      const res = await submitOrder({ items, customer: customerInfo, pointsRedeemed });
      fo = res.order;
      accountAfter = res.customer;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 429)) {
        setErrorMsg(err.message);
        setIsSubmitting(false);
        return;
      }
      // Server unreachable: the order still reaches the restaurant through WhatsApp (nothing is stored in the browser).
    }

    // Format WhatsApp message text
    const itemsText = fo.items
      .map((item, idx) => {
        const extraText = item.options.extras && item.options.extras.length > 0
          ? ` (${item.options.extras.join(', ')})`
          : '';
        const breadText = item.options.bread ? ` [${item.options.bread}]` : '';
        const noteText = item.options.notes ? ` - ملاحظة: ${item.options.notes}` : '';
        return `${idx + 1}. *${item.menuItem.name}* x${item.quantity}${breadText}${extraText} = ${item.totalPrice} ₪${noteText}`;
      })
      .join('\n');

    const paymentText =
      paymentMethod === 'cash'
        ? '💵 الدفع عند الاستلام (كاش)'
        : paymentMethod === 'jawwal_pay'
        ? '📱 الدفع الإلكتروني (Jawwal Pay)'
        : '💳 مدفوع إلكترونياً (بطاقة ائتمان)';

    const typeText = orderType === 'delivery' 
      ? `🛵 *توصيل للعنوان*\n📍 *المنطقة:* ${selectedRegion}\n🏠 *العنوان التفصيلي:* ${detailedAddress}`
      : '🏪 *استلام شخصي من مطعم شاورما ليل (خاراس)*';

    const loyaltyText = pointsDiscount > 0
      ? `⭐ *خصم نقاط الولاء المستبدلة:* -${pointsDiscount} ₪ (تم استبدال ${pointsRedeemed} نقطة)\n`
      : '';

    const whatsappMessage = `*طلب جديد من منيو شاورما ليل 🌯🔥*
-------------------------------
*رقم الطلب:* #${fo.orderId}
*الاسم:* ${fullName}
*الهاتف:* ${phoneNumber}
*نوع الطلب:* ${typeText}
*طريقة الدفع:* ${paymentText}
${notes ? `*ملاحظات الزبون:* ${notes}\n` : ''}
*تفاصيل الوجبات:*
${itemsText}
-------------------------------
*المجموع الفرعي:* ${fo.subtotal} ₪
${loyaltyText}*رسوم التوصيل:* ${fo.deliveryFee} ₪
*الإجمالي المطلوب للدفع:* *${fo.total} ₪*
${customer && (fo.pointsEarned || 0) > 0 ? `*نقاط الولاء:* ${fo.pointsEarned} نقطة تُضاف ${loyalty.awardOn === 'completed' ? 'بعد اكتمال الطلب واستلامه' : 'عند تأكيد الطلب'}\n` : ''}
شكراً لاختياركم شاورما ليل! ننتظر تأكيدكم وبدء التحضير فوراً.`;

    const encodedMsg = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/970593965358?text=${encodedMsg}`;

    setIsSubmitting(false);
    onOrderPlaced(fo, accountAfter);

    // Open WhatsApp in a new tab so the customer can also message the restaurant directly
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold">إتمام طلبك من شاورما ليل</h2>
            <p className="text-xs text-stone-300">
              خطوة واحدة فقط لتأكيد الطلب وتجهيزه طازجاً
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Delivery vs Pickup Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">طريقة الاستلام:</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderType === 'delivery'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>🛵 توصيل للعنوان</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('pickup')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  orderType === 'pickup'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>🏪 استلام من المطعم (خاراس)</span>
              </button>
            </div>
          </div>

          {/* Customer Personal Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wide">
              معلومات العميل للتواصل:
            </h3>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                الاسم الكريم *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله"
                  className="w-full text-xs pr-9 pl-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                رقم الهاتف المحمول (واتساب) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phoneNumber}
                  readOnly={!!customer}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0593965358"
                  className="w-full text-xs pr-3 pl-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-right font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Delivery Location if delivery */}
          {orderType === 'delivery' && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                عنوان التوصيل:
              </h3>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  المنطقة أو البلدة:
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white font-medium"
                >
                  {REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name} ({r.fee > 0 ? `${r.fee} ₪ توصيل` : 'توصيل مجاني'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  العنوان بالتفصيل ومعلم قريب *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
                  <textarea
                    required
                    rows={2}
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                    placeholder="مثال: خاراس، قرب مدرسة الذكور، بجانب سوبرماركت الأمانة، الطابق الثاني"
                    className="w-full text-xs pr-9 pl-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Order Notes */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-xs font-medium text-stone-600 mb-1">
              ملاحظات إضافية للطلب أو السائق:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: يرجى الاتصال قبل الوصول بـ 5 دقائق"
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
            />
          </div>

          {/* Payment Method Section */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                طريقة الدفع (مطلوب):
              </h3>
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                دفع آمن وموثوق
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Cash on Delivery */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <span>الدفع عند الاستلام (كاش)</span>
                    {paymentMethod === 'cash' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    ادفع نقداً عند استلام وجبتك الساخنة
                  </p>
                </div>
              </button>

              {/* Option 2: Pre-paid Card (enabled from admin) */}
              {payments.cardEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                  paymentMethod === 'card'
                    ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${paymentMethod === 'card' ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <span>دفع مسبق إلكتروني (بطاقة)</span>
                    {paymentMethod === 'card' && <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    فيزا، ماستركارد، أو بطاقات الخصم
                  </p>
                </div>
              </button>
              )}

              {/* Option 3: manual e-wallet (enabled from admin) */}
              {payments.walletEnabled && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('jawwal_pay')}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                    paymentMethod === 'jawwal_pay'
                      ? 'border-sky-600 bg-sky-50/70 ring-1 ring-sky-600'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${paymentMethod === 'jawwal_pay' ? 'bg-sky-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                      <span>{payments.walletLabel}</span>
                      {paymentMethod === 'jawwal_pay' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {paymentMethod === 'jawwal_pay' && payments.walletEnabled && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-[11px] text-sky-900">
                {payments.walletInstructions}
              </div>
            )}

            {/* Electronic Card Input Fields if selected */}
            {paymentMethod === 'card' && payments.cardEnabled && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span className="font-semibold">بوابة الدفع الإلكتروني</span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-500">
                    <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200">VISA</span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200">Mastercard</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">
                    رقم البطاقة الائتمانية:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4000 1234 5678 9010"
                    className="w-full text-xs p-2 bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:border-red-600 text-left"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      تاريخ الانتهاء (MM/YY):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full text-xs p-2 bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:border-red-600 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      رمز الأمان (CVV):
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full text-xs p-2 bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:border-red-600 text-center"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Box */}
          <div className="p-3.5 bg-stone-100 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-600">
              <span>قيمة الوجبات ({items.length} أصناف):</span>
              <span className="font-mono tabular-nums font-bold text-stone-900">{subtotal} ₪</span>
            </div>

            {pointsDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  خصم استبدال نقاط الولاء:
                </span>
                <span className="font-mono tabular-nums">-{pointsDiscount} ₪</span>
              </div>
            )}

            <div className="flex items-center justify-between text-stone-600">
              <span>رسوم التوصيل:</span>
              <span className="font-mono tabular-nums font-bold text-stone-900">{deliveryFee} ₪</span>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-sm font-black text-stone-900">
              <div>
                <span>الإجمالي الكلي المطلوب:</span>
                {customer && newPointsEarned > 0 && (
                  <span className="block text-[11px] font-medium text-amber-700">
                    {loyalty.awardOn === 'completed'
                      ? `+ ستحصل على ${newPointsEarned} نقطة ولاء بعد اكتمال طلبك واستلامه`
                      : `+ تكسب ${newPointsEarned} نقطة ولاء عند تأكيد الطلب`}
                  </span>
                )}
              </div>
              <span className="text-xl font-black text-red-600 font-mono tabular-nums">
                {grandTotal} ₪
              </span>
            </div>
          </div>

          {/* WhatsApp integration note */}
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <Send className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="leading-relaxed">
              سيتم إرسال تفاصيل طلبك مباشرةً إلى واتساب مطعم شاورما ليل (<span dir="ltr" className="font-mono font-bold">0593965358</span>) للتجهيز الفوري وتزويدك برابط التتبع.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E61C24] hover:bg-[#cf151c] disabled:bg-stone-400 text-white py-3.5 px-4 rounded-xl font-bold shadow-lg shadow-red-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <span>جاري إرسال الطلب...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4 rtl:rotate-180" />
                  <span>تأكيد الطلب وإرساله لواتساب المطعم ({grandTotal} ₪)</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
