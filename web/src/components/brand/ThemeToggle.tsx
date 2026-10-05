import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/lib/theme'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const [isRippling, setIsRippling] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsRippling(true)
    setTimeout(() => setIsRippling(false), 500)
    toggle(e)
  }

  const isDark = theme === 'dark'

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 transition-all duration-300 ${
        isDark
          ? 'bg-[#181a29] text-white hover:bg-[#202438]'
          : 'bg-[#f0f2fb] text-[#3b52f6] hover:bg-white'
      } ${className}`}
    >
      {/* Click expand ripple ring */}
      {isRippling && (
        <motion.span
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1.75, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`absolute inset-0 rounded-full pointer-events-none ${
            isDark ? 'bg-indigo-400/20' : 'bg-[#3b52f6]/20'
          }`}
        />
      )}

      {/* Animated icon switch for both light -> dark and dark -> light */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ rotate: -120, scale: 0.3, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 120, scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="h-[21px] w-[21px] stroke-[2] text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
          ) : (
            <Moon className="h-[21px] w-[21px] stroke-[2.2] text-[#3b52f6]" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}


