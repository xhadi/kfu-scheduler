const SECTION_COLORS = [
  'bg-blue-200 dark:bg-blue-900/80 border-blue-400 dark:border-blue-600',
  'bg-green-200 dark:bg-green-900/80 border-green-400 dark:border-green-600',
  'bg-yellow-200 dark:bg-yellow-900/80 border-yellow-400 dark:border-yellow-600',
  'bg-purple-200 dark:bg-purple-900/80 border-purple-400 dark:border-purple-600',
  'bg-pink-200 dark:bg-pink-900/80 border-pink-400 dark:border-pink-600',
  'bg-orange-200 dark:bg-orange-900/80 border-orange-400 dark:border-orange-600',
  'bg-cyan-200 dark:bg-cyan-900/80 border-cyan-400 dark:border-cyan-600',
  'bg-red-200 dark:bg-red-900/80 border-red-400 dark:border-red-600',
]

export default function TimetableBlock({ section, colorIndex }) {
  const color = SECTION_COLORS[colorIndex % SECTION_COLORS.length]

  return (
    <div
      className={`h-full rounded-md border-l-4 p-1.5 text-[11px] leading-snug overflow-hidden ${color}`}
      dir="rtl"
    >
      <div className="font-bold truncate">{section.course_title || section.course_id}</div>
      <div className="truncate opacity-80">{section.teacher}</div>
      <div className="opacity-70">
        {section.start_time} - {section.end_time}
      </div>
      <div className="opacity-70">
        CRN: {section.crn} | #{section.section_number}
      </div>
    </div>
  )
}