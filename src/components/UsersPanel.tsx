import React, { useState, useCallback, useEffect } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import {
  AuthUser,
  ManagedUser,
  Role,
  listUsers,
  addUser,
  deleteUser,
  setUserDisabled,
  setUserRole,
  resetUserPassword,
  changeOwnPassword,
  passwordStrength,
} from '../utils/auth';

interface UsersPanelProps {
  currentUser: AuthUser;
}

const roleLabel: Record<Role, string> = { owner: 'مالك', manager: 'مدير' };
const inputCls = 'w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs';

export const UsersPanel: React.FC<UsersPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = useCallback(() => {
    listUsers()
      .then(setUsers)
      .catch((e) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'تعذر تحميل المستخدمين.' }));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const notify = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // add user form
  const [nu, setNu] = useState({ username: '', displayName: '', password: '', role: 'manager' as Role });
  // own password form
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' });
  // reset password for another user
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');

  const run = async (fn: () => Promise<{ ok: true } | { ok: false; error: string }> | { ok: true } | { ok: false; error: string }, okText: string) => {
    try {
      const res = await fn();
      if (res.ok) {
        notify(true, okText);
        refresh();
        return true;
      }
      notify(false, res.error);
    } catch (e) {
      notify(false, e instanceof Error ? e.message : 'تعذر تنفيذ العملية.');
    }
    return false;
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-2.5 rounded-xl border font-semibold ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Users list */}
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
        <span className="font-black text-stone-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          المستخدمون ({users.length})
        </span>
        {users.map((u) => {
          const isMe = u.id === currentUser.id;
          return (
            <div key={u.id} className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 truncate">
                    {u.displayName} <span className="font-mono text-stone-500 font-normal">@{u.username}</span>
                    {isMe && <span className="mr-1 text-[10px] bg-stone-900 text-white px-1.5 py-0.5 rounded-md">أنت</span>}
                    {u.disabled && <span className="mr-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">موقوف</span>}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {roleLabel[u.role]} · آخر دخول: {u.lastLogin ? new Date(u.lastLogin).toLocaleString('ar') : 'لم يدخل بعد'}
                  </div>
                </div>

                {!isMe && (
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={u.role}
                      onChange={(e) => run(() => setUserRole(u.id, e.target.value as Role), 'تم تغيير الصلاحية')}
                      className="text-[11px] border border-stone-200 rounded-lg px-1.5 py-1 bg-white"
                    >
                      <option value="manager">مدير</option>
                      <option value="owner">مالك</option>
                    </select>
                    <button
                      type="button"
                      title={u.disabled ? 'تفعيل' : 'إيقاف'}
                      onClick={() => run(() => setUserDisabled(u.id, !u.disabled), u.disabled ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')}
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
                    >
                      {u.disabled ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-amber-600" />}
                    </button>
                    <button
                      type="button"
                      title="كلمة مرور جديدة"
                      onClick={() => {
                        setResetId(resetId === u.id ? null : u.id);
                        setResetPw('');
                      }}
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      onClick={() => {
                        if (window.confirm(`حذف المستخدم ${u.username}؟`)) run(() => deleteUser(u.id), 'تم حذف المستخدم');
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {resetId === u.id && (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="كلمة المرور الجديدة"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (await run(() => resetUserPassword(u.id, resetPw), 'تم تغيير كلمة المرور')) {
                        setResetId(null);
                        setResetPw('');
                      }
                    }}
                    className="px-3 py-2 bg-stone-900 text-white rounded-xl font-bold shrink-0"
                  >
                    حفظ
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add user */}
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
        <span className="font-black text-stone-900 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-blue-600" />
          إضافة مستخدم
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className={inputCls} placeholder="اسم المستخدم" autoComplete="off" autoCapitalize="none" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
          <input className={inputCls} placeholder="الاسم الظاهر" autoComplete="off" maxLength={40} value={nu.displayName} onChange={(e) => setNu({ ...nu, displayName: e.target.value })} />
          <input className={inputCls} type="password" placeholder="كلمة المرور" autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          <select className={inputCls} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}>
            <option value="manager">مدير (بدون إدارة المستخدمين)</option>
            <option value="owner">مالك (صلاحيات كاملة)</option>
          </select>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => {
            const s = passwordStrength(nu.password);
            return <div key={i} className={`h-1 flex-1 rounded ${i < s ? (s <= 1 ? 'bg-red-500' : s <= 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-200'}`} />;
          })}
        </div>
        <button
          type="button"
          onClick={async () => {
            if (await run(() => addUser(nu.username, nu.displayName, nu.password, nu.role), 'تمت إضافة المستخدم')) {
              setNu({ username: '', displayName: '', password: '', role: 'manager' });
            }
          }}
          className="px-3 py-2 bg-stone-900 text-white rounded-xl font-bold"
        >
          إضافة
        </button>
      </div>

      {/* Change own password */}
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
        <span className="font-black text-stone-900 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-amber-600" />
          تغيير كلمة مروري
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className={inputCls} type="password" placeholder="الحالية" autoComplete="off" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />
          <input className={inputCls} type="password" placeholder="الجديدة" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <input className={inputCls} type="password" placeholder="تأكيد الجديدة" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </div>
        <button
          type="button"
          onClick={async () => {
            if (pw.next !== pw.confirm) return notify(false, 'كلمتا المرور الجديدتان غير متطابقتين.');
            if (await run(() => changeOwnPassword(pw.old, pw.next), 'تم تغيير كلمة المرور')) setPw({ old: '', next: '', confirm: '' });
          }}
          className="px-3 py-2 bg-stone-900 text-white rounded-xl font-bold"
        >
          تغيير
        </button>
      </div>

      <p className="text-[11px] text-stone-500 leading-relaxed">
        الحسابات محفوظة على الخادم وكلمات المرور مشفّرة (scrypt مع ملح عشوائي). الجلسة تنتهي بعد 30 دقيقة من عدم النشاط، ويُقفل الدخول مؤقتاً بعد المحاولات الخاطئة المتكررة.
      </p>
    </div>
  );
};
