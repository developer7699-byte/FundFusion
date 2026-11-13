import { useState } from 'react'
import { X, Gift, Check, Sparkles, Award, Star } from 'lucide-react'

interface RewardsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RewardsModal({ isOpen, onClose }: RewardsModalProps) {
  if (!isOpen) return null

  const [claimedDays, setClaimedDays] = useState<number[]>([1, 2])
  const [claimedTasks, setClaimedTasks] = useState<string[]>([])
  const [justClaimed, setJustClaimed] = useState('')

  const handleClaimDay = (day: number) => {
    if (claimedDays.includes(day)) return
    setClaimedDays([...claimedDays, day])
    setJustClaimed(`Claimed Day ${day} Daily Reward (+2 USDT)!`)
    setTimeout(() => setJustClaimed(''), 2500)
  }

  const handleClaimTask = (taskId: string, reward: string) => {
    if (claimedTasks.includes(taskId)) return
    setClaimedTasks([...claimedTasks, taskId])
    setJustClaimed(`Claimed Task Bonus (+${reward})!`)
    setTimeout(() => setJustClaimed(''), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#121829] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Rewards Hub</h3>
              <p className="text-[10px] text-slate-400">Complete daily tasks & earn up to 50 USDT</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {justClaimed && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <Check className="w-4 h-4 shrink-0" />
              <span>{justClaimed}</span>
            </div>
          )}

          {/* 7-Day Check-in Streak */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 7-Day Check-in Streak
              </span>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                {claimedDays.length}/7 Days
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const isClaimed = claimedDays.includes(d)
                const isToday = d === 3

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleClaimDay(d)}
                    disabled={isClaimed}
                    className={`p-2 rounded-xl text-center transition-all cursor-pointer ${
                      isClaimed
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : isToday
                        ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-500/30 scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-[9px] block">Day {d}</span>
                    <span className="text-[11px] font-black">{isClaimed ? '✓' : `+${d * 2}`}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* New User Tasks */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-white block">Beginner Tasks</span>

            {[
              { id: 'kyc', title: 'Complete Identity KYC', desc: 'Verify identity to unlock full limits', reward: '5 USDT' },
              { id: 'p2p', title: 'Make First P2P Trade', desc: 'Buy or sell any amount via P2P escrow', reward: '10 USDT' },
              { id: 'deposit', title: 'Deposit ≥ 50 USDT', desc: 'Any network deposit with zero gas fee', reward: '15 USDT' },
            ].map((task) => {
              const isDone = claimedTasks.includes(task.id)

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</h4>
                    <p className="text-[10px] text-slate-400">{task.desc}</p>
                    <span className="text-[10px] font-black text-amber-500 mt-0.5 inline-block">+{task.reward}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaimTask(task.id, task.reward)}
                    disabled={isDone}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                    }`}
                  >
                    {isDone ? 'Claimed' : 'Claim'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

