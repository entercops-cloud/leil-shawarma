import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Palette,
  Plus,
  LogOut,
  AlertTriangle,
  ChevronUp,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface SiteControlLauncherProps {
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminPanel: () => void;
  onOpenUsers?: () => void;
  onOpenSiteCustomizer?: () => void;
  onAddNewItem?: () => void;
  onLogout?: () => void;
  delayedOrdersCount?: number;
  hasFloatingCart?: boolean;
}

/**
 * SiteControlLauncher
 * أيقونة طرف الموقع الهادئة والمخفية للوحة الإدارة وخطة ومواصفات المشروع
 * تمنح تجربة تصفح نظيفة وخالية من الأزرار الإدارية لزوار المطعم العاديين
 */
export const SiteControlLauncher: React.FC<SiteControlLauncherProps> = ({
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminPanel,
  onOpenUsers,
  onOpenSiteCustomizer,
  onAddNewItem,
  onLogout,
  delayedOrdersCount = 0,
  hasFloatingCart = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`fixed left-4 z-40 transition-all duration-300 ${
        hasFloatingCart
          ? 'bottom-20 sm:bottom-6 sm:left-6'
          : 'bottom-4 sm:bottom-6 sm:left-6'
      }`}
    >
      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 text-stone-900 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">طرف النظام والتحكم</h4>
                <p className="text-[10px] text-stone-400">
                  {isAdmin ? 'جلسة الإدارة مفعلة' : 'الإدارة وخطة العمل'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-1.5 text-xs">
            {/* 1. Admin Panel / Login */}
            {isAdmin ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdminPanel();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-semibold ${
                  delayedOrdersCount > 0
                    ? 'bg-red-50 hover:bg-red-100 text-red-900 border border-red-200'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {delayedOrdersCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>لوحة تحكم الإدارة الكاملة</span>
                </div>
                {delayedOrdersCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                    {delayedOrdersCount} متأخر
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdminLogin();
                }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition-all"
              >
                <Lock className="w-4 h-4 text-stone-300" />
                <div className="text-right">
                  <span className="block leading-tight">دخول إدارة المطعم</span>
                  <span className="text-[10px] text-stone-400 font-normal">
                    تحكم بالطلبات، الأسعار، والإعدادات
                  </span>
                </div>
              </button>
            )}

            {/* Admin Controls (Shown only when logged in) */}
            {isAdmin && (
              <>

                {onOpenUsers && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenUsers();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>المستخدمون وكلمات المرور</span>
                  </button>
                )}

                {onOpenSiteCustomizer && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSiteCustomizer();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors font-semibold"
                  >
                    <Palette className="w-4 h-4 text-amber-600" />
                    <span>تخصيص الهوية والشعار</span>
                  </button>
                )}

                {onAddNewItem && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewItem();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors font-semibold"
                  >
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>إضافة وجبة جديدة للمنيو</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-semibold pt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل خروج من الإدارة</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-stone-100 text-[10px] text-center text-stone-400">
            أيقونة طرف الموقع · مخصصة للإدارة وخطة العمل
          </div>
        </div>
      )}

      {/* Floating Corner Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="أيقونة إدارة المطعم"
        title="أيقونة طرف الموقع: إدارة المطعم"
        className={`relative flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-lg backdrop-blur-md transition-all duration-200 active:scale-95 border ${
          isOpen
            ? 'bg-stone-900 text-white border-stone-800 ring-2 ring-stone-900/20 shadow-xl'
            : isAdmin
            ? 'bg-stone-900/90 hover:bg-stone-900 text-white border-stone-700/80'
            : 'bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 border-stone-300/80 shadow-md'
        }`}
      >
        {/* Status Dot / Alert icon */}
        {delayedOrdersCount > 0 ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
          </span>
        ) : isAdmin ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        ) : (
          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
        )}

        <span className="text-[11px] font-bold hidden sm:inline">
          {isAdmin ? 'إدارة المطعم' : 'الإدارة والخطة'}
        </span>

        {delayedOrdersCount > 0 ? (
          <span className="bg-red-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
            {delayedOrdersCount}
          </span>
        ) : (
          <ChevronUp
            className={`w-3 h-3 text-stone-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
    </div>
  );
};
