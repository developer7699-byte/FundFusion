import { useState, useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ShieldCheck, Zap, Clock, Mail, Lock, User, ArrowLeft } from 'lucide-react'

import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/brand/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { homeFor, useAuth } from '@/lib/auth'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="h-screen w-screen max-h-screen max-w-vw overflow-hidden lg:grid lg:grid-cols-12 bg-nx-bg transition-colors duration-500 select-none">
      {/* Background Graphic Grid Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-15 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Left Visual Showcase Panel */}
      <div className="relative hidden lg:col-span-6 xl:col-span-7 lg:flex flex-col justify-between p-8 xl:p-10 overflow-hidden bg-gradient-to-br from-[#eef2fd] via-[#e5ecfb] to-[#f0ebfe] dark:from-[#0b0f1c] dark:via-[#10172e] dark:to-[#1a1236] text-slate-900 dark:text-white border-r border-indigo-100 dark:border-slate-800/80 transition-colors duration-500">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 dark:bg-indigo-600/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-400/20 dark:bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-purple-500/15 dark:bg-purple-600/20 blur-3xl pointer-events-none" />

        {/* Top Header inside Auth Panel */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="transition hover:opacity-90">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 backdrop-blur-md transition-all duration-200 shadow-2xs group"
              title="Back to Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              <span>Back to Home</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Middle Content Section */}
        <div className="relative z-10 my-auto max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 backdrop-blur-md">
              FUNDFUSION WALLET
            </span>
            <h1 className="mt-3 text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Trade crypto instantly, anytime, anywhere.
            </h1>
          </motion.div>

          {/* Feature Highlights */}
          <div className="mt-5 space-y-2.5">
            {[
              {
                icon: ShieldCheck,
                title: 'Protected trades',
                desc: 'Funds held securely in escrow until both sides confirm',
              },
              {
                icon: Zap,
                title: 'About a minute',
                desc: 'Average time to complete a seamless P2P trade',
              },
              {
                icon: Clock,
                title: 'Market live 24x7',
                desc: 'Trade and settle any hour, any day without interruptions',
              },
            ].map(({ icon: Icon, title: t, desc: d }, idx) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.12 + idx * 0.08 }}
                className="flex items-center gap-3 p-2.5 px-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-indigo-100/80 dark:border-white/10 backdrop-blur-md transition hover:bg-white dark:hover:bg-white/10 shadow-xs"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-400/25">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300/80 mt-0.5">{d}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pedestal Visual Graphic */}
          <div className="relative mt-5 flex items-center justify-center">
            <div className="relative w-full max-w-sm h-28 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-indigo-100 dark:border-white/15 backdrop-blur-xl p-3 flex items-center justify-around shadow-md">
              <div className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs font-bold text-xs">
                  ₮
                </div>
                <p className="mt-1 text-[11px] font-bold text-slate-800 dark:text-white">USDT</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+0.12%</p>
              </div>
              <div className="text-center scale-105">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/40 font-black text-lg">
                  F
                </div>
                <p className="mt-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-300">FundFusion</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-300">Live Rails</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 text-orange-500 dark:text-orange-400 border border-orange-500/30 shadow-xs font-bold text-xs">
                  ₿
                </div>
                <p className="mt-1 text-[11px] font-bold text-slate-800 dark:text-white">BTC</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+1.4%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info in left panel */}
        <div className="relative z-10 text-[11px] text-slate-500 dark:text-slate-400/80">
          © {new Date().getFullYear()} FundFusion · Powered by simulated ledger engine.
        </div>
      </div>

      {/* Right Column Form Container */}
      <div className="h-full lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-4 sm:p-8 lg:p-8 relative bg-nx-bg transition-colors duration-500 overflow-y-auto">
        {/* Mobile Header (Hidden on desktop so only 1 Back to Home button is shown) */}
        <div className="flex items-center justify-between w-full mb-4 lg:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md transition-all duration-200 shadow-2xs group"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link to="/" className="transition hover:opacity-90">
              <Logo compact />
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="my-auto mx-auto w-full max-w-sm sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-white/95 dark:bg-[#121829]/95 border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-colors duration-500"
          >
            <div className="text-center mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>

            {children}
          </motion.div>
        </div>

        {/* Mobile Footer */}
        <p className="mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400 lg:hidden">
          © {new Date().getFullYear()} FundFusion · All rights reserved.
        </p>
      </div>
    </div>
  )
}

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect immediately if already authenticated
  useEffect(() => {
    if (user) navigate(homeFor(user), { replace: true })
  }, [user, navigate])

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const fillDemo = (email: string, pass: string) => {
    form.setValue('email', email)
    form.setValue('password', pass)
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your FundFusion account.">
      {/* Form */}
      <form
        className="space-y-3.5"
        onSubmit={form.handleSubmit(async (v) => {
          setError('')
          setLoading(true)
          try {
            // Step one of two (PRD §9.1). A code goes to the address; the
            // session is minted on the next screen, not here.
            await login(v.email, v.password)
            navigate('/verify-otp')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Sign in failed')
          } finally {
            setLoading(false)
          }
        })}
      >
        <div className="space-y-1">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Email address"
              type="email"
              className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0c101d] transition-all"
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-rose-500 pl-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Password"
              type="password"
              className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0c101d] transition-all"
              {...form.register('password')}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-rose-500 pl-1">{form.formState.errors.password.message}</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-500 text-center font-medium bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between text-xs pt-0.5">
          <Link to="/forgot-password" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition">
            Forgot password?
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Demo:</span>
            <button
              type="button"
              onClick={() => fillDemo('customer@demo.test', 'Example!Demo1')}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-500 font-medium transition cursor-pointer"
            >
              User
            </button>
            <button
              type="button"
              onClick={() => fillDemo('merchant@demo.test', 'Example!Demo1')}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-500 font-medium transition cursor-pointer"
            >
              Merchant
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full font-semibold text-sm sm:text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-[0_4px_18px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_22px_rgba(99,102,241,0.55)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {/* Footer link */}
      <p className="mt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        New to FundFusion?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Create an account
        </Link>
      </p>

      {/* Risk disclosure footnote */}
      <p className="mt-4 text-center text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        By continuing you accept our <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Terms</span>,{' '}
        <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</span> and{' '}
        <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Risk Disclosure</span>.
      </p>
    </AuthLayout>
  )
}

