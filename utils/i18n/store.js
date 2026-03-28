import { create } from 'zustand';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { DevSettings, I18nManager, Platform } from 'react-native';

const LANGUAGE_KEY = 'app-language';
const SUPPORTED_LANGUAGES = ['ar', 'en'];
const FALLBACK_LANGUAGE = 'ar';
const isExpoGo = Constants.appOwnership === 'expo';

const getDeviceLocale = () => getLocales()?.[0] ?? null;

const normalizeLanguage = (language) =>
  typeof language === 'string' && SUPPORTED_LANGUAGES.includes(language) ? language : null;

const resolvePreferredLanguage = (savedLanguage) =>
  normalizeLanguage(savedLanguage) ??
  normalizeLanguage(getDeviceLocale()?.languageCode) ??
  FALLBACK_LANGUAGE;

const syncNativeLayoutDirection = async (isRTL) => {
  if (Platform.OS === 'web' || I18nManager.isRTL === isRTL) {
    return;
  }

  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);

  if (__DEV__ || isExpoGo) {
    console.warn(
      '[i18n] RTL direction changed. Expo Go/dev will not fully reload native layout direction, especially on Android. Verify direction changes in a development or production build after restart.'
    );
    return;
  }

  try {
    await Updates.reloadAsync();
  } catch (error) {
    console.warn('[i18n] Failed to reload after RTL change:', error);
    if (!isExpoGo) {
      DevSettings.reload();
    }
  }
};

