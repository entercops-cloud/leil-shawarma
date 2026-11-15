import React, { useState } from 'react';
import { SlidersHorizontal, Star, Edit, Trash2, Eye, EyeOff, Utensils, Zap, Check, Plus } from 'lucide-react';
import { MenuItem } from '../types';
import { HERO_IMAGE } from '../data/menuData';

interface MenuItemCardProps {
  item: MenuItem;
  ratingStats: { average: number; count: number };
  onQuickAdd: (item: MenuItem) => void;
  onFastOrder?: (item: MenuItem) => void;
  onCustomize: (item: MenuItem) => void;
  onOpenRating: (item: MenuItem) => void;
  isAdmin?: boolean;
  onEditItem?: (item: MenuItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onToggleAvailability?: (itemId: string) => void;
  showRatings?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  ratingStats,
  onQuickAdd,
  onFastOrder,
  onCustomize,
  onOpenRating,
  isAdmin = false,
  onEditItem,
  onDeleteItem,
  onToggleAvailability,
  showRatings = true,
}) => {
  const isAvailable = item.isAvailable !== false;
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const hasCustomizations =
    item.options &&
    ((item.options.sizes && item.options.sizes.length > 1) ||
      (item.options.breads && item.options.breads.length > 1) ||
      (item.options.extras && item.options.extras.length > 0));

  const displayImage = imageError ? HERO_IMAGE : (item.image || HERO_IMAGE);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    onQuickAdd(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const handleFastOrderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (onFastOrder) {
      onFastOrder(item);
    } else {
      onQuickAdd(item);
    }
  };

  return (
    <article
      className={`group relative bg-white text-stone-900 rounded-2xl sm:rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isAvailable
          ? 'border-stone-200/80 hover:border-stone-300 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.06)]'
          : 'border-stone-200 opacity-60 grayscale-[40%]'
      } ${isAdmin ? 'ring-1 ring-amber-400' : ''}`}
    >
      {/* Admin Quick Action Floating Banner on Card */}
      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-900 font-bold z-10">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            تحكم المدير
          </span>
          <div className="flex items-center gap-2">
            {onToggleAvailability && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAvailability(item.id);
                }}
                className={`p-1 rounded hover:bg-amber-100 ${isAvailable ? 'text-emerald-700' : 'text-stone-500'}`}
                title={isAvailable ? 'تعطيل الوجبة (نفدت)' : 'تفعيل الوجبة (متوفرة)'}
              >
                {isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
            {onEditItem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem(item);
                }}
                className="p-1 rounded text-sky-700 hover:bg-amber-100"
                title="تعديل تفاصيل الوجبة واستبدال الصورة"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteItem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="p-1 rounded text-red-700 hover:bg-amber-100"
                title="حذف الوجبة نهائياً"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Image area with European clean framing */}
      <div
        onClick={() => onCustomize(item)}
        className="relative aspect-[16/10] sm:aspect-[4/3] w-full bg-stone-100 overflow-hidden cursor-pointer select-none"
      >
        {/* Placeholder skeleton while loading */}
        {!isLoaded && !imageError && (
          <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center text-stone-400">
            <Utensils className="w-6 h-6 opacity-40" />
          </div>
        )}

        <img
          src={displayImage}
          alt={item.name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />

        {/* Badge if present (Clean European tag) */}
        {item.badge && (
          <span className="absolute top-3 right-3 bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs">
            {item.badge}
          </span>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold">
            <span className="bg-stone-900/90 border border-white/20 px-3 py-1.5 rounded-lg">
              غير متوفر حالياً
            </span>
          </div>
        )}

        {/* Calories indicator on photo bottom */}
        {item.calories && (
          <div className="absolute bottom-2.5 right-3 text-[10px] text-white font-medium bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
            <span className="font-mono tabular-nums">{item.calories}</span> سعرة
          </div>
        )}
      </div>

      {/* Content area with generous breathing room & editorial typography */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Top meta row: Rating & Subcategory */}
          <div className="flex items-center justify-between gap-2 text-xs">
            {showRatings && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRating(item);
                }}
                className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors"
                title="عرض التقييمات وتقييم الوجبة"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-stone-800 font-mono tabular-nums">
                  {ratingStats.average}
                </span>
                <span className="text-[11px] text-stone-400">
                  ({ratingStats.count > 0 ? ratingStats.count : 'قيّم'})
                </span>
              </button>
            )}

            {item.subCategory && (
              <span className="text-[11px] font-medium text-stone-500">
                {item.subCategory}
              </span>
            )}
          </div>

          {/* Dish Title */}
          <h3
            onClick={() => onCustomize(item)}
            className="font-bold text-base sm:text-lg text-stone-900 group-hover:text-red-700 transition-colors cursor-pointer leading-snug"
          >
            {item.name}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-stone-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Price & Interactive Action Bar */}
        <div className="pt-3 border-t border-stone-100 flex flex-col gap-3">
          {/* Price display & Customization notice */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 tabular-nums font-mono">
                {item.price}
              </span>
              <span className="text-xs font-semibold text-stone-500">₪</span>
            </div>

            {hasCustomizations && (
              <button
                type="button"
                onClick={() => onCustomize(item)}
                className="text-[11px] font-medium text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3 text-stone-400" />
                <span>خيارات الحجم والخبز</span>
              </button>
            )}
          </div>

          {/* Action Buttons: European Clean "طلب سريع" and "أضف للسلة" */}
          <div className="grid grid-cols-2 gap-2">
            {/* Quick 1-Click Fast Order Button */}
            <button
              type="button"
              onClick={handleFastOrderClick}
              disabled={!isAvailable}
              className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-stone-200/80 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="طلب مباشر فوري"
            >
              <Zap className="w-3.5 h-3.5 text-stone-700" />
              <span>طلب سريع</span>
            </button>

            {/* Add to Cart Button: Solid Charcoal CTA */}
            <button
              type="button"
              onClick={handleAddClick}
              disabled={!isAvailable}
              className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                justAdded
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs'
              }`}
              title="إضافة الوجبة للسلة"
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-white" />
                  <span>تمت الإضافة!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>أضف للسلة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
