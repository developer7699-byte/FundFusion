import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'en' | 'hi'

export interface LanguageContextType {
  language: Language
  languageName: string
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const STORAGE_KEY = 'fundfusion_language'

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Dock Navigation
    'nav.home': 'Home',
    'nav.leaderboard': 'Leaderboard',
    'nav.scan': 'Scan & Pay',
    'nav.transactions': 'Transactions',
    'nav.menu': 'Menu',

    // Top Header
    'header.search': 'Search Gift Vouchers, bills...',
    'header.scan': 'Scan QR',
    'header.help': 'Help & Support',
    'header.notifications': 'Notifications',
    'header.themeLight': 'Switch to Light Mode',
    'header.themeDark': 'Switch to Dark Mode',

    // Dashboard
    'dash.totalAssets': 'Total Assets',
    'dash.deposit': 'Deposit',
    'dash.sell': 'Sell Crypto',
    'dash.buy': 'Buy Crypto',
    'dash.instantUpi': 'Instant UPI & QR Settlements',
    'dash.scanQr': 'Scan QR',
    'dash.allServices': 'All Services',
    'dash.backHome': 'Back to Home',
    'dash.wallet': 'Wallet',
    'dash.bills': 'Bills & Utility',
    'dash.gifts': 'Gift Cards',
    'dash.offers': 'Offers',
    'dash.cards': 'Virtual Cards',
    'dash.community': 'Refer & Earn',
    'dash.more': 'More',

    // Profile & Settings
    'profile.title': 'Profile & Settings',
    'profile.subtitle': 'Account security & preferences',
    'profile.generalSettings': 'GENERAL SETTINGS',
    'profile.managePayments': 'Manage Payments',
    'profile.buyMethods': 'Buy Methods',
    'profile.verifyBank': 'Verify bank',
    'profile.language': 'Language',
    'profile.displayCurrency': 'Display Currency',
    'profile.appearance': 'Appearance',
    'profile.withdrawAddress': 'Withdraw Address',
    'profile.notificationSettings': 'Notification Settings',
    'profile.rateAlerts': 'Rate Alerts',
    'profile.helpSupport': 'HELP & SUPPORT',
    'profile.appTour': 'Take the App Tour',
    'profile.contactSupport': 'Contact Support',
    'profile.shareFeedback': 'Share Feedback',
    'profile.privacyPolicy': 'Privacy Policy',
    'profile.logout': 'Log out',
    'profile.methods': 'Methods',
    'profile.addresses': 'Addresses',
    'profile.darkMode': 'Dark Mode',
    'profile.whiteMode': 'Light Mode',
    'profile.copyUsername': 'Copy Username',
    'profile.copied': 'Copied!',
    'profile.vipProgress': '500 USDT to Silver',

    // Modals
    'modal.contactSupport': 'Contact Customer Support',
    'modal.emailSupport': 'Email Support',
    'modal.emailDesc': 'Official 24/7 dispute resolution and customer assistance desk.',
    'modal.emailResponse': 'Response within 2 hours for transaction disputes.',
    'modal.sendEmail': 'Send Email Now',
    'modal.copyEmail': 'Copy Email Address',
    'modal.selectLanguage': 'Select Language',
    'modal.english': 'English',
    'modal.hindi': 'हिंदी (Hindi)',
  },
  hi: {
    // Dock Navigation
    'nav.home': 'होम',
    'nav.leaderboard': 'लीडरबोर्ड',
    'nav.scan': 'स्कैन व पे',
    'nav.transactions': 'लेन-देन',
    'nav.menu': 'मेनू',

    // Top Header
    'header.search': 'गिफ्ट वाउचर, बिल खोजें...',
    'header.scan': 'क्यूआर स्कैन',
    'header.help': 'सहायता और समर्थन',
    'header.notifications': 'सूचनाएं',
    'header.themeLight': 'लाइट मोड चालू करें',
    'header.themeDark': 'डार्क मोड चालू करें',

    // Dashboard
    'dash.totalAssets': 'कुल संपत्ति',
    'dash.deposit': 'जमा करें',
    'dash.sell': 'क्रिप्टो बेचें',
    'dash.buy': 'क्रिप्टो खरीदें',
    'dash.instantUpi': 'तुरंत यूपीआई और क्यूआर भुगतान',
    'dash.scanQr': 'स्कैन करें',
    'dash.allServices': 'सभी सेवाएं',
    'dash.backHome': 'वापस होम पर जाएं',
    'dash.wallet': 'वॉलेट',
    'dash.bills': 'बिल व रिचार्ज',
    'dash.gifts': 'गिफ्ट कार्ड्स',
    'dash.offers': 'ऑफर्स',
    'dash.cards': 'वर्चुअल कार्ड्स',
    'dash.community': 'रेफर व कमाएं',
    'dash.more': 'और देखें',

    // Profile & Settings
    'profile.title': 'प्रोफ़ाइल और सेटिंग्स',
    'profile.subtitle': 'खाता सुरक्षा और प्राथमिकताएं',
    'profile.generalSettings': 'सामान्य सेटिंग्स',
    'profile.managePayments': 'भुगतान विधियां',
    'profile.buyMethods': 'खरीद विधियां',
    'profile.verifyBank': 'बैंक सत्यापित करें',
    'profile.language': 'भाषा (Language)',
    'profile.displayCurrency': 'मुद्रा (Currency)',
    'profile.appearance': 'थीम (Appearance)',
    'profile.withdrawAddress': 'निकासी पता',
    'profile.notificationSettings': 'सूचना सेटिंग्स',
    'profile.rateAlerts': 'रेट अलर्ट',
    'profile.helpSupport': 'सहायता और समर्थन',
    'profile.appTour': 'ऐप टूर देखें',
    'profile.contactSupport': 'सहायता से संपर्क करें',
    'profile.shareFeedback': 'प्रतिक्रिया दें',
    'profile.privacyPolicy': 'गोपनीयता नीति',
    'profile.logout': 'लॉग आउट',
    'profile.methods': 'विधियां',
    'profile.addresses': 'पते',
    'profile.darkMode': 'डार्क मोड',
    'profile.whiteMode': 'लाइट मोड',
    'profile.copyUsername': 'यूज़रनेम कॉपी करें',
    'profile.copied': 'कॉपी हो गया!',
    'profile.vipProgress': 'सिल्वर टियर के लिए 500 USDT बाकी',

    // Modals
    'modal.contactSupport': 'ग्राहक सहायता से संपर्क करें',
    'modal.emailSupport': 'ईमेल सहायता',
    'modal.emailDesc': 'आधिकारिक 24/7 विवाद समाधान और ग्राहक सहायता डेस्क।',
    'modal.emailResponse': 'लेन-देन विवादों के लिए 2 घंटे के भीतर समाधान।',
    'modal.sendEmail': 'अभी ईमेल भेजें',
    'modal.copyEmail': 'ईमेल पता कॉपी करें',
    'modal.selectLanguage': 'भाषा चुनें',
    'modal.english': 'English',
    'modal.hindi': 'हिंदी (Hindi)',
  },
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'hi' || saved === 'en') return saved
    } catch {}
    return 'en'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {}
  }

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key
  }

  const languageName = language === 'hi' ? 'हिंदी' : 'English'

  return (
    <LanguageContext.Provider value={{ language, languageName, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      language: 'en' as Language,
      languageName: 'English',
      setLanguage: () => {},
      t: (key: string) => translations.en[key] || key,
    }
  }
  return ctx
}