// Arabic translations
const ar = {
  // Common
  common: {
    next: 'التالي',
    back: 'رجوع',
    start: 'ابدأ الآن',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    send: 'إرسال',
    done: 'تم',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    success: 'تم بنجاح',
    search: 'بحث',
    noResults: 'لا توجد نتائج',
    selectLanguage: 'اختر اللغة',
    arabic: 'العربية',
    english: 'English',
    sar: 'ر.س',
  },
  
  // Onboarding
  onboarding: {
    welcome: 'مرحباً بك في',
    appName: 'وسيط الان',
    selectLanguage: 'اختر لغتك المفضلة',
    screen1Title: "وسيط الآن",
    screen1Subtitle: "بعد أكثر من عامين من العمل والتطوير، نُطلق لكم تطبيقنا كمنصة موثوقة للوساطة المالية وخدمات التعقيب والتنازل عن العمالة المنزلية.\nنربط بين الأطراف باحترافية عالية ونوفر بيئة آمنة تحفظ الحقوق وتضمن الجدية.\nنلتزم بالشفافية الكاملة ونعتمد آلية واضحة تحمي جميع الأطراف حتى إنجاز الخدمة.\nهدفنا ليس مجرد إتمام صفقة، بل بناء ثقة دائمة وتجربة آمنة ومضمونة للجميع.\nمعنا… الأمان أولاً، والإنجاز مضمون",
    screen2Title: "قسم التنازل",
    screen2Subtitle: "يتيح لك هذا القسم عرض ونقل العقود المتبقية للعمالة المنزلية بكل أمان وشفافية. يمكنك البحث عن عاملة منزلية والتواصل مباشرة مع صاحب العمل السابق للاطلاع على التفاصيل بكل وضوح. كما يمكنك إضافة إعلان إذا كان لديك عمالة ترغب بالتنازل عن عقودهم المتبقية. يتم حجز مبلغ الاتفاق داخل التطبيق ولا يُحوَّل إلا بعد انتهاء فترة التجربة، والتأكد من رضا جميع الأطراف، وإتمام نقل الخدمات رسميًا.",
    screen3Title: "قسم التعقيب",
    screen3Subtitle: "أنجز معاملاتك الحكومية والإدارية عبر معقبين معتمدين في مختلف الجهات والدوائر. تصفح الإعلانات، اختر مقدم الخدمة المناسب، ويتم حجز المبلغ بأمان حتى انتهاء التنفيذ. كما يمكنك إضافة إعلانك إذا كنت تقدم خدمات تعقيب أو خدمات عامة في أي قطاع، والوصول لعملاء موثوقين عبر بيئة مضمونة.",
    screen4Title: "قسم الضامن (الوساطة المالية)",
    screen4Subtitle: "لحماية أموالك وضمان حقوقك في أي اتفاق بينك وبين طرف آخر (بيع، شراء، تقديم خدمة). يقوم التطبيق بدور الوسيط المالي، حيث يتم إيداع المبلغ لدينا كطرف محايد، ولا يتم تحويله للطرف الثاني إلا بعد إتمام الاتفاق المتفق عليه. حماية كاملة من الاحتيال، راحة بال، وضمان لجدية التعامل.",
    getStarted: 'ابدأ الآن',
    services: [
      'تجديد إقامة',
      'نقل كفالة',
      'تعديل بيانات',
    ],
  },
  
  // Home
  home: {
    greeting: 'مرحباً بك',
    selectService: 'اختر الخدمة المطلوبة',
    tanazul: 'التنازل عن العقود',
    tanazulDesc: 'نقل كفالة العمالة المنزلية بسهولة',
    taqib: 'خدمات التعقيب',
    taqibDesc: 'إنجاز المعاملات الحكومية',
    dhamen: 'خدمة الضامن',
    dhamenDesc: 'ضمان حقوقك المالية والقانونية',
  },
  
  // Chat
  chat: {
    title: 'المحادثة',
    typeMessage: 'اكتب رسالتك...',
    receipt: 'فاتورة',
    library: 'المكتبة',
    attachFile: 'إرفاق ملف',
    attachImage: 'إرفاق صورة',
    shareLocation: 'مشاركة الموقع',
    send: 'إرسال',
    noMedia: 'لا توجد وسائط سابقة',
    createReceipt: 'إنشاء فاتورة',
    previousMedia: 'الوسائط السابقة',
    receiptStates: {
      draft: 'مسودة',
      sellerSigned: 'موقع من البائع',
      final: 'نهائي',
    },
    acceptAndSign: 'قبول وتوقيع',
    viewReceiptPdf: 'عرض PDF',
    payNow: 'ادفع الآن',
    paymentLink: 'رابط الدفع',
  },
  
  // Dhamen (Escrow)
  dhamen: {
    title: 'اتفاقية ضمان جديدة',
    serviceOwnerMobile: 'رقم جوال صاحب الخدمة',
    serviceProviderMobile: 'رقم جوال مقدم الخدمة',
    serviceTypeOrDetails: 'نوع الخدمة أو تفاصيل',
    servicePeriodStart: 'بداية فترة الخدمة',
    completionDays: 'عدد أيام الإنجاز',
    value: 'القيمة',
    commission: 'العمولة',
    tax: 'الضريبة',
    total: 'الإجمالي',
    sendRequest: 'إرسال الطلب',
    sending: 'جاري الإرسال...',
    requestSent: 'تم الإرسال!',
    requestSentMessage: 'تم إرسال طلب الضمان بنجاح',
    ok: 'موافق',
    enterMobile: 'أدخل رقم الجوال',
    enterDetails: 'أدخل التفاصيل',
    selectDate: 'اختر التاريخ',
    enterDays: 'أدخل عدد الأيام',
    enterAmount: 'أدخل المبلغ',
  },

  // Profile
  profile: {
    title: 'الملف الشخصي',
    account: 'الحساب',
    personal: 'المعلومات الشخصية',
    wallet: 'المحفظة',
    payment: 'طرق الدفع',
    notifications: 'الإشعارات',
    appSettings: 'إعدادات التطبيق',
    language: 'اللغة',
    darkMode: 'الوضع الليلي',
    support: 'الدعم والمساعدة',
    security: 'الأمان والخصوصية',
    help: 'مركز المساعدة',
    logout: 'تسجيل الخروج',
    myAds: 'إعلاناتي',
    orders: 'طلبات',
    rating: 'تقييم',
    noAds: 'لم تقم بإضافة أي إعلانات بعد',
    deleteAd: 'حذف الإعلان',
    deleteAdConfirm: 'هل أنت متأكد من حذف هذا الإعلان؟',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    logoutConfirm: 'هل أنت متأكد من تسجيل الخروج؟',
    guest: 'زائر',
    login: 'تسجيل الدخول',
    error: 'خطأ',
    failedToDelete: 'فشل حذف الإعلان',
    deleted: 'تم الحذف',
    adDeleted: 'تم حذف الإعلان بنجاح',
    failedToSignOut: 'فشل تسجيل الخروج',
    // Security page
    deleteAccount: 'حذف الحساب',
    deleteAccountDesc: 'سيتم حذف حسابك وجميع بياناتك نهائياً. لا يمكن التراجع عن هذا الإجراء.',
    deleteAccountConfirm: 'هل أنت متأكد من حذف حسابك؟ سيتم حذف جميع بياناتك ولا يمكن استرجاعها.',
    deleteAccountButton: 'حذف حسابي نهائياً',
    accountDeleted: 'تم حذف الحساب',
    accountDeletedDesc: 'تم حذف حسابك بنجاح',
    failedToDeleteAccount: 'فشل حذف الحساب',
    dataPrivacy: 'خصوصية البيانات',
    dataPrivacyDesc: 'نحن نحمي بياناتك الشخصية ولا نشاركها مع أطراف خارجية بدون إذنك.',
    // Help page
    aboutApp: 'عن التطبيق',
    appVersion: 'إصدار التطبيق',
    contactUs: 'تواصل معنا',
    contactEmail: 'البريد الإلكتروني للدعم',
    contactPhone: 'رقم الدعم',
    faq: 'الأسئلة الشائعة',
    faqQ1: 'كيف أنشئ إعلان جديد؟',
    faqA1: 'اضغط على زر "+" في الشاشة الرئيسية واختر نوع الإعلان ثم أكمل البيانات المطلوبة.',
    faqQ2: 'كيف يعمل نظام الضامن؟',
    faqA2: 'نظام الضامن يحمي المعاملات بين الطرفين حيث يتم حجز المبلغ حتى إتمام الخدمة.',
    faqQ3: 'كيف أسحب رصيدي من المحفظة؟',
    faqA3: 'اذهب إلى المحفظة ثم اضغط على "سحب" وأدخل بيانات الحساب البنكي والمبلغ المطلوب.',
  },
};

