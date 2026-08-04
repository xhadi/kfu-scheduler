import { useState, useEffect, useMemo } from 'react'
import { Github, Send } from 'lucide-react'
import { useUiText } from '../contexts/UiTextContext'
import { useScrapeStatus } from '../hooks/useScrapeStatus'

function formatRelativeTime(date) {
  if (!date) return null

  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'الآن'
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  return `منذ ${diffDays} يوم`
}

export default function Footer() {
  const { text } = useUiText()
  const { lastUpdate, loading } = useScrapeStatus()
  const [relativeTime, setRelativeTime] = useState(null)

  // Compute initial relative time
  const initialRelativeTime = useMemo(
    () => (lastUpdate ? formatRelativeTime(lastUpdate) : null),
    [lastUpdate]
  )

  // Update relative time every minute
  useEffect(() => {
    if (!lastUpdate) return

    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastUpdate))
    }, 60000)

    return () => clearInterval(interval)
  }, [lastUpdate])

  return (
    <footer className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Mobile: stack vertically, Desktop: single row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Timestamp and credit */}
          <div className="text-center sm:text-start">
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
              {text('footerLastUpdated')}:{' '}
              {loading ? '...' : relativeTime || initialRelativeTime || text('footerUnknown')}
            </p>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary mt-1">
              {text('footerDevelopedBy')}
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/xhadi/kfu-schedular"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-primary transition-colors"
            >
              <Github size={18} />
              <span>{text('footerGithub')}</span>
            </a>
            <a
              href="https://t.me/JadwilniBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-primary transition-colors"
            >
              <Send size={18} />
              <span>{text('footerContactTelegram')}</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
