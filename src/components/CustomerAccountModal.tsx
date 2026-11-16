import React, { useEffect, useState } from 'react';
import { X, Phone, KeyRound, LogOut, Award, Search, RefreshCw, ShoppingBag, User } from 'lucide-react';
import type { CartItem, PlacedOrder } from '../types';
import {
  CustomerAccount,
  OrderLookup,
  authenticateCustomerWithPin,
  customerLogout,
  fetchMyOrders,
  lookupOrder,
} from '../utils/customerAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
  customerLoginEnabled: boolean;
  onCustomerChange: (c: CustomerAccount | null) => void;
  onReorder: (items: CartItem[]) => void;
  initialOrderId?: string;
  initialPhone?: string;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: 'قيد الانتظار', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  preparing: { text: 'قيد التحضير 👨‍🍳', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  completed: { text: 'مكتمل ✓', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { text: 'ملغى', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const inputCls = 'w-full text-xs px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-red-600 focus:bg-white';
const toAsciiDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

export const CustomerAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  customerLoginEnabled,
  onCustomerChange,
  onReorder,
  initialOrderId = '',
  initialPhone = '',
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // guest tracking
  const [trackId, setTrackId] = useState(initialOrderId);
  const [trackPhone, setTrackPhone] = useState(initialPhone);
  const [tracked, setTracked] = useState<OrderLookup | null>(null);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      setOrders(await fetchMyOrders());
    } catch {
      /* not signed in / offline */
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !customer) return;
    loadOrders();
    const id = setInterval(loadOrders, 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer?.phone]);

  if (!isOpen) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'حدث خطأ.' });
    } finally {
      setBusy(false);
    }
  };

  const authenticate = () =>
    run(async () => {
      if (authMode === 'register' && pin !== confirmPin) {
        setMsg({ ok: false, text: 'رقما PIN غير متطابقين.' });
        return;
      }
      const c = await authenticateCustomerWithPin(authMode, phone, pin, name);
      onCustomerChange(c);
      setPin('');
      setConfirmPin('');
    });

  const track = () =>
    run(async () => {
      setTracked(await lookupOrder(trackId, trackPhone));
    });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">{customerLoginEnabled ? 'طلباتي ونقاط الولاء' : 'تتبّع طلبي'}</h2>
            <p className="text-xs text-stone-300">{customerLoginEnabled ? 'تتبّع طلبك وتجميع النقاط' : 'أدخل رقم الطلب ورقم جوالك'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
          {msg && (
            <div className={`p-2.5 rounded-xl border font-semibold ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {/* ---- signed in ---- */}
          {customer && (
            <>
              <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    {customer.name && <div className="text-[11px] font-bold text-stone-700">{customer.name}</div>}
                    <div className="font-black text-amber-950 text-sm">
                      <span className="font-mono tabular-nums">{customer.points}</span> نقطة · مستوى {customer.tier}
                    </div>
                    <div className="text-[11px] text-stone-600 font-mono" dir="ltr">+{customer.phone}</div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await customerLogout();
                    onCustomerChange(null);
                    setOrders([]);
                  }}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 font-bold flex items-center gap-1 hover:bg-white"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  خروج
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-black text-stone-900">طلباتي السابقة</h3>
                <button onClick={loadOrders} className="text-stone-500 hover:text-stone-900 flex items-center gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-stone-500 text-center py-4">لا توجد طلبات مسجّلة على هذا الرقم بعد.</p>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((o) => {
                    const st = STATUS_LABEL[o.status || 'pending'];
                    const credited = o.pointsAwarded === true;
                    return (
                      <div key={o.orderId} className="p-3 border border-stone-200 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-stone-900">#{o.orderId}</span>
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${st.cls}`}>{st.text}</span>
                        </div>
                        <div className="text-stone-600 leading-relaxed">
                          {o.items.map((i) => `${i.menuItem.name} ×${i.quantity}`).join('، ')}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-stone-900">{o.total} ₪</span>
                          {!!o.pointsEarned && o.status !== 'cancelled' && (
                            <span className="text-amber-700 font-semibold">
                              {credited ? `+${o.pointsEarned} نقطة` : `${o.pointsEarned} نقطة بعد اكتمال الطلب`}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              onReorder(o.items);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-stone-900 text-white rounded-lg font-bold flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            أعد الطلب
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ---- customer PIN login / registration ---- */}
          {!customer && customerLoginEnabled && (
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
              <h3 className="font-black text-stone-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                {authMode === 'login' ? 'دخول حسابك ونقاط الولاء' : 'إنشاء حساب زبون جديد'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setAuthMode('login'); setMsg(null); }} className={`py-2 rounded-lg font-bold ${authMode === 'login' ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-700'}`}>تسجيل الدخول</button>
                <button onClick={() => { setAuthMode('register'); setMsg(null); }} className={`py-2 rounded-lg font-bold ${authMode === 'register' ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-700'}`}>حساب جديد</button>
              </div>
              {authMode === 'register' && (
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="name"
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className={`${inputCls} pr-9`}
                    data-testid="customer-name"
                  />
                </div>
              )}
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(toAsciiDigits(e.target.value))}
                  placeholder="0593965358"
                  className={`${inputCls} pr-3 pl-9 text-right`}
                  data-testid="login-phone"
                />
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  value={pin}
                  onChange={(e) => setPin(toAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                  placeholder="PIN من 6 أرقام"
                  className={`${inputCls} pr-3 pl-9 text-right`}
                  data-testid="customer-pin"
                />
              </div>
              {authMode === 'register' && (
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    dir="ltr"
                    autoComplete="new-password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(toAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                    placeholder="تأكيد PIN"
                    className={`${inputCls} pr-3 pl-9 text-right`}
                    data-testid="customer-pin-confirm"
                  />
                </div>
              )}
              <p className="text-[10px] leading-relaxed text-stone-500">{authMode === 'register' ? 'اختر PIN من 6 أرقام واحفظه؛ ستحتاجه مع رقم جوالك للدخول لاحقاً.' : 'أدخل رقم جوالك وPIN الذي اخترته عند إنشاء الحساب.'}</p>
              <button
                onClick={authenticate}
                disabled={busy || phone.trim().length < 9 || pin.length !== 6 || (authMode === 'register' && (name.trim().length < 2 || confirmPin.length !== 6))}
                className="w-full py-2.5 bg-stone-900 text-white font-bold rounded-xl disabled:opacity-40"
                data-testid={authMode === 'login' ? 'customer-login' : 'customer-register'}
              >
                {busy ? 'جارٍ التحقق...' : authMode === 'login' ? 'دخول الحساب' : 'إنشاء الحساب'}
              </button>
            </div>
          )}

          {/* ---- guest tracking (no sign-in needed) ---- */}
          <div className="p-3.5 border border-stone-200 rounded-2xl space-y-2.5">
            <h3 className="font-black text-stone-900 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-red-600" />
              تتبّع طلب برقمه
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} dir="ltr" placeholder="LEIL-12345" value={trackId} onChange={(e) => setTrackId(e.target.value)} data-testid="track-id" />
              <input className={inputCls} dir="ltr" placeholder="رقم الجوال" value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} data-testid="track-phone" />
            </div>
            <button onClick={track} disabled={busy || !trackId.trim() || !trackPhone.trim()} className="w-full py-2 bg-red-600 text-white font-bold rounded-xl disabled:opacity-40" data-testid="track-btn">
              تتبّع
            </button>
            {tracked && (
              <div className="p-2.5 bg-stone-50 rounded-xl flex items-center justify-between" data-testid="track-result">
                <span className="font-mono font-bold">#{tracked.orderId}</span>
                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${STATUS_LABEL[tracked.status].cls}`}>{STATUS_LABEL[tracked.status].text}</span>
                <span className="text-stone-600">{tracked.total} ₪</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
