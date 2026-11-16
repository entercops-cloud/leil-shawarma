import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AnnouncementBar } from './components/AnnouncementBar';
import { MobileMenuDrawer } from './components/MobileMenuDrawer';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { MenuItemCard } from './components/MenuItemCard';
import { ItemCustomizeModal } from './components/ItemCustomizeModal';
import { FloatingCartBar } from './components/FloatingCartBar';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { RestaurantInfoModal } from './components/RestaurantInfoModal';
import { RatingModal } from './components/RatingModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AuthUser, fetchMe, getStatus, pingActivity, logout as authLogout, AUTH_EXPIRED_EVENT } from './utils/auth';
import { CustomerAccount, fetchCustomer } from './utils/customerAuth';
import { readLegacyContent, clearLegacyStorage } from './utils/legacyMigration';
import { fetchContent, pushContent, SiteContent } from './utils/contentSync';
import { fetchAdminOrders, patchOrder, fetchReviews, submitReview, updateReviewRemote, deleteReviewRemote } from './utils/serverData';
import { EditMenuItemModal } from './components/EditMenuItemModal';
import { AdminPanelDrawer } from './components/AdminPanelDrawer';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { FlashOffers } from './components/FlashOffers';
import { SiteCustomizerModal } from './components/SiteCustomizerModal';
import { CustomerAccountModal } from './components/CustomerAccountModal';
import { Footer } from './components/Footer';
import { SiteControlLauncher } from './components/SiteControlLauncher';

import { CATEGORIES, MENU_ITEMS as DEFAULT_MENU_ITEMS, RESTAURANT_INFO } from './data/menuData';
import { MenuItem, CartItem, CartItemOption, PlacedOrder, Review, LoyaltyAccount, FlashOffer, SiteCustomization, OrderStatus } from './types';
import { calculateItemRating, normalizeCustomization, DEFAULT_SITE_CUSTOMIZATION, DEFAULT_FLASH_OFFERS } from './utils/storage';
import { orderAlertManager } from './utils/audio';

