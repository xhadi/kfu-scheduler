import { ThemeProvider } from './contexts/ThemeContext'
import { UiTextProvider } from './contexts/UiTextContext'
import { ScheduleProvider, useSchedule } from './contexts/ScheduleContext'
import Header from './components/Header'
import Footer from './components/Footer'
import CourseSelectionPage from './components/Step1/CourseSelectionPage'
import ResultsPage from './components/Step2/ResultsPage'

function AppContent() {
  const { step } = useSchedule()
  return step === 1 ? <CourseSelectionPage /> : <ResultsPage />
}

function App() {
  return (
    <ThemeProvider>
      <UiTextProvider>
        <ScheduleProvider>
          <div className="min-h-screen flex flex-col bg-white dark:bg-surface-dark text-text dark:text-text-dark">
            <Header />
            <main className="flex-1">
              <AppContent />
            </main>
            <Footer />
          </div>
        </ScheduleProvider>
      </UiTextProvider>
    </ThemeProvider>
  )
}

export default App