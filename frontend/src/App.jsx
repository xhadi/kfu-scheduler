import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-white dark:bg-surface-dark text-text dark:text-text-dark">
        <p className="p-8 text-center">KFU Scheduler</p>
      </div>
    </ThemeProvider>
  )
}

export default App