import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { ChevronRight, ChevronLeft } from 'lucide-react'

export default function ScheduleNav() {
  const { currentScheduleIndex, setCurrentScheduleIndex, results } = useSchedule()
  const { dir } = useLanguage()

  if (!results || results.total_options_found <= 1) return null

  const total = results.total_options_found
  const hasPrev = currentScheduleIndex > 0
  const hasNext = currentScheduleIndex < total - 1

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        onClick={() => setCurrentScheduleIndex(currentScheduleIndex - 1)}
        disabled={!hasPrev}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <PrevIcon size={24} />
      </button>
      <button
        onClick={() => setCurrentScheduleIndex(currentScheduleIndex + 1)}
        disabled={!hasNext}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <NextIcon size={24} />
      </button>
    </div>
  )
}