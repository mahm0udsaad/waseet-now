import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';

const LANGUAGE_KEY = 'app-language';

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
    appName: 'كافل',
    selectLanguage: 'اختر لغتك المفضلة',
    screen1Title: 'كافل',
    screen1Subtitle: 'كل خدماتك في مكان واحد',
    screen2Title: 'التنازل بسهولة وأمان',
    screen2Subtitle: 'نظافة – رعاية – عقود العمالة',
    screen3Title: 'إجراءات حكومية أسرع',
    screen3Subtitle: 'تجديد إقامة – نقل كفالة – تعديل بيانات',
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
    appName: 'Kafel',
    selectLanguage: 'Choose your preferred language',
    screen1Title: 'Kafel',
    screen1Subtitle: 'All your services in one place',
    screen2Title: 'Secure Contract Transfer',
    screen2Subtitle: 'Cleaning – Care – Domestic worker contracts',
    screen3Title: 'Faster Government Services',
    screen3Subtitle: 'Iqama renewal – Transfer – Data update',
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
};

const translations = { ar, en };

export const useLanguageStore = create((set, get) => ({
  language: 'ar', // 'ar' | 'en'
  isRTL: true,
  t: ar,
  
  setLanguage: async (language) => {
    const isRTL = language === 'ar';
    const t = translations[language];
    
    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
    
    // Note: Full RTL changes require app restart
    // I18nManager.allowRTL(isRTL);
    // I18nManager.forceRTL(isRTL);
    
    set({ language, isRTL, t });
  },
  
  toggleLanguage: async () => {
    const currentLang = get().language;
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    await get().setLanguage(newLang);
  },
  
  initLanguage: async () => {
    try {
      const savedLang = await SecureStore.getItemAsync(LANGUAGE_KEY);
      if (savedLang === 'ar' || savedLang === 'en') {
        const isRTL = savedLang === 'ar';
        const t = translations[savedLang];
        set({ language: savedLang, isRTL, t });
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  },
}));

export const useLanguage = () => {
  const { language, isRTL, t, setLanguage, toggleLanguage } = useLanguageStore();
  return { language, isRTL, t, setLanguage, toggleLanguage };
};

export const useTranslation = () => {
  const { t, language, isRTL } = useLanguageStore();
  return { t, language, isRTL };
};

