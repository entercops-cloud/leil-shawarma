import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Image as ImageIcon,
  Check,
  Upload,
  Link as LinkIcon,
  Sparkles,
  FolderOpen,
  Trash2,
  Plus,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import { MenuItem, Category } from '../types';
import { HERO_IMAGE } from '../data/menuData';
import { processImageFile, getMediaLibrary, refreshMediaLibrary, MediaImage } from '../utils/mediaLibrary';
import { MediaLibraryModal } from './MediaLibraryModal';

interface EditMenuItemModalProps {
  item: MenuItem | null; // null means adding a new item
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (item: MenuItem) => void;
}

export const EditMenuItemModal: React.FC<EditMenuItemModalProps> = ({
  item,
  isOpen,
  onClose,
  categories,
  onSave,
}) => {
  const isEditing = Boolean(item);

  const [name, setName] = useState(item?.name || '');
  const [nameEn, setNameEn] = useState(item?.nameEn || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState<number>(item?.price || 15);
  const [categoryId, setCategoryId] = useState(item?.categoryId || categories[0]?.id || 'chicken');
  const [subCategory, setSubCategory] = useState(item?.subCategory || '');
  const [badge, setBadge] = useState(item?.badge || '');
  const [calories, setCalories] = useState<number>(item?.calories || 450);
  const [imageUrl, setImageUrl] = useState<string>(item?.image || HERO_IMAGE);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(item?.isAvailable !== false);
  const [isPopular, setIsPopular] = useState<boolean>(Boolean(item?.isPopular));
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Meal Customization Options: Sizes & Breads
  const [hasSizes, setHasSizes] = useState<boolean>(
    Boolean(item?.options?.sizes && item.options.sizes.length > 0)
  );
  const [sizes, setSizes] = useState<{ name: string; priceDelta: number }[]>(
    item?.options?.sizes && item.options.sizes.length > 0
      ? item.options.sizes
      : [
          { name: 'عادي', priceDelta: 0 },
          { name: 'دبل', priceDelta: 6 },
        ]
  );

  const [hasBreads, setHasBreads] = useState<boolean>(
    Boolean(item?.options?.breads && item.options.breads.length > 0)
  );
  const [breads, setBreads] = useState<string[]>(
    item?.options?.breads && item.options.breads.length > 0
      ? item.options.breads
      : ['خبز صاج', 'خبز طابون']
  );

  // Media Library modal state
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isUploadingDirect, setIsUploadingDirect] = useState(false);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Quick presets from library
  const [libraryPresets, setLibraryPresets] = useState<MediaImage[]>([]);

  useEffect(() => {
    refreshMediaLibrary().then((lib) => setLibraryPresets(lib.slice(0, 6)));
  }, [isOpen, isMediaLibraryOpen]);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setNameEn(item.nameEn);
      setDescription(item.description);
      setPrice(item.price);
      setCategoryId(item.categoryId);
      setSubCategory(item.subCategory || '');
      setBadge(item.badge || '');
      setCalories(item.calories || 450);
      setImageUrl(item.image);
      setCustomUrlInput(item.image.startsWith('http') ? item.image : '');
      setIsAvailable(item.isAvailable !== false);
      setIsPopular(Boolean(item.isPopular));
      setPreviewError(false);
      setUploadError(null);

      // Sizes state
      if (item.options?.sizes && item.options.sizes.length > 0) {
        setHasSizes(true);
        setSizes(item.options.sizes);
      } else {
        setHasSizes(false);
        setSizes([
          { name: 'عادي', priceDelta: 0 },
          { name: 'دبل', priceDelta: 6 },
        ]);
      }

      // Breads state
      if (item.options?.breads && item.options.breads.length > 0) {
        setHasBreads(true);
        setBreads(item.options.breads);
      } else {
        setHasBreads(false);
        setBreads(['خبز صاج', 'خبز طابون']);
      }
    } else {
      setName('');
      setNameEn('');
      setDescription('');
      setPrice(15);
      setCategoryId(categories[0]?.id || 'chicken');
      setSubCategory('');
      setBadge('');
      setCalories(450);
      setImageUrl(HERO_IMAGE);
      setCustomUrlInput('');
      setIsAvailable(true);
      setIsPopular(false);
      setPreviewError(false);
      setUploadError(null);

      setHasSizes(true);
      setSizes([
        { name: 'عادي', priceDelta: 0 },
        { name: 'دبل', priceDelta: 6 },
      ]);
      setHasBreads(true);
      setBreads(['خبز صاج', 'خبز طابون']);
    }
  }, [item, categories]);

  if (!isOpen) return null;

  const handleApplyCustomUrl = (url: string) => {
    setCustomUrlInput(url);
    if (url.trim()) {
      setImageUrl(url.trim());
      setPreviewError(false);
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDirect(true);
    setUploadError(null);
    try {
      const file = files[0];
      const newMedia = await processImageFile(file);
      setImageUrl(newMedia.url);
      setCustomUrlInput('');
      setPreviewError(false);
      setLibraryPresets(getMediaLibrary().slice(0, 6));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setIsUploadingDirect(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  // Helper functions for Sizes
  const handleAddSize = (nameToAdd = 'حجم جديد', deltaToAdd = 4) => {
    setSizes((prev) => [...prev, { name: nameToAdd, priceDelta: deltaToAdd }]);
  };

  const handleUpdateSizeName = (index: number, newName: string) => {
    setSizes((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, name: newName } : s))
    );
  };

  const handleUpdateSizeDelta = (index: number, newDelta: number) => {
    setSizes((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, priceDelta: newDelta } : s))
    );
  };

  const handleDeleteSize = (index: number) => {
    setSizes((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Helper functions for Breads
  const handleAddBread = (breadToAdd = 'خبز جديد') => {
    setBreads((prev) => [...prev, breadToAdd]);
  };

  const handleUpdateBread = (index: number, newName: string) => {
    setBreads((prev) => prev.map((b, idx) => (idx === index ? newName : b)));
  };

  const handleDeleteBread = (index: number) => {
    setBreads((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0) return;

    // Filter valid sizes and breads
    const cleanedSizes = hasSizes ? sizes.filter((s) => s.name.trim()) : undefined;
    const cleanedBreads = hasBreads ? breads.filter((b) => b.trim()) : undefined;

    const savedItem: MenuItem = {
      id: item?.id || `item-custom-${Date.now()}`,
      name: name.trim(),
      nameEn: nameEn.trim() || name.trim(),
      description: description.trim(),
      price: Number(price),
      categoryId,
      subCategory: subCategory.trim() || undefined,
      image: imageUrl.trim() || HERO_IMAGE,
      badge: badge.trim() || undefined,
      calories: Number(calories) || undefined,
      isAvailable,
      isPopular,
      options: {
        sizes: cleanedSizes && cleanedSizes.length > 0 ? cleanedSizes : undefined,
        breads: cleanedBreads && cleanedBreads.length > 0 ? cleanedBreads : undefined,
        extras: item?.options?.extras || [
          { id: 'cheese', name: 'جبنة موزاريلا', price: 4 },
          { id: 'pomegranate', name: 'دبس رمان', price: 2 },
        ],
        removals: item?.options?.removals || ['بدون مخلل', 'بدون ثومية'],
      },
    };

    onSave(savedItem);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#0B192C] text-white flex items-center justify-between border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `تعديل وجبة: ${item?.name}` : 'إضافة وجبة جديدة إلى منيو ليل'}
              </h2>
              <p className="text-[11px] text-amber-300">
                {isEditing ? 'تعديل الأسعار، الأحجام، نوع الخبز والصورة فوراً' : 'ستظهر الوجبة فوراً في القسم المختار'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Image Preview & Upload Section */}
            <div className="space-y-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-red-600" />
                  صورة الوجبة (رفع أو استبدال فوري):
                </span>
                <span className="text-[10px] text-stone-500">جودة عالية · حفظ تلقائي</span>
              </div>

              {/* Live Preview Box */}
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-stone-200 bg-stone-900 group">
                <img
                  src={imageUrl}
                  alt={name || 'معاينة وجبة'}
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3 text-white justify-between">
                  <span className="font-bold drop-shadow-sm truncate max-w-[240px]">
                    {name || 'اسم الوجبة'}
                  </span>
                  <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold">
                    {previewError ? 'صورة بديلة' : 'الصورة المختارة حالياً'}
                  </span>
                </div>
              </div>

              {/* Upload Direct Button & URL Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    ref={directFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDirectUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => directFileInputRef.current?.click()}
                    disabled={isUploadingDirect}
                    className="w-full bg-[#0B192C] hover:bg-[#152e4e] disabled:bg-stone-400 text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <Upload className="w-4 h-4 text-red-400" />
                    <span>{isUploadingDirect ? 'جاري الرفع...' : 'رفع صورة من جهازي 📤'}</span>
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setIsMediaLibraryOpen(true)}
                    className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-stone-600" />
                    <span>تصفح مكتبة الوسائط 📁</span>
                  </button>
                </div>
              </div>

              {/* Direct Image URL input */}
              <div>
                <label className="block text-stone-600 font-bold text-[11px] mb-1">
                  أو ألصق رابط صورة مباشر (URL):
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    dir="ltr"
                    value={customUrlInput}
                    onChange={(e) => handleApplyCustomUrl(e.target.value)}
                    placeholder="https://example.com/shawarma.jpg"
                    className="w-full pr-8 pl-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-red-600 text-left"
                  />
                </div>
              </div>

              {/* Quick Presets Gallery Selector */}
              <div>
                <span className="block text-stone-600 text-[11px] font-medium mb-1.5">
                  أو اختر سريعاً من مكتبة الصور الجاهزة:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {libraryPresets.map((preset) => {
                    const isSelected = imageUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setImageUrl(preset.url);
                          setCustomUrlInput(preset.url.startsWith('http') ? preset.url : '');
                          setPreviewError(false);
                        }}
                        className={`p-1.5 rounded-xl border text-right transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-red-600 bg-red-50 ring-1 ring-red-600'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-12 object-cover rounded-lg"
                        />
                        <span className="text-[10px] font-bold text-stone-700 truncate w-full text-center">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> مختارة
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Meal Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-bold mb-1">اسم الوجبة (عربي) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: ساندويش شاورما إكسترا"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">الاسم بالإنجليزي (اختياري)</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Shawarma Extra Wrap"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Price & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-bold mb-1">السعر الأساسي بالشيكل (₪) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono tabular-nums font-bold focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">القسم / التصنيف *</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCategoryId(newCat);
                    const matchedCat = categories.find((c) => c.id === newCat);
                    if (matchedCat?.subCategories && matchedCat.subCategories.length > 0) {
                      setSubCategory(matchedCat.subCategories[0]);
                    }
                  }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-red-600 focus:bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-Category */}
            <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-stone-800 font-bold text-xs">
                  التصنيف الفرعي داخل القسم (Sub-category):
                </label>
                <span className="text-[10px] text-amber-700 font-medium">لتنظيم القائمة وسهولة تصفح الزبائن</span>
              </div>

              {/* Sub-category Quick Suggestion Chips */}
              {(() => {
                const currentCat = categories.find((c) => c.id === categoryId);
                const suggestions = currentCat?.subCategories || [];
                if (suggestions.length === 0) return null;

                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-medium">مقترحات سريعة:</span>
                    {suggestions.map((sub) => {
                      const isSelected = subCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubCategory(sub)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-400'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="مثلاً: ساندويشات صاج، وجبات فردية، صحون، سوبر..."
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 font-medium text-xs"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-stone-700 font-bold mb-1">الوصف والمكونات:</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مشهي للوجبة والتتبيلة ونوع الخبز..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white resize-none"
              />
            </div>

            {/* ======================================================== */}
            {/* FEATURE: SIZES EDITOR (خاصية تعديل خيارات الحجم والأسعار) */}
            {/* ======================================================== */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 block text-xs">خيارات أحجام الوجبة (Sizes):</span>
                    <span className="text-[10px] text-stone-500">تحديد الأحجام المتوفرة مع فارق السعر بالشيكل</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasSizes(!hasSizes)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    hasSizes
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  {hasSizes ? '✓ مفعلة' : 'غير مفعلة (حجم واحد)'}
                </button>
              </div>

              {hasSizes && (
                <div className="space-y-2.5 pt-2 border-t border-stone-200">
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-medium">إضافة سريعة:</span>
                    <button
                      type="button"
                      onClick={() => handleAddSize('عادي', 0)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-red-400"
                    >
                      + عادي (+0 ₪)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSize('دبل', 6)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-red-400"
                    >
                      + دبل (+6 ₪)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSize('سوبر', 10)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-red-400"
                    >
                      + سوبر (+10 ₪)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSize('صاروخ', 4)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-red-400"
                    >
                      + صاروخ (+4 ₪)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSize('وجبة كاملة', 12)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-red-400"
                    >
                      + وجبة كاملة (+12 ₪)
                    </button>
                  </div>

                  {/* Size Rows */}
                  <div className="space-y-2">
                    {sizes.map((s, idx) => {
                      const finalCalculatedPrice = Number(price) + Number(s.priceDelta || 0);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-white rounded-xl border border-stone-200 shadow-2xs"
                        >
                          <div className="flex-1">
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => handleUpdateSizeName(idx, e.target.value)}
                              placeholder="اسم الحجم (عادي، دبل...)"
                              className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-600"
                            />
                          </div>

                          <div className="w-28 flex items-center gap-1">
                            <span className="text-[11px] text-stone-500 font-mono">+</span>
                            <input
                              type="number"
                              value={s.priceDelta}
                              onChange={(e) => handleUpdateSizeDelta(idx, Number(e.target.value))}
                              placeholder="0"
                              className="w-16 p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:border-red-600"
                            />
                            <span className="text-[11px] text-stone-600 font-bold">₪</span>
                          </div>

                          <div className="hidden sm:block text-[11px] text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded-lg shrink-0">
                            الإجمالي: {finalCalculatedPrice} ₪
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSize(idx)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف هذا الحجم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSize('حجم إضافي', 5)}
                    className="w-full py-2 border border-dashed border-stone-300 hover:border-red-500 hover:bg-red-50/50 rounded-xl text-stone-700 hover:text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة خيار حجم جديد</span>
                  </button>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* FEATURE: BREADS EDITOR (خاصية تعديل خيارات نوع الخبز)    */}
            {/* ======================================================== */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 block text-xs">خيارات نوع الخبز (Breads):</span>
                    <span className="text-[10px] text-stone-500">أنواع الخبز التي يختار الزبون منها لوجبته</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasBreads(!hasBreads)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    hasBreads
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  {hasBreads ? '✓ مفعلة' : 'غير مفعلة (بدون اختيار)'}
                </button>
              </div>

              {hasBreads && (
                <div className="space-y-2.5 pt-2 border-t border-stone-200">
                  {/* Preset quick bread chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-medium">إضافة سريعة:</span>
                    <button
                      type="button"
                      onClick={() => handleAddBread('خبز صاج')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                    >
                      + خبز صاج
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBread('خبز طابون')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                    >
                      + خبز طابون
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBread('خبز حمام')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                    >
                      + خبز حمام
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBread('خبز تورتيلا')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                    >
                      + خبز تورتيلا
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBread('بدون خبز (وجبة صحن)')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                    >
                      + بدون خبز (وجبة صحن)
                    </button>
                  </div>

                  {/* Bread list */}
                  <div className="space-y-2">
                    {breads.map((b, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-white rounded-xl border border-stone-200 shadow-2xs"
                      >
                        <input
                          type="text"
                          value={b}
                          onChange={(e) => handleUpdateBread(idx, e.target.value)}
                          placeholder="نوع الخبز (مثال: خبز صاج، طابون...)"
                          className="flex-1 p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteBread(idx)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف هذا الخيار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddBread('نوع خبز جديد')}
                    className="w-full py-2 border border-dashed border-stone-300 hover:border-amber-500 hover:bg-amber-50/50 rounded-xl text-stone-700 hover:text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة نوع خبز آخر</span>
                  </button>
                </div>
              )}
            </div>

            {/* Badge & Calories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-bold mb-1">شارة مميزة (Badge)</label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="الأكثر طلباً، جديد، توفير..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">السعرات الحرارية</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  placeholder="550"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Toggles: Availability & Popular */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">حالة توفر الوجبة للزبائن:</span>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isAvailable ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {isAvailable ? '✓ متوفرة للطلب' : '✕ غير متوفرة (نفدت)'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                <span className="font-bold text-stone-800">تمييز الوجبة (Featured / Popular):</span>
                <button
                  type="button"
                  onClick={() => setIsPopular(!isPopular)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isPopular ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {isPopular ? '★ وجبة مميزة' : 'عادية'}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#E61C24] hover:bg-[#cf151c] text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'حفظ التعديلات والأحجام والصورة' : 'إضافة الوجبة إلى المنيو'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Media Library Sub-Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        selectedImageUrl={imageUrl}
        onSelectImage={(url) => {
          setImageUrl(url);
          setCustomUrlInput(url.startsWith('http') ? url : '');
          setPreviewError(false);
        }}
      />
    </>
  );
};
