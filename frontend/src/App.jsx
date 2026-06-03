import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-white dark:bg-surface-dark text-text dark:text-text-dark">
          <p className="p-8 text-center">مجدول KFU</p>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App