const registerSchema = loginSchema.extend({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
})

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  })

  return (
    <AuthLayout title="Create your account" subtitle="Start your crypto journey in less than 60 seconds.">
      <form
        className="space-y-3.5"
        onSubmit={form.handleSubmit(async (v) => {
          setError('')
          setLoading(true)
          try {
            await register(v)
            navigate('/verify-otp')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Registration failed')
          } finally {
            setLoading(false)
          }
        })}
      >
        <div className="space-y-1">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Display Name"
              className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0c101d] transition-all"
              {...form.register('displayName')}
            />
          </div>
          {form.formState.errors.displayName && (
            <p className="text-xs text-rose-500 pl-1">{form.formState.errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Email address"
              type="email"
              className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0c101d] transition-all"
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-rose-500 pl-1">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Password (6+ characters)"
              type="password"
              className="pl-10 h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0c101d] transition-all"
              {...form.register('password')}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-rose-500 pl-1">{form.formState.errors.password.message}</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-500 text-center font-medium bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full font-semibold text-sm sm:text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-[0_4px_18px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_22px_rgba(99,102,241,0.55)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          {loading ? 'Creating account...' : 'Get started'}
        </Button>
      </form>

      {/* Footer link */}
      <p className="mt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Sign in
        </Link>
      </p>

      {/* Risk disclosure footnote */}
      <p className="mt-4 text-center text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        By registering you accept our <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Terms</span>,{' '}
        <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</span> and{' '}
        <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">Risk Disclosure</span>.
      </p>
    </AuthLayout>
  )
}

/**
 * v1 has no password-reset route (PRD §9.1 defines sign-in and nothing else),
 * so this screen says so. The prototype's version posted to a mock endpoint
 * and told everyone the code was 246810, which reads as a working reset.
 */
export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Not something you can do yourself yet."
    >
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Password reset is not part of this release. Ask support to reset the
          account, then sign in with the new password and your emailed code.
        </p>
        <Link to="/login">
          <Button className="w-full h-11 rounded-full font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
            Back to Sign in
          </Button>
        </Link>
      </div>
    </AuthLayout>
  )
}

export function VerifyOtpPage() {
  const { pending, verifyCode } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // A reload loses the half-finished sign-in. There is nothing to verify
  // without it, and an email box here would invite verifying someone else's.
  useEffect(() => {
    if (!pending) navigate('/login', { replace: true })
  }, [pending, navigate])

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        pending
          ? `We sent a one-time code to ${pending.email}.`
          : 'Start again from the sign-in screen.'
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          setLoading(true)
          const code = String(new FormData(e.currentTarget).get('code') ?? '')
          try {
            const me = await verifyCode(code)
            // The authenticator is the financial gate (PRD §9.1). Someone who
            // has not enrolled one is sent there, not to a screen that would
            // refuse every request it makes.
            navigate(me.canMoveMoney ? homeFor(me) : '/mfa/enroll', {
              replace: true,
            })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'That code was not accepted.')
          } finally {
            setLoading(false)
          }
        }}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="emailed-code"
            className="text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Emailed code
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              id="emailed-code"
              name="code"
              required
              autoComplete="one-time-code"
              placeholder="246810"
              className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-[#0c101d] border-slate-200 dark:border-slate-800 tracking-widest font-mono"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-500 text-center font-medium bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-full font-semibold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg"
        >
          {loading ? 'Verifying...' : 'Continue'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Back to Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
