import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { MenuItem, CartItemOption } from '../types';

interface ItemCustomizeModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, options: CartItemOption) => void;
}

export const ItemCustomizeModal: React.FC<ItemCustomizeModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  // Selected state hooks declared unconditionally
  const [selectedSize, setSelectedSize] = useState<string>('عادي');
  const [selectedBread, setSelectedBread] = useState<string>('خبز صاج');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Sync state whenever selected item opens
  useEffect(() => {
    if (item) {
      setSelectedSize(item.options?.sizes?.[0]?.name || 'عادي');
      setSelectedBread(item.options?.breads?.[0] || 'خبز صاج');
      setSelectedExtras([]);
      setSelectedRemovals([]);
      setNotes('');
      setQuantity(1);
    }
  }, [item, isOpen]);

  // Calculate unit price based on options
  const unitPrice = useMemo(() => {
    if (!item) return 0;
    let price = item.price;

    // Size delta
    if (item.options?.sizes) {
      const foundSize = item.options.sizes.find((s) => s.name === selectedSize);
      if (foundSize) price += foundSize.priceDelta;
    }

    // Extras
    if (item.options?.extras) {
      item.options.extras.forEach((ext) => {
        if (selectedExtras.includes(ext.id)) {
          price += ext.price;
        }
      });
    }

    return price;
  }, [item, selectedSize, selectedExtras]);

  if (!isOpen || !item) return null;

  const totalPrice = unitPrice * quantity;

  const toggleExtra = (extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const toggleRemoval = (removalName: string) => {
    setSelectedRemovals((prev) =>
      prev.includes(removalName)
        ? prev.filter((name) => name !== removalName)
        : [...prev, removalName]
    );
  };

  const handleAdd = () => {
    onAddToCart(item, quantity, {
      size: selectedSize,
      bread: selectedBread,
      extras: selectedExtras,
      removals: selectedRemovals,
      notes: notes.trim(),
      unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Header with image */}
        <div className="relative h-44 sm:h-52 w-full bg-stone-100 shrink-0">
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 right-4 left-4 text-white">
            <h2 className="text-xl font-bold">{item.name}</h2>
            <p className="text-xs text-stone-200 line-clamp-1 mt-0.5">{item.description}</p>
          </div>
        </div>

        {/* Scrollable Customization Options */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 divide-y divide-stone-100">
          {/* Bread Choice */}
          {item.options?.breads && item.options.breads.length > 0 && (
            <div className="pt-2 first:pt-0">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2.5">
                اختر نوع الخبز:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {item.options.breads.map((bread) => {
                  const isChecked = selectedBread === bread;
                  return (
                    <button
                      key={bread}
                      type="button"
                      onClick={() => setSelectedBread(bread)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold text-right transition-all ${
                        isChecked
                          ? 'border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <span>{bread}</span>
                      {isChecked && <Check className="w-4 h-4 text-red-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Choice */}
          {item.options?.sizes && item.options.sizes.length > 1 && (
            <div className="pt-4">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2.5">
                اختر الحجم:
              </label>
              <div className="space-y-2">
                {item.options.sizes.map((s) => {
                  const isChecked = selectedSize === s.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelectedSize(s.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                        isChecked
                          ? 'border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isChecked ? 'border-red-600 bg-red-600' : 'border-stone-300'}`}>
                          {isChecked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>{s.name}</span>
                      </div>
                      <span className="font-mono tabular-nums text-stone-900 font-bold">
                        {s.priceDelta > 0 ? `+${s.priceDelta} ₪` : 'السعر الأساسي'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Paid Extras */}
          {item.options?.extras && item.options.extras.length > 0 && (
            <div className="pt-4">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2.5">
                إضافات ليل الخاصة (اختياري):
              </label>
              <div className="space-y-2">
                {item.options.extras.map((extra) => {
                  const isChecked = selectedExtras.includes(extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(extra.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isChecked
                          ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? 'border-red-600 bg-red-600 text-white' : 'border-stone-300'}`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span>{extra.name}</span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-red-600">
                        +{extra.price} ₪
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Removals / Preferences */}
          {item.options?.removals && item.options.removals.length > 0 && (
            <div className="pt-4">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-2.5">
                ملاحظات المكونات:
              </label>
              <div className="flex flex-wrap gap-2">
                {item.options.removals.map((rem) => {
                  const isChecked = selectedRemovals.includes(rem);
                  return (
                    <button
                      key={rem}
                      type="button"
                      onClick={() => toggleRemoval(rem)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-stone-900 border-stone-900 text-white'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {isChecked ? `✓ ${rem}` : rem}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="pt-4">
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              ملاحظة خاصة للشيف:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تحمير الصاج زيادة، الثومية على جنب..."
              className="w-full text-xs p-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        {/* Footer sticky bar */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          {/* Quantity stepper */}
          <div className="flex items-center border border-stone-300 bg-white rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 rounded-r-xl"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold font-mono tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-l-xl"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart CTA */}
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 flex items-center justify-between bg-stone-900 hover:bg-stone-800 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold shadow-xs transition-all text-sm"
          >
            <span>إضافة إلى الطلب</span>
            <span className="font-mono tabular-nums font-black">{totalPrice} ₪</span>
          </button>
        </div>
      </div>
    </div>
  );
};
