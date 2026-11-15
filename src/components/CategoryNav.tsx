import React, { useRef, useEffect } from 'react';
import { Category } from '../types';

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll active button into view on small screens
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeButton = scrollContainerRef.current.querySelector(
      `[data-category-id="${activeCategoryId}"]`
    ) as HTMLElement;

    if (activeButton) {
      const container = scrollContainerRef.current;
      const scrollLeft =
        activeButton.offsetLeft -
        container.offsetWidth / 2 +
        activeButton.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategoryId]);

  return (
    <nav 
      aria-label="أقسام قائمة الطعام"
      className="sticky top-[108px] sm:top-[74px] z-30 bg-white/95 backdrop-blur-md border-y border-stone-200/80 shadow-xs"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto py-2.5 sm:py-3 no-scrollbar scroll-smooth"
        >
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                data-category-id={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 select-none active:scale-95 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs font-bold'
                    : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 hover:text-stone-900'
                }`}
              >
                <span className="text-base leading-none">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
