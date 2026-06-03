import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'

export default function GenderSelector() {
  const { t } = useLanguage()
  const { gender, setGender } = useSchedule()

  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={() => setGender('male')}
        className={`px-8 py-3 rounded-lg text-lg font-semibold transition-colors ${
          gender === 'male'
            ? 'bg-primary text-white'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {t('male')}
      </button>
      <button
        onClick={() => setGender('female')}
        className={`px-8 py-3 rounded-lg text-lg font-semibold transition-colors ${
          gender === 'female'
            ? 'bg-primary text-white'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {t('female')}
      </button>
    </div>
  )
}