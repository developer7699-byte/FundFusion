import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { PrototypeBanner, SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { ForgotPasswordPage, LoginPage, RegisterPage, VerifyOtpPage } from '@/features/auth/pages'
import { CustomerDashboard, PayHome, UtilitiesHub } from '@/features/customer/pages'
import {
  AddressesFlow,
  DepositFlow,
  QuoteFlow,
  ReceiveFlow,
  SendFlow,
  TransactionDetailFlow,
  TransactionsFlow,
  WalletHome,
  WithdrawFlow,
} from '@/features/customer/wallet-flows'
import { LandingPage } from '@/features/marketing/LandingPage'
import {
  AboutPage,
  BlogPage,
  BlogPostPage,
  ContactPage,
  FaqPage,
  FeaturesPage,
  HelpPage,
  HowItWorksPage,
  legal,
  LegalPage,
  MerchantPublicPage,
  SecurityPage,
  FeesPage,
} from '@/features/marketing/Pages'
import { CustomerLayout } from '@/layouts/CustomerLayout'
import { MerchantLayout } from '@/layouts/MerchantLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DeskLayout, adminLinks, merchantLinks } from '@/layouts/DeskLayout'
import { useAuth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomerProfilePage } from '@/features/customer/CustomerProfilePage'
import { CustomerScanPayPage } from '@/features/customer/CustomerScanPayPage'
import { RequestMoneyPage } from '@/features/customer/RequestMoneyPage'
import {
  AccountLive,
  GiftBrand,
  GiftHistory,
  GiftHub,
  NoticeCenter,
  OrderDetail,
  OrdersList,
  PayConfirm,
  PayScanLive,
  SupportDesk,
  TicketDetail,
  UtilityFlow,
} from '@/features/customer/ops-pages'
import {
  MerchantAvailable,
  MerchantHome,
  MerchantNote,
  MerchantNotices,
  MerchantOrderDetail,
  MerchantOrders,
  MerchantProfile,
  MerchantWallet,
  MerchantEarnings,
  MerchantPaymentMethods,
} from '@/features/merchant/pages'
import {
  AdminAudit,
  AdminDisputes,
  AdminGiftCards,
  AdminHome,
  AdminLedger,
  AdminMerchants,
  AdminNote,
  AdminOrderDetail,
  AdminOrders,
  AdminSettlements,
  AdminSettings,
  AdminSupport,
  AdminUserDetail,
  AdminUsers,
  AdminWallets,
} from '@/features/admin/pages'

function PublicLayout() {
  return (
    <div className="nx-grid min-h-screen">
      <PrototypeBanner />
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  )
}

function RequireAuth({ role }: { role?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <Skeleton className="m-8 h-40" />
  if (!user) return <Navigate to="/login" replace />
  if (role && !user.roles.includes(role) && !user.roles.includes('ADMIN')) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

function MerchantShell() {
  return <DeskLayout home="/merchant/dashboard" links={merchantLinks} />
}

function AdminShell() {
  return <DeskLayout home="/admin/dashboard" links={adminLinks} />
}
export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/merchant" element={<MerchantPublicPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/terms" element={<LegalPage title="Terms and conditions" body={legal.terms} />} />
            <Route path="/privacy" element={<LegalPage title="Privacy policy" body={legal.privacy} />} />
            <Route path="/risk-disclosure" element={<LegalPage title="Risk disclosure" body={legal.risk} />} />
            <Route path="/refund-policy" element={<LegalPage title="Refund policy" body={legal.refund} />} />
            <Route path="/cookie-policy" element={<LegalPage title="Cookie policy" body={legal.cookie} />} />
          </Route>

          {/* Standalone Auth Routes without navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          <Route element={<RequireAuth role="CUSTOMER" />}>
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="wallet" element={<WalletHome />} />
              <Route path="wallet/deposit" element={<DepositFlow />} />
              <Route path="wallet/withdraw" element={<WithdrawFlow />} />
              <Route path="wallet/send" element={<SendFlow />} />
              <Route path="wallet/receive" element={<ReceiveFlow />} />
              <Route path="wallet/addresses" element={<AddressesFlow />} />
              <Route path="buy" element={<QuoteFlow side="BUY" />} />
              <Route path="sell" element={<QuoteFlow side="SELL" />} />
              <Route path="convert" element={<QuoteFlow side="CONVERT" />} />
              <Route path="pay" element={<PayHome />} />
              <Route path="pay/scan" element={<CustomerScanPayPage />} />
              <Route path="pay/confirm" element={<PayConfirm />} />
              <Route path="pay/request" element={<RequestMoneyPage />} />
              <Route path="request" element={<RequestMoneyPage />} />
              <Route path="orders" element={<OrdersList />} />
              <Route path="orders/:orderId" element={<OrderDetail />} />
              <Route path="transactions" element={<TransactionsFlow />} />
              <Route path="transactions/:transactionId" element={<TransactionDetailFlow />} />
              <Route path="gift-cards" element={<GiftHub />} />
              <Route path="gift-cards/orders" element={<GiftHistory />} />
              <Route path="gift-cards/:brandId" element={<GiftBrand />} />
              <Route path="utilities" element={<UtilitiesHub />} />
              <Route path="utilities/mobile-recharge" element={<UtilityFlow service="MOBILE" />} />
              <Route path="utilities/dth" element={<UtilityFlow service="DTH" />} />
              <Route path="utilities/electricity" element={<UtilityFlow service="ELECTRICITY" />} />
              <Route path="utilities/bill-payment" element={<UtilityFlow service="BILL" />} />
              <Route path="notifications" element={<NoticeCenter />} />
              <Route path="support" element={<SupportDesk />} />
              <Route path="support/:ticketId" element={<TicketDetail />} />
              <Route path="referrals" element={<AccountLive title="Referrals" />} />
              <Route path="rewards" element={<AccountLive title="Rewards" />} />
              <Route path="profile" element={<CustomerProfilePage />} />
              <Route path="settings" element={<AccountLive title="Settings" />} />
              <Route path="security" element={<AccountLive title="Security" />} />
              <Route path="sessions" element={<AccountLive title="Sessions" />} />
              <Route path="verification" element={<AccountLive title="Verification" />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="MERCHANT" />}>
            <Route path="/merchant" element={<MerchantLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<MerchantHome />} />
              <Route path="available-orders" element={<MerchantAvailable />} />
              <Route path="active-orders" element={<MerchantOrders filter="active" />} />
              <Route path="completed-orders" element={<MerchantOrders filter="done" />} />
              <Route path="orders" element={<MerchantOrders />} />
              <Route path="orders/:orderId" element={<MerchantOrderDetail />} />
              <Route path="wallet" element={<MerchantWallet />} />
              <Route path="earnings" element={<MerchantEarnings />} />
              <Route path="settlements" element={<MerchantWallet />} />
              <Route path="withdrawals" element={<MerchantWallet />} />
              <Route path="performance" element={<MerchantEarnings />} />
              <Route path="payment-methods" element={<MerchantPaymentMethods />} />
              <Route path="notifications" element={<MerchantNotices />} />
              <Route path="profile" element={<MerchantProfile />} />
              <Route path="settings" element={<MerchantProfile />} />
            </Route>
          </Route>
          <Route element={<RequireAuth role="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminHome />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="merchants" element={<AdminMerchants />} />
              <Route path="merchants/:merchantId" element={<AdminMerchants />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:orderId" element={<AdminOrderDetail />} />
              <Route path="transactions" element={<AdminLedger />} />
              <Route path="transactions/:transactionId" element={<AdminLedger />} />
              <Route path="withdrawals" element={<AdminWallets />} />
              <Route path="settlements" element={<AdminSettlements />} />
              <Route path="escrow" element={<AdminOrders />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="wallets" element={<AdminWallets />} />
              <Route path="ledger" element={<AdminLedger />} />
              <Route path="gift-cards" element={<AdminGiftCards />} />
              <Route path="gift-cards/inventory" element={<AdminGiftCards />} />
              <Route path="gift-cards/router" element={<AdminGiftCards />} />
              <Route path="gift-cards/forwarded" element={<AdminGiftCards />} />
              <Route path="gift-cards/orders" element={<AdminGiftCards />} />
              <Route path="utilities" element={<AdminNote title="BBPS Utility Rails" body="NPCI BBPS biller aggregators and mock biller adapters are active." />} />
              <Route path="utilities/orders" element={<AdminOrders />} />
              <Route path="notifications" element={<AdminSupport />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="reports" element={<AdminHome />} />
              <Route path="financials" element={<AdminWallets />} />
              <Route path="analytics" element={<AdminHome />} />
              <Route path="security" element={<AdminAudit />} />
              <Route path="fraud-monitoring" element={<AdminUsers />} />
              <Route path="audit-logs" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/platform" element={<AdminSettings />} />
              <Route path="settings/fees" element={<AdminSettings />} />
              <Route path="settings/limits" element={<AdminSettings />} />
              <Route path="profile" element={<AdminNote title="SuperAdmin Profile" body="SuperAdmin operator session authenticated with hardware 2FA." />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
