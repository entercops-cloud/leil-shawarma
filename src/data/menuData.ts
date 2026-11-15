import { Category, MenuItem } from '../types';

import heroShawarma from '../assets/images/hero_shawarma_leil_1791041594417.jpg';
import chickenWrapImg from '../assets/images/shawarma_chicken_wrap_1791041603153.jpg';
import beefPlatterImg from '../assets/images/shawarma_beef_platter_1791041615785.jpg';
import arabiMealImg from '../assets/images/shawarma_arabi_meal_1791041625052.jpg';
import familyBoxImg from '../assets/images/leil_family_box_1791041634511.jpg';

export const HERO_IMAGE = heroShawarma;

export const RESTAURANT_INFO = {
  name: 'مطعم شاورما ليل',
  nameEn: 'Leil Shawarma',
  tagline: 'أشهى نكهة شاورما على أصولها في خاراس والخليل',
  phone: '0593965358',
  phoneIntl: '+970593965358',
  address: 'الخليل - خاراس - بجانب مطبعة إسلام حلاحله',
  city: 'خاراس، محافظة الخليل',
  mapsUrl: 'https://maps.app.goo.gl/FWQu3YcAXDDdfEnTA',
  facebookUrl: 'https://www.facebook.com/leilshawarma',
  instagramUrl: 'https://www.instagram.com/leilshawarma?stkn=YnR1Mzh2ZDhyeTNr',
  workingHours: 'يومياً: 12:00 ظهراً - 1:00 بعد منتصف الليل',
  deliveryTime: '25 - 40 دقيقة',
  minOrder: 20,
  defaultDeliveryFee: 5,
};

export const CATEGORIES: Category[] = [
  {
    id: 'chicken',
    name: 'دجاج',
    nameEn: 'Chicken Shawarma',
    icon: '🍗',
    description: 'شاورما الدجاج المتبلة بخلطة ليل السرية والمشوية على أصولها',
    subCategories: ['ساندويشات', 'وجبات عربي', 'صحون'],
  },
  {
    id: 'beef',
    name: 'لحم',
    nameEn: 'Beef Shawarma',
    icon: '🥩',
    description: 'لحم عجل بلدي طازج ومتبل بأبهى النكهات مع صوص الطحينية الفاخر',
    subCategories: ['ساندويشات', 'وجبات عربي', 'صحون'],
  },
  {
    id: 'mix',
    name: 'ميكس (دجاج & لحم)',
    nameEn: 'Mix Shawarma',
    icon: '🍖',
    description: 'المزيج الملوكي الشهي يجمع بين دجاج ليل ولحم العجل البلدي',
    subCategories: ['ساندويشات ميكس', 'وجبات ميكس'],
  },
  {
    id: 'lail-meals',
    name: 'وجبات ليل',
    nameEn: 'Leil Specials & Boxes',
    icon: '🍱',
    description: 'وجبات وبوكسات ليل المميزة (شاورما فرايز، بوكس ليل، والبوكس العائلي)',
    subCategories: ['وجبات خاصة', 'بوكسات ليل'],
  },
  {
    id: 'sides',
    name: 'الاضافات',
    nameEn: 'Sides & Salads',
    icon: '🍟',
    description: 'صحن بطاطا مقلية، علب صوصات وسلطات مشكلة طازجة',
    subCategories: ['بطاطا مقلية', 'صوصات ومقبلات'],
  },
  {
    id: 'drinks',
    name: 'مشروبات',
    nameEn: 'Beverages',
    icon: '🥤',
    description: 'كولا مثلجة، علب غازية، وعصائر منعشة تكمل وجبتك',
    subCategories: ['مشروبات غازية', 'عصائر منعشة'],
  },
];