// English translations
const en = {
  // Common
  common: {
    next: 'Next',
    back: 'Back',
    start: 'Get Started',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    send: 'Send',
    done: 'Done',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    search: 'Search',
    noResults: 'No results found',
    selectLanguage: 'Select Language',
    arabic: 'العربية',
    english: 'English',
    sar: 'SAR',
  },
  
  // Onboarding
  onboarding: {
    welcome: 'Welcome to',
    appName: 'Waseet Alan',
    selectLanguage: 'Choose your preferred language',
    screen1Title: "Waseet Alan",
    screen1Subtitle: "After more than two years of development, we launch our app as a reliable platform for financial brokerage, follow-up, and domestic worker contract transfers.\nWe connect parties professionally and provide a secure environment that protects rights and ensures seriousness.\nWe commit to full transparency with clear mechanisms that protect everyone until the service is done.\nOur goal isn't just a deal, but building lasting trust and a secure experience.\nWith us... Safety first, achievement guaranteed.",
    screen2Title: "Contract Transfer Section",
    screen2Subtitle: "This section allows you to offer and transfer remaining domestic worker contracts with complete security and transparency. You can search for a domestic worker and communicate directly with the previous employer to view details clearly. You can also post an ad if you have workers whose remaining contracts you wish to transfer. The agreement amount is held within the app and is only transferred after the trial period ends, ensuring all parties are satisfied and the transfer of services is officially completed.",
    screen3Title: "Follow-up Services",
    screen3Subtitle: "Complete your government and administrative transactions through certified agents across various departments. Browse ads, choose the right service provider, and your payment is securely held until execution is complete. You can also post your own ad if you offer these services, reaching trusted clients in a guaranteed environment.",
    screen4Title: "Damin (Financial Escrow)",
    screen4Subtitle: "To protect your funds and ensure your rights in any agreement (buying, selling, or services). The app acts as a financial broker; funds are deposited with us as a neutral party and only transferred to the second party after the agreed terms are fulfilled. Complete protection from fraud, peace of mind, and a guarantee of serious dealing.",
    getStarted: 'Get Started',
    services: [
      'Iqama Renewal',
      'Sponsorship Transfer',
      'Data Update',
    ],
  },
  
  // Home
  home: {
    greeting: 'Welcome',
    selectService: 'Select the service you need',
    tanazul: 'Contract Transfer',
    tanazulDesc: 'Easy domestic worker sponsorship transfer',
    taqib: 'Follow-up Services',
    taqibDesc: 'Government transaction processing',
    dhamen: 'Escrow Service',
    dhamenDesc: 'Protect your financial and legal rights',
  },
  
  // Chat
  chat: {
    title: 'Chat',
    typeMessage: 'Type your message...',
    receipt: 'Receipt',
    library: 'Library',
    attachFile: 'Attach File',
    attachImage: 'Attach Image',
    shareLocation: 'Share Location',
    send: 'Send',
    noMedia: 'No previous media',
    createReceipt: 'Create Receipt',
    previousMedia: 'Previous Media',
    receiptStates: {
      draft: 'Draft',
      sellerSigned: 'Signed by Seller',
      final: 'Final',
    },
    acceptAndSign: 'Accept & Sign',
    viewReceiptPdf: 'View PDF',
    payNow: 'Pay Now',
    paymentLink: 'Payment Link',
  },
  
  // Dhamen (Escrow)
  dhamen: {
    title: 'New Escrow Agreement',
    serviceOwnerMobile: 'Service Owner Mobile',
    serviceProviderMobile: 'Service Provider Mobile',
    serviceTypeOrDetails: 'Service Type or Details',
    servicePeriodStart: 'Service Period Start',
    completionDays: 'Completion Days',
    value: 'Value',
    commission: 'Commission',
    tax: 'Tax',
    total: 'Total',
    sendRequest: 'Send Request',
    sending: 'Sending...',
    requestSent: 'Sent!',
    requestSentMessage: 'Escrow request sent successfully',
    ok: 'OK',
    enterMobile: 'Enter mobile number',
    enterDetails: 'Enter details',
    selectDate: 'Select date',
    enterDays: 'Enter number of days',
    enterAmount: 'Enter amount',
  },

  // Profile
  profile: {
    title: 'Profile',
    account: 'Account',
    personal: 'Personal Information',
    wallet: 'Wallet',
    payment: 'Payment Methods',
    notifications: 'Notifications',
    appSettings: 'App Settings',
    language: 'Language',
    darkMode: 'Dark Mode',
    support: 'Support',
    security: 'Security & Privacy',
    help: 'Help Center',
    logout: 'Logout',
    myAds: 'My Ads',
    orders: 'Orders',
    rating: 'Rating',
    noAds: "You haven't posted any ads yet",
    deleteAd: 'Delete Ad',
    deleteAdConfirm: 'Are you sure you want to delete this ad?',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    logoutConfirm: 'Are you sure you want to sign out?',
    guest: 'Guest',
    login: 'Login',
    error: 'Error',
    failedToDelete: 'Failed to delete ad',
    deleted: 'Deleted',
    adDeleted: 'Ad deleted successfully',
    failedToSignOut: 'Failed to sign out',
    // Security page
    deleteAccount: 'Delete Account',
    deleteAccountDesc: 'Your account and all your data will be permanently deleted. This action cannot be undone.',
    deleteAccountButton: 'Delete My Account Permanently',
    deleteAccountConfirm: 'Are you sure you want to delete your account? All your data will be permanently removed and cannot be recovered.',
    accountDeleted: 'Account Deleted',
    accountDeletedDesc: 'Your account has been deleted successfully',
    failedToDeleteAccount: 'Failed to delete account',
    dataPrivacy: 'Data Privacy',
    dataPrivacyDesc: 'We protect your personal data and do not share it with third parties without your consent.',
    // Help page
    aboutApp: 'About the App',
    appVersion: 'App Version',
    contactUs: 'Contact Us',
    contactEmail: 'Support Email',
    contactPhone: 'Support Phone',
    faq: 'FAQ',
    faqQ1: 'How do I create a new ad?',
    faqA1: 'Tap the "+" button on the home screen, choose the ad type, and fill in the required details.',
    faqQ2: 'How does the escrow (Damin) system work?',
    faqA2: 'The escrow system protects transactions between parties by holding the payment until the service is completed.',
    faqQ3: 'How do I withdraw my wallet balance?',
    faqA3: 'Go to Wallet, tap "Withdraw", and enter your bank account details and the desired amount.',
  },
};

