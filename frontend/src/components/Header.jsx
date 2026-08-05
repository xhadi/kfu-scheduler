import { useTheme } from '../contexts/ThemeContext'
import { useUiText } from '../contexts/UiTextContext'
import { Sun, Moon } from 'lucide-react'

export default function Header() {
  const { theme, setTheme } = useTheme()
  const { text } = useUiText()

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border dark:border-border-dark">
      <a className="text-lg font-bold text-primary" href="/">{text('appTitle')}</a>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={text('theme')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}