export const MENU_ITEMS: MenuItem[] = [
  // ========================================================
  // 1. قسم دجاج (CHICKEN)
  // ========================================================
  {
    id: 'chk-laffa',
    name: 'شاورما دجاج - لفة',
    nameEn: 'Chicken Shawarma Laffa',
    description: 'شاورما دجاج متبلة بخبز اللفة المحمص مع الثومية والمخلل (غير شامل الكولا والبطاطا)',
    price: 15,
    categoryId: 'chicken',
    subCategory: 'ساندويشات',
    image: chickenWrapImg,
    isPopular: true,
    badge: 'الأكثر طلباً',
    calories: 480,
    options: {
      breads: ['خبز لفة محمص', 'خبز صاج مقرمش'],
      extras: [
        { id: 'cheese', name: 'إضافة جبنة شيدر / موزاريلا', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
        { id: 'spicy', name: 'شطة نار حارة', price: 1 },
      ],
      removals: ['بدون مخلل', 'بدون ثومية', 'بدون شطة'],
    },
  },
  {
    id: 'chk-kmaj',
    name: 'شاورما دجاج - كماج',
    nameEn: 'Chicken Shawarma Kmaj',
    description: 'شاورما دجاج بخبز الكماج الطري مع الثومية والبهارات الخاصة (غير شامل الكولا والبطاطا)',
    price: 12,
    categoryId: 'chicken',
    subCategory: 'ساندويشات',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
    calories: 420,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
      ],
      removals: ['بدون مخلل', 'بدون ثومية'],
    },
  },
  {
    id: 'chk-baguette',
    name: 'شاورما دجاج - باجيت',
    nameEn: 'Chicken Shawarma Baguette',
    description: 'ساندويش شاورما دجاج بخبز الباجيت الفرنسي المقرمش (غير شامل الكولا والبطاطا)',
    price: 18,
    categoryId: 'chicken',
    subCategory: 'ساندويشات',
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    calories: 540,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة شيدر', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
      ],
      removals: ['بدون مخلل', 'بدون ثومية'],
    },
  },
  {
    id: 'chk-arabi',
    name: 'وجبة عربي دجاج',
    nameEn: 'Chicken Arabi Meal',
    description: 'وجبة شاورما دجاج مقطعة ومحمرة مع البطاطا المقلية والثومية والمخللات (غير شامل الكولا)',
    price: 20,
    categoryId: 'chicken',
    subCategory: 'وجبات عربي',
    image: arabiMealImg,
    isPopular: true,
    badge: 'مميزة',
    calories: 780,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة ذائبة على الوجه', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
        { id: 'pomegranate', name: 'دبس رمان ليل', price: 2 },
      ],
      removals: ['بدون مخلل', 'بدون شطة'],
    },
  },
  {
    id: 'chk-arabi-super',
    name: 'وجبة عربي سوبر دجاج',
    nameEn: 'Chicken Arabi Super Meal',
    description: 'وجبة عربي سوبر دجاج مساحب ع الفحم، شامل الكولا والبطاطا والمقبلات الغنية',
    price: 30,
    categoryId: 'chicken',
    subCategory: 'وجبات عربي',
    image: arabiMealImg,
    isPopular: true,
    badge: 'شامل الكولا والبطاطا',
    calories: 950,
  },
  {
    id: 'chk-bashka',
    name: 'باشكا دجاج',
    nameEn: 'Chicken Bashka',
    description: 'باشكا شاورما دجاج محمرة على الصاج بنكهة غنية وجبنة ذائبة (غير شامل الكولا)',
    price: 20,
    categoryId: 'chicken',
    subCategory: 'ساندويشات',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    calories: 620,
    options: {
      extras: [
        { id: 'cheese_extra', name: 'جبنة إكسترا', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
      ],
    },
  },
  {
    id: 'chk-plate',
    name: 'صحن شاورما دجاج',
    nameEn: 'Chicken Shawarma Plate',
    description: 'شرائح شاورما دجاج طازجة بالصحن (صغير 15 ₪ / كبير 28 ₪ - غير شامل الكولا والبطاطا)',
    price: 15,
    categoryId: 'chicken',
    subCategory: 'صحون',
    image: heroShawarma,
    badge: 'صغير أو كبير',
    calories: 520,
    options: {
      sizes: [
        { name: 'صحن صغير (15 ₪)', priceDelta: 0 },
        { name: 'صحن كبير (28 ₪)', priceDelta: 13 },
      ],
      extras: [
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
        { id: 'cheese', name: 'إضافة جبنة ذائبة', price: 4 },
      ],
    },
  },

  // ========================================================
  // 2. قسم لحم (MEAT / BEEF)
  // ========================================================
  {
    id: 'beef-laffa',
    name: 'شاورما لحم - لفة',
    nameEn: 'Beef Shawarma Laffa',
    description: 'شاورما لحم عجل بلدي طازج بخبز اللفة المحمص مع صوص الطحينية والبقدونس (غير شامل الكولا والبطاطا)',
    price: 23,
    categoryId: 'beef',
    subCategory: 'ساندويشات',
    image: beefPlatterImg,
    isPopular: true,
    badge: 'عجل بلدي طازج',
    calories: 540,
    options: {
      breads: ['خبز لفة محمص', 'خبز صاج مقرمش'],
      extras: [
        { id: 'tahini_extra', name: 'صوص طحينية إكسترا', price: 2 },
        { id: 'cheese', name: 'إضافة جبنة', price: 4 },
        { id: 'pomegranate', name: 'دبس رمان', price: 2 },
      ],
      removals: ['بدون بصل وبقدونس', 'بدون طحينية'],
    },
  },
  {
    id: 'beef-kmaj',
    name: 'شاورما لحم - كماج',
    nameEn: 'Beef Shawarma Kmaj',
    description: 'شاورما لحم عجل بلدي بخبز الكماج الطري مع الطحينية والسلطة (غير شامل الكولا والبطاطا)',
    price: 18,
    categoryId: 'beef',
    subCategory: 'ساندويشات',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
    calories: 460,
    options: {
      extras: [
        { id: 'tahini_extra', name: 'طحينية إكسترا', price: 2 },
        { id: 'cheese', name: 'إضافة جبنة', price: 4 },
      ],
      removals: ['بدون بصل', 'بدون طحينية'],
    },
  },
  {
    id: 'beef-baguette',
    name: 'شاورما لحم - باجيت',
    nameEn: 'Beef Shawarma Baguette',
    description: 'ساندويش شاورما لحم عجل بلدي بخبز الباجيت الفرنسي المقرمش (غير شامل الكولا والبطاطا)',
    price: 25,
    categoryId: 'beef',
    subCategory: 'ساندويشات',
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    calories: 590,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة', price: 4 },
        { id: 'tahini_extra', name: 'طحينية إكسترا', price: 2 },
      ],
    },
  },
  {
    id: 'beef-arabi',
    name: 'وجبة عربي لحم',
    nameEn: 'Beef Arabi Meal',
    description: 'وجبة شاورما لحم عجل بلدي مقطعة ومحمرة مع البطاطا وصوص الطحينية والمخللات (غير شامل الكولا)',
    price: 35,
    categoryId: 'beef',
    subCategory: 'وجبات عربي',
    image: beefPlatterImg,
    isPopular: true,
    badge: 'لحم بلدي فاخر',
    calories: 840,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة ذائبة', price: 4 },
        { id: 'tahini_extra', name: 'طحينية إكسترا', price: 2 },
      ],
    },
  },
  {
    id: 'beef-arabi-super',
    name: 'وجبة عربي سوبر لحم',
    nameEn: 'Beef Arabi Super Meal',
    description: 'وجبة عربي سوبر لحم عجل مساحب ع الفحم، شامل الكولا والبطاطا والمقبلات الغنية',
    price: 50,
    categoryId: 'beef',
    subCategory: 'وجبات عربي',
    image: beefPlatterImg,
    isPopular: true,
    badge: 'شامل الكولا والبطاطا',
    calories: 1050,
  },
  {
    id: 'beef-bashka',
    name: 'باشكا لحم',
    nameEn: 'Beef Bashka',
    description: 'باشكا شاورما لحم عجل بلدي محشوة ومحمرة بنكهة الشواء الخاصة والجبن (غير شامل الكولا)',
    price: 35,
    categoryId: 'beef',
    subCategory: 'ساندويشات',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    calories: 680,
  },
  {
    id: 'beef-plate',
    name: 'صحن شاورما لحم عجل',
    nameEn: 'Beef Shawarma Plate',
    description: 'شرائح لحم عجل بلدي طازجة بالصحن (250 غرام 28 ₪ / 500 غرام 55 ₪ - غير شامل الكولا والبطاطا)',
    price: 28,
    categoryId: 'beef',
    subCategory: 'صحون',
    image: beefPlatterImg,
    badge: '250غ أو 500غ',
    calories: 610,
    options: {
      sizes: [
        { name: '250 غرام (28 ₪)', priceDelta: 0 },
        { name: '500 غرام (55 ₪)', priceDelta: 27 },
      ],
      extras: [
        { id: 'tahini_extra', name: 'طحينية إكسترا', price: 2 },
        { id: 'pomegranate', name: 'دبس رمان', price: 2 },
      ],
    },
  },

  // ========================================================
  // 3. قسم ميكس (دجاج & لحم) (MIX)
  // ========================================================
  {
    id: 'mix-laffa',
    name: 'شاورما ميكس - لفة',
    nameEn: 'Mix Shawarma Laffa',
    description: 'مزيج فاخر من شاورما الدجاج ولحم العجل بخبز اللفة المحمص (غير شامل الكولا والبطاطا)',
    price: 18,
    categoryId: 'mix',
    subCategory: 'ساندويشات ميكس',
    image: chickenWrapImg,
    isPopular: true,
    badge: 'ميكس ليل الشهير',
    calories: 510,
    options: {
      breads: ['خبز لفة محمص', 'خبز صاج مقرمش'],
      extras: [
        { id: 'cheese', name: 'إضافة جبنة', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
        { id: 'tahini_extra', name: 'طحينية إكسترا', price: 2 },
      ],
    },
  },
  {
    id: 'mix-baguette',
    name: 'شاورما ميكس - باجيت',
    nameEn: 'Mix Shawarma Baguette',
    description: 'ساندويش ميكس دجاج ولحم عجل بخبز الباجيت الفرنسي المقرمش (غير شامل الكولا والبطاطا)',
    price: 22,
    categoryId: 'mix',
    subCategory: 'ساندويشات ميكس',
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    calories: 560,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة شيدر', price: 4 },
      ],
    },
  },
  {
    id: 'mix-bashka',
    name: 'باشكا ميكس',
    nameEn: 'Mix Bashka',
    description: 'باشكا محشوة بخليط شاورما الدجاج واللحم والجبن ومحمرة بالفرن (غير شامل الكولا)',
    price: 28,
    categoryId: 'mix',
    subCategory: 'وجبات ميكس',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    calories: 650,
  },
  {
    id: 'mix-arabi',
    name: 'وجبة عربي ميكس',
    nameEn: 'Mix Arabi Meal',
    description: 'وجبة عربي ميكس دجاج ولحم مقطعة مع البطاطا والثومية والطحينية والمخللات (غير شامل الكولا)',
    price: 28,
    categoryId: 'mix',
    subCategory: 'وجبات ميكس',
    image: arabiMealImg,
    isPopular: true,
    badge: 'ميكس ملوكي',
    calories: 820,
    options: {
      extras: [
        { id: 'cheese', name: 'إضافة جبنة ذائبة', price: 4 },
        { id: 'garlic_extra', name: 'ثومية إكسترا', price: 2 },
      ],
    },
  },

  // ========================================================
  // 4. قسم وجبات ليل (LEIL SPECIALS & BOXES)
  // ========================================================
  {
    id: 'leil-shawarma-fries',
    name: 'شاورما فرايز',
    nameEn: 'Shawarma Fries',
    description: 'بطاطس مقلية مقرمشة، شرائح شاورما، حمص، جبنة شيدر، قطع هاليبنو حارة، مع كولا شات 250 مل',
    price: 20,
    categoryId: 'lail-meals',
    subCategory: 'وجبات خاصة',
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
    isPopular: true,
    badge: 'شامل كولا شات 250مل',
    calories: 720,
    options: {
      extras: [
        { id: 'cheese_extra', name: 'شيدر إكسترا', price: 4 },
        { id: 'jalapeno_extra', name: 'هاليبنو إكسترا', price: 2 },
      ],
      removals: ['بدون هاليبنو (غير حار)', 'بدون حمص'],
    },
  },
  {
    id: 'leil-box',
    name: 'بوكس ليل',
    nameEn: 'Leil Box',
    description: '10 قطع عربي، بطاطا مقلية، سلطات مشكل، صوصات ليل، مع كولا لتر وربع',
    price: 80,
    categoryId: 'lail-meals',
    subCategory: 'بوكسات ليل',
    image: familyBoxImg,
    isPopular: true,
    badge: 'شامل كولا 1.25 لتر',
    calories: 1850,
  },
  {
    id: 'leil-family-box',
    name: 'بوكس عائلي',
    nameEn: 'Family Box',
    description: '10 قطع عربي، باشكا 6 قطع، قطع عجين بطاطا، سلطات مشكل، صوصات متنوعة، مع 2 كولا لتر وربع',
    price: 200,
    categoryId: 'lail-meals',
    subCategory: 'بوكسات ليل',
    image: familyBoxImg,
    isPopular: true,
    badge: 'الوليمة الكبرى · 2 كولا 1.25 لتر',
    calories: 3800,
  },

  // ========================================================
  // 5. قسم الاضافات (SIDES & EXTRAS)
  // ========================================================
  {
    id: 'side-fries',
    name: 'صحن بطاطا',
    nameEn: 'French Fries Plate',
    description: 'بطاطا مقلية ذهبية مقرمشة وساخنة مع بهارات ليل الخاصة (صغير 5 ₪ / كبير 10 ₪)',
    price: 5,
    categoryId: 'sides',
    subCategory: 'بطاطا مقلية',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    badge: 'صغير أو كبير',
    calories: 340,
    options: {
      sizes: [
        { name: 'صحن بطاطا صغير (5 ₪)', priceDelta: 0 },
        { name: 'صحن بطاطا كبير (10 ₪)', priceDelta: 5 },
      ],
      extras: [
        { id: 'melted_cheese', name: 'إضافة جبنة شيدر ذائبة', price: 4 },
        { id: 'garlic_dip', name: 'علبة ثومية جانبية', price: 2 },
      ],
    },
  },
  {
    id: 'side-sauce-cup',
    name: 'علبة صوص أو سلطة صغيرة',
    nameEn: 'Sauce / Small Salad Cup',
    description: 'علبة صوص ثومية، طحينية، شطة أو أي علبة سلطات صغيرة',
    price: 2,
    categoryId: 'sides',
    subCategory: 'صوصات ومقبلات',
    image: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=600&q=80',
    options: {
      breads: ['صوص ثومية ليل', 'صوص طحينية بلدي', 'صوص شطة حارة', 'دبس رمان أصلي', 'مخللات مشكلة'],
    },
  },
  {
    id: 'side-mixed-salads',
    name: 'سلطات مشكلة',
    nameEn: 'Mixed Salads Plate',
    description: 'صحن سلطات مشكلة طازجة يضم 5 أنواع من المقبلات والسلطات الغنية',
    price: 7,
    categoryId: 'sides',
    subCategory: 'صوصات ومقبلات',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    badge: '5 أنواع مشكلة',
    calories: 180,
  },

  // ========================================================
  // 6. قسم مشروبات (BEVERAGES)
  // ========================================================
  {
    id: 'drink-cola-1-25',
    name: 'كولا لتر وربع',
    nameEn: 'Cola 1.25L Bottle',
    description: 'زجاجة كوكاكولا مثلجة حجم عائلي 1.25 لتر',
    price: 4,
    categoryId: 'drinks',
    subCategory: 'مشروبات غازية',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    calories: 520,
  },
  {
    id: 'drink-cola-can',
    name: 'علبة كولا',
    nameEn: 'Cola Can 330ml',
    description: 'كان مثلج منعش 330 مل (كوكاكولا، سبرايت، فانتا)',
    price: 2,
    categoryId: 'drinks',
    subCategory: 'مشروبات غازية',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    calories: 140,
    options: {
      breads: ['كوكاكولا كلاسيك', 'سبرايت ليمون', 'فانتا برتقال', 'كوكاكولا زيرو'],
    },
  },
  {
    id: 'drink-glass-juice',
    name: 'عصير زجاج',
    nameEn: 'Glass Bottle Juice',
    description: 'عصير طبيعي مثلج بعبوة زجاجية باردة',
    price: 2,
    categoryId: 'drinks',
    subCategory: 'عصائر منعشة',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    calories: 110,
    options: {
      breads: ['عصير مانجا', 'عصير برتقال', 'عصير تفاح', 'عصير فراولة وموز'],
    },
  },
  {
    id: 'drink-juice-pack',
    name: 'عصير',
    nameEn: 'Juice Pack',
    description: 'عبوة عصير بارد منعش',
    price: 1,
    categoryId: 'drinks',
    subCategory: 'عصائر منعشة',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    calories: 80,
  },
];
