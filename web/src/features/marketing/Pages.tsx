import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

function Shell({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      {kicker && <p className="text-xs uppercase tracking-[0.2em] text-nx-mint">{kicker}</p>}
      <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
      <div className="mt-8 space-y-4 text-nx-muted">{children}</div>
    </div>
  )
}

export function AboutPage() {
  return (
    <Shell title="About NEXORA PAY" kicker="Company">
      <p>
        NEXORA PAY is an original product concept: a modular-monolith desk for wallets, P2P matching,
        QR orchestration, catalogs, and operations. It is being built as a development prototype.
      </p>
      <p>
        We do not claim regulatory registration, insurance, or non-custodial architecture. Production
        would require independent legal, AML, and provider reviews.
      </p>
    </Shell>
  )
}

export function FeaturesPage() {
  const items = [
    'P2P crypto trading (simulated ledger)',
    'USDT to INR display conversion',
    'Buy and sell desks',
    'UPI QR payments (mock parser)',
    'Digital wallet with locked funds',
    'Merchant marketplace',
    'Gift cards and utilities',
    'Customer, merchant, and admin roles',
  ]
  return (
    <Shell title="Platform features" kicker="Product">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item} className="text-nx-text">
            {item}
          </Card>
        ))}
      </div>
    </Shell>
  )
}

export function HowItWorksPage() {
  return (
    <Shell title="How the platform works" kicker="Flow">
      <p>1. Authenticate and open a role-specific desk.</p>
      <p>2. Wallet accounts hold available and locked simulated balances.</p>
      <p>3. Quotes are issued by the API and expire.</p>
      <p>4. Orders lock funds, match a merchant, collect proof, then settle on the ledger.</p>
    </Shell>
  )
}

export function SecurityPage() {
  return (
    <Shell title="Security information" kicker="Trust">
      <p>
        Authentication uses hashed passwords, short-lived access tokens, and rotating refresh tokens.
        OTP and admin 2FA are mocked. Private keys are never stored.
      </p>
      <p>
        NEXORA PAY is not described here as RBI-authorized, FIU-registered, insured, or guaranteed.
      </p>
    </Shell>
  )
}

export function FeesPage() {
  return (
    <Shell title="Fees and pricing" kicker="Transparent">
      <p>Prototype fee table (simulated, not an offer):</p>
      <Card className="text-nx-text">
        P2P match fee 0.40% · QR conversion spread 0.35% · Gift card markup varies by brand ·
        Withdrawals show a mock network fee. Nothing is billed in rupees or crypto in this environment.
      </Card>
    </Shell>
  )
}

export function MerchantPublicPage() {
  return (
    <Shell title="Become a merchant" kicker="Supply">
      <p>
        Merchants fill customer orders from a simulated USDT balance and a mock INR rail. Commission is
        a fee on settled volume, not a guaranteed return.
      </p>
      <Link to="/register">
        <Button>Apply from a customer account</Button>
      </Link>
    </Shell>
  )
}

export function HelpPage() {
  return (
    <Shell title="Help center" kicker="Support">
      <p>Browse FAQs, open a ticket after you sign in, or write to the contact desk.</p>
      <div className="flex gap-3">
        <Link to="/faq">
          <Button variant="ghost">FAQ</Button>
        </Link>
        <Link to="/contact">
          <Button>Contact</Button>
        </Link>
      </div>
    </Shell>
  )
}

export function FaqPage() {
  return (
    <Shell title="Frequently asked questions" kicker="FAQ">
      <p>
        <strong className="text-nx-text">Can I trade with real USDT?</strong> Not in this prototype.
      </p>
      <p>
        <strong className="text-nx-text">Is KYC required?</strong> Profiles exist; production KYC is not
        activated.
      </p>
      <p>
        <strong className="text-nx-text">Minimum size?</strong> The demo seed uses small simulated tickets.
      </p>
    </Shell>
  )
}

export function ContactPage() {
  const [sent, setSent] = useState(false)
  return (
    <Shell title="Contact support" kicker="Desk">
      {sent ? (
        <p className="text-nx-mint">Message stored locally in this prototype. No ticket was emailed.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setSent(true)
          }}
        >
          <Input required placeholder="Your email" type="email" />
          <Input required placeholder="Subject" />
          <textarea
            required
            className="h-32 w-full rounded-xl border border-nx-line bg-nx-bg/60 p-3 text-nx-text"
            placeholder="How can we help?"
          />
          <Button type="submit">Send</Button>
        </form>
      )}
    </Shell>
  )
}

const posts = [
  {
    slug: 'why-locked-funds-matter',
    title: 'Why locked funds must not be spendable',
    excerpt: 'A short note on available versus locked balances in a prototype ledger.',
  },
  {
    slug: 'mock-providers-first',
    title: 'Mock providers first, credentials never in git',
    excerpt: 'How NEXORA PAY keeps rails behind interfaces.',
  },
]

export function BlogPage() {
  return (
    <Shell title="Journal" kicker="Writing">
      {posts.map((p) => (
        <Link key={p.slug} to={`/blog/${p.slug}`}>
          <Card className="text-nx-text hover:border-nx-accent">
            <p className="font-medium">{p.title}</p>
            <p className="mt-1 text-sm text-nx-muted">{p.excerpt}</p>
          </Card>
        </Link>
      ))}
    </Shell>
  )
}

export function BlogPostPage() {
  const { slug } = useParams()
  const post = posts.find((p) => p.slug === slug)
  if (!post) return <Shell title="Article not found">That slug is not in the prototype catalog.</Shell>
  return (
    <Shell title={post.title} kicker="Journal">
      <p>{post.excerpt}</p>
      <p>
        This article is original NEXORA PAY documentation. It is not financial advice and does not
        describe a live regulated product.
      </p>
    </Shell>
  )
}

export function LegalPage({ title, body }: { title: string; body: string[] }) {
  return (
    <Shell title={title} kicker="Legal">
      {body.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </Shell>
  )
}

export const legal = {
  terms: [
    'NEXORA PAY is provided as software in development. It is not an offer to custody assets or settle INR.',
    'You must not use this prototype to process real customer funds.',
  ],
  privacy: [
    'Local development stores emails, password hashes, and session metadata in PostgreSQL.',
    'Do not seed production personal data into this environment.',
  ],
  risk: [
    'Crypto and P2P activity can result in total loss in real markets. This prototype does not execute those markets.',
    'Nothing on this site is investment, tax, or legal advice.',
  ],
  refund: [
    'Simulated orders can be reversed through authorized ledger operations. There are no real refunds of bank money.',
  ],
  cookie: [
    'The SPA uses localStorage for access and refresh tokens in this prototype. Cookie sessions may replace that later.',
  ],
}
