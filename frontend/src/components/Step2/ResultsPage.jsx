import { useMemo } from 'react'
import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import ResultsHeader from './ResultsHeader'
import FilterBar from './FilterBar'
import TimetableView from './TimetableView'
import ScheduleNav from './ScheduleNav'

export default function ResultsPage() {
  const { results, filteredOptions, currentScheduleIndex, goBack } = useSchedule()
  const { t } = useLanguage()

  const courseColorMap = useMemo(() => {
    if (!results) return {}
    const map = {}
    let idx = 0
    results.options.forEach(schedule =>
      schedule.sections.forEach(sec => {
        if (!(sec.course_id in map)) {
          map[sec.course_id] = idx++
        }
      })
    )
    return map
  }, [results])

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
      <TimetableView schedule={schedule} courseColorMap={courseColorMap} />
      <ScheduleNav />
      <div className="text-center mt-4">
        <button
          onClick={goBack}
          className="px-6 py-2 rounded-lg border border-border dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t('editCourses')}
        </button>
      </div>
    </div>
  )
}