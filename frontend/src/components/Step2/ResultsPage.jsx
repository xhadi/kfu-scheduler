import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import ResultsHeader from './ResultsHeader'
import FilterBar from './FilterBar'

export default function ResultsPage() {
  const { results, filteredOptions, currentScheduleIndex } = useSchedule()
  const { t } = useLanguage()

  if (!results || results.total_options_found === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <ResultsHeader />
        <p className="mt-8 text-gray-500">{t('noResults')}</p>
      </div>
    )
  }

  if (filteredOptions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <ResultsHeader />
        <FilterBar />
        <p className="mt-4 text-gray-500">{t('noFilters')}</p>
      </div>
    )
  }

  const schedule = filteredOptions[currentScheduleIndex] || filteredOptions[0]

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <ResultsHeader />
      <FilterBar />
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center text-gray-400">
        Schedule {currentScheduleIndex + 1} placeholder — {schedule.sections.length} sections
      </div>
    </div>
  )
}