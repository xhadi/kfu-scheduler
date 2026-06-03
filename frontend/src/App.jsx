import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ScheduleProvider } from './contexts/ScheduleContext'
import Header from './components/Header'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ScheduleProvider>
          <div className="min-h-screen bg-white dark:bg-surface-dark text-text dark:text-text-dark">
            <Header />
          </div>
        </ScheduleProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App