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
import { DeskLayout, adminLinks, merchantLinks } from '@/layouts/DeskLayout'
import { useAuth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomerProfilePage } from '@/features/customer/CustomerProfilePage'
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
} from '@/features/merchant/pages'
import {
  AdminAudit,
  AdminDisputes,
  AdminHome,
  AdminLedger,
  AdminNote,
  AdminOrderDetail,
  AdminOrders,
  AdminSettings,
  AdminSupport,
  AdminUserDetail,
  AdminUsers,
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
              <Route path="pay/scan" element={<PayScanLive />} />
              <Route path="pay/confirm" element={<PayConfirm />} />
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
            <Route path="/merchant" element={<MerchantShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<MerchantHome />} />
              <Route path="available-orders" element={<MerchantAvailable />} />
              <Route path="active-orders" element={<MerchantOrders filter="active" />} />
              <Route path="completed-orders" element={<MerchantOrders filter="done" />} />
              <Route path="orders" element={<MerchantOrders />} />
              <Route path="orders/:orderId" element={<MerchantOrderDetail />} />
              <Route path="wallet" element={<MerchantWallet />} />
              <Route path="earnings" element={<MerchantNote title="Earnings" body="Gross, fees, and net here are simulated. Not a guaranteed return." />} />
              <Route path="settlements" element={<MerchantNote title="Settlements" body="No live INR settlement. History will list mock completions." />} />
              <Route path="withdrawals" element={<MerchantNote title="Withdrawals" body="Use the customer withdraw flow pattern on mock USDT available only." />} />
              <Route path="performance" element={<MerchantNote title="Performance" body="Completion rate comes from the merchant dashboard mock metrics." />} />
              <Route path="payment-methods" element={<MerchantNote title="Payment methods" body="Mock UPI / IMPS rails only." />} />
              <Route path="notifications" element={<MerchantNotices />} />
              <Route path="profile" element={<MerchantProfile />} />
              <Route path="settings" element={<MerchantNote title="Settings" body="Desk preferences are local to this prototype." />} />
            </Route>
          </Route>
          <Route element={<RequireAuth role="ADMIN" />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminHome />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="merchants" element={<AdminNote title="Merchants" body="Seeded Orbit desk is ACTIVE. Onboarding approve/reject is simulated via user status." />} />
              <Route path="merchants/:merchantId" element={<AdminNote title="Merchant" body="Wallet and orders are on the mock ledger." />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:orderId" element={<AdminOrderDetail />} />
              <Route path="transactions" element={<AdminLedger />} />
              <Route path="transactions/:transactionId" element={<AdminLedger />} />
              <Route path="withdrawals" element={<AdminNote title="Withdrawals" body="Mock outbound requests appear in activity." />} />
              <Route path="settlements" element={<AdminNote title="Settlements" body="No live payouts." />} />
              <Route path="escrow" element={<AdminOrders />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="wallets" element={<AdminNote title="Wallets" body="Balances live in the in-memory store." />} />
              <Route path="ledger" element={<AdminLedger />} />
              <Route path="gift-cards" element={<AdminNote title="Gift cards" body="Catalog is mocked in PrototypeStore." />} />
              <Route path="gift-cards/orders" element={<AdminNote title="Gift orders" body="Customer gift history is mock inventory." />} />
              <Route path="utilities" element={<AdminNote title="Utilities" body="Mock biller adapters only." />} />
              <Route path="utilities/orders" element={<AdminNote title="Utility orders" body="See customer utility history." />} />
              <Route path="notifications" element={<AdminNote title="Notifications" body="In-app mock inbox." />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="reports" element={<AdminNote title="Reports" body="No live volume. Charts use demo series." />} />
              <Route path="financials" element={<AdminLedger />} />
              <Route path="analytics" element={<AdminHome />} />
              <Route path="security" element={<AdminNote title="Security" body="Login throttling and 2FA remain mocked." />} />
              <Route path="fraud-monitoring" element={<AdminNote title="Fraud" body="Flag review is a prototype surface." />} />
              <Route path="audit-logs" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/platform" element={<AdminSettings />} />
              <Route path="settings/fees" element={<AdminSettings />} />
              <Route path="settings/limits" element={<AdminSettings />} />
              <Route path="profile" element={<AdminNote title="Profile" body="Nexora Operator mock account." />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
