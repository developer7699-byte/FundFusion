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
    'dash.send': 'Send',
    'dash.receive': 'Receive',
    'dash.orders': 'Orders',
    'dash.transactions': 'Transactions',
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

    // Merchant Panel - Dock Navigation
    'merchantNav.home': 'Home',
    'merchantNav.orders': 'Orders',
    'merchantNav.available': 'Available',
    'merchantNav.wallet': 'Wallet',
    'merchantNav.profile': 'Profile',

    // Merchant Top Header
    'merchantHeader.desk': 'Merchant Desk',
    'merchantHeader.live': 'LIVE',
    'merchantHeader.allOrders': 'All Orders',
    'merchantHeader.notifications': 'Notifications',

    // Merchant Dashboard
    'merchantDash.totalBalance': 'Total Desk Balance',
    'merchantDash.rate': 'Rate',
    'merchantDash.deposit': 'Deposit USDT',
    'merchantDash.withdraw': 'Withdraw / Settle',
    'merchantDash.availableToTrade': 'Available to Trade',
    'merchantDash.lockedEscrow': 'Locked in Escrow',
    'merchantDash.todayVolume': 'Today Volume',
    'merchantDash.tradesSettled': 'Trades Settled',
    'merchantDash.todayNetFee': 'Today Net Fee',
    'merchantDash.earned': 'Earned',
    'merchantDash.activeEscrows': 'Active Escrows',
    'merchantDash.orders': 'Orders',
    'merchantDash.locked': 'USDT Locked',
    'merchantDash.completion': 'Completion',
    'merchantDash.rating': 'Rating',
    'merchantDash.actionRequired': 'Action Required: Verify & Release',
    'merchantDash.pending': 'Pending',
    'merchantDash.verifyRelease': 'Verify & Release USDT',
    'merchantDash.dispute': 'Dispute',
    'merchantDash.liveOrders': 'Live Customer Orders (Available Book)',
    'merchantDash.viewAll': 'View All',
    'merchantDash.acceptOrder': 'Accept Order',
    'merchantDash.estCommission': 'Est. Commission',
    'merchantDash.available': 'Available',
    'merchantDash.escrows': 'Escrows',
    'merchantDash.earnings': 'Earnings',
    'merchantDash.banksUpi': 'Banks / UPI',
    'merchantDash.limits': 'Limits',
    'merchantDash.alerts': 'Alerts',

    // Merchant Profile & Preferences
    'merchantProfile.title': 'Merchant Desk Profile',
    'merchantProfile.subtitle': 'Desk credentials & operational settings',
    'merchantProfile.verified': 'Verified OTC Desk Partner',
    'merchantProfile.online': 'Taking Orders (Online)',
    'merchantProfile.offline': 'Desk Paused (Offline)',
    'merchantProfile.pause': 'Pause',
    'merchantProfile.resume': 'Resume',
    'merchantProfile.preferences': 'DESK PREFERENCES & RAILS',
    'merchantProfile.settlementAccounts': 'Settlement Accounts',
    'merchantProfile.tradingLimits': 'Trading Ticket Limits',
    'merchantProfile.earningsTier': 'Earnings & Tier Status',
    'merchantProfile.appearance': 'Appearance',
    'merchantProfile.language': 'Language',
    'merchantProfile.supportDesk': 'Arbitrator Support Desk',
    'merchantProfile.logout': 'Log out',
    'merchantProfile.selectLanguage': 'Select Language',
    'merchantProfile.langChanged': 'Language updated to English',

    // Merchant Alerts / Notifications
    'merchantAlerts.title': 'Merchant Alerts',
    'merchantAlerts.subtitle': 'Live escrow and order updates',
    'merchantAlerts.markAllRead': 'Mark all read',
    'merchantAlerts.allRead': 'All read',
    'merchantAlerts.toastMarked': 'All notifications marked as read',

    // Merchant Orders
    'merchantOrders.title': 'Merchant Orders',
    'merchantOrders.subtitle': 'Track escrow lifecycle & release settlements',
    'merchantOrders.tabAll': 'All Orders',
    'merchantOrders.tabActive': 'Active Escrows',
    'merchantOrders.tabCompleted': 'Completed',

    // Merchant Wallet & Earnings
    'merchantWallet.title': 'Merchant Vault & Wallet',
    'merchantWallet.subtitle': 'Non-custodial desk liquidity management',
    'merchantEarnings.title': 'Earnings & Commission',
    'merchantEarnings.subtitle': 'P2P liquidity spread & trade rebates',
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
    'dash.send': 'भेजें',
    'dash.receive': 'प्राप्त करें',
    'dash.orders': 'ऑर्डर',
    'dash.transactions': 'लेन-देन',
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

    // Merchant Panel - Dock Navigation
    'merchantNav.home': 'होम',
    'merchantNav.orders': 'ऑर्डर्स',
    'merchantNav.available': 'उपलब्ध',
    'merchantNav.wallet': 'वॉलेट',
    'merchantNav.profile': 'प्रोफ़ाइल',

    // Merchant Top Header
    'merchantHeader.desk': 'मर्चेंट डेस्क',
    'merchantHeader.live': 'लाइव',
    'merchantHeader.allOrders': 'सभी ऑर्डर्स',
    'merchantHeader.notifications': 'सूचनाएं',

    // Merchant Dashboard
    'merchantDash.totalBalance': 'कुल डेस्क बैलेंस',
    'merchantDash.rate': 'दर',
    'merchantDash.deposit': 'यूएसडीटी जमा',
    'merchantDash.withdraw': 'निकासी / सेटल',
    'merchantDash.availableToTrade': 'ट्रेड हेतु उपलब्ध',
    'merchantDash.lockedEscrow': 'एस्क्रो में सुरक्षित',
    'merchantDash.todayVolume': 'आज का वॉल्यूम',
    'merchantDash.tradesSettled': 'सफल ट्रेड्स',
    'merchantDash.todayNetFee': 'आज की शुद्ध फीस',
    'merchantDash.earned': 'कमाई',
    'merchantDash.activeEscrows': 'सक्रिय एस्क्रो',
    'merchantDash.orders': 'ऑर्डर्स',
    'merchantDash.locked': 'USDT सुरक्षित',
    'merchantDash.completion': 'पूर्णता दर',
    'merchantDash.rating': 'रेटिंग',
    'merchantDash.actionRequired': 'कार्रवाई आवश्यक: जांचें व रिलीज करें',
    'merchantDash.pending': 'लंबित',
    'merchantDash.verifyRelease': 'सत्यापित करें व रिलीज करें',
    'merchantDash.dispute': 'विवाद',
    'merchantDash.liveOrders': 'लाइव ग्राहक ऑर्डर्स (उपलब्ध बुक)',
    'merchantDash.viewAll': 'सभी देखें',
    'merchantDash.acceptOrder': 'ऑर्डर स्वीकारें',
    'merchantDash.estCommission': 'अनुमानित कमीशन',
    'merchantDash.available': 'उपलब्ध',
    'merchantDash.escrows': 'एस्क्रो',
    'merchantDash.earnings': 'कमाई',
    'merchantDash.banksUpi': 'बैंक / यूपीआई',
    'merchantDash.limits': 'सीमाएं',
    'merchantDash.alerts': 'अलर्ट्स',

    // Merchant Profile & Preferences
    'merchantProfile.title': 'मर्चेंट डेस्क प्रोफ़ाइल',
    'merchantProfile.subtitle': 'डेस्क क्रेडेंशियल्स व संचालन सेटिंग्स',
    'merchantProfile.verified': 'सत्यापित ओटीसी डेस्क पार्टनर',
    'merchantProfile.online': 'ऑर्डर्स स्वीकार कर रहे हैं (ऑनलाइन)',
    'merchantProfile.offline': 'डेस्क रुका हुआ (ऑफलाइन)',
    'merchantProfile.pause': 'रोकें',
    'merchantProfile.resume': 'शुरू करें',
    'merchantProfile.preferences': 'डेस्क प्राथमिकताएं और चैनल',
    'merchantProfile.settlementAccounts': 'सेटलमेंट खाते',
    'merchantProfile.tradingLimits': 'ट्रेडिंग टिकट सीमाएं',
    'merchantProfile.earningsTier': 'कमाई और टियर स्थिति',
    'merchantProfile.appearance': 'थीम (Appearance)',
    'merchantProfile.language': 'भाषा (Language)',
    'merchantProfile.supportDesk': 'मध्यस्थता सहायता डेस्क',
    'merchantProfile.logout': 'लॉग आउट',
    'merchantProfile.selectLanguage': 'भाषा चुनें',
    'merchantProfile.langChanged': 'भाषा बदलकर हिंदी कर दी गई है',

    // Merchant Alerts / Notifications
    'merchantAlerts.title': 'मर्चेंट सूचनाएं',
    'merchantAlerts.subtitle': 'लाइव एस्क्रो और ऑर्डर अपडेट',
    'merchantAlerts.markAllRead': 'सब पढ़ें मार्क करें',
    'merchantAlerts.allRead': 'सभी पढ़ लिए',
    'merchantAlerts.toastMarked': 'सभी सूचनाएं पढ़ी हुई मार्क कर दी गईं',

    // Merchant Orders
    'merchantOrders.title': 'मर्चेंट ऑर्डर्स',
    'merchantOrders.subtitle': 'एस्क्रो स्थिति ट्रैक करें और भुगतान रिलीज करें',
    'merchantOrders.tabAll': 'सभी ऑर्डर्स',
    'merchantOrders.tabActive': 'सक्रिय एस्क्रो',
    'merchantOrders.tabCompleted': 'पूर्ण',

    // Merchant Wallet & Earnings
    'merchantWallet.title': 'मर्चेंट वॉल्ट और वॉलेट',
    'merchantWallet.subtitle': 'गैर-कस्टोडियल डेस्क लिक्विडिटी प्रबंधन',
    'merchantEarnings.title': 'कमाई और कमीशन',
    'merchantEarnings.subtitle': 'P2P लिक्विडिटी स्प्रेड और ट्रेड छूट',
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

