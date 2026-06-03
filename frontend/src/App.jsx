import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Header from './components/Header'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-white dark:bg-surface-dark text-text dark:text-text-dark">
          <Header />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App