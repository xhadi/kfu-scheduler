import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function CatalogLoader() {
  const { t, dir } = useLanguage()
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Show a simple spinner for the first 3 seconds
  if (secondsElapsed < 3) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          {t('connecting')}
        </p>
      </div>
    )
  }

  const progress = Math.min(Math.floor(((secondsElapsed - 3) / 47) * 100), 99)
  const secondsRemaining = Math.max(50 - secondsElapsed, 1)

  // After 3 seconds, show detailed server waking card
  const timeMessage = t('estimatedTime', { seconds: secondsRemaining })

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-xl shadow-lg transition-all duration-300 animate-fade-in">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 bg-primary/10 rounded-full animate-ping"></div>
        </div>

        <h3 className="text-lg font-bold text-text dark:text-text-dark">
          {t('serverWakingUp')}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {t('serverWakingUpDesc')}
        </p>

        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mt-2">
          <div 
            className="bg-primary h-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <span className="text-xs font-semibold text-primary/80" dir={dir}>
          {timeMessage} ({progress}%)
        </span>
      </div>
    </div>
  )
}