const translations = { ar, en };

export const getRTLRowDirection = (isRTL) => {
  // Rely on the active native/layout direction instead of compensating in JS.
  // Manual mismatch flipping caused Android double-reversal when the native RTL
  // state and JS language state were temporarily out of sync.
  return 'row';
};

export const getRTLInverseRowDirection = () => 'row-reverse';

export const getRTLTextAlign = (isRTL) => (isRTL ? 'right' : 'left');

export const pickRTLValue = (isRTL, rtlValue, ltrValue) => (isRTL ? rtlValue : ltrValue);

export const getRTLStartAlign = (isRTL) => (isRTL ? 'flex-end' : 'flex-start');

export const getRTLEndAlign = (isRTL) => (isRTL ? 'flex-start' : 'flex-end');

const getDirectionSnapshot = (language) => {
  const locale = getDeviceLocale();
  const isRTL = language === 'ar';

  return {
    language,
    isRTL,
    t: translations[language],
    locale: locale?.languageTag ?? null,
    localeTextDirection: locale?.textDirection ?? (isRTL ? 'rtl' : 'ltr'),
    rowDirection: getRTLRowDirection(isRTL),
    textAlign: getRTLTextAlign(isRTL),
    writingDirection: isRTL ? 'rtl' : 'ltr',
    startAlign: getRTLStartAlign(isRTL),
    endAlign: getRTLEndAlign(isRTL),
    backIcon: isRTL ? 'forward' : 'back',
  };
};

export const useLanguageStore = create((set, get) => ({
  ...getDirectionSnapshot(FALLBACK_LANGUAGE),
  
  setLanguage: async (language) => {
    const nextLanguage = resolvePreferredLanguage(language);
    const nextSnapshot = getDirectionSnapshot(nextLanguage);

    await SecureStore.setItemAsync(LANGUAGE_KEY, nextLanguage);
    set(nextSnapshot);
    await syncNativeLayoutDirection(nextSnapshot.isRTL);
  },
  
  toggleLanguage: async () => {
    const currentLang = get().language;
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    await get().setLanguage(newLang);
  },
  
  initLanguage: async () => {
    try {
      const savedLang = await SecureStore.getItemAsync(LANGUAGE_KEY);
      const initialSnapshot = getDirectionSnapshot(resolvePreferredLanguage(savedLang));
      set(initialSnapshot);
      // Only set direction flags — do NOT reload during init.
      // Reloading here causes an infinite loop because forceRTL
      // state doesn't persist through Updates.reloadAsync().
      // syncNativeLayoutDirection (with reload) is called from
      // setLanguage/toggleLanguage when the user explicitly changes language.
      if (Platform.OS !== 'web' && I18nManager.isRTL !== initialSnapshot.isRTL) {
        I18nManager.allowRTL(initialSnapshot.isRTL);
        I18nManager.forceRTL(initialSnapshot.isRTL);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  },
}));

export const useLanguage = () => {
  const {
    language,
    isRTL,
    t,
    locale,
    localeTextDirection,
    rowDirection,
    textAlign,
    writingDirection,
    startAlign,
    endAlign,
    backIcon,
    setLanguage,
    toggleLanguage,
  } = useLanguageStore();

  return {
    language,
    isRTL,
    t,
    locale,
    localeTextDirection,
    rowDirection,
    textAlign,
    writingDirection,
    startAlign,
    endAlign,
    backIcon,
    setLanguage,
    toggleLanguage,
  };
};

export const useTranslation = () => {
  const {
    t,
    language,
    isRTL,
    locale,
    localeTextDirection,
    rowDirection,
    textAlign,
    writingDirection,
    startAlign,
    endAlign,
    backIcon,
  } = useLanguageStore();

  return {
    t,
    language,
    isRTL,
    locale,
    localeTextDirection,
    rowDirection,
    textAlign,
    writingDirection,
    startAlign,
    endAlign,
    backIcon,
  };
};