export default function App() {
  // Everything below is loaded from the server on start. The browser stores nothing.
  const [customization, setCustomization] = useState<SiteCustomization>(DEFAULT_SITE_CUSTOMIZATION);
  const [flashOffers, setFlashOffers] = useState<FlashOffer[]>(DEFAULT_FLASH_OFFERS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Staff session (HttpOnly cookie on the server) and verified customer (loyalty)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const isAdmin = !!currentUser;
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [customerVerificationAvailable, setCustomerVerificationAvailable] = useState(false);
  // PIN-based customer accounts are available whenever the owner enables loyalty.
  const customerLoginEnabled = customerVerificationAvailable && customization.loyalty.enabled;
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [adminOrders, setAdminOrders] = useState<PlacedOrder[]>([]);

  // Background timer (updates every 15 seconds) for real-time order elapsed time tracking
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // ---------- Shared content (visible to every visitor) ----------
  // Menu, offers and site settings live on the server. Visitors read them; signed-in admins publish them.
  const [contentReady, setContentReady] = useState(false);
  const [remoteKnown, setRemoteKnown] = useState(false); // server answered at least once
  const lastSynced = useRef<string>('');
  const lastUpdatedAt = useRef<string>('');
  const serialize = (m: MenuItem[], o: FlashOffer[], c: SiteCustomization) => JSON.stringify({ m, o, c });

  const applyRemote = (remote: SiteContent) => {
    const cust = normalizeCustomization(remote.customization);
    lastSynced.current = serialize(remote.menu, remote.offers, cust);
    lastUpdatedAt.current = remote.updatedAt || '';
    setMenuItems(remote.menu);
    setFlashOffers(remote.offers);
    setCustomization(cust);
  };

  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const serverWasEmpty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      const [remote, me, status, cust] = await Promise.all([
        fetchContent(),
        fetchMe(),
        getStatus().catch(() => null),
        fetchCustomer(),
      ]);
      if (cancelled) return;
      if (remote === undefined) {
        setLoadFailed(true); // server unreachable: show a retry screen instead of stale data
        return;
      }
      setCurrentUser(me);
      setCustomer(cust);
      setCustomerVerificationAvailable(!!status?.verificationAvailable);
      if (remote) {
        applyRemote(remote);
        clearLegacyStorage(); // the server is the source of truth now; drop anything old versions left in this browser
      } else {
        serverWasEmpty.current = true; // nothing published yet; the owner's first sign-in publishes
      }
      setRemoteKnown(true);
      setContentReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempt]);

  // First publish: bring over what an older version saved in the owner's browser (once), then wipe it.
  const migrated = useRef(false);
  useEffect(() => {
    if (!isAdmin || !remoteKnown || !serverWasEmpty.current || migrated.current) return;
    migrated.current = true;
    readLegacyContent().then((legacy) => {
      if (!legacy) return;
      if (legacy.menu) setMenuItems(legacy.menu);
      if (legacy.offers) setFlashOffers(legacy.offers);
      if (legacy.customization) setCustomization(normalizeCustomization(legacy.customization));
      showToast('تم نقل تعديلاتك القديمة من هذا المتصفح ونشرها على الخادم ✓');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, remoteKnown]);

  // Visitors (and admins before the first successful read) pick up changes automatically.
  useEffect(() => {
    if (!contentReady || (isAdmin && remoteKnown)) return;
    const tick = async () => {
      const r = await fetchContent();
      if (r === undefined) return;
      setRemoteKnown(true);
      if (r && r.updatedAt !== lastUpdatedAt.current) applyRemote(r);
    };
    const id = setInterval(tick, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentReady, isAdmin, remoteKnown]);

  // Admin edits are published automatically a moment after the last change.
  const latestState = useRef({ menuItems, flashOffers, customization });
  latestState.current = { menuItems, flashOffers, customization };
  useEffect(() => {
    if (!isAdmin || !contentReady || !remoteKnown) return;
    const snapshot = serialize(menuItems, flashOffers, customization);
    if (snapshot === lastSynced.current) return;
    const timer = setTimeout(async () => {
      try {
        const res = await pushContent({ menu: menuItems, offers: flashOffers, customization });
        lastSynced.current = serialize(res.menu, res.offers, res.customization);
        const cur = latestState.current;
        if (serialize(cur.menuItems, cur.flashOffers, cur.customization) === snapshot) {
          setMenuItems(res.menu);
          setFlashOffers(res.offers);
          setCustomization(res.customization);
        }
        serverWasEmpty.current = false;
        clearLegacyStorage();
        showToast('تم نشر التغييرات للزبائن ✓');
      } catch (e) {
        showToast(`تعذر نشر التغييرات: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`);
      }
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems, flashOffers, customization, isAdmin, contentReady, remoteKnown]);


  // ---------- Orders & reviews on the server ----------
  // Admin: load every customer's orders, refresh often, and ring when a new one arrives.
  const knownOrderIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!isAdmin) {
      knownOrderIds.current = null;
      return;
    }
    let stopped = false;
    const load = async () => {
      try {
        const list = await fetchAdminOrders();
        if (stopped) return;
        if (knownOrderIds.current) {
          const fresh = list.filter((o) => !knownOrderIds.current!.has(o.orderId));
          if (fresh.length > 0) {
            orderAlertManager.notifyNewOrder();
            showToast(`🔔 طلب جديد ${fresh[0].orderId} — ${fresh[0].customer.fullName}`);
          }
        }
        knownOrderIds.current = new Set(list.map((o) => o.orderId));
        setAdminOrders(list);
      } catch {
        /* auth expiry is handled globally; network errors retry on the next tick */
      }
    };
    load();
    const id = setInterval(load, 8_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Reviews are shared by everyone and live on the server.
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      const r = await fetchReviews();
      if (!stopped && r) setReviews(r);
    };
    load();
    const id = setInterval(load, 45_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // A verified customer's balance is refreshed while the page is open (e.g. after an order is completed).
  useEffect(() => {
    if (!customer) return;
    const id = setInterval(async () => {
      const c = await fetchCustomer();
      if (c) setCustomer(c);
    }, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.phone]);

  // Points can only be redeemed by a signed-in customer
  useEffect(() => {
    if (!customer && pointsToRedeem !== 0) setPointsToRedeem(0);
  }, [customer, pointsToRedeem]);

  // Server says the session is no longer valid
  useEffect(() => {
    const onExpired = () => {
      setCurrentUser((prev) => {
        if (prev) showToast('انتهت جلسة الإدارة، سجّل الدخول مجدداً');
        return null;
      });
      setIsAdminPanelOpen(false);
      setAdminOrders([]);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  // Compute delayed orders (> 20 min and not completed / cancelled)
  const delayedOrdersCount = useMemo(() => {
    return adminOrders.filter((o) => {
      if (o.status === 'completed' || o.status === 'cancelled') return false;
      const ts = o.timestamp || (o.createdAtIso ? new Date(o.createdAtIso).getTime() : 0);
      if (!ts) return false;
      const elapsedMin = (nowTimestamp - ts) / 60000;
      return elapsedMin > 20;
    }).length;
  }, [adminOrders, nowTimestamp]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Active Category state
  const [activeCategoryId, setActiveCategoryId] = useState(CATEGORIES[0].id);
  const [activeSubCategories, setActiveSubCategories] = useState<Record<string, string>>({});

  // Modals state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Modals for Rating, Admin & Media Library & Customizer features
  const [ratingTargetItem, setRatingTargetItem] = useState<MenuItem | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState<'items' | 'users'>('items');
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isSiteCustomizerOpen, setIsSiteCustomizerOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [orderHistoryInitialPhone, setOrderHistoryInitialPhone] = useState('');
  const [orderHistoryInitialOrderId, setOrderHistoryInitialOrderId] = useState('');

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleOpenOrderHistory = (phone?: string, orderId?: string) => {
    setOrderHistoryInitialPhone(phone || '');
    setOrderHistoryInitialOrderId(orderId || '');
    setIsOrderHistoryOpen(true);
  };

  // Re-add a past order using TODAY's menu and prices (items that no longer exist are skipped).
  const handleReorder = (oldItems: CartItem[]) => {
    const rebuilt: CartItem[] = [];
    for (const it of oldItems) {
      if (it.offerId) continue;
      const meal = menuItems.find((m) => m.id === it.menuItem.id);
      if (!meal || meal.isAvailable === false) continue;
      let unit = meal.price;
      const size = meal.options?.sizes?.find((sz) => sz.name === it.options.size);
      if (size) unit += size.priceDelta;
      (it.options.extras || []).forEach((id) => {
        const ex = meal.options?.extras?.find((x) => x.id === id);
        if (ex) unit += ex.price;
      });
      rebuilt.push({ ...it, menuItem: meal, options: { ...it.options, unitPrice: unit }, totalPrice: unit * it.quantity });
    }
    if (rebuilt.length === 0) {
      showToast('هذه الأصناف لم تعد متوفرة حالياً');
      return;
    }
    setCart(rebuilt);
    setIsCartOpen(true);
    showToast('تمت استعادة وجباتك السابقة إلى السلة بأسعار اليوم 🌯');
  };

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Cart calculations
  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // Points discount calculation
  const pointsDiscount = customer && pointsToRedeem > 0 && pointsToRedeem === (customization.loyalty.redeemPoints || 50) ? (customization.loyalty.redeemDiscount ?? 5) : 0;
  const cartFinalTotal = Math.max(0, subtotalPrice - pointsDiscount);

  // Toggle points redemption in cart
  const handleToggleRedeemPoints = (points: number) => {
    setPointsToRedeem(points);
    if (points > 0) {
      showToast(`تم تفعيل خصم ${points === 50 ? 5 : 12} ₪ مقابل استبدال ${points} نقطة ولاء 🌟`);
    } else {
      showToast('تم إلغاء استبدال نقاط الولاء');
    }
  };

  // Quick 1-click Add (+) from menu
  const handleQuickAdd = (item: MenuItem) => {
    if (item.options?.sizes && item.options.sizes.length > 1) {
      setCustomizingItem(item);
      setIsCustomizerOpen(true);
      return;
    }

    const defaultOptions: CartItemOption = {
      size: item.options?.sizes?.[0]?.name,
      bread: item.options?.breads?.[0],
      extras: [],
      removals: [],
      unitPrice: item.price,
    };

    const cartItemId = `${item.id}-default`;

    setCart((prev) => {
      const existing = prev.find((ci) => ci.cartItemId === cartItemId);
      if (existing) {
        return prev.map((ci) =>
          ci.cartItemId === cartItemId
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                totalPrice: (ci.quantity + 1) * ci.options.unitPrice,
              }
            : ci
        );
      } else {
        return [
          ...prev,
          {
            cartItemId,
            menuItem: item,
            quantity: 1,
            options: defaultOptions,
            totalPrice: item.price,
          },
        ];
      }
    });

    showToast(`تمت إضافة "${item.name}" للسلة بنجاح`);
  };

  // 1-Click Fast Order: Quick add and open checkout modal immediately
  const handleFastOrder = (item: MenuItem) => {
    handleQuickAdd(item);
    setIsCheckoutOpen(true);
    showToast(`⚡ طلب سريع: تمت إضافة "${item.name}" وجاري إتمام الطلب مباشرة`);
  };

  // Open customizer
  const handleCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    setIsCustomizerOpen(true);
  };

  // Add customized item
  const handleAddCustomizedToCart = (
    item: MenuItem,
    quantity: number,
    options: CartItemOption
  ) => {
    const extrasKey = options.extras?.sort().join('-') || '';
    const removalsKey = options.removals?.sort().join('-') || '';
    const cartItemId = `${item.id}-${options.size || 'base'}-${options.bread || 'saj'}-${extrasKey}-${removalsKey}-${options.notes || ''}`;

    const totalPrice = options.unitPrice * quantity;

    setCart((prev) => {
      const existing = prev.find((ci) => ci.cartItemId === cartItemId);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map((ci) =>
          ci.cartItemId === cartItemId
            ? {
                ...ci,
                quantity: newQty,
                totalPrice: newQty * options.unitPrice,
              }
            : ci
        );
      } else {
        return [
          ...prev,
          {
            cartItemId,
            menuItem: item,
            quantity,
            options,
            totalPrice,
          },
        ];
      }
    });

    showToast(`تمت إضافة "${item.name}" (${quantity} وجبات) للسلة`);
  };

  // Update quantity in cart
  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }

    setCart((prev) =>
      prev.map((ci) =>
        ci.cartItemId === cartItemId
          ? {
              ...ci,
              quantity: newQty,
              totalPrice: newQty * ci.options.unitPrice,
            }
          : ci
      )
    );
  };

  // Remove item from cart
  const handleRemoveItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.cartItemId !== cartItemId));
  };

  // Scroll to category
  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const element = document.getElementById(`category-${catId}`);
    if (element) {
      const yOffset = -140;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q)
    );
  }, [searchQuery, menuItems]);

  // Order placed successfully: Plays Audio Chime & Haptic Vibration alert for instant management notification!
  const handleOrderPlaced = (order: PlacedOrder, accountAfter: CustomerAccount | null) => {
    orderAlertManager.notifyNewOrder();
    if (accountAfter) setCustomer(accountAfter); // balance after spending redeemed points
    setPointsToRedeem(0);
    setPlacedOrder(order);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setIsConfirmationOpen(true);

    showToast(
      order.pointsEarned && customization.loyalty.awardOn === 'completed'
        ? `🔔 تم استلام طلبك! ستضاف ${order.pointsEarned} نقطة ولاء بعد اكتمال الطلب`
        : '🔔 تم استلام طلبك بنجاح'
    );
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updated = await patchOrder(orderId, { status });
      setAdminOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, ...updated } : o)));
      showToast(
        status === 'completed'
          ? 'تم تحديد الطلب كمكتمل ✓ (تُضاف نقاط الولاء للزبون على جهازه)'
          : status === 'preparing'
          ? 'الطلب الآن قيد التحضير في المطبخ 👨‍🍳'
          : status === 'cancelled'
          ? 'تم إلغاء الطلب ✕'
          : 'تم تحديث حالة الطلب'
      );
    } catch (e) {
      showToast(`تعذر تحديث الطلب: ${e instanceof Error ? e.message : 'خطأ'}`);
    }
  };

  const handleSeedSampleOrders = () => {
    showToast('الطلبات تُحفظ على الخادم، وتظهر هنا طلبات الزبائن الحقيقية.');
  };

  // --- RATING HANDLERS ---
  const handleOpenRating = (item: MenuItem) => {
    setRatingTargetItem(item);
    setIsRatingModalOpen(true);
  };

  const handleAddReview = async (
    itemId: string,
    rating: number,
    userName: string,
    comment?: string
  ) => {
    try {
      const review = await submitReview({ itemId, rating, userName: userName.trim(), comment: comment?.trim() });
      setReviews((prev) => [review, ...prev]);
      showToast('شكراً لك! تم تسجيل تقييمك وحفظه بنجاح');
    } catch (e) {
      showToast(`تعذر حفظ التقييم: ${e instanceof Error ? e.message : 'خطأ'}`);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewRemote(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast('تم حذف التقييم بنجاح');
    } catch (e) {
      showToast(`تعذر حذف التقييم: ${e instanceof Error ? e.message : 'خطأ'}`);
    }
  };

  const handleEditReview = async (reviewId: string, updatedRating: number, updatedComment: string) => {
    try {
      const rev = await updateReviewRemote(reviewId, updatedRating, updatedComment);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? rev : r)));
      showToast('تم تحديث التقييم بنجاح');
    } catch (e) {
      showToast(`تعذر تحديث التقييم: ${e instanceof Error ? e.message : 'خطأ'}`);
    }
  };

  // --- ADMIN DIRECT EDIT HANDLERS ---
  const handleAdminLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    showToast(`مرحباً ${user.displayName}! تم تفعيل وضع الإدارة والتعديل المباشر`);
  };

  const handleAdminLogout = () => {
    authLogout();
    setCurrentUser(null);
    setAdminOrders([]);
    setIsAdminPanelOpen(false);
    showToast('تم تسجيل الخروج بنجاح');
  };

  // The server enforces the idle timeout; real clicks/keys tell it the admin is still here.
  useEffect(() => {
    if (!currentUser) return;
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last > 60_000) {
        last = now;
        pingActivity();
      }
    };
    const events = ['click', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [currentUser]);

  const handleOpenAddNewItem = () => {
    setEditingItem(null);
    setIsEditItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsEditItemModalOpen(true);
  };

  const handleSaveMenuItem = (savedItem: MenuItem) => {
    setMenuItems((prev) => {
      const exists = prev.some((i) => i.id === savedItem.id);
      let updated: MenuItem[];
      if (exists) {
        updated = prev.map((i) => (i.id === savedItem.id ? savedItem : i));
        showToast(`تم تعديل وجبة "${savedItem.name}" واستبدال الصورة بنجاح`);
      } else {
        updated = [savedItem, ...prev];
        showToast(`تمت إضافة وجبة "${savedItem.name}" للمنيو بنجاح`);
      }
      return updated;
    });
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      return updated;
    });
    showToast('تم حذف الوجبة بنجاح من المنيو');
  };

  const handleToggleItemAvailability = (itemId: string) => {
    setMenuItems((prev) => {
      const updated = prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              isAvailable: i.isAvailable === false ? true : false,
            }
          : i
      );
      const target = updated.find((i) => i.id === itemId);
      showToast(
        target?.isAvailable !== false
          ? `أصبحت وجبة "${target?.name}" متوفرة للطلب`
          : `تم تعطيل وجبة "${target?.name}" (غير متوفرة حالياً)`
      );
      return updated;
    });
  };

  const handleResetDefaultMenu = () => {
    setMenuItems(DEFAULT_MENU_ITEMS);
    showToast('تمت استعادة القائمة والأسعار الافتراضية الأصلية');
  };

  // --- SITE CUSTOMIZATION HANDLERS ---
  const handleSaveCustomization = (newCust: SiteCustomization) => {
    setCustomization(newCust);
    showToast('تم حفظ وتطبيق الهوية والألوان والنصوص بنجاح 🎨');
  };

  const handleResetCustomization = () => {
    setCustomization(DEFAULT_SITE_CUSTOMIZATION);
    showToast('تمت استعادة الهوية والإعدادات الأصلية للموقع');
  };

  // --- FLASH OFFERS HANDLERS ---
  const handleUpdateFlashOffers = (newOffers: FlashOffer[]) => {
    setFlashOffers(newOffers);
    showToast('تم تحديث العروض الخاصة ونسب الخصم ⚡');
  };

  const handleClaimOffer = (offer: FlashOffer, targetMenuItem?: MenuItem) => {
    const meal = targetMenuItem || menuItems.find((m) => m.id === offer.targetItemId) || menuItems[0];
    const cartItemId = `offer-${offer.id}-${Date.now()}`;
    const offerItem: CartItem = {
      cartItemId,
      menuItem: {
        ...meal,
        name: `${meal.name} [${offer.badge}]`,
        price: offer.discountedPrice,
      },
      quantity: 1,
      options: {
        size: 'عرض خاص',
        bread: meal.options?.breads?.[0] || undefined,
        extras: [],
        removals: [],
        notes: `طلب عبر ${offer.badge}${typeof offer.discountPercentage === 'number' ? ` بخصم ${offer.discountPercentage}%` : ` (توفير ${Math.max(0, offer.savings ?? (offer.originalPrice - offer.discountedPrice))} ₪)`}`,
        unitPrice: offer.discountedPrice,
      },
      totalPrice: offer.discountedPrice,
      offerId: offer.id,
    };

    setCart((prev) => [offerItem, ...prev]);
    showToast(`🔥 تم إدراج "${offer.title}" في السلة بسعر العرض (${offer.discountedPrice} ₪)`);
  };

  if (loadFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-50 text-stone-700 text-sm p-6 text-center" dir="rtl">
        <p className="font-bold">تعذر الاتصال بالخادم.</p>
        <p className="text-xs text-stone-500">تحقق من الإنترنت ثم أعد المحاولة.</p>
        <button onClick={() => setLoadAttempt((n) => n + 1)} className="px-4 py-2 bg-stone-900 text-white rounded-xl font-bold">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!contentReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500 text-sm" dir="rtl">
        جاري تحميل قائمة الطعام...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors"
      style={{ backgroundColor: customization.colors.bgSurface }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold border border-stone-800 animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Announcement Bar for Special Offers */}
      <AnnouncementBar
        onActionClick={() => handleSelectCategory(CATEGORIES[0].id)}
        accentColor={customization.colors.accentGold}
      />

      {/* Header */}
      <Header
        cartItemCount={totalItemCount}
        cartTotal={cartFinalTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenLocation={() => setIsLocationOpen(true)}
        onOpenOrderHistory={() => handleOpenOrderHistory()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onAddNewItem={handleOpenAddNewItem}
        loyaltyPoints={customer?.points ?? 0}
        showLoyalty={customerLoginEnabled}
        customization={customization}
        onOpenSiteCustomizer={() => setIsSiteCustomizerOpen(true)}
        delayedOrdersCount={delayedOrdersCount}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Hero Banner */}
      {customization.sectionsVisibility.showHeroBanner && (
        <HeroBanner
          onExploreMenu={() => handleSelectCategory(CATEGORIES[0].id)}
          onOpenWhatsapp={() => {
            window.location.href = `https://wa.me/970593965358?text=${encodeURIComponent('مرحباً مطعم شاورما ليل، أود الاستفسار عن المنيو وتقديم طلب')}`;
          }}
          customization={customization}
        />
      )}

      {/* Flash Offers Component (عروض البرق المؤقتة مع العد التنازلي والخصم) */}
      {(customization.sectionsVisibility.showFlashOffers || isAdmin) && (
        <FlashOffers
          offers={flashOffers}
          menuItems={menuItems}
          onClaimOffer={handleClaimOffer}
          isAdmin={isAdmin}
          onManageOffers={() => setIsAdminPanelOpen(true)}
          customTitle={customization.texts.flashOffersTitle}
          customSubtitle={customization.texts.flashOffersSubtitle}
        />
      )}

      {/* Sticky Categories Navigation */}
      {customization.sectionsVisibility.showCategoryNav && (
        <CategoryNav
          categories={CATEGORIES}
          activeCategoryId={activeCategoryId}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {/* Main Content Area */}
      <main id="menu" className="flex-1 max-w-6xl mx-auto px-4 py-8 sm:py-14 w-full space-y-12 sm:space-y-16">
        {/* If searching, show search results */}
        {filteredItems ? (
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-stone-200/80 pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                نتائج البحث عن: <span className="text-red-700">"{searchQuery}"</span>
              </h2>
              <span className="text-xs text-stone-600 font-mono tabular-nums bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg">
                {filteredItems.length} وجبات
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8 space-y-3 shadow-xs">
                <p className="text-sm font-bold text-stone-800">لم يتم العثور على وجبات مطابقة</p>
                <p className="text-xs text-stone-500">
                  جرب البحث بكلمات أخرى مثل "دجاج"، "لحم"، "عربي" أو تصفح الأقسام أدناه.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  إلغاء البحث وعرض المنيو
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    ratingStats={calculateItemRating(item.id, reviews)}
                    onQuickAdd={handleQuickAdd}
                    onFastOrder={handleFastOrder}
                    onCustomize={handleCustomize}
                    onOpenRating={handleOpenRating}
                    isAdmin={isAdmin}
                    onEditItem={handleOpenEditItem}
                    onDeleteItem={handleDeleteMenuItem}
                    onToggleAvailability={handleToggleItemAvailability}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Normal Category Sections with Sub-categories support */
          CATEGORIES.map((category) => {
            const allItems = menuItems.filter((item) => item.categoryId === category.id);
            if (allItems.length === 0) return null;

            // Collect unique subcategories available in items or predefined in category
            const subCategoriesList = Array.from(
              new Set([
                ...(category.subCategories || []),
                ...(allItems.map((i) => i.subCategory).filter(Boolean) as string[]),
              ])
            );

            const currentSub = activeSubCategories[category.id] || 'all';
            const displayedItems = currentSub === 'all'
              ? allItems
              : allItems.filter((i) => i.subCategory === currentSub);

            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-36"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4 border-b border-stone-200/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl">{category.icon}</span>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                        {category.name}
                      </h2>
                      <p className="text-xs text-stone-500 mt-0.5 hidden sm:block">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-stone-600 font-mono tabular-nums bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-xl">
                    {displayedItems.length} {currentSub === 'all' ? 'أصناف' : `من ${allItems.length}`}
                  </span>
                </div>

                {/* Sub-categories Interactive Filter Bar */}
                {subCategoriesList.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-4 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSubCategories((prev) => ({ ...prev, [category.id]: 'all' }))
                      }
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                        currentSub === 'all'
                          ? 'bg-stone-900 text-white font-bold shadow-xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      الكل ({allItems.length})
                    </button>
                    {subCategoriesList.map((sub) => {
                      const countForSub = allItems.filter((i) => i.subCategory === sub).length;
                      const isSubActive = currentSub === sub;

                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() =>
                            setActiveSubCategories((prev) => ({ ...prev, [category.id]: sub }))
                          }
                          className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
                            isSubActive
                              ? 'bg-stone-900 text-white font-bold shadow-xs'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          <span>{sub}</span>
                          <span className="text-[10px] opacity-75 font-mono">({countForSub})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Cards Grid */}
                {displayedItems.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-600 space-y-3 shadow-xs">
                    <p className="font-bold text-xs">لا توجد وجبات مضافة حالياً في تصنيف "{currentSub}"</p>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSubCategories((prev) => ({ ...prev, [category.id]: 'all' }))
                      }
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      عرض جميع وجبات {category.name}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-7">
                    {displayedItems.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        ratingStats={calculateItemRating(item.id, reviews)}
                        onQuickAdd={handleQuickAdd}
                        onFastOrder={handleFastOrder}
                        onCustomize={handleCustomize}
                        onOpenRating={handleOpenRating}
                        isAdmin={isAdmin}
                        onEditItem={handleOpenEditItem}
                        onDeleteItem={handleDeleteMenuItem}
                        onToggleAvailability={handleToggleItemAvailability}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>

      {/* Floating Interactive Cart Bar */}
      <FloatingCartBar
        itemCount={totalItemCount}
        totalPrice={cartFinalTotal}
        onOpenCart={() => setIsCartOpen(true)}
        customization={customization}
        onExploreMenu={() => handleSelectCategory(CATEGORIES[0].id)}
      />

      {/* Modals & Drawers */}
      {isCustomizerOpen && customizingItem && (
        <ItemCustomizeModal
          item={customizingItem}
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          onAddToCart={handleAddCustomizedToCart}
        />
      )}

      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onProceedToCheckout={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
          subtotal={subtotalPrice}
          loyaltyAccount={customerLoginEnabled ? customer : null}
          customerLoginEnabled={customerLoginEnabled}
          onOpenCustomerLogin={() => {
            setIsCartOpen(false);
            handleOpenOrderHistory();
          }}
          pointsToRedeem={pointsToRedeem}
          onToggleRedeemPoints={handleToggleRedeemPoints}
          minOrder={customization.ordering.minOrder}
          loyalty={customization.loyalty}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cart}
          subtotal={subtotalPrice}
          pointsDiscount={pointsDiscount}
          pointsRedeemed={pointsToRedeem}
          onOrderPlaced={handleOrderPlaced}
          deliveryRegions={customization.ordering.deliveryRegions}
          loyalty={customization.loyalty}
          payments={customization.payments}
          customer={customerLoginEnabled ? customer : null}
        />
      )}

      {isConfirmationOpen && placedOrder && (
        <OrderConfirmationModal
          order={placedOrder}
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onNewOrder={() => setIsConfirmationOpen(false)}
          onTrackOrder={(phone) => handleOpenOrderHistory(phone, placedOrder?.orderId)}
        />
      )}

      {isLocationOpen && (
        <RestaurantInfoModal
          isOpen={isLocationOpen}
          onClose={() => setIsLocationOpen(false)}
        />
      )}

      {/* Rating & Review Modal */}
      {isRatingModalOpen && ratingTargetItem && (
        <RatingModal
          item={ratingTargetItem}
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          reviews={reviews}
          onAddReview={handleAddReview}
          isAdmin={isAdmin}
          onDeleteReview={handleDeleteReview}
          onEditReview={handleEditReview}
        />
      )}

      {/* Admin Login Modal */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}

      {/* Admin Edit / Add Meal Modal (With Image Upload, Library & URL support) */}
      {isEditItemModalOpen && (
        <EditMenuItemModal
          item={editingItem}
          isOpen={isEditItemModalOpen}
          onClose={() => setIsEditItemModalOpen(false)}
          categories={CATEGORIES}
          onSave={handleSaveMenuItem}
        />
      )}

      {/* Admin Management Panel Drawer */}
      {isAdminPanelOpen && (
        <AdminPanelDrawer
          isOpen={isAdminPanelOpen}
          onClose={() => { setIsAdminPanelOpen(false); setAdminPanelTab('items'); }}
          menuItems={menuItems}
          reviews={reviews}
          categories={CATEGORIES}
          onAddNewItem={handleOpenAddNewItem}
          onEditItem={handleOpenEditItem}
          onDeleteItem={handleDeleteMenuItem}
          onToggleAvailability={handleToggleItemAvailability}
          onDeleteReview={handleDeleteReview}
          onEditReview={handleEditReview}
          onResetDefaultMenu={handleResetDefaultMenu}
          onLogout={handleAdminLogout}
          currentUser={currentUser}
          initialTab={adminPanelTab}
          onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
          flashOffers={flashOffers}
          onUpdateFlashOffers={handleUpdateFlashOffers}
          onOpenSiteCustomizer={() => setIsSiteCustomizerOpen(true)}
          orders={adminOrders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSeedSampleOrders={handleSeedSampleOrders}
          nowTimestamp={nowTimestamp}
        />
      )}

      {/* Media Library Full Modal (Upload, Download, Browse) */}
      {isMediaLibraryOpen && (
        <MediaLibraryModal
          isOpen={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
        />
      )}

      {/* Site Customizer Modal (الهوية، الشعار، الألوان، النصوص، الأقسام) */}
      {isSiteCustomizerOpen && (
        <SiteCustomizerModal
          isOpen={isSiteCustomizerOpen}
          onClose={() => setIsSiteCustomizerOpen(false)}
          customization={customization}
          onSaveCustomization={handleSaveCustomization}
          onResetCustomization={handleResetCustomization}
          onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
        />
      )}

      {/* Mobile Menu Drawer (قائمة جانبية متجاوبة للجوال) */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenLocation={() => setIsLocationOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrderHistory={() => handleOpenOrderHistory()}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenSiteCustomizer={() => setIsSiteCustomizerOpen(true)}
        loyaltyPoints={customer?.points ?? 0}
        showLoyalty={customerLoginEnabled}
        customization={customization}
        delayedOrdersCount={delayedOrdersCount}
        onSelectCategory={handleSelectCategory}
      />

      {/* Customer Order History & Loyalty Tracking Modal */}
      {isOrderHistoryOpen && (
        <CustomerAccountModal
          isOpen={isOrderHistoryOpen}
          onClose={() => setIsOrderHistoryOpen(false)}
          customer={customerLoginEnabled ? customer : null}
          customerLoginEnabled={customerLoginEnabled}
          onCustomerChange={(c) => {
            setCustomer(c);
            if (!c) setPointsToRedeem(0);
          }}
          onReorder={handleReorder}
          initialOrderId={orderHistoryInitialOrderId}
          initialPhone={orderHistoryInitialPhone}
        />
      )}

      {/* Footer */}
      <Footer
        onOpenLocation={() => setIsLocationOpen(true)}
        onOpenOrderHistory={() => handleOpenOrderHistory()}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        customization={customization}
        onOpenSiteCustomizer={() => setIsSiteCustomizerOpen(true)}
      />

      {/* Site Control Launcher (أيقونة طرف الموقع لإدارة المطعم) */}
      <SiteControlLauncher
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenAdminPanel={() => { setAdminPanelTab('items'); setIsAdminPanelOpen(true); }}
        onOpenUsers={currentUser?.role === 'owner' ? () => { setAdminPanelTab('users'); setIsAdminPanelOpen(true); } : undefined}
        onOpenSiteCustomizer={() => setIsSiteCustomizerOpen(true)}
        onAddNewItem={handleOpenAddNewItem}
        onLogout={handleAdminLogout}
        delayedOrdersCount={delayedOrdersCount}
        hasFloatingCart={totalItemCount > 0}
      />
    </div>
  );
}
