import { useSchedule } from '../../contexts/ScheduleContext'
import { useUiText } from '../../contexts/UiTextContext'
import { ArrowLeft } from 'lucide-react'

export default function ResultsHeader() {
  const { goBack, currentScheduleIndex, results } = useSchedule()
  const { text } = useUiText()

  if (!results) return null

  const total = results.total_options_found

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border dark:border-border-dark">
      <button
        onClick={goBack}
        className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
      >
        <ArrowLeft size={18} />
        <span>{text('editCourses')}</span>
      </button>
      <span className="text-sm font-medium">
        {text('scheduleOf', { current: currentScheduleIndex + 1, total })}
      </span>
      <div className="w-24" />
    </div>
  )
}