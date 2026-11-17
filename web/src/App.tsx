import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { PrototypeBanner, SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { NotFound } from '@/components/layout/NotFound'
import { ForgotPasswordPage, LoginPage, RegisterPage, VerifyOtpPage } from '@/features/auth/pages'
import { CustomerDashboard } from '@/features/customer/pages'
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
import { DeskLayout, adminLinks } from '@/layouts/DeskLayout'
import { useAuth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomerProfilePage } from '@/features/customer/CustomerProfilePage'
import { RequestMoneyPage } from '@/features/customer/RequestMoneyPage'
import {
  AccountLive,
  NoticeCenter,
  OrderDetail,
  OrdersList,
  SupportDesk,
  TicketDetail,
} from '@/features/customer/ops-pages'
import {
  MerchantAvailable,
  MerchantHome,
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
              <Route path="request" element={<RequestMoneyPage />} />
              <Route path="orders" element={<OrdersList />} />
              <Route path="orders/:orderId" element={<OrderDetail />} />
              <Route path="transactions" element={<TransactionsFlow />} />
              <Route path="transactions/:transactionId" element={<TransactionDetailFlow />} />
              <Route path="notifications" element={<NoticeCenter />} />
              <Route path="support" element={<SupportDesk />} />
              <Route path="support/:ticketId" element={<TicketDetail />} />
              <Route path="profile" element={<CustomerProfilePage />} />
              <Route path="settings" element={<AccountLive title="Settings" />} />
              <Route path="security" element={<AccountLive title="Security" />} />
              <Route path="sessions" element={<AccountLive title="Sessions" />} />
              <Route path="*" element={<NotFound home="/customer/dashboard" />} />
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
              <Route path="*" element={<NotFound home="/merchant/dashboard" />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="ADMIN" />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminHome />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="merchants" element={<AdminNote title="Merchants" body="Merchant onboarding review." />} />
              <Route path="merchants/:merchantId" element={<AdminNote title="Merchant" body="Merchant wallet and orders." />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:orderId" element={<AdminOrderDetail />} />
              <Route path="transactions" element={<AdminLedger />} />
              <Route path="transactions/:transactionId" element={<AdminLedger />} />
              <Route path="withdrawals" element={<AdminNote title="Withdrawals" body="Outbound withdrawal requests." />} />
              <Route path="settlements" element={<AdminNote title="Settlements" body="Merchant settlements." />} />
              <Route path="escrow" element={<AdminOrders />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="wallets" element={<AdminNote title="Wallets" body="Custodial wallet balances." />} />
              <Route path="ledger" element={<AdminLedger />} />
              <Route path="notifications" element={<AdminNote title="Notifications" body="In-app inbox." />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="reports" element={<AdminNote title="Reports" body="Volume and revenue reporting." />} />
              <Route path="financials" element={<AdminLedger />} />
              <Route path="analytics" element={<AdminHome />} />
              <Route path="security" element={<AdminNote title="Security" body="Login throttling and admin MFA." />} />
              <Route path="fraud-monitoring" element={<AdminNote title="Fraud" body="Flag review queue." />} />
              <Route path="audit-logs" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/platform" element={<AdminSettings />} />
              <Route path="settings/fees" element={<AdminSettings />} />
              <Route path="settings/limits" element={<AdminSettings />} />
              <Route path="profile" element={<AdminNote title="Profile" body="Operator account." />} />
              <Route path="*" element={<NotFound home="/admin/dashboard" />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
