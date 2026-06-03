import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import ResultsHeader from './ResultsHeader'

export default function ResultsPage() {
  const { results } = useSchedule()
  const { t } = useLanguage()

  if (!results || results.total_options_found === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <ResultsHeader />
        <p className="mt-8 text-gray-500">{t('noResults')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <ResultsHeader />
      <div className="mt-4" />
      {/* FilterBar and TimetableView will be added in later tasks */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center text-gray-400">
        Schedule display placeholder
      </div>
    </div>
  )
}