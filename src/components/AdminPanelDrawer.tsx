import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UsersPanel } from './UsersPanel';
import type { AuthUser } from '../utils/auth';
import { listCustomers, setCustomerPoints } from '../utils/serverData';
import type { CustomerAccount } from '../utils/customerAuth';
import {
  X,
  Plus,
  Star,
  Edit,
  Trash2,
  LogOut,
  ShieldCheck,
  RotateCcw,
  Eye,
  EyeOff,
  MessageSquare,
  Package,
  Volume2,
  VolumeX,
  Bell,
  Image as ImageIcon,
  FolderOpen,
  ClipboardList,
  Clock,
  Sparkles,
  Zap,
  Palette,
  Check,
  Percent,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  ChefHat,
  Filter,
  RefreshCw,
  ShoppingBag,
  MessageCircle,
  Send,
  Copy,
  ExternalLink,
  Upload,
  Smartphone,
  Type,
  Sliders,
  Layout,
  Save,
  Phone,
  Users,
  Award,
} from 'lucide-react';
import { MenuItem, Review, Category, PlacedOrder, FlashOffer, OrderStatus, SiteCustomization } from '../types';
import { orderAlertManager } from '../utils/audio';
import { DEFAULT_SITE_CUSTOMIZATION } from '../utils/storage';
import { processImageFile } from '../utils/mediaLibrary';
import { HERO_IMAGE, RESTAURANT_INFO } from '../data/menuData';
import { Logo } from './Logo';
import { MediaLibraryModal } from './MediaLibraryModal';
import arabiMealImg from '../assets/images/shawarma_arabi_meal_1791041625052.jpg';
import familyBoxImg from '../assets/images/leil_family_box_1791041634511.jpg';
import beefPlatterImg from '../assets/images/shawarma_beef_platter_1791041615785.jpg';
import chickenWrapImg from '../assets/images/shawarma_chicken_wrap_1791041603153.jpg';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';

const HERO_BACKGROUND_PRESETS = [
  {
    id: 'hero-default',
    name: 'شاورما ليل الأصلية والأسياخ الذهبية',
    url: HERO_IMAGE,
  },
  {
    id: 'hero-arabi-meal',
    name: 'وجبة عربي محمرة مع البطاطا والثومية',
    url: arabiMealImg,
  },
  {
    id: 'hero-family-box',
    name: 'بوكس ليل العائلي الملكي المشكل',
    url: familyBoxImg,
  },
  {
    id: 'hero-beef-platter',
    name: 'صحن شاورما عجل بلدي طازج',
    url: beefPlatterImg,
  },
  {
    id: 'hero-chicken-wrap',
    name: 'ساندويش شاورما دجاج صاج مقرمشة',
    url: chickenWrapImg,
  },
];

interface AdminPanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  reviews: Review[];
  categories: Category[];
  flashOffers: FlashOffer[];
  onUpdateFlashOffers: (offers: FlashOffer[]) => void;
  onOpenSiteCustomizer: () => void;
  onAddNewItem: () => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleAvailability: (itemId: string) => void;
  onDeleteReview: (reviewId: string) => void;
  onEditReview: (reviewId: string, rating: number, comment: string) => void;
  onResetDefaultMenu: () => void;
  onLogout: () => void;
  onOpenMediaLibrary: () => void;
  orders: PlacedOrder[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onSeedSampleOrders?: () => void;
  nowTimestamp?: number;
  customization?: SiteCustomization;
  onSaveCustomization?: (newCustomization: SiteCustomization) => void;
  currentUser?: AuthUser | null;
  initialTab?: 'items' | 'offers' | 'reviews' | 'orders' | 'analytics' | 'customization' | 'users' | 'customers';
}

export const AdminPanelDrawer: React.FC<AdminPanelDrawerProps> = ({
  isOpen,
  onClose,
  menuItems,
  reviews,
  categories,
  flashOffers,
  onUpdateFlashOffers,
  onOpenSiteCustomizer,
  onAddNewItem,
  onEditItem,
  onDeleteItem,
  onToggleAvailability,
  onDeleteReview,
  onEditReview,
  onResetDefaultMenu,
  onLogout,
  onOpenMediaLibrary,
  orders,
  onUpdateOrderStatus,
  onSeedSampleOrders,
  nowTimestamp,
  customization,
  onSaveCustomization,
  currentUser,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'offers' | 'reviews' | 'orders' | 'analytics' | 'customization' | 'users' | 'customers'>(initialTab ?? 'items');
  const [orderFilter, setOrderFilter] = useState<'all' | 'delayed' | 'active' | 'completed'>('all');
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerPointsDraft, setCustomerPointsDraft] = useState<Record<string, string>>({});
  const [customerMsg, setCustomerMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'customers') return;
    let cancelled = false;
    setCustomersLoading(true);
    setCustomerMsg(null);
    listCustomers()
      .then((rows) => {
        if (!cancelled) {
          setCustomers(rows);
          setCustomerPointsDraft(Object.fromEntries(rows.map((r) => [r.phone, String(r.points)])));
        }
      })
      .catch((e) => {
        if (!cancelled) setCustomerMsg({ ok: false, text: e instanceof Error ? e.message : 'تعذر تحميل الزبائن.' });
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>('');
  const [soundActive, setSoundActive] = useState<boolean>(() => orderAlertManager.isSoundEnabled());
  const [testChimePlaying, setTestChimePlaying] = useState<boolean>(false);

  // Site Customization form state inside Admin Drawer
  const [customForm, setCustomForm] = useState<SiteCustomization>(() => customization || DEFAULT_SITE_CUSTOMIZATION);
  const [customSaveSuccess, setCustomSaveSuccess] = useState(false);
  const [customToast, setCustomToast] = useState<string | null>(null);
  const [adminMediaModalOpen, setAdminMediaModalOpen] = useState(false);
  const [adminMediaTarget, setAdminMediaTarget] = useState<'logo' | 'hero'>('logo');
  const [isUploadingAdminLogo, setIsUploadingAdminLogo] = useState(false);
  const [isUploadingAdminHero, setIsUploadingAdminHero] = useState(false);
  const adminLogoFileRef = useRef<HTMLInputElement>(null);
  const adminHeroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customization) {
      setCustomForm(customization);
    }
  }, [customization]);

  const showCustomNotice = (msg: string) => {
    setCustomToast(msg);
    setTimeout(() => setCustomToast(null), 3000);
  };

  const handleSaveCustomizationFromAdmin = () => {
    if (onSaveCustomization) {
      onSaveCustomization(customForm);
    }
    setCustomSaveSuccess(true);
    showCustomNotice('تم حفظ وتطبيق التعديلات بنجاح على واجهة وخلفية ونصوص الموقع! 🎨');
    setTimeout(() => setCustomSaveSuccess(false), 2500);
  };

  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingAdminLogo(true);
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
      const updated: SiteCustomization = {
        ...customForm,
        branding: {
          ...customForm.branding,
          customLogoUrl: imageUrl,
          logoMode: 'image',
        },
      };
      setCustomForm(updated);
      if (onSaveCustomization) {
        onSaveCustomization(updated);
      }
      showCustomNotice('تم تغيير وتطبيق الشعار فوراً بنجاح! ✓');
    } catch (err: unknown) {
      showCustomNotice(err instanceof Error ? err.message : 'فشل رفع الشعار');
    } finally {
      setIsUploadingAdminLogo(false);
      if (adminLogoFileRef.current) adminLogoFileRef.current.value = '';
    }
  };

  const handleAdminHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingAdminHero(true);
    try {
      const file = files[0];
      const newMedia = await processImageFile(file);
      const updated: SiteCustomization = {
        ...customForm,
        branding: {
          ...customForm.branding,
          heroBackgroundImage: newMedia.url,
        },
      };
      setCustomForm(updated);
      if (onSaveCustomization) {
        onSaveCustomization(updated);
      }
      showCustomNotice('تم تغيير وتطبيق صورة خلفية الدخول فوراً! ✓');
    } catch (err: unknown) {
      showCustomNotice(err instanceof Error ? err.message : 'فشل رفع صورة الخلفية');
    } finally {
      setIsUploadingAdminHero(false);
      if (adminHeroFileRef.current) adminHeroFileRef.current.value = '';
    }
  };

  const handleResetToVectorLogo = () => {
    const updated: SiteCustomization = {
      ...customForm,
      branding: {
        ...customForm.branding,
        customLogoUrl: '',
        logoMode: 'vector',
      },
    };
    setCustomForm(updated);
    if (onSaveCustomization) {
      onSaveCustomization(updated);
    }
    showCustomNotice('تمت استعادة الشعار المتجهي الأصلي (SVG) بنجاح ✓');
  };

  // New Flash Offer form state
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [offerMealId, setOfferMealId] = useState(menuItems[0]?.id || '');
  const [offerDiscountedPrice, setOfferDiscountedPrice] = useState<number>(0);
  const [offerSavings, setOfferSavings] = useState<number>(0);
  const [offerDiscountPct, setOfferDiscountPct] = useState<number>(0);

  const initOfferPricingForMeal = (mealId: string) => {
    const m = menuItems.find((item) => item.id === mealId) || menuItems[0];
    if (!m) return;
    setOfferDiscountedPrice(m.price);
    setOfferSavings(0);
    setOfferDiscountPct(0);
  };
  const [offerBadge, setOfferBadge] = useState('عرض البرق ⚡');
  const [offerHours, setOfferHours] = useState<number>(6);
  const [offerCustomTitle, setOfferCustomTitle] = useState('');

  // WhatsApp Customer Status Update Modal State
  const [whatsappOrder, setWhatsappOrder] = useState<PlacedOrder | null>(null);
  const [whatsappStatusType, setWhatsappStatusType] = useState<OrderStatus | 'on_the_way'>('pending');
  const [whatsappMessageText, setWhatsappMessageText] = useState<string>('');
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);
  const [autoUpdateOrderStatusOnWhatsapp, setAutoUpdateOrderStatusOnWhatsapp] = useState<boolean>(true);

  // Admin Items filter by category and subcategory
  const [adminItemCatFilter, setAdminItemCatFilter] = useState<string>('all');
  const [adminItemSubFilter, setAdminItemSubFilter] = useState<string>('all');

  const generateWhatsappTemplate = (order: PlacedOrder, statusType: OrderStatus | 'on_the_way') => {
    const customerName = order.customer.fullName || 'عزيزنا العميل';
    const orderId = order.orderId;
    const total = order.total;
    const typeLabel = order.customer.orderType === 'delivery' 
      ? `توصيل إلى (${order.customer.neighborhood || 'العنوان المذكور'})` 
      : 'استلام مباشر من المطعم';
    const itemsSummary = order.items.map((i) => `${i.menuItem.name} (${i.quantity}x)`).join('، ');

    switch (statusType) {
      case 'pending':
        return `مرحباً ${customerName} 🌯\nتم استلام طلبك رقم #${orderId} في مطعم شاورما ليل بنجاح!\n\n📋 تفاصيل طلبك:\n• الوجبات: ${itemsSummary}\n• طريقة الاستلام: ${typeLabel}\n• الإجمالي المطلوب: ${total} ₪\n\nجاري مراجعة الطلب والبدء بإعداده فوراً. شكراً لثقتك بنا! ❤️`;
      case 'preparing':
        return `أهلاً بك ${customerName} 👨‍🍳🔥\nطلبك رقم #${orderId} قيد التحضير الآن في مطبخ شاورما ليل بكل حب وإتقان!\n\n• الوجبات: ${itemsSummary}\n• الوقت المقدر للجهوزية: ${order.estimatedTime || '20 - 30 دقيقة'}\n\nسنخبرك فور الانتهاء من تجهيز طلبك ساخناً وطازجاً 🌯✨`;
      case 'on_the_way':
        return `مرحباً ${customerName} 🛵💨\nسائق توصيل شاورما ليل استلم طلبك رقم #${orderId} وهو في طريقه إليك الآن!\n\n• العنوان: ${order.customer.neighborhood} - ${order.customer.address}\n• المبلغ المطلوب للدفع: ${total} ₪\n\nيرجى إبقاء هاتفك قريباً لاستلام الوجبة شهية وساخنة. بالهناء والشفاء! 🔥`;
      case 'completed':
        return `ألف صحة وهنا يا ${customerName}! 🎉🌯\nتم تسليم طلبك رقم #${orderId} بالكامل وبنجاح.\n\nنتمنى أن تنال الوجبة إعجابكم، ويسعدنا دائماً استقبال تقييمك وملاحظاتك لخدمتكم بأفضل صورة.\nأهلاً وسهلاً بك دائماً في مطعم شاورما ليل ⭐✨`;
      case 'cancelled':
        return `نعتذر منك بشدة عزيزنا ${customerName} 🌹\nبخصوص طلبك رقم #${orderId}، نعتذر عن تعذر إكماله حالياً.\nلأي استفسار أو لترتيب طلب بديل يرجى مراسلتنا هنا مباشرة، ونتشرف بخدمتك دائماً.`;
      default:
        return `مرحباً ${customerName}، بخصوص طلبك رقم #${orderId} في شاورما ليل...`;
    }
  };

  const handleOpenWhatsappModal = (order: PlacedOrder, statusOverride?: OrderStatus | 'on_the_way') => {
    const initialStatus = statusOverride || (order.status === 'completed' ? 'completed' : order.status === 'preparing' ? 'preparing' : 'pending');
    setWhatsappOrder(order);
    setWhatsappStatusType(initialStatus);
    setWhatsappMessageText(generateWhatsappTemplate(order, initialStatus));
    setCopiedWhatsapp(false);
  };

  const handleSwitchWhatsappTemplate = (statusType: OrderStatus | 'on_the_way') => {
    if (!whatsappOrder) return;
    setWhatsappStatusType(statusType);
    setWhatsappMessageText(generateWhatsappTemplate(whatsappOrder, statusType));
  };

  const handleSendWhatsappMessage = () => {
    if (!whatsappOrder) return;
    
    // Auto update status in the system if requested
    if (autoUpdateOrderStatusOnWhatsapp) {
      if (whatsappStatusType === 'pending' || whatsappStatusType === 'preparing' || whatsappStatusType === 'completed' || whatsappStatusType === 'cancelled') {
        onUpdateOrderStatus(whatsappOrder.orderId, whatsappStatusType);
      } else if (whatsappStatusType === 'on_the_way') {
        onUpdateOrderStatus(whatsappOrder.orderId, 'preparing');
      }
    }

    // Normalize phone number for WhatsApp
    let rawPhone = whatsappOrder.customer.phoneNumber || '';
    let cleaned = rawPhone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
    if (cleaned.startsWith('0')) cleaned = '970' + cleaned.substring(1);
    else if (!cleaned.startsWith('970') && !cleaned.startsWith('972') && cleaned.length === 9) {
      cleaned = '970' + cleaned;
    }

    const waUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(whatsappMessageText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setWhatsappOrder(null);
  };

  const currentNow = nowTimestamp || Date.now();

  // Background order time tracking calculation
  const getOrderElapsedMinutes = (order: PlacedOrder) => {
    const ts = order.timestamp || (order.createdAtIso ? new Date(order.createdAtIso).getTime() : 0);
    if (!ts) return 0;
    return Math.max(0, Math.floor((currentNow - ts) / 60000));
  };

  const isOrderDelayed = (order: PlacedOrder) => {
    if (order.status === 'completed' || order.status === 'cancelled') return false;
    return getOrderElapsedMinutes(order) > 20;
  };

  const delayedOrders = useMemo(() => orders.filter(isOrderDelayed), [orders, currentNow]);
  const delayedCount = delayedOrders.length;
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'), [orders]);
  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'completed'), [orders]);

  const displayedOrders = useMemo(() => {
    if (orderFilter === 'delayed') return orders.filter(isOrderDelayed);
    if (orderFilter === 'active') return orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    if (orderFilter === 'completed') return orders.filter((o) => o.status === 'completed');
    return orders;
  }, [orders, orderFilter, currentNow]);

  // Analytics Metrics
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders]);

  const avgOrderValue = useMemo(() => {
    return orders.length > 0 ? Math.round((totalRevenue / orders.length) * 10) / 10 : 0;
  }, [orders, totalRevenue]);

  // Top Most Ordered Meals
  const topMealsData = useMemo(() => {
    const mealMap: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const name = item.menuItem?.name || 'وجبة';
        if (!mealMap[name]) {
          mealMap[name] = { name, count: 0, revenue: 0 };
        }
        mealMap[name].count += item.quantity || 1;
        mealMap[name].revenue += item.totalPrice || ((item.quantity || 1) * (item.options?.unitPrice || 0));
      });
    });
    return Object.values(mealMap).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [orders]);

  // Daily Sales Volume (7-day timeline)
  const dailySalesData = useMemo(() => {
    const daysMap: Record<string, { dateLabel: string; sales: number; ordersCount: number; timestamp: number }> = {};
    orders.forEach((order) => {
      const ts = order.timestamp || (order.createdAtIso ? new Date(order.createdAtIso).getTime() : Date.now());
      const dateObj = new Date(ts);
      const dayName = dateObj.toLocaleDateString('ar-PS', { weekday: 'short', month: 'numeric', day: 'numeric' });
      const key = dateObj.toISOString().split('T')[0];
      if (!daysMap[key]) {
        daysMap[key] = {
          dateLabel: dayName,
          sales: 0,
          ordersCount: 0,
          timestamp: dateObj.getTime(),
        };
      }
      daysMap[key].sales += order.total || 0;
      daysMap[key].ordersCount += 1;
    });
    const sorted = Object.values(daysMap).sort((a, b) => a.timestamp - b.timestamp);
    return sorted.slice(-7);
  }, [orders]);

  const overallAvg = useMemo(() => {
    return reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';
  }, [reviews]);

  if (!isOpen) return null;

  const handleStartReviewEdit = (r: Review) => {
    setEditingReviewId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment || '');
  };

  const handleSaveReviewEdit = (reviewId: string) => {
    onEditReview(reviewId, editRating, editComment);
    setEditingReviewId(null);
  };

  const handleTestAlert = () => {
    setTestChimePlaying(true);
    orderAlertManager.notifyNewOrder();
    setTimeout(() => setTestChimePlaying(false), 1200);
  };

  const handleToggleSound = () => {
    const nextState = !soundActive;
    setSoundActive(nextState);
    orderAlertManager.setSoundEnabled(nextState);
  };

  // --- Flash Offers Handlers ---
  const handleToggleOfferActive = (offerId: string) => {
    const updated = flashOffers.map((o) =>
      o.id === offerId ? { ...o, isActive: !o.isActive } : o
    );
    onUpdateFlashOffers(updated);
  };

  const handleUpdateOfferPricing = (offerId: string, field: 'discountedPrice' | 'savings', value: number) => {
    const updated = flashOffers.map((o) => {
      if (o.id !== offerId) return o;
      const orig = Math.max(0, o.originalPrice);
      let discounted = o.discountedPrice;
      let savings = o.savings ?? Math.max(0, orig - o.discountedPrice);
      if (field === 'discountedPrice') {
        discounted = Math.min(Math.max(0, value), orig);
        savings = Math.max(0, Math.round((orig - discounted) * 100) / 100);
      } else {
        savings = Math.min(Math.max(0, value), orig);
        discounted = Math.max(0, Math.round((orig - savings) * 100) / 100);
      }
      const pct = orig > 0 ? Math.round((savings / orig) * 100) : undefined;
      return { ...o, discountedPrice: discounted, savings, discountPercentage: pct };
    });
    onUpdateFlashOffers(updated);
  };

  const handleRenewOfferTimer = (offerId: string, hours: number) => {
    const updated = flashOffers.map((o) => {
      if (o.id === offerId) {
        const newEndsAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
        return { ...o, endsAt: newEndsAt, isActive: true };
      }
      return o;
    });
    onUpdateFlashOffers(updated);
  };

  const handleDeleteOffer = (offerId: string) => {
    const updated = flashOffers.filter((o) => o.id !== offerId);
    onUpdateFlashOffers(updated);
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const meal = menuItems.find((m) => m.id === offerMealId) || menuItems[0];
    if (!meal) return;

    const originalPrice = meal.price;
    let discountedPrice = Math.min(Math.max(0, Number(offerDiscountedPrice) || 0), originalPrice);
    let savings = Math.min(Math.max(0, Number(offerSavings) || 0), originalPrice);
    // if user set savings but not price (or vice versa), sync
    if (savings > 0 && discountedPrice === 0) discountedPrice = Math.max(0, originalPrice - savings);
    if (discountedPrice > 0 && savings === 0) savings = Math.max(0, originalPrice - discountedPrice);
    discountedPrice = Math.min(discountedPrice, originalPrice);
    savings = Math.max(0, Math.round((originalPrice - discountedPrice) * 100) / 100);
    const pct = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : undefined;

    const newOffer: FlashOffer = {
      id: `offer-${Date.now()}`,
      title: offerCustomTitle.trim() || `عرض: ${meal.name}`,
      badge: offerBadge.trim() || 'عرض خاص ⚡',
      description: meal.description,
      discountPercentage: pct,
      targetItemId: meal.id,
      originalPrice,
      discountedPrice,
      savings,
      endsAt: new Date(Date.now() + offerHours * 3600 * 1000).toISOString(),
      isActive: true,
      image: meal.image,
    };

    onUpdateFlashOffers([newOffer, ...flashOffers]);
    setIsAddingOffer(false);
    setOfferCustomTitle('');
    setOfferDiscountedPrice(0);
    setOfferSavings(0);
    setOfferDiscountPct(0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-[#0B192C] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base">لوحة تحكم شاورما ليل</h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    مدير المطعم
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  إدارة المنيو، التنبيهات الصوتية، ومكتبة الصور
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AUDIO & HAPTIC ORDER ALERT CONTROL BANNER (تنبيه صوتي واهتزاز فوري) */}
          <div className="p-3 bg-amber-500/10 border-b border-amber-300/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <span className="font-black text-amber-950 block">
                  نظام التنبيه الصوتي والاهتزاز اللحظي:
                </span>
                <span className="text-[11px] text-stone-600">
                  رنين جرس واهتزاز للهاتف عند كل طلب جديد
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleTestAlert}
                className="bg-white hover:bg-amber-100 border border-amber-400 text-amber-950 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                title="تشغيل صوت الرنين والاهتزاز للتجربة"
              >
                <Volume2 className={`w-3.5 h-3.5 text-amber-600 ${testChimePlaying ? 'animate-spin' : ''}`} />
                <span>{testChimePlaying ? 'رنين...' : 'تجربة التنبيه 🔔'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1.5 rounded-lg border transition-colors ${
                  soundActive
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-200 text-stone-600 border-stone-300'
                }`}
                title={soundActive ? 'التنبيه الصوتي مفعّل' : 'التنبيه الصوتي معطّل'}
              >
                {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* SITE CUSTOMIZER SHORTCUT BANNER */}
          <div className="p-3 bg-gradient-to-r from-[#0B192C] via-[#162E4E] to-[#1E3E62] text-white flex items-center justify-between gap-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-stone-900 shadow-xs font-black">
                <Palette className="w-4 h-4 text-stone-950" />
              </div>
              <div>
                <span className="font-black text-xs block text-white">تخصيص الهوية، الشعار، الألوان والنصوص</span>
                <span className="text-[10px] text-slate-300">تحكم كامل في مظهر وأقسام الموقع بالكامل</span>
              </div>
            </div>
            <button
              onClick={() => {
                onOpenSiteCustomizer();
                onClose();
              }}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-sm shrink-0 active:scale-95 transition-all"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>تخصيص الموقع</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50 p-3 text-center text-xs divide-x divide-x-reverse divide-stone-200">
            <div>
              <span className="text-stone-500 block text-[10px]">الوجبات</span>
              <span className="text-sm font-black text-stone-900 font-mono tabular-nums">
                {menuItems.length}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">عروض الفلاش</span>
              <span className="text-sm font-black text-red-600 font-mono tabular-nums">
                {flashOffers.filter((o) => o.isActive).length}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">الطلبات</span>
              <span className="text-sm font-black text-stone-900 font-mono tabular-nums">
                {orders.length}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">التقييم العام</span>
              <span className="text-sm font-black text-amber-600 font-mono tabular-nums flex items-center justify-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {overallAvg}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap border-b border-stone-200 bg-white p-2 gap-1 text-xs">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-all ${
                activeTab === 'items'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>الوجبات</span>
            </button>

            <button
              onClick={() => setActiveTab('offers')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-all ${
                activeTab === 'offers'
                  ? 'bg-[#E61C24] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>العروض ({flashOffers.filter((o) => o.isActive).length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-all ${
                activeTab === 'reviews'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>التقييمات</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'orders'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : delayedCount > 0
                  ? 'bg-red-50 text-red-700 border border-red-300'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>الطلبات ({orders.length})</span>
              {delayedCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse flex items-center gap-0.5 shadow-xs">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {delayedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>الإحصائيات</span>
            </button>

            {currentUser?.role === 'owner' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'users'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>المستخدمون</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'customers'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>الزبائن</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeTab === 'customers' ? 'bg-white/20' : 'bg-stone-200 text-stone-700'}`}>{customers.length}</span>
            </button>
          </div>

          {/* URGENT DELAYED ORDERS BANNER (>20 MINUTES) */}
          {delayedCount > 0 && (
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-3 flex items-center justify-between gap-3 text-xs shadow-md border-b border-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 animate-bounce" />
                <div>
                  <span className="font-black block text-xs">⚠️ تحذير: طلبات متأخرة تجاوزت 20 دقيقة!</span>
                  <span className="text-[11px] text-red-100 block">
                    يوجد {delayedCount} طلب معلق لم يتم تسليمه أو تحويله إلى مكتمل.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setOrderFilter('delayed');
                }}
                className="bg-white text-red-700 hover:bg-red-50 font-black px-2.5 py-1.5 rounded-xl text-[11px] shadow-sm shrink-0 transition-transform active:scale-95"
              >
                عرض المتأخرة ({delayedCount})
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {activeTab === 'users' && currentUser?.role === 'owner' && <UsersPanel currentUser={currentUser} />}

            {activeTab === 'customers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-600" /> الزبائن المسجلون ونقاط الولاء</h3>
                    <p className="text-[11px] text-stone-500">عرض الزبائن المسجلين، رصيد نقاط الولاء، والتحكم بعدد النقاط لكل زبون.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('customers'); }}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-[11px] font-bold flex items-center gap-1"
                    title="تحديث"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${customersLoading ? 'animate-spin' : ''}`} />
                    تحديث
                  </button>
                </div>

                {customerMsg && (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold ${customerMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {customerMsg.text}
                  </div>
                )}

                {customersLoading ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500">جاري تحميل الزبائن...</div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500 space-y-1">
                    <Users className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="font-bold">لا يوجد زبائن مسجلون بعد</p>
                    <p className="text-[11px]">سيظهر الزبائن هنا بعد تسجيلهم بحساباتهم.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customers.map((c) => {
                      const localPhone = c.phone.startsWith('970') ? '0' + c.phone.slice(3) : '+' + c.phone;
                      const draft = customerPointsDraft[c.phone] ?? String(c.points);
                      return (
                        <div key={c.phone} className="p-3 bg-white rounded-2xl border border-stone-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 truncate">{c.name || 'زبون'}</div>
                              <div className="text-[11px] text-stone-500 font-mono" dir="ltr">{localPhone}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">النقاط: {c.points}</span>
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-lg">المستوى: {c.tier}</span>
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-lg">الطلبات: {c.ordersCount}</span>
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-lg">الإنفاق: {Math.round(c.totalSpent)} ₪</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                            <label className="text-[11px] font-semibold text-stone-700 whitespace-nowrap">تعديل النقاط:</label>
                            <input
                              type="number"
                              min={0}
                              value={draft}
                              onChange={(e) => setCustomerPointsDraft((prev) => ({ ...prev, [c.phone]: e.target.value }))}
                              className="w-28 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const pts = Math.max(0, Math.round(Number(customerPointsDraft[c.phone] ?? c.points) || 0));
                                  const updated = await setCustomerPoints(c.phone, pts);
                                  setCustomers((prev) => prev.map((x) => x.phone === c.phone ? updated : x));
                                  setCustomerPointsDraft((prev) => ({ ...prev, [c.phone]: String(updated.points) }));
                                  setCustomerMsg({ ok: true, text: `تم تحديث نقاط ${updated.name || localPhone}.` });
                                } catch (e) {
                                  setCustomerMsg({ ok: false, text: e instanceof Error ? e.message : 'تعذر تحديث النقاط.' });
                                }
                              }}
                              className="px-3 py-1.5 bg-stone-900 text-white rounded-xl font-bold text-[11px]"
                            >
                              حفظ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-3">
                {/* Top Action buttons: Add Meal & Media Library */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onAddNewItem();
                      onClose();
                    }}
                    className="bg-[#E61C24] hover:bg-[#cf151c] text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة وجبة جديدة (+)</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenMediaLibrary();
                      onClose();
                    }}
                    className="bg-[#0B192C] hover:bg-[#152e4e] text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <ImageIcon className="w-4 h-4 text-red-400" />
                    <span>مكتبة الصور (رفع/تحميل) 📸</span>
                  </button>
                </div>

                {/* Category & Subcategory Filter Bar */}
                <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminItemCatFilter('all');
                        setAdminItemSubFilter('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                        adminItemCatFilter === 'all'
                          ? 'bg-[#0B192C] text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      كل الأقسام ({menuItems.length})
                    </button>
                    {categories.map((c) => {
                      const count = menuItems.filter((i) => i.categoryId === c.id).length;
                      const isSelected = adminItemCatFilter === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setAdminItemCatFilter(c.id);
                            setAdminItemSubFilter('all');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                            isSelected
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{c.icon}</span>
                          <span>{c.name} ({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-categories bar when category is selected */}
                  {adminItemCatFilter !== 'all' && (() => {
                    const currentCatObj = categories.find((c) => c.id === adminItemCatFilter);
                    const subs = currentCatObj?.subCategories || [];
                    if (subs.length === 0) return null;

                    return (
                      <div className="flex items-center gap-1 pt-1.5 border-t border-stone-200/80 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] text-stone-500 font-bold shrink-0">التصنيف الفرعي:</span>
                        <button
                          type="button"
                          onClick={() => setAdminItemSubFilter('all')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors ${
                            adminItemSubFilter === 'all'
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-stone-600 border border-stone-200'
                          }`}
                        >
                          الكل
                        </button>
                        {subs.map((s) => {
                          const isSubSelected = adminItemSubFilter === s;
                          const subCount = menuItems.filter(
                            (i) => i.categoryId === adminItemCatFilter && i.subCategory === s
                          ).length;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setAdminItemSubFilter(s)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors ${
                                isSubSelected
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-400'
                              }`}
                            >
                              {s} ({subCount})
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Items List */}
                <div className="space-y-2.5">
                  {menuItems
                    .filter((item) => {
                      if (adminItemCatFilter !== 'all' && item.categoryId !== adminItemCatFilter) return false;
                      if (adminItemSubFilter !== 'all' && item.subCategory !== adminItemSubFilter) return false;
                      return true;
                    })
                    .map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    const cat = categories.find((c) => c.id === item.categoryId);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 bg-white transition-all ${
                          isAvailable ? 'border-stone-200' : 'border-stone-200 bg-stone-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-stone-900 truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                              <span className="font-mono tabular-nums font-bold text-red-600">
                                {item.price} ₪
                              </span>
                              <span>·</span>
                              <span>{cat?.name || item.categoryId}</span>
                              {item.subCategory && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded text-[10px]">
                                  {item.subCategory}
                                </span>
                              )}
                              {!isAvailable && (
                                <span className="text-red-500 font-bold bg-red-50 px-1 rounded">
                                  غير متوفر
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onToggleAvailability(item.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                            }`}
                            title={isAvailable ? 'تعطيل الوجبة (نفدت)' : 'تفعيل الوجبة (متوفرة)'}
                          >
                            {isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              onEditItem(item);
                              onClose();
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            title="تعديل تفاصيل الوجبة وتصنيفها الفرعي واستبدال صورتها"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                            title="حذف الوجبة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'offers' && (
              <div className="space-y-4">
                {/* Header & Add Button */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">إدارة العروض الخاصة (Flash Offers)</h3>
                    <p className="text-[11px] text-stone-500">
                      تفعيل/إيقاف وتحديد نسب الخصم وربطها بوجبات القائمة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isAddingOffer;
                      setIsAddingOffer(next);
                      if (next) {
                        const m = menuItems.find((item) => item.id === offerMealId) || menuItems[0];
                        if (m) {
                          setOfferCustomTitle((t) => t || `عرض: ${m.name}`);
                          initOfferPricingForMeal(m.id);
                        }
                      }
                    }}
                    className="bg-[#E61C24] hover:bg-[#cf151c] text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingOffer ? 'إلغاء' : 'عرض جديد (+)'}</span>
                  </button>
                </div>

                {/* New Offer Form */}
                {isAddingOffer && (
                  <form
                    onSubmit={handleCreateOffer}
                    className="p-4 bg-red-50/50 rounded-2xl border border-red-200 space-y-3 animate-in fade-in duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-red-950 flex items-center gap-1">
                        <Zap className="w-4 h-4 text-red-600" />
                        إضافة عرض فلاش جديد
                      </span>
                      <span className="text-[10px] text-stone-500">ينشر فوراً أعلى المنيو</span>
                    </div>

                    <div>
                      <label className="text-stone-700 block mb-1 font-bold text-[11px]">اختر الوجبة المرتبطة بالعرض:</label>
                      <select
                        value={offerMealId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setOfferMealId(id);
                          const mm = menuItems.find((item) => item.id === id);
                          if (mm) {
                            setOfferCustomTitle(`عرض: ${mm.name}`);
                            initOfferPricingForMeal(id);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                      >
                        {menuItems.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} - (السعر الأصلي: {m.price} ₪)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-stone-700 block mb-1 font-bold text-[11px]">عنوان العرض المخصص (اختياري):</label>
                      <input
                        type="text"
                        placeholder="مثال: عرض البرق: وجبة عربي دجاج + بطاطا وثومية"
                        value={offerCustomTitle}
                        onChange={(e) => setOfferCustomTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-700 block mb-1 font-bold text-[11px]">شارة العرض:</label>
                        <input
                          type="text"
                          value={offerBadge}
                          onChange={(e) => setOfferBadge(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-stone-700 block mb-1 font-bold text-[11px]">مدة سريان العرض:</label>
                        <select
                          value={offerHours}
                          onChange={(e) => setOfferHours(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs"
                        >
                          <option value={3}>3 ساعات</option>
                          <option value={6}>6 ساعات</option>
                          <option value={12}>12 ساعة</option>
                          <option value={24}>24 ساعة (يوم كامل)</option>
                          <option value={48}>48 ساعة (نهاية الأسبوع)</option>
                        </select>
                      </div>
                    </div>

                    {/* التسعير اليدوي */}
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-3">
                      <div className="text-[11px] text-stone-600">
                        السعر الأصلي: <span className="font-mono font-bold text-stone-900">{(menuItems.find(m=>m.id===offerMealId)||menuItems[0])?.price ?? 0} ₪</span>
                        {(() => { const orig=(menuItems.find(m=>m.id===offerMealId)||menuItems[0])?.price ?? 0; const sv = Math.max(0, Number(offerSavings)|| (orig - (Number(offerDiscountedPrice)||0))); const pct = orig>0?Math.round((sv/orig)*100):0; return pct>0 ? <span className="mr-2 text-emerald-700 font-semibold">(نسبة تقديرية: {pct}% — اختيارية)</span> : null; })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-stone-700 block mb-1 font-bold text-[11px]">قيمة العرض (السعر بعد الخصم) ₪</label>
                          <input type="number" min={0} step="0.5" value={offerDiscountedPrice || ''}
                            onChange={(e) => { const orig = (menuItems.find(m=>m.id===offerMealId)||menuItems[0])?.price ?? 0; const v = Number(e.target.value) || 0; const d = Math.min(Math.max(0,v), orig); const sv = Math.max(0, Math.round((orig - d)*100)/100); setOfferDiscountedPrice(d); setOfferSavings(sv); setOfferDiscountPct(orig>0?Math.round((sv/orig)*100):0); }}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono" placeholder="مثال: 17" />
                        </div>
                        <div>
                          <label className="text-stone-700 block mb-1 font-bold text-[11px]">قيمة التوفير ₪</label>
                          <input type="number" min={0} step="0.5" value={offerSavings || ''}
                            onChange={(e) => { const orig = (menuItems.find(m=>m.id===offerMealId)||menuItems[0])?.price ?? 0; const v = Number(e.target.value) || 0; const sv = Math.min(Math.max(0,v), orig); const d = Math.max(0, Math.round((orig - sv)*100)/100); setOfferSavings(sv); setOfferDiscountedPrice(d); setOfferDiscountPct(orig>0?Math.round((sv/orig)*100):0); }}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono" placeholder="مثال: 3" />
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-500">أدخل قيمة العرض أو قيمة التوفير يدوياً (النسبة اختيارية وتُحسب تلقائياً).</p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#E61C24] hover:bg-[#cf151c] text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>نشر وتفعيل العرض فوراً</span>
                    </button>
                  </form>
                )}

                {/* Offers List */}
                <div className="space-y-3">
                  {flashOffers.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500">
                      <Zap className="w-8 h-8 mx-auto text-stone-300 mb-1" />
                      <p className="font-bold">لا توجد عروض فلاش مضافة</p>
                      <p className="text-[11px]">اضغط على زر «عرض جديد» لإضافة عروض خصم مؤقتة لزبائنك.</p>
                    </div>
                  ) : (
                    flashOffers.map((offer) => {
                      const meal = menuItems.find((m) => m.id === offer.targetItemId);
                      const displayImg = offer.image || meal?.image;

                      return (
                        <div
                          key={offer.id}
                          className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                            offer.isActive
                              ? 'bg-white border-stone-200 shadow-xs'
                              : 'bg-stone-50 border-stone-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {displayImg && (
                                <img
                                  src={displayImg}
                                  alt={offer.title}
                                  referrerPolicy="no-referrer"
                                  className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-stone-900 text-xs">
                                    {offer.title}
                                  </span>
                                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    {offer.badge}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                  <span className="font-black text-red-600 font-mono text-sm">
                                    {offer.discountedPrice} ₪
                                  </span>
                                  <span className="text-[11px] text-stone-400 line-through font-mono">
                                    {offer.originalPrice} ₪
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    وفر {offer.originalPrice - offer.discountedPrice} ₪
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Active Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleOfferActive(offer.id)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                offer.isActive
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-stone-200 text-stone-600'
                              }`}
                              title={offer.isActive ? 'العرض مفعل ويظهر للزبائن' : 'العرض متوقف'}
                            >
                              {offer.isActive ? 'مفعل' : 'متوقف'}
                            </button>
                          </div>

                          {/* Controls: Discount % quick adjustment */}
                          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-stone-500 font-bold">السعر/التوفير:</span>
                              <label className="flex items-center gap-1 text-[10px]">
                                <span className="text-stone-500">قيمة العرض</span>
                                <input type="number" min={0} step="0.5" value={offer.discountedPrice}
                                  onChange={(e)=>handleUpdateOfferPricing(offer.id,'discountedPrice', Number(e.target.value)||0)}
                                  className="w-20 px-2 py-1 border border-stone-200 rounded-lg font-mono text-[11px]" />
                                <span>₪</span>
                              </label>
                              <label className="flex items-center gap-1 text-[10px]">
                                <span className="text-stone-500">التوفير</span>
                                <input type="number" min={0} step="0.5" value={offer.savings ?? Math.max(0, offer.originalPrice - offer.discountedPrice)}
                                  onChange={(e)=>handleUpdateOfferPricing(offer.id,'savings', Number(e.target.value)||0)}
                                  className="w-20 px-2 py-1 border border-stone-200 rounded-lg font-mono text-[11px]" />
                                <span>₪</span>
                              </label>
                              {typeof offer.discountPercentage === 'number' && <span className="text-[10px] text-emerald-700 font-semibold">({offer.discountPercentage}%)</span>}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Renew timer */}
                              <button
                                type="button"
                                onClick={() => handleRenewOfferTimer(offer.id, 12)}
                                className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg text-[10px] font-bold"
                                title="تجديد مدة العرض لمدة 12 ساعة إضافية"
                              >
                                تجديد العداد (12س)
                              </button>

                              {/* Delete offer */}
                              <button
                                type="button"
                                onClick={() => handleDeleteOffer(offer.id)}
                                className="p-1 rounded-lg text-red-600 hover:bg-red-50"
                                title="حذف العرض"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-3">
                <p className="text-stone-500 text-[11px]">
                  يمكنك مراجعة جميع تقييمات الزبائن وتعديلها أو حذف أي تقييم مسيء أو غير دقيق:
                </p>

                {reviews.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500">
                    لا توجد تقييمات حالياً
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {reviews.map((rev) => {
                      const meal = menuItems.find((m) => m.id === rev.itemId);

                      return (
                        <div
                          key={rev.id}
                          className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5"
                        >
                          {editingReviewId === rev.id ? (
                            <div className="space-y-2 bg-white p-3 rounded-xl border border-amber-300">
                              <span className="font-bold text-amber-900 block">تعديل التقييم:</span>
                              <div className="flex items-center gap-1" dir="ltr">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setEditRating(s)}
                                    className="focus:outline-none"
                                  >
                                    <Star
                                      className={`w-5 h-5 ${
                                        editRating >= s
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'fill-stone-200 text-stone-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={2}
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                className="w-full text-xs p-2 border border-stone-200 rounded-lg"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingReviewId(null)}
                                  className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 rounded-lg"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveReviewEdit(rev.id)}
                                  className="px-3 py-1 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                >
                                  حفظ التعديل
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-900">{rev.userName}</span>
                                    <div className="flex items-center gap-0.5 text-amber-500" dir="ltr">
                                      {Array.from({ length: 5 }).map((_, idx) => (
                                        <Star
                                          key={idx}
                                          className={`w-3 h-3 ${
                                            idx < rev.rating
                                              ? 'fill-amber-400 text-amber-400'
                                              : 'fill-stone-200 text-stone-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-stone-500">
                                    على وجبة: <strong className="text-stone-800">{meal?.name || rev.itemId}</strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartReviewEdit(rev)}
                                    className="p-1 text-stone-400 hover:text-amber-600 transition-colors"
                                    title="تعديل هذا التقييم"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteReview(rev.id)}
                                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                                    title="حذف هذا التقييم"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {rev.comment && (
                                <p className="text-stone-700 text-xs leading-relaxed">
                                  {rev.comment}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ORDERS TAB WITH BACKGROUND TIME TRACKING & >20 MIN ALERTS */}
            {activeTab === 'orders' && (
              <div className="space-y-3.5">
                {/* Orders Header & Filter Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-stone-900 font-bold block text-xs">متابعة الطلبات المباشرة وحالتها:</span>
                      <span className="text-[10px] text-stone-500">
                        تتبع زمني آلي - تحذير تلقائي بعد مرور 20 دقيقة
                      </span>
                    </div>
                    {onSeedSampleOrders && (
                      <button
                        type="button"
                        onClick={onSeedSampleOrders}
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title="تحميل عينة طلبات للمعاينة"
                      >
                        <RefreshCw className="w-3 h-3 text-stone-500" />
                        <span>بيانات تجريبية</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setOrderFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                        orderFilter === 'all'
                          ? 'bg-[#0B192C] text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      الكل ({orders.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderFilter('delayed')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                        orderFilter === 'delayed'
                          ? 'bg-red-600 text-white shadow-xs'
                          : delayedCount > 0
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-300" />
                      <span>متأخرة &gt;20د ({delayedCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderFilter('active')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                        orderFilter === 'active'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      قيد العمل ({activeOrders.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderFilter('completed')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                        orderFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      المكتملة ({completedOrders.length})
                    </button>
                  </div>
                </div>

                {/* Orders Cards List */}
                {displayedOrders.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500 space-y-2 border border-stone-200">
                    <ClipboardList className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="font-bold">لا توجد طلبات في هذا التصنيف حالياً</p>
                    <p className="text-[11px] text-stone-400">
                      {orderFilter === 'delayed'
                        ? 'ممتاز! لا توجد أي طلبات متأخرة تجاوزت مدة 20 دقيقة 👏'
                        : 'عند تقديم أي طلب جديد، سيظهر هنا فوراً مع صوت التنبيه.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedOrders.map((order) => {
                      const elapsedMin = getOrderElapsedMinutes(order);
                      const isDelayed = isOrderDelayed(order);

                      return (
                        <div
                          key={order.orderId}
                          className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                            isDelayed
                              ? 'bg-red-50/80 border-2 border-red-500 shadow-md ring-2 ring-red-300 animate-in fade-in'
                              : order.status === 'completed'
                              ? 'bg-emerald-50/30 border-stone-200 opacity-90'
                              : order.status === 'preparing'
                              ? 'bg-blue-50/30 border-blue-200'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          {/* Delayed Warning Banner on card */}
                          {isDelayed && (
                            <div className="bg-red-600 text-white px-2.5 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-black shadow-xs">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
                                تحذير: مضى {elapsedMin} دقيقة على الطلب (تجاوز مهلة 20 دقيقة)!
                              </span>
                              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                                عاجل ⚠️
                              </span>
                            </div>
                          )}

                          {/* Card Top Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                                #{order.orderId}
                              </span>
                              <span className="text-[10px] text-stone-500 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {order.createdAt}
                              </span>
                            </div>

                            {/* Elapsed Time Badge */}
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 font-mono ${
                                  isDelayed
                                    ? 'bg-red-600 text-white shadow-2xs'
                                    : order.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                <Hourglass className="w-3 h-3" />
                                <span>{elapsedMin} دقيقة</span>
                              </span>
                            </div>
                          </div>

                          {/* Customer & Total Row */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <div>
                              <span className="font-bold text-stone-900 block">{order.customer.fullName}</span>
                              <span className="text-[11px] text-stone-500 font-mono" dir="ltr">
                                {order.customer.phoneNumber}
                              </span>
                            </div>
                            <div className="text-left font-mono tabular-nums">
                              <span className="font-black text-sm text-stone-900">{order.total} ₪</span>
                              <span className="block text-[10px] text-stone-500">
                                {order.customer.paymentMethod === 'cash'
                                  ? '💵 كاش'
                                  : order.customer.paymentMethod === 'jawwal_pay'
                                  ? '📱 Jawwal Pay'
                                  : '💳 بطاقة'}
                              </span>
                            </div>
                          </div>

                          {/* Order items summary */}
                          <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-200/80 flex items-center justify-between">
                            <span>
                              {order.customer.orderType === 'delivery'
                                ? `🛵 توصيل: ${order.customer.neighborhood}`
                                : '🏪 استلام من المطعم'}
                            </span>
                            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                              {order.items.length} أصناف (
                              {order.items.map((i) => `${i.menuItem.name} x${i.quantity}`).join('، ')}
                              )
                            </span>
                          </div>

                          {/* STATUS & ACTIONS BAR */}
                          <div className="pt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                            {/* Status Pill */}
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-stone-500">الحالة:</span>
                              <span
                                className={`font-black px-2 py-0.5 rounded-lg text-[10px] ${
                                  order.status === 'completed'
                                    ? 'bg-emerald-600 text-white'
                                    : order.status === 'preparing'
                                    ? 'bg-blue-600 text-white'
                                    : order.status === 'cancelled'
                                    ? 'bg-stone-300 text-stone-700'
                                    : 'bg-amber-500 text-stone-950'
                                }`}
                              >
                                {order.status === 'completed'
                                  ? '✓ مكتمل ومسلّم'
                                  : order.status === 'preparing'
                                  ? '👨‍🍳 قيد التحضير'
                                  : order.status === 'cancelled'
                                  ? '✕ ملغي'
                                  : '⏳ قيد الانتظار'}
                              </span>
                            </div>

                            {/* Status Change Buttons & WhatsApp Direct */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* WhatsApp Direct Action Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsappModal(order)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1"
                                title="إرسال تحديث لحالة الطلب عبر واتساب للزبون"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-current text-white" />
                                <span>واتساب للعميل</span>
                              </button>

                              {order.status !== 'preparing' && order.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateOrderStatus(order.orderId, 'preparing');
                                    handleOpenWhatsappModal(order, 'preparing');
                                  }}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                                  title="تحويل لقيد التحضير وإشعار الزبون عبر واتساب"
                                >
                                  <span>👨‍🍳 تحضير</span>
                                </button>
                              )}

                              {order.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateOrderStatus(order.orderId, 'completed');
                                    handleOpenWhatsappModal(order, 'completed');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black transition-all shadow-2xs flex items-center gap-1"
                                  title="تحديد الطلب كمكتمل وإزالة أي تحذير تأخير فوراً مع رسالة تهنئة للعميل"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>كمكتمل ✓</span>
                                </button>
                              )}

                              {order.status !== 'cancelled' && order.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateOrderStatus(order.orderId, 'cancelled');
                                    handleOpenWhatsappModal(order, 'cancelled');
                                  }}
                                  className="px-2 py-1 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg text-[10px] transition-colors"
                                  title="إلغاء الطلب وإرسال رسالة اعتذار للزبون"
                                >
                                  ✕ إلغاء
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ANALYTICS & STATS DASHBOARD (رسوم بيانية باستخدام recharts) */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                {/* Analytics Header with Refresh & Seed Demo Data */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-2xs">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-xs">لوحة الإحصائيات والمبيعات</h3>
                      <p className="text-[10px] text-stone-500">تحليل المبيعات اليومية، أكثر الوجبات طلباً، وحجم الإيرادات</p>
                    </div>
                  </div>
                  {onSeedSampleOrders && (
                    <button
                      type="button"
                      onClick={onSeedSampleOrders}
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="تحميل عينة إضافية من الطلبات للمعاينة"
                    >
                      <RefreshCw className="w-3 h-3 text-stone-500" />
                      <span>بيانات تجريبية</span>
                    </button>
                  )}
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-stone-500 text-[10px] block">إجمالي الطلبات</span>
                    <span className="text-lg font-black text-stone-900 font-mono tabular-nums block">
                      {orders.length}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold block">
                      ✓ {completedOrders.length} مكتمل
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-stone-500 text-[10px] block">حجم المبيعات</span>
                    <span className="text-lg font-black text-red-600 font-mono tabular-nums block">
                      {totalRevenue.toLocaleString()} ₪
                    </span>
                    <span className="text-[9px] text-stone-500 block">
                      إجمالي الإيرادات
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-stone-500 text-[10px] block">متوسط الفاتورة</span>
                    <span className="text-lg font-black text-amber-600 font-mono tabular-nums block">
                      {avgOrderValue} ₪
                    </span>
                    <span className="text-[9px] text-stone-500 block">
                      لكل طلبية
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border shadow-2xs ${
                    delayedCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-stone-200'
                  }`}>
                    <span className="text-stone-500 text-[10px] block">طلبات متأخرة (&gt;20د)</span>
                    <span className={`text-lg font-black font-mono tabular-nums block ${
                      delayedCount > 0 ? 'text-red-600 animate-pulse' : 'text-emerald-600'
                    }`}>
                      {delayedCount}
                    </span>
                    <span className="text-[9px] font-bold block text-stone-500">
                      {delayedCount > 0 ? '⚠️ تتطلب متابعة فورية' : '✓ كل الطلبات في وقتها'}
                    </span>
                  </div>
                </div>

                {/* CHART 1: DAILY SALES VOLUME (حجم المبيعات اليومي) */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-red-600" />
                        <span>حجم المبيعات اليومي (Daily Sales Volume):</span>
                      </h4>
                      <span className="text-[10px] text-stone-500">مقارنة الإيرادات اليومية بالشيكل وعدد الطلبات</span>
                    </div>
                  </div>

                  {dailySalesData.length > 0 ? (
                    <div className="h-56 w-full pt-2" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0B192C',
                              color: '#fff',
                              borderRadius: '12px',
                              border: 'none',
                              fontSize: '11px',
                              textAlign: 'right',
                              direction: 'rtl',
                            }}
                            formatter={(value: any, name: any) => [
                              name === 'sales' ? `${value} ₪` : `${value} طلب`,
                              name === 'sales' ? 'المبيعات' : 'عدد الطلبات',
                            ]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                            formatter={(value) => (value === 'sales' ? 'المبيعات (₪)' : 'عدد الطلبات')}
                          />
                          <Bar dataKey="sales" name="sales" fill="#E61C24" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="ordersCount" name="ordersCount" fill="#0B192C" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-stone-400">لا تتوفر مبيعات كافية للرسم البياني</div>
                  )}
                </div>

                {/* CHART 2: TOP SELLING MEALS (أكثر الوجبات طلباً) */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-amber-500" />
                        <span>أكثر الوجبات طلباً (Top Ordered Meals):</span>
                      </h4>
                      <span className="text-[10px] text-stone-500">الوجبات الأعلى طلباً وإقبالاً من قبل الزبائن</span>
                    </div>
                  </div>

                  {topMealsData.length > 0 ? (
                    <div className="space-y-4">
                      {/* Bar chart for top meals */}
                      <div className="h-48 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={topMealsData}
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 10, fill: '#1e293b' }}
                              width={110}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0B192C',
                                color: '#fff',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '11px',
                                direction: 'rtl',
                              }}
                              formatter={(value: any) => [`${value} وجبة`, 'الكمية المطلوبة']}
                            />
                            <Bar dataKey="count" fill="#F59E0B" radius={[0, 6, 6, 0]}>
                              {topMealsData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={index === 0 ? '#E61C24' : index === 1 ? '#F59E0B' : index === 2 ? '#0B192C' : '#64748B'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Ranked list of top meals */}
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        {topMealsData.map((m, idx) => (
                          <div
                            key={m.name}
                            className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                                idx === 0 ? 'bg-amber-400 text-stone-950 shadow-xs' : idx === 1 ? 'bg-stone-300 text-stone-800' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-stone-200 text-stone-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-bold text-stone-900">{m.name}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-[11px]">
                              <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                {m.count} وجبات
                              </span>
                              <span className="text-stone-500 font-bold">
                                {m.revenue} ₪
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-stone-400">لا توجد بيانات وجبات كافية</div>
                  )}
                </div>

                {/* DISTRIBUTION: Payment & Delivery Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Delivery vs Pickup */}
                  <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                    <span className="font-bold text-stone-800 block text-xs">نوع الطلبات:</span>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-bold">
                          <span className="text-red-700">🛵 توصيل للمنازل</span>
                          <span>{orders.filter((o) => o.customer?.orderType === 'delivery').length} طلب</span>
                        </div>
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600 rounded-full"
                            style={{
                              width: `${orders.length > 0 ? (orders.filter((o) => o.customer?.orderType === 'delivery').length / orders.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1 font-bold">
                          <span className="text-[#0B192C]">🏪 استلام من المطعم</span>
                          <span>{orders.filter((o) => o.customer?.orderType === 'pickup').length} طلب</span>
                        </div>
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0B192C] rounded-full"
                            style={{
                              width: `${orders.length > 0 ? (orders.filter((o) => o.customer?.orderType === 'pickup').length / orders.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                    <span className="font-bold text-stone-800 block text-xs">طرق الدفع المستخدمة:</span>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 text-emerald-900">
                        <span className="font-bold">💵 نقدي عند الاستلام</span>
                        <span className="font-mono font-black">{orders.filter((o) => o.customer?.paymentMethod === 'cash').length} طلب</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50 text-amber-900">
                        <span className="font-bold">📱 محفظة Jawwal Pay</span>
                        <span className="font-mono font-black">{orders.filter((o) => o.customer?.paymentMethod === 'jawwal_pay').length} طلب</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-blue-50 text-blue-900">
                        <span className="font-bold">💳 بطاقة ائتمانية</span>
                        <span className="font-mono font-black">{orders.filter((o) => o.customer?.paymentMethod === 'card').length} طلب</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Reset, Media Library, Customizer, & Logout */}
          <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-2">
            <button
              onClick={() => {
                onOpenSiteCustomizer();
                onClose();
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-xs"
            >
              <Palette className="w-4 h-4" />
              <span>لوحة تخصيص الهوية، الألوان، الشعار، والنصوص (Site Customizer)</span>
            </button>

            <button
              onClick={() => {
                onOpenMediaLibrary();
                onClose();
              }}
              className="w-full bg-[#0B192C] hover:bg-[#152e4e] text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-xs shadow-xs"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>فتح وتصفح مكتبة الصور والوسائط (Media Gallery)</span>
            </button>

            <button
              onClick={onResetDefaultMenu}
              className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-stone-600 hover:bg-stone-200 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة القائمة والأسعار الافتراضية الأصلية للمطعم</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل خروج الأدمن</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Customer Status Update Modal */}
      {whatsappOrder && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#25D366] text-white p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-black text-sm">إرسال تحديث للعميل عبر الواتساب</h3>
                  <p className="text-[11px] text-white/90">
                    طلب رقم #{whatsappOrder.orderId} - العميل: {whatsappOrder.customer.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappOrder(null)}
                className="p-1.5 rounded-xl text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Customer Info Card */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900 block">{whatsappOrder.customer.fullName}</span>
                  <span className="text-[11px] text-stone-500 font-mono" dir="ltr">
                    {whatsappOrder.customer.phoneNumber}
                  </span>
                </div>
                <div className="text-left font-mono">
                  <span className="font-black text-emerald-700 block text-sm">{whatsappOrder.total} ₪</span>
                  <span className="text-[10px] text-stone-500">
                    {whatsappOrder.customer.orderType === 'delivery' ? '🛵 توصيل' : '🏪 استلام'}
                  </span>
                </div>
              </div>

              {/* Status Template Selector Tabs */}
              <div>
                <label className="font-bold text-stone-800 block text-xs mb-1.5">
                  اختر حالة الطلب لتحميل الرسالة التلقائية الجاهزة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchWhatsappTemplate('pending')}
                    className={`p-2.5 rounded-xl border text-right transition-all font-bold text-[11px] flex items-center gap-1.5 ${
                      whatsappStatusType === 'pending'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span>⏳</span>
                    <span>تم الاستلام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchWhatsappTemplate('preparing')}
                    className={`p-2.5 rounded-xl border text-right transition-all font-bold text-[11px] flex items-center gap-1.5 ${
                      whatsappStatusType === 'preparing'
                        ? 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-400'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span>👨‍🍳</span>
                    <span>قيد التحضير</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchWhatsappTemplate('on_the_way')}
                    className={`p-2.5 rounded-xl border text-right transition-all font-bold text-[11px] flex items-center gap-1.5 ${
                      whatsappStatusType === 'on_the_way'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-400'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span>🛵</span>
                    <span>في الطريق</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchWhatsappTemplate('completed')}
                    className={`p-2.5 rounded-xl border text-right transition-all font-bold text-[11px] flex items-center gap-1.5 ${
                      whatsappStatusType === 'completed'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span>✅</span>
                    <span>جاهز / مسلّم</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchWhatsappTemplate('cancelled')}
                    className={`p-2.5 rounded-xl border text-right transition-all font-bold text-[11px] flex items-center gap-1.5 col-span-2 sm:col-span-1 ${
                      whatsappStatusType === 'cancelled'
                        ? 'border-red-500 bg-red-50 text-red-950 ring-2 ring-red-400'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span>❌</span>
                    <span>اعتذار وإلغاء</span>
                  </button>
                </div>
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 text-xs">نص الرسالة للزبون (جاهز للإرسال أو التعديل):</label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappMessageText);
                      setCopiedWhatsapp(true);
                      setTimeout(() => setCopiedWhatsapp(false), 2000);
                    }}
                    className="text-[10px] text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedWhatsapp ? 'تم النسخ بنجاح ✓' : 'نسخ النص'}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={whatsappMessageText}
                  onChange={(e) => setWhatsappMessageText(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs leading-relaxed focus:bg-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Auto update status checkbox */}
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-[11px] text-stone-800 font-bold border border-stone-200">
                <input
                  type="checkbox"
                  checked={autoUpdateOrderStatusOnWhatsapp}
                  onChange={(e) => setAutoUpdateOrderStatusOnWhatsapp(e.target.checked)}
                  className="rounded text-emerald-600 accent-emerald-600 w-4 h-4 cursor-pointer"
                />
                <span>تحديث حالة الطلب في النظام تلقائياً بالتوازي مع إرسال الرسالة للزبون</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setWhatsappOrder(null)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 font-bold text-xs"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={handleSendWhatsappMessage}
                className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl font-black text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>فتح واتساب وإرسال الرسالة للعميل 🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
