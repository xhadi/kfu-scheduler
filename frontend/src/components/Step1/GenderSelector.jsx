import { User } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'

export default function GenderSelector() {
  const { t } = useLanguage()
  const { gender, setGender } = useSchedule()

  const options = ['male', 'female']

  return (
    <div
      role="radiogroup"
      aria-label={t('selectGender')}
      className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full"
    >
      {options.map((opt) => {
        const isSelected = gender === opt
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setGender(opt)}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-primary-light focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
              isSelected
                ? 'border-primary dark:border-primary-light bg-primary/5 dark:bg-primary-light/10 shadow-md text-primary dark:text-primary-light'
                : 'border-border dark:border-border-dark bg-white dark:bg-gray-800 hover:border-primary/50 dark:hover:border-primary-light/50 hover:shadow-md hover:-translate-y-1 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div
              className={`p-3 rounded-full mb-3 transition-colors duration-300 ${
                isSelected
                  ? 'bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <User size={32} aria-hidden="true" />
            </div>
            <span className="text-base font-bold">{t(opt)}</span>
          </button>
        )
      })}
    </div>
  )
}