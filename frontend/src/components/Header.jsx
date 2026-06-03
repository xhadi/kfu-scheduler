import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Sun, Moon, Monitor, Languages } from 'lucide-react'

export default function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
  }

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border dark:border-border-dark">
      <h1 className="text-lg font-bold text-primary">{t('appTitle')}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t('theme')}
        >
          {theme === 'system' ? <Monitor size={20} /> : <ThemeIcon size={20} />}
        </button>
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t('language')}
        >
          <Languages size={20} />
        </button>
      </div>
    </header>
  )
}