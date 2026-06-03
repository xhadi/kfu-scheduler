import { useLanguage } from '../../contexts/LanguageContext'

const SECTION_COLORS = [
  'bg-blue-200 dark:bg-blue-900 border-blue-400 dark:border-blue-600',
  'bg-green-200 dark:bg-green-900 border-green-400 dark:border-green-600',
  'bg-yellow-200 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-600',
  'bg-purple-200 dark:bg-purple-900 border-purple-400 dark:border-purple-600',
  'bg-pink-200 dark:bg-pink-900 border-pink-400 dark:border-pink-600',
  'bg-orange-200 dark:bg-orange-900 border-orange-400 dark:border-orange-600',
  'bg-cyan-200 dark:bg-cyan-900 border-cyan-400 dark:border-cyan-600',
  'bg-red-200 dark:bg-red-900 border-red-400 dark:border-red-600',
]

export default function TimetableBlock({ section, colorIndex }) {
  const { t } = useLanguage()
  const color = SECTION_COLORS[colorIndex % SECTION_COLORS.length]

  const startTime = section.start_time
  const endTime = section.end_time

  return (
    <div
      className={`absolute end-1 start-1 rounded-md border p-1 text-xs overflow-hidden ${color}`}
    >
      <div className="font-bold leading-tight">{section.course_id}</div>
      <div className="leading-tight truncate">{section.teacher}</div>
      <div className="leading-tight text-[10px]">
        {startTime} - {endTime}
      </div>
      <div className="leading-tight text-[10px]">
        {section.section_type === 'Theory' ? t('theory') : t('practical')}
      </div>
    </div>
  )
}