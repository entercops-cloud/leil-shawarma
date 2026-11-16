import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Palette,
  Type,
  Image as ImageIcon,
  Layout,
  Save,
  RotateCcw,
  Check,
  Sparkles,
  Flame,
  Eye,
  EyeOff,
  FolderOpen,
  Sliders,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  Smartphone,
  ShoppingBag,
  Phone,
  MessageCircle,
  Layers,
  Truck,
  Plus,
  Award,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { SiteCustomization } from '../types';
import { lookupCustomer, setCustomerPoints } from '../utils/serverData';
import type { CustomerAccount } from '../utils/customerAuth';
import { DEFAULT_SITE_CUSTOMIZATION } from '../utils/storage';
import { processImageFile, getMediaLibrary, refreshMediaLibrary, MediaImage } from '../utils/mediaLibrary';
import { HERO_IMAGE, RESTAURANT_INFO } from '../data/menuData';
import arabiMealImg from '../assets/images/shawarma_arabi_meal_1791041625052.jpg';
import familyBoxImg from '../assets/images/leil_family_box_1791041634511.jpg';
import beefPlatterImg from '../assets/images/shawarma_beef_platter_1791041615785.jpg';
import chickenWrapImg from '../assets/images/shawarma_chicken_wrap_1791041603153.jpg';
import { MediaLibraryModal } from './MediaLibraryModal';
import { Logo } from './Logo';

interface SiteCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: SiteCustomization;
  onSaveCustomization: (newCustomization: SiteCustomization) => void;
  onResetCustomization: () => void;
  onOpenMediaLibrary: () => void;
}

// Preset color themes for quick 1-click styling
const COLOR_PRESETS = [
  {
    id: 'european-minimalist',
    name: 'النمط الأوروبي الراقي (بسيط، نقي واحترافي)',
    primaryNavy: '#18181B',
    primaryNavyDark: '#09090B',
    accentRed: '#B91C1C',
    accentRedHover: '#991B1B',
    accentGold: '#D97706',
    bgSurface: '#FAFAF9',
  },
  {
    id: 'original',
    name: 'كحلي ليل وأحمر اللهب (الأصلي)',
    primaryNavy: '#0B192C',
    primaryNavyDark: '#060D17',
    accentRed: '#E61C24',
    accentRedHover: '#cf151c',
    accentGold: '#F59E0B',
    bgSurface: '#F8FAFC',
  },
  {
    id: 'charcoal-fire',
    name: 'فحم الشواء واللهب الملكي',
    primaryNavy: '#111827',
    primaryNavyDark: '#030712',
    accentRed: '#EF4444',
    accentRedHover: '#DC2626',
    accentGold: '#EAB308',
    bgSurface: '#F3F4F6',
  },
  {
    id: 'midnight-gold',
    name: 'سماء منتصف الليل والذهب الفاخر',
    primaryNavy: '#0F172A',
    primaryNavyDark: '#020617',
    accentRed: '#F43F5E',
    accentRedHover: '#E11D48',
    accentGold: '#FBBF24',
    bgSurface: '#F8FAFC',
  },
  {
    id: 'oriental-emerald',
    name: 'زيتي كنعاني وأحمر الرمان',
    primaryNavy: '#064E3B',
    primaryNavyDark: '#022C22',
    accentRed: '#BE123C',
    accentRedHover: '#9F1239',
    accentGold: '#F59E0B',
    bgSurface: '#F0FDF4',
  },
];

// Presets for Hero Background Image
const HERO_BG_PRESETS = [
  {
    id: 'hero-spit-original',
    name: 'سيخ شاورما ليل الأصلي',
    url: HERO_IMAGE,
  },
  {
    id: 'hero-arabi-meal',
    name: 'وجبة عربي دجاج صاج وبطاطا',
    url: arabiMealImg,
  },
  {
    id: 'hero-family-box',
    name: 'بوكس ليل الملكي العائلي',
    url: familyBoxImg,
  },
  {
    id: 'hero-beef-platter',
    name: 'صحن شاورما عجل بلدي فاخر',
    url: beefPlatterImg,
  },
  {
    id: 'hero-chicken-wrap',
    name: 'ساندويش شاورما دجاج صاج مقرمشة',
    url: chickenWrapImg,
  },
];

export const SiteCustomizerModal: React.FC<SiteCustomizerModalProps> = ({
  isOpen,
  onClose,
  customization,
  onSaveCustomization,
  onResetCustomization,
  onOpenMediaLibrary,
}) => {
  const [pointsInput, setPointsInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<CustomerAccount | null>(null);
  const [customerMsg, setCustomerMsg] = useState('');
  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'colors' | 'branding' | 'hero' | 'bottomBar' | 'texts' | 'sections' | 'delivery' | 'loyalty' | 'payments'
  >('colors');

  // Working copy of customization state
  const [formState, setFormState] = useState<SiteCustomization>(customization);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [instantToast, setInstantToast] = useState<string | null>(null);

  // Media Library Sub-Modal target: 'logo' or 'hero'
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalTarget, setMediaModalTarget] = useState<'logo' | 'hero'>('logo');

  // Direct Logo Upload
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoPresets, setLogoPresets] = useState<MediaImage[]>([]);

  // Direct Hero Background Upload
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [heroCustomUrlInput, setHeroCustomUrlInput] = useState('');

  // Bottom Bar Preview toggle
  const [bottomBarPreviewState, setBottomBarPreviewState] = useState<'with_items' | 'empty'>('with_items');

  const showInstantNotice = (msg: string) => {
    setInstantToast(msg);
    setTimeout(() => setInstantToast(null), 3000);
  };

  // Synchronize when opened with current state
  // Only re-sync the draft when the customizer itself opens. Previously this also ran when the
  // media sub-modal closed, which overwrote the just-picked image with the old saved value.
  useEffect(() => {
    if (isOpen) {
      setFormState(customization);
      setSaveSuccess(false);
      setHeroCustomUrlInput(customization.branding.heroBackgroundImage || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Refresh the quick-pick presets whenever the library may have changed.
  useEffect(() => {
    if (isOpen) refreshMediaLibrary().then((lib) => setLogoPresets(lib.slice(0, 8)));
  }, [isOpen, isMediaModalOpen]);

  const handleDirectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingLogo(true);
    try {
      const file = files[0];
      let imageUrl = '';
      if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('فشل قراءة ملف SVG'));
          reader.readAsDataURL(file);
        });
      } else {
        const newMedia = await processImageFile(file);
        imageUrl = newMedia.url;
      }

      const nextCustomization: SiteCustomization = {
        ...formState,
        branding: {
          ...formState.branding,
          customLogoUrl: imageUrl,
          logoMode: 'image',
        },
      };

      setFormState(nextCustomization);
      onSaveCustomization(nextCustomization);
      showInstantNotice('تم حفظ وتطبيق الشعار فوراً ✓');
      setLogoPresets(getMediaLibrary().slice(0, 8));
    } catch (err: unknown) {
      showInstantNotice(err instanceof Error ? err.message : 'فشل رفع الشعار');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleDirectHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingHero(true);
    try {
      const file = files[0];
      const newMedia = await processImageFile(file);
      const nextCustomization: SiteCustomization = {
        ...formState,
        branding: {
          ...formState.branding,
          heroBackgroundImage: newMedia.url,
        },
      };
      setFormState(nextCustomization);
      setHeroCustomUrlInput(newMedia.url);
      onSaveCustomization(nextCustomization);
      showInstantNotice('تم حفظ وتطبيق صورة خلفية واجهة الدخول فوراً ✓');
    } catch (err: unknown) {
      showInstantNotice(err instanceof Error ? err.message : 'فشل رفع صورة الخلفية');
    } finally {
      setIsUploadingHero(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    }
  };

  const handleInstantSaveLogo = (updatedBranding?: Partial<typeof formState.branding>) => {
    const nextCustomization: SiteCustomization = {
      ...formState,
      branding: {
        ...formState.branding,
        ...(updatedBranding || {}),
      },
    };
    setFormState(nextCustomization);
    onSaveCustomization(nextCustomization);
    showInstantNotice('تم حفظ وتطبيق الشعار فوراً ✓');
  };

  const handleInstantSaveHero = (newUrl: string) => {
    const nextCustomization: SiteCustomization = {
      ...formState,
      branding: {
        ...formState.branding,
        heroBackgroundImage: newUrl,
      },
    };
    setFormState(nextCustomization);
    onSaveCustomization(nextCustomization);
    showInstantNotice('تم تطبيق وحفظ صورة خلفية الدخول فوراً ✓');
  };

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setFormState((prev) => ({
      ...prev,
      colors: {
        primaryNavy: preset.primaryNavy,
        primaryNavyDark: preset.primaryNavyDark,
        accentRed: preset.accentRed,
        accentRedHover: preset.accentRedHover,
        accentGold: preset.accentGold,
        bgSurface: preset.bgSurface,
      },
    }));
  };

  const handleSave = () => {
    onSaveCustomization(formState);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleResetToDefaults = () => {
    setFormState(DEFAULT_SITE_CUSTOMIZATION);
    onResetCustomization();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1200);
  };

  if (!isOpen) return null;

  const currentHeroBg = formState.branding.heroBackgroundImage?.trim() || HERO_IMAGE;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 transition-opacity animate-in fade-in duration-200">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div
            className="p-4 sm:p-5 text-white flex items-center justify-between border-b border-white/10 shrink-0 transition-colors"
            style={{ backgroundColor: formState.colors.primaryNavy }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                style={{ backgroundColor: formState.colors.accentRed }}
              >
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>لوحة التخصيص الكامل لهوية ومظهر موقع شاورما ليل</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h2>
                <p className="text-[11px] text-stone-300">
                  تعديل الألوان، الشعار، صورة خلفية الدخول، الشريط السفلي والنصوص مباشرة
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instant notification toast */}
          {instantToast && (
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{instantToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setInstantToast(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-2 bg-stone-100 border-b border-stone-200 shrink-0 overflow-x-auto text-xs font-semibold no-scrollbar">
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'colors'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Palette className="w-4 h-4 text-red-600" />
              <span>الألوان والمظهر</span>
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'branding'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <span>الشعار والهوية</span>
            </button>

            {/* TAB: HERO BACKGROUND IMAGE */}
            <button
              onClick={() => setActiveTab('hero')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'hero'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>خلفية الدخول (Hero)</span>
            </button>

            {/* TAB: BOTTOM BAR */}
            <button
              onClick={() => setActiveTab('bottomBar')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'bottomBar'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-purple-600" />
              <span>الشريط السفلي</span>
            </button>

            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'delivery'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Truck className="w-4 h-4 text-sky-600" />
              <span>التوصيل والحد الأدنى</span>
            </button>

            <button
              onClick={() => setActiveTab('loyalty')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'loyalty'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span>نقاط الولاء</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'payments'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <CreditCard className="w-4 h-4 text-red-600" />
              <span>الدفع</span>
            </button>

            <button
              onClick={() => setActiveTab('texts')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'texts'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Type className="w-4 h-4 text-amber-600" />
              <span>نصوص الموقع</span>
            </button>

            <button
              onClick={() => setActiveTab('sections')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'sections'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Layout className="w-4 h-4 text-emerald-500" />
              <span>الأقسام (إظهار/إخفاء)</span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
            {/* TAB 1: COLORS */}
            {activeTab === 'colors' && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <span className="font-bold text-stone-800 text-sm block">
                    نماذج ألوان جاهزة مستوحاة من الهوية (بنقرة واحدة):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = formState.colors.primaryNavy === preset.primaryNavy;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500 shadow-xs'
                              : 'border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex -space-x-1.5 rtl:space-x-reverse">
                              <span
                                className="w-5 h-5 rounded-full border border-white shadow-xs inline-block"
                                style={{ backgroundColor: preset.primaryNavy }}
                              />
                              <span
                                className="w-5 h-5 rounded-full border border-white shadow-xs inline-block"
                                style={{ backgroundColor: preset.accentRed }}
                              />
                              <span
                                className="w-5 h-5 rounded-full border border-white shadow-xs inline-block"
                                style={{ backgroundColor: preset.accentGold }}
                              />
                            </div>
                            <span className="font-bold text-stone-900">{preset.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-red-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-4">
                  <span className="font-bold text-stone-800 text-sm block">
                    أو تخصيص درجات الألوان يدوياً:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <label className="font-bold text-stone-800 block">اللون الداكن الرئيسي:</label>
                        <span className="text-[11px] text-stone-500">الهيدر، الفوتر والأزرار الرئيسية</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formState.colors.primaryNavy}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              colors: { ...prev.colors, primaryNavy: e.target.value },
                            }))
                          }
                          className="w-9 h-9 rounded-xl cursor-pointer border border-stone-300"
                        />
                        <input
                          type="text"
                          value={formState.colors.primaryNavy}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              colors: { ...prev.colors, primaryNavy: e.target.value },
                            }))
                          }
                          className="w-20 px-2 py-1 text-center font-mono text-[11px] bg-white border border-stone-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <label className="font-bold text-stone-800 block">لون لهب الشاورما (الأحمر):</label>
                        <span className="text-[11px] text-stone-500">أزرار الطلب، الشارات والتنبيهات</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formState.colors.accentRed}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              colors: { ...prev.colors, accentRed: e.target.value },
                            }))
                          }
                          className="w-9 h-9 rounded-xl cursor-pointer border border-stone-300"
                        />
                        <input
                          type="text"
                          value={formState.colors.accentRed}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              colors: { ...prev.colors, accentRed: e.target.value },
                            }))
                          }
                          className="w-20 px-2 py-1 text-center font-mono text-[11px] bg-white border border-stone-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BRANDING & LOGO */}
            {activeTab === 'branding' && (
              <div className="space-y-5">
                <div className="p-4 bg-stone-900 text-white rounded-2xl border border-stone-700 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-xs text-stone-200">معاينة الشعار الحية:</span>
                    <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-md text-amber-300">
                      {formState.branding.logoMode === 'image' && formState.branding.customLogoUrl
                        ? 'صورة مخصصة 🖼️'
                        : 'شعار متجهي أصلي ✒️'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      className="p-3 rounded-xl border border-white/10 flex items-center justify-center min-h-[70px]"
                      style={{ backgroundColor: formState.colors.primaryNavy }}
                    >
                      <div className="bg-white/95 p-2 rounded-xl shadow-md">
                        <Logo
                          size="md"
                          showSubtitle={false}
                          logoMode={formState.branding.logoMode}
                          customImageUrl={formState.branding.customLogoUrl}
                          customNavyColor={formState.colors.primaryNavy}
                          customRedColor={formState.colors.accentRed}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center min-h-[70px]">
                      <div className="bg-white p-2 rounded-xl shadow-xs border border-stone-200">
                        <Logo
                          size="md"
                          showSubtitle={true}
                          logoMode={formState.branding.logoMode}
                          customImageUrl={formState.branding.customLogoUrl}
                          customNavyColor={formState.colors.primaryNavy}
                          customRedColor={formState.colors.accentRed}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload & Presets for Logo */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <label className="font-bold text-stone-800 block text-xs">تغيير الشعار أو رفع صورة مخصصة:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*,.svg"
                        onChange={handleDirectLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="w-full bg-[#0B192C] hover:bg-[#152e4e] text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>{isUploadingLogo ? 'جاري الرفع...' : 'رفع شعار من جهازي 📤'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaModalTarget('logo');
                        setIsMediaModalOpen(true);
                      }}
                      className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-stone-600" />
                      <span>اختيار من مكتبة الوسائط 📁</span>
                    </button>
                  </div>
                </div>

                {/* Restaurant Info Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-stone-800 block mb-1">اسم المطعم بالعربية:</label>
                    <input
                      type="text"
                      value={formState.branding.restaurantName}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          branding: { ...prev.branding, restaurantName: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-800 block mb-1">اسم المطعم بالإنجليزية:</label>
                    <input
                      type="text"
                      value={formState.branding.restaurantNameEn}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          branding: { ...prev.branding, restaurantNameEn: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-stone-800 block mb-1">الشعار اللفظي / السلوجان:</label>
                    <input
                      type="text"
                      value={formState.branding.tagline}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          branding: { ...prev.branding, tagline: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Footer texts (نصوص أسفل الموقع) */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <span className="font-bold text-stone-900 block">نصوص أسفل الموقع (الفوتر):</span>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">نبذة عن المطعم:</label>
                    <textarea rows={2} value={formState.texts.footerAbout} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerAbout: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs resize-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عنوان عمود قائمة الطعام:</label>
                    <input type="text" value={formState.texts.footerMenuTitle} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerMenuTitle: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عنوان عمود ساعات العمل:</label>
                    <input type="text" value={formState.texts.footerHoursTitle} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerHoursTitle: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عنوان الدوام (مثل: يومياً بدون عطل):</label>
                    <input type="text" value={formState.texts.footerHoursLabel} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerHoursLabel: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">ساعات الدوام:</label>
                    <input type="text" value={formState.texts.footerHours} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerHours: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عنوان مناطق التوصيل:</label>
                    <input type="text" value={formState.texts.footerDeliveryTitle} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerDeliveryTitle: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">مناطق التوصيل:</label>
                    <input type="text" value={formState.texts.footerDeliveryAreas} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerDeliveryAreas: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عنوان عمود العنوان والاتصال:</label>
                    <input type="text" value={formState.texts.footerContactTitle} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerContactTitle: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">نص رابط الخريطة:</label>
                    <input type="text" value={formState.texts.footerMapsLinkText} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerMapsLinkText: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">المنطقة (السطر السفلي):</label>
                    <input type="text" value={formState.texts.footerRegion} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerRegion: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عبارة الحقوق:</label>
                    <input type="text" value={formState.texts.footerRights} onChange={(e) => setFormState((prev) => ({ ...prev, texts: { ...prev.texts, footerRights: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: HERO BACKGROUND IMAGE (خاصية تعديل صورة خلفية الدخول) */}
            {/* ======================================================== */}
            {activeTab === 'hero' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    تعديل صورة خلفية الموقع عند الدخول (Hero Banner Background):
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    هذه الصورة الكبيرة تظهر كخلفية سينمائية فخمة وراء العنوان الرئيسي عند فتح الموقع لأول مرة
                  </p>
                </div>

                {/* LIVE HERO BANNER PREVIEW CARD */}
                <div className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 text-white p-5 sm:p-7 min-h-[220px] flex flex-col justify-end shadow-xl group">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <img
                      src={currentHeroBg}
                      alt="معاينة خلفية الدخول"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center opacity-40 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-950/40" />
                  </div>

                  {/* Overlay Mock Content */}
                  <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-stone-300 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{formState.texts.heroBadge || 'تحضير طازج على أصول الشواء'}</span>
                    </div>

                    <h4 className="text-base sm:text-xl font-black text-white leading-tight">
                      {formState.texts.heroHeadline || 'شاورما ليل · الطعم الأصيل بلمسة عصرية راقية'}
                    </h4>

                    <p className="text-[11px] text-stone-300 line-clamp-2 max-w-lg">
                      {formState.texts.heroSubheadline}
                    </p>
                  </div>

                  <span className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-xs text-amber-300 text-[10px] px-2.5 py-1 rounded-lg border border-white/10 font-bold">
                    معاينة حية لخلفية الموقع الحالية 👁️
                  </span>
                </div>

                {/* Upload & Choose Controls */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  <span className="font-bold text-stone-900 block text-xs">
                    اختر صورة الخلفية أو ارفع صورة جديدة من جهازك:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <input
                        ref={heroFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleDirectHeroUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => heroFileInputRef.current?.click()}
                        disabled={isUploadingHero}
                        className="w-full bg-[#0B192C] hover:bg-[#152e4e] text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                      >
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>{isUploadingHero ? 'جاري رفع ومعالجة الصورة...' : 'رفع صورة خلفية من جهازي 📤'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaModalTarget('hero');
                        setIsMediaModalOpen(true);
                      }}
                      className="w-full bg-stone-200 hover:bg-stone-300 text-stone-800 p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-stone-600" />
                      <span>اختيار من مكتبة وسائط ليل 📁</span>
                    </button>
                  </div>

                  {/* Direct Image URL */}
                  <div>
                    <label className="block text-stone-700 font-bold text-[11px] mb-1">
                      أو أدخل رابط صورة مباشر (Image URL):
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          dir="ltr"
                          value={heroCustomUrlInput}
                          onChange={(e) => setHeroCustomUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/.../shawarma.jpg"
                          className="w-full pr-8 pl-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-red-600 text-left"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (heroCustomUrlInput.trim()) {
                            handleInstantSaveHero(heroCustomUrlInput.trim());
                          }
                        }}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
                      >
                        تطبيق الرابط
                      </button>
                    </div>
                  </div>

                  {/* Presets Gallery for Hero Background */}
                  <div>
                    <span className="block text-stone-700 text-[11px] font-bold mb-2">
                      نماذج صور خلفية فاخرة جاهزة للمطعم (بنقرة واحدة):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {HERO_BG_PRESETS.map((preset) => {
                        const isSelected = currentHeroBg === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleInstantSaveHero(preset.url)}
                            className={`p-1.5 rounded-xl border text-right transition-all flex flex-col items-center gap-1.5 ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500 shadow-xs'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-16 object-cover rounded-lg"
                            />
                            <span className="text-[10px] font-bold text-stone-800 text-center truncate w-full">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-bold text-amber-700 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> الخلفية المختارة
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset to Default Hero Button */}
                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">
                      هل تريد العودة لصورة السيخ الأصلية؟
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInstantSaveHero('')}
                      className="px-3 py-1.5 text-stone-600 hover:text-red-700 hover:bg-stone-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      استعادة الصورة الافتراضية
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: BOTTOM BAR (خاصية تعديل وتخصيص الشريط السفلي)      */}
            {/* ======================================================== */}
            {activeTab === 'bottomBar' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">
                    تخصيص الشريط السفلي العائم (Floating Bottom Bar):
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    التحكم في ظهور الشريط أسفل الشاشة، نصوصه، وطريقة عرضه على الجوال وأجهزة الزوار
                  </p>
                </div>

                {/* LIVE BOTTOM BAR PREVIEW BOX */}
                <div className="p-4 bg-stone-900 text-white rounded-2xl border border-stone-800 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-xs text-stone-200">معاينة تفاعلية للشريط السفلي:</span>
                    <div className="flex items-center gap-1.5 bg-stone-800 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setBottomBarPreviewState('with_items')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors ${
                          bottomBarPreviewState === 'with_items'
                            ? 'bg-red-600 text-white'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        مع وجود طلب
                      </button>
                      <button
                        type="button"
                        onClick={() => setBottomBarPreviewState('empty')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors ${
                          bottomBarPreviewState === 'empty'
                            ? 'bg-stone-700 text-white'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        السلة فارغة
                      </button>
                    </div>
                  </div>

                  {/* Render Mock Preview of Bottom Bar */}
                  <div className="p-3 bg-stone-950/80 rounded-xl border border-white/5 flex items-center justify-center">
                    {bottomBarPreviewState === 'with_items' ? (
                      <div className="w-full max-w-md bg-stone-900 text-white p-3 rounded-2xl border border-stone-800 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-stone-200" />
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                              2
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-stone-300 block">
                              {formState.bottomBar?.text || 'طلبك الحالي'} (2 أصناف)
                            </span>
                            <span className="text-sm font-bold text-white font-mono">35 ₪</span>
                          </div>
                        </div>
                        <div className="bg-white text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                          {formState.bottomBar?.buttonText || 'إتمام الطلب'}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-md bg-stone-900 text-white p-2.5 rounded-2xl border border-stone-800 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-semibold text-stone-200 truncate">
                            {formState.bottomBar?.emptyText || 'شاورما ليل · أشهى سيخ شاورما يصلك ساخناً'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {formState.bottomBar?.showPhoneQuickAction !== false && (
                            <div className="p-1.5 rounded-lg bg-stone-800 text-stone-200">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {formState.bottomBar?.showWhatsappQuickAction !== false && (
                            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="bg-white text-stone-950 px-3 py-1.5 rounded-xl text-xs font-bold">
                            {formState.bottomBar?.emptyButtonText || 'تصفح المنيو واطلب'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Controls for Bottom Bar */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  {/* Enable / Disable Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <span className="font-bold text-stone-900 block text-xs">تفعيل الشريط السفلي في الموقع:</span>
                      <span className="text-[11px] text-stone-500">
                        إظهار شريط الوصول السريع للطلبات والسلة في أسفل شاشة الجوال والكمبيوتر
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          bottomBar: {
                            ...prev.bottomBar,
                            enabled: prev.bottomBar?.enabled === false ? true : false,
                          },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        formState.bottomBar?.enabled !== false
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-stone-300 text-stone-700'
                      }`}
                    >
                      {formState.bottomBar?.enabled !== false ? '✓ الشريط مفعّل' : '✕ معطّل'}
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div>
                    <label className="font-bold text-stone-800 block text-xs mb-1.5">
                      طريقة عرض الشريط السفلي:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              mode: 'cart_only',
                            },
                          }))
                        }
                        className={`p-3 rounded-xl border text-right transition-all ${
                          (formState.bottomBar?.mode || 'cart_only') === 'cart_only'
                            ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <span className="font-bold text-stone-900 block text-xs">
                          1. يظهر فقط عند إضافة أصناف للسلة (الوضع الافتراضي)
                        </span>
                        <span className="text-[11px] text-stone-500">
                          يختفي عندما تكون السلة فارغة، ويظهر فوراً كشريط طلب بمجرد إضافة أي وجبة
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              mode: 'always_visible',
                            },
                          }))
                        }
                        className={`p-3 rounded-xl border text-right transition-all ${
                          formState.bottomBar?.mode === 'always_visible'
                            ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <span className="font-bold text-stone-900 block text-xs">
                          2. شريط ثابت دائم (Always Visible Sticky Bar)
                        </span>
                        <span className="text-[11px] text-stone-500">
                          يبقى ظاهراً دائماً مع أزرار الاتصال والواتساب السريع وتصفح المنيو
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Texts Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        نص الشريط عند وجود طلب (مثال: طلبك الحالي):
                      </label>
                      <input
                        type="text"
                        value={formState.bottomBar?.text || 'طلبك الحالي'}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              text: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        نص زر السلة (مثال: إتمام الطلب):
                      </label>
                      <input
                        type="text"
                        value={formState.bottomBar?.buttonText || 'إتمام الطلب'}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              buttonText: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        نص الشريط عند خلو السلة (للشريط الدائم):
                      </label>
                      <input
                        type="text"
                        value={formState.bottomBar?.emptyText || 'شاورما ليل · أشهى سيخ شاورما يصلك ساخناً'}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              emptyText: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-800 block mb-1">
                        نص الزر عند خلو السلة (مثال: تصفح المنيو):
                      </label>
                      <input
                        type="text"
                        value={formState.bottomBar?.emptyButtonText || 'تصفح المنيو واطلب'}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              emptyButtonText: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Quick Action Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-stone-600" />
                        <span className="font-bold text-stone-800 text-xs">زر الاتصال الهاتفي السريع</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              showPhoneQuickAction:
                                prev.bottomBar?.showPhoneQuickAction === false ? true : false,
                            },
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          formState.bottomBar?.showPhoneQuickAction !== false
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-300 text-stone-700'
                        }`}
                      >
                        {formState.bottomBar?.showPhoneQuickAction !== false ? 'مفعّل' : 'معطّل'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-stone-800 text-xs">زر محادثة الواتساب المباشرة</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            bottomBar: {
                              ...prev.bottomBar,
                              showWhatsappQuickAction:
                                prev.bottomBar?.showWhatsappQuickAction === false ? true : false,
                            },
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          formState.bottomBar?.showWhatsappQuickAction !== false
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-300 text-stone-700'
                        }`}
                      >
                        {formState.bottomBar?.showWhatsappQuickAction !== false ? 'مفعّل' : 'معطّل'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TEXTS */}
            {activeTab === 'texts' && (
              <div className="space-y-4">
                <span className="font-bold text-stone-800 text-sm block">
                  تعديل نصوص ورسائل واجهات الموقع:
                </span>

                <div>
                  <label className="font-bold text-stone-800 block mb-1">شريط الإعلان العلوي (Header Notice):</label>
                  <input
                    type="text"
                    value={formState.texts.headerNotice}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        texts: { ...prev.texts, headerNotice: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <span className="font-bold text-stone-900 block">نصوص البانر الترحيبي (Hero Banner):</span>

                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">العنوان الرئيسي العريض:</label>
                    <input
                      type="text"
                      value={formState.texts.heroHeadline}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          texts: { ...prev.texts, heroHeadline: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">الوصف الفرعي للبانر:</label>
                    <textarea
                      rows={2}
                      value={formState.texts.heroSubheadline}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          texts: { ...prev.texts, heroSubheadline: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-stone-700 block mb-1 font-semibold">شارة البانر (Badge):</label>
                      <input
                        type="text"
                        value={formState.texts.heroBadge}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            texts: { ...prev.texts, heroBadge: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-stone-700 block mb-1 font-semibold">نص زر التصفح:</label>
                      <input
                        type="text"
                        value={formState.texts.heroButtonText}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            texts: { ...prev.texts, heroButtonText: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-stone-800 block mb-1">رقم الهاتف للطلبات:</label>
                    <input
                      type="text"
                      value={formState.texts.phone}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          texts: { ...prev.texts, phone: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-800 block mb-1">رقم الواتساب الدولي:</label>
                    <input
                      type="text"
                      value={formState.texts.whatsapp}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          texts: { ...prev.texts, whatsapp: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DELIVERY & MINIMUM ORDER */}
            {activeTab === 'delivery' && (
              <div className="space-y-5">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <span className="font-bold text-stone-900 block">الحد الأدنى للطلب:</span>
                  <label className="flex items-center gap-2 font-semibold text-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.ordering.minOrder === 0}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          ordering: { ...prev.ordering, minOrder: e.target.checked ? 0 : 20 },
                        }))
                      }
                      className="w-4 h-4 accent-red-600"
                    />
                    <span>طلب مفتوح (بدون حد أدنى)</span>
                  </label>
                  {formState.ordering.minOrder > 0 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={formState.ordering.minOrder}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            ordering: { ...prev.ordering, minOrder: Math.max(1, Number(e.target.value) || 1) },
                          }))
                        }
                        className="w-28 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                      />
                      <span className="font-semibold text-stone-700">₪ أقل قيمة للطلب</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 block">أسعار التوصيل حسب المنطقة:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          ordering: {
                            ...prev.ordering,
                            deliveryRegions: [
                              ...prev.ordering.deliveryRegions,
                              { id: `r${Date.now()}`, name: 'منطقة جديدة', fee: 10 },
                            ],
                          },
                        }))
                      }
                      className="px-3 py-1.5 bg-stone-900 text-white rounded-lg font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة منطقة</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500">اكتب 0 لجعل التوصيل مجانياً لمنطقة معينة. الاستلام من المطعم دائماً مجاني.</p>

                  <div className="space-y-2">
                    {formState.ordering.deliveryRegions.map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={r.name}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              ordering: {
                                ...prev.ordering,
                                deliveryRegions: prev.ordering.deliveryRegions.map((x) =>
                                  x.id === r.id ? { ...x, name: e.target.value } : x
                                ),
                              },
                            }))
                          }
                          className="flex-1 min-w-0 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold"
                        />
                        <input
                          type="number"
                          min={0}
                          value={r.fee}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              ordering: {
                                ...prev.ordering,
                                deliveryRegions: prev.ordering.deliveryRegions.map((x) =>
                                  x.id === r.id ? { ...x, fee: Math.max(0, Number(e.target.value) || 0) } : x
                                ),
                              },
                            }))
                          }
                          className="w-20 px-2 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono text-center"
                        />
                        <span className="text-stone-600 font-semibold">₪</span>
                        <button
                          type="button"
                          disabled={formState.ordering.deliveryRegions.length <= 1}
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              ordering: {
                                ...prev.ordering,
                                deliveryRegions: prev.ordering.deliveryRegions.filter((x) => x.id !== r.id),
                              },
                            }))
                          }
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="حذف المنطقة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">اضغط «حفظ» أسفل النافذة لتطبيق التغييرات على السلة وصفحة الدفع.</p>
              </div>
            )}

            {/* TAB: LOYALTY POINTS */}
            {activeTab === 'loyalty' && (
              <div className="space-y-5">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <span className="font-bold text-stone-900 block">حسابات الزبائن ونقاط الولاء:</span>
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input type="checkbox" checked={formState.loyalty.enabled} onChange={(e) => setFormState((prev) => ({ ...prev, loyalty: { ...prev.loyalty, enabled: e.target.checked } }))} className="w-4 h-4 accent-red-600" />
                    <span>تفعيل حسابات الزبائن ونقاط الولاء</span>
                  </label>
                  <p className="text-[11px] text-stone-600 bg-white border border-stone-200 rounded-xl p-2.5 leading-relaxed">
                    يدخل الزبون باسمه ورقم جواله ويختار PIN من 6 أرقام. تُحفظ النقاط على الخادم وتُربط بالطلبات عند استخدام رقم الجوال نفسه.
                  </p>
                  <p className="text-[11px] text-stone-500">عند إيقاف المفتاح تختفي كل عناصر النقاط وتسجيل الزبائن من الموقع.</p>
                  <div className={formState.loyalty.enabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>

                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">عدد النقاط لكل 1 ₪:</label>
                    <input type="number" min={0} step={0.1} value={formState.loyalty.pointsPerShekel} onChange={(e) => setFormState((prev) => ({ ...prev, loyalty: { ...prev.loyalty, pointsPerShekel: Math.max(0, Number(e.target.value) || 0) } }))} className="w-28 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono" />
                  </div>

                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">متى تُضاف النقاط للزبون؟</label>
                    <select value={formState.loyalty.awardOn} onChange={(e) => setFormState((prev) => ({ ...prev, loyalty: { ...prev.loyalty, awardOn: e.target.value as 'completed' | 'placed' } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold">
                      <option value="completed">بعد اكتمال الطلب فعلياً (موصى به)</option>
                      <option value="placed">فور إرسال الطلب</option>
                    </select>
                    <p className="text-[11px] text-stone-500 mt-1">عند «بعد اكتمال الطلب» تُضاف النقاط عندما تضغط «مكتمل» على الطلب من لوحة الطلبات، وتُلغى إن أُلغي الطلب.</p>
                  </div>

                  <label className="flex items-center gap-2 font-semibold text-stone-800 cursor-pointer">
                    <input type="checkbox" checked={formState.loyalty.includeDeliveryFee} onChange={(e) => setFormState((prev) => ({ ...prev, loyalty: { ...prev.loyalty, includeDeliveryFee: e.target.checked } }))} className="w-4 h-4 accent-red-600" />
                    <span>احتساب رسوم التوصيل ضمن النقاط</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                    <div>
                      <label className="text-stone-700 block mb-1 font-semibold">عدد النقاط المطلوبة للاستبدال:</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={formState.loyalty.redeemPoints}
                        onChange={(e) => setFormState((prev) => ({ ...prev, loyalty: { ...prev.loyalty, redeemPoints: Math.max(1, Math.round(Number(e.target.value) || 1)) } }))}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-stone-700 block mb-1 font-semibold">قيمة الخصم عند الاستبدال (₪):</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={formState.loyalty.redeemDiscount}
                        onChange={(e) => setFormState((prev) => ({ ...prev, loyalty: { ...prev.loyalty, redeemDiscount: Math.max(0, Number(e.target.value) || 0) } }))}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500">مثال: 50 نقطة = خصم 5 ₪ (يمكنك التحكم بالعدد والقيمة).</p>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <span className="font-bold text-stone-900 block">رصيد نقاط زبون (يُحفظ على الخادم):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="0593965358"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                    <button
                      type="button"
                      disabled={phoneInput.trim().length < 9}
                      onClick={async () => {
                        setCustomerMsg('');
                        setFoundCustomer(null);
                        try {
                          const c = await lookupCustomer(phoneInput);
                          if (c) setFoundCustomer(c);
                          else setCustomerMsg('لا يوجد زبون مسجّل بهذا الرقم بعد.');
                        } catch (e) {
                          setCustomerMsg(e instanceof Error ? e.message : 'تعذر البحث.');
                        }
                      }}
                      className="px-3 py-2 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-40"
                    >
                      بحث
                    </button>
                  </div>
                  {customerMsg && <p className="text-[11px] text-red-700">{customerMsg}</p>}
                  {foundCustomer && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-stone-600">
                        {foundCustomer.name || 'زبون'} · الرصيد الحالي: <b className="font-mono text-stone-900">{foundCustomer.points}</b> نقطة · المستوى: {foundCustomer.tier} · الطلبات المكتملة: {foundCustomer.ordersCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="الرصيد الجديد"
                          value={pointsInput}
                          onChange={(e) => setPointsInput(e.target.value)}
                          className="w-32 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                        />
                        <button
                          type="button"
                          disabled={pointsInput === ''}
                          onClick={async () => {
                            try {
                              const c = await setCustomerPoints(foundCustomer.phone, Math.max(0, Math.round(Number(pointsInput) || 0)));
                              setFoundCustomer(c);
                              setPointsInput('');
                              showInstantNotice('تم تحديث رصيد النقاط ✓');
                            } catch (e) {
                              setCustomerMsg(e instanceof Error ? e.message : 'تعذر التحديث.');
                            }
                          }}
                          className="px-3 py-2 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-40"
                        >
                          تحديث الرصيد
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">إعدادات النقاط تُطبَّق بعد الضغط على «حفظ». تعديل الرصيد يُطبَّق فوراً.</p>
              </div>
            )}

            {/* TAB: PAYMENTS */}
            {activeTab === 'payments' && (
              <div className="space-y-5">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <span className="font-bold text-stone-900 block">طرق الدفع الظاهرة للزبون:</span>
                  <label className="flex items-center gap-2 font-semibold text-stone-500">
                    <input type="checkbox" checked disabled className="w-4 h-4" />
                    <span>الدفع عند الاستلام (كاش) — مفعّل دائماً</span>
                  </label>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input type="checkbox" checked={formState.payments.cardEnabled} onChange={(e) => setFormState((prev) => ({ ...prev, payments: { ...prev.payments, cardEnabled: e.target.checked } }))} className="w-4 h-4 accent-red-600" />
                    <span>الدفع بالبطاقة (فيزا / ماستركارد)</span>
                  </label>
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    تنبيه: الدفع بالبطاقة هنا تجريبي ولا يسحب أي مبلغ فعلي. لا تفعّله للزبائن قبل ربط بوابة دفع حقيقية من البنك (تحتاج خادماً وبيانات الربط).
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <label className="flex items-center gap-2 font-bold text-stone-900 cursor-pointer">
                    <input type="checkbox" checked={formState.payments.walletEnabled} onChange={(e) => setFormState((prev) => ({ ...prev, payments: { ...prev.payments, walletEnabled: e.target.checked } }))} className="w-4 h-4 accent-red-600" />
                    <span>محفظة إلكترونية (دفع يدوي بالتحويل)</span>
                  </label>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">اسم الخيار الظاهر للزبون:</label>
                    <input type="text" value={formState.payments.walletLabel} onChange={(e) => setFormState((prev) => ({ ...prev, payments: { ...prev.payments, walletLabel: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="text-stone-700 block mb-1 font-semibold">التعليمات التي تظهر عند اختياره:</label>
                    <textarea rows={3} value={formState.payments.walletInstructions} onChange={(e) => setFormState((prev) => ({ ...prev, payments: { ...prev.payments, walletInstructions: e.target.value } }))} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs resize-none" />
                    <p className="text-[11px] text-stone-500 mt-1">يمكنك كتابة رقم محفظتك وطريقة إرسال الإيصال. يُسجَّل الطلب ويؤكده فريقك يدوياً بعد وصول المبلغ.</p>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">اضغط «حفظ» لتطبيق التغييرات.</p>
              </div>
            )}

            {/* TAB 6: SECTIONS VISIBILITY */}
            {activeTab === 'sections' && (
              <div className="space-y-4">
                <span className="font-bold text-stone-800 text-sm block">
                  التحكم في إظهار أو إخفاء أقسام الموقع:
                </span>

                <div className="bg-stone-50 rounded-2xl border border-stone-200 divide-y divide-stone-200">
                  {/* Hero Banner Toggle */}
                  <div className="p-3.5 flex items-center justify-between hover:bg-stone-100/60 transition-colors">
                    <div>
                      <span className="font-bold text-stone-900 block">البانر الترحيبي العريض (Hero Banner)</span>
                      <span className="text-[11px] text-stone-500">
                        الواجهة الافتتاحية الكبيرة مع صورة الشواء والعنوان الرئيسي
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          sectionsVisibility: {
                            ...prev.sectionsVisibility,
                            showHeroBanner: !prev.sectionsVisibility.showHeroBanner,
                          },
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                        formState.sectionsVisibility.showHeroBanner ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                          formState.sectionsVisibility.showHeroBanner ? 'translate-x-0' : '-translate-x-6'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Flash Offers Toggle */}
                  <div className="p-3.5 flex items-center justify-between hover:bg-stone-100/60 transition-colors">
                    <div>
                      <span className="font-bold text-stone-900 block">قسم العروض المؤقتة (Flash Offers)</span>
                      <span className="text-[11px] text-stone-500">
                        صناديق الخصم الخاصة مع العد التنازلي ونسب التوفير
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          sectionsVisibility: {
                            ...prev.sectionsVisibility,
                            showFlashOffers: !prev.sectionsVisibility.showFlashOffers,
                          },
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                        formState.sectionsVisibility.showFlashOffers ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                          formState.sectionsVisibility.showFlashOffers ? 'translate-x-0' : '-translate-x-6'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Floating Cart Toggle */}
                  <div className="p-3.5 flex items-center justify-between hover:bg-stone-100/60 transition-colors">
                    <div>
                      <span className="font-bold text-stone-900 block">الشريط السفلي العائم (Floating Bottom Bar)</span>
                      <span className="text-[11px] text-stone-500">
                        شريط أسفل الشاشة لإظهار الطلب وإتمام الشراء
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          sectionsVisibility: {
                            ...prev.sectionsVisibility,
                            showFloatingCart: !prev.sectionsVisibility.showFloatingCart,
                          },
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                        formState.sectionsVisibility.showFloatingCart ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                          formState.sectionsVisibility.showFloatingCart ? 'translate-x-0' : '-translate-x-6'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Save, Reset, & Close */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-stone-600 hover:text-red-700 hover:bg-stone-200 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة ضبط المصنع</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-700 hover:bg-stone-200 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>تم حفظ التخصيصات بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ وتطبيق التغييرات فوراً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Sub-Modal */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        selectedImageUrl={
          mediaModalTarget === 'logo'
            ? formState.branding.customLogoUrl
            : currentHeroBg
        }
        onSelectImage={(url) => {
          // Apply AND persist immediately (same behaviour as a direct upload).
          if (mediaModalTarget === 'logo') {
            handleInstantSaveLogo({ customLogoUrl: url, logoMode: 'image' });
          } else {
            handleInstantSaveHero(url);
            setHeroCustomUrlInput(url);
          }
          setIsMediaModalOpen(false);
        }}
      />
    </>
  );
};
