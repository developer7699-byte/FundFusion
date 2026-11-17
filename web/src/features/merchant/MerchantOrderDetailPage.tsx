import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Check,
  Send,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useMerchantStore } from '@/lib/merchant-store'
import { ReleaseEscrowModal, DisputeOrderModal } from './components/MerchantModals'
import { cn } from '@/lib/utils'
import { ToastNotification } from '@/components/ui/ToastNotification'

export function MerchantOrderDetail() {
  const { orderId } = useParams()
  const { myOrders, submitUtr } = useMerchantStore()

  const order = myOrders.find((o) => o.id === orderId) || {
    id: orderId || 'FF-8921',
    buyerName: '@aarav_crypto',
    buyerRating: '99.8%',
    buyerTrades: 142,
    usdtAmount: 100.0,
    inrAmount: 9150.0,
    rate: 91.5,
    paymentMethod: 'UPI (Google Pay)',
    paymentType: 'UPI' as const,
    status: 'UTR_SUBMITTED' as const,
    createdAt: '6 mins ago',
    expiresInMinutes: 9,
    utr: '429104829104',
    commissionEarned: 1.5,
  }

  const [copiedUtr, setCopiedUtr] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [manualUtr, setManualUtr] = useState('')
  const [isReleaseOpen, setIsReleaseOpen] = useState(false)
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'system', text: `Order #${order.id} initiated. Escrow of ${order.usdtAmount} USDT safely locked.`, time: '14:20' },
    { id: '2', sender: 'buyer', text: `Hi! I have transferred ₹${order.inrAmount} via ${order.paymentMethod}. UTR is ${order.utr || '429104829104'}.`, time: '14:24' },
  ])
  const [chatInput, setChatInput] = useState('')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = {
      id: `${Date.now()}`,
      sender: 'merchant',
      text: chatInput,
      time: 'Just now',
    }
    setChatMessages((prev) => [...prev, msg])
    setChatInput('')

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now() + 1}`,
          sender: 'buyer',
          text: 'Thank you! Please release the USDT once confirmed.',
          time: 'Just now',
        },
      ])
    }, 1500)
  }

  const isCompleted = order.status === 'COMPLETED'
  const isUtrSubmitted = order.status === 'UTR_SUBMITTED'
  const isAwaiting = order.status === 'AWAITING_PAYMENT'

  return (
    <div className="space-y-4 max-w-lg mx-auto w-full pb-6 relative">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/merchant/orders" />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Order #{order.id}
            </h1>
            <p className="text-[11px] text-slate-500">{order.createdAt} · P2P Escrow</p>
          </div>
        </div>

        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-black',
            isCompleted && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            isUtrSubmitted && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse',
            isAwaiting && 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          )}
        >
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {/* Status Hero Card */}
      <div
        className={cn(
          'p-4.5 rounded-3xl text-white shadow-xl relative overflow-hidden space-y-2',
          isCompleted
            ? 'bg-gradient-to-tr from-emerald-800 via-teal-800 to-emerald-900'
            : isUtrSubmitted
            ? 'bg-gradient-to-tr from-[#0a2316] via-[#0d3420] to-[#0a2316] border border-emerald-500/40'
            : 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900'
        )}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
          <ShieldCheck className="w-4 h-4" />
          <span>Automated Multi-Sig Escrow Active</span>
        </div>

        <h2 className="text-lg font-black tracking-tight">
          {isCompleted
            ? 'Order Completed & Settled'
            : isUtrSubmitted
            ? 'Buyer Submitted UTR · Release Ready'
            : 'Awaiting Buyer INR Transfer'}
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isCompleted
            ? 'USDT has been released from escrow to the buyer. Your 1.5% commission has been credited.'
            : isUtrSubmitted
            ? 'Buyer states that INR has been sent. Check your bank statement and click Release USDT.'
            : 'Buyer has 15 minutes to pay into your settlement account and upload bank UTR.'}
        </p>
      </div>

      {/* 4-Step Lifecycle Progress Tracker */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-2xs space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Trade Escrow Lifecycle
        </span>
        <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
          <div className="space-y-1">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold mx-auto flex items-center justify-center text-[10px]">
              ✓
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Matched</span>
          </div>

          <div className="space-y-1">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold mx-auto flex items-center justify-center text-[10px]">
              ✓
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Locked</span>
          </div>

          <div className="space-y-1">
            <div
              className={cn(
                'w-6 h-6 rounded-full font-bold mx-auto flex items-center justify-center text-[10px]',
                isUtrSubmitted || isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-blue-500/20 text-blue-500 animate-pulse'
              )}
            >
              {isUtrSubmitted || isCompleted ? '✓' : '3'}
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">INR Sent</span>
          </div>

          <div className="space-y-1">
            <div
              className={cn(
                'w-6 h-6 rounded-full font-bold mx-auto flex items-center justify-center text-[10px]',
                isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              )}
            >
              {isCompleted ? '✓' : '4'}
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Settled</span>
          </div>
        </div>
      </div>

      {/* Trade Summary Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-slate-400">Buyer Counterparty</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-white">{order.buyerName}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 rounded-full">
              {order.buyerRating}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">You Receive (INR)</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                ₹{order.inrAmount.toLocaleString('en-IN')}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(String(order.inrAmount))
                  setCopiedAmount(true)
                  setTimeout(() => setCopiedAmount(false), 2000)
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Escrow USDT</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block pt-0.5">
              {order.usdtAmount.toFixed(2)} USDT
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Payment Method</span>
            <span className="font-bold text-slate-900 dark:text-white">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Locked Rate</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">₹{order.rate.toFixed(2)} / USDT</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Desk Commission (1.5%)</span>
            <span className="font-mono font-bold text-amber-500">
              +{((order.usdtAmount * 0.015)).toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* Bank UTR Container */}
        {order.utr && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                Buyer Bank UTR Number
              </span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                {order.utr}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(order.utr || '')
                setCopiedUtr(true)
                setTimeout(() => setCopiedUtr(false), 2000)
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              {copiedUtr ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUtr ? 'Copied' : 'Copy UTR'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2">
        {isUtrSubmitted && (
          <>
            <button
              type="button"
              onClick={() => setIsReleaseOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Verify Bank Receipt & Release USDT</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDisputeOpen(true)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition-colors cursor-pointer"
            >
              Didn't Receive Payment / Raise Dispute
            </button>
          </>
        )}

        {isAwaiting && (
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold space-y-2">
            <p>Waiting for buyer to complete payment and submit bank UTR reference.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or input manual UTR if verified..."
                value={manualUtr}
                onChange={(e) => setManualUtr(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!manualUtr) return
                  submitUtr(order.id, manualUtr)
                  showToast('UTR submitted manually!')
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {isCompleted && (
          <Link
            to="/merchant/orders"
            className="w-full py-3 rounded-2xl bg-[#0a2316] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Back to All Orders</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Live Encrypted Trade Chat */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <span className="font-extrabold text-slate-900 dark:text-white">Encrypted Trade Chat</span>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Desk Arbitrator
          </span>
        </div>

        {/* Messages */}
        <div className="p-3.5 space-y-2.5 max-h-48 overflow-y-auto no-scrollbar text-xs">
          {chatMessages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'flex flex-col',
                m.sender === 'merchant'
                  ? 'items-end'
                  : m.sender === 'buyer'
                  ? 'items-start'
                  : 'items-center text-center'
              )}
            >
              {m.sender === 'system' ? (
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono">
                  {m.text}
                </span>
              ) : (
                <div
                  className={cn(
                    'p-2.5 rounded-2xl max-w-[80%] space-y-0.5',
                    m.sender === 'merchant'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none'
                  )}
                >
                  <p className="text-xs leading-relaxed">{m.text}</p>
                  <span className="text-[9px] opacity-70 block text-right">{m.time}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSendChat} className="p-2 border-t border-slate-100 dark:border-slate-800 flex gap-1.5">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Send message to buyer..."
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modals */}
      <ReleaseEscrowModal
        order={order}
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        onSuccess={showToast}
      />
      <DisputeOrderModal
        order={order}
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        onSuccess={showToast}
      />
    </div>
  )
}

