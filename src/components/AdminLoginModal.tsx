import React, { useState, useEffect } from 'react';
import { X, Lock, User, ShieldCheck, KeyRound } from 'lucide-react';
import { AuthUser, getStatus, login, setupFirstOwner, passwordStrength } from '../utils/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  // First run (no accounts yet): the owner creates their own credentials. Nothing is pre-filled or suggested.
  const [status, setStatus] = useState<{ hasUsers: boolean; setupEnabled: boolean; verificationAvailable: boolean; customerLoginEnabled: boolean } | null>(null);
  const [statusError, setStatusError] = useState('');
  const isSetup = status ? !status.hasUsers : false;
  const [setupCode, setSetupCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockLeft, setLockLeft] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    getStatus()
      .then(setStatus)
      .catch(() => setStatusError('تعذر الاتصال بالخادم. تأكد أن الموقع منشور مع تفعيل Netlify Functions.'));
  }, [isOpen]);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = setInterval(() => setLockLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [lockLeft]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      if (isSetup) {
        if (password !== confirm) {
          setErrorMsg('كلمتا المرور غير متطابقتين.');
          return;
        }
        const res = await setupFirstOwner(username, displayName, password, setupCode);
        if (!res.ok) {
          setErrorMsg(res.error);
          return;
        }
        onLoginSuccess(res.user);
        onClose();
      } else {
        const res = await login(username, password);
        if (!res.ok) {
          setPassword('');
          setLockLeft(res.lockedSeconds ?? 0);
          setErrorMsg(res.error);
          return;
        }
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = passwordStrength(password);
  const locked = lockLeft > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col">
        <div className="p-5 bg-[#0B192C] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">{isSetup ? 'إنشاء حساب المدير' : 'تسجيل دخول الإدارة'}</h2>
              <p className="text-[11px] text-slate-300">مطعم شاورما ليل</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs" autoComplete="off">
          {statusError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">{statusError}</div>
          )}
          {!status && !statusError && <p className="text-[11px] text-stone-500">جاري الاتصال بالخادم...</p>}
          {isSetup && !status?.setupEnabled && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
              لإنشاء حساب المدير أضف متغير البيئة <code className="font-mono font-bold">ADMIN_SETUP_CODE</code> في إعدادات Netlify (Site configuration ← Environment variables)، ثم أعد نشر الموقع.
            </div>
          )}
          {isSetup && status?.setupEnabled && (
            <p className="text-[11px] text-stone-600 leading-relaxed">
              لا يوجد حساب إدارة بعد. أدخل رمز الإعداد الذي ضبطته في Netlify، ثم اختر اسم مستخدم وكلمة مرور قوية.
            </p>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
              {errorMsg}
              {locked && <span className="block mt-0.5 font-mono">أعد المحاولة بعد {lockLeft} ثانية</span>}
            </div>
          )}

          <div>
            <label className="block text-stone-700 font-bold mb-1">اسم المستخدم:</label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                name="leil-admin-user"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          </div>

          {isSetup && (
            <div>
              <label className="block text-stone-700 font-bold mb-1">رمز الإعداد (ADMIN_SETUP_CODE):</label>
              <input
                type="password"
                required
                autoComplete="off"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          )}

          {isSetup && (
            <div>
              <label className="block text-stone-700 font-bold mb-1">الاسم الظاهر:</label>
              <input
                type="text"
                autoComplete="off"
                maxLength={40}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-stone-700 font-bold mb-1">كلمة المرور:</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                name="leil-admin-pass"
                autoComplete={isSetup ? 'new-password' : 'off'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
            {isSetup && (
              <>
                <div className="flex gap-1 mt-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded ${i < strength ? (strength <= 1 ? 'bg-red-500' : strength <= 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-200'}`} />
                  ))}
                </div>
                <p className="text-[10px] text-stone-500 mt-1">8 أحرف على الأقل، وتحتوي حروفاً وأرقاماً.</p>
              </>
            )}
          </div>

          {isSetup && (
            <div>
              <label className="block text-stone-700 font-bold mb-1">تأكيد كلمة المرور:</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || locked || !status || (isSetup && !status.setupEnabled)}
            className="w-full bg-[#E61C24] hover:bg-[#cf151c] disabled:bg-stone-300 text-white py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'جاري التحقق...' : isSetup ? 'إنشاء الحساب والدخول' : 'دخول لوحة التحكم'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
