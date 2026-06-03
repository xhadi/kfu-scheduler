import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ScheduleProvider, useSchedule } from './contexts/ScheduleContext'
import Header from './components/Header'
import CourseSelectionPage from './components/Step1/CourseSelectionPage'
import ResultsPage from './components/Step2/ResultsPage'

function AppContent() {
  const { step } = useSchedule()
  return step === 1 ? <CourseSelectionPage /> : <ResultsPage />
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ScheduleProvider>
          <div className="min-h-screen bg-white dark:bg-surface-dark text-text dark:text-text-dark">
            <Header />
            <AppContent />
          </div>
        </ScheduleProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App