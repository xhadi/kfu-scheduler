import './schedule.css'
import WeekGrid from './WeekGrid'
import { useUiText } from '../../contexts/UiTextContext'

export default function ScheduleCard({ scheduleId, schedule, courseColorMap }) {
  const { text } = useUiText()
  const crns = schedule.sections.map(s => s.crn)

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border dark:border-border-dark bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-border dark:border-border-dark flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
            #{scheduleId}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {crns.map((crn, i) => (
              <span
                key={`${crn}-${i}`}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono"
              >
                CRN {crn}
              </span>
            ))}
          </div>
        </div>

        {/* Day column headers */}
        <div className="flex bg-gray-50 dark:bg-gray-800 border-b border-border dark:border-border-dark" dir="ltr">
          <div className="shrink-0 weekgrid-time-col" />
          {['sun','mon','tue','wed','thu'].map(d => (
            <div key={d} className="flex-1 text-center text-xs font-semibold py-1.5 border-l border-border dark:border-border-dark text-gray-500 dark:text-gray-400 uppercase">
              {text(d)}
            </div>
          ))}
        </div>

        <WeekGrid schedule={schedule} courseColorMap={courseColorMap} />
      </div>
    </div>
  )
}
