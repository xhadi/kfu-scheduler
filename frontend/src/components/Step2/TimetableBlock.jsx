const SECTION_COLORS = [
  'bg-blue-100 dark:bg-blue-900/60 border-l-blue-500 dark:border-l-blue-400',
  'bg-green-100 dark:bg-green-900/60 border-l-green-500 dark:border-l-green-400',
  'bg-yellow-100 dark:bg-yellow-900/60 border-l-yellow-500 dark:border-l-yellow-400',
  'bg-purple-100 dark:bg-purple-900/60 border-l-purple-500 dark:border-l-purple-400',
  'bg-pink-100 dark:bg-pink-900/60 border-l-pink-500 dark:border-l-pink-400',
  'bg-orange-100 dark:bg-orange-900/60 border-l-orange-500 dark:border-l-orange-400',
  'bg-cyan-100 dark:bg-cyan-900/60 border-l-cyan-500 dark:border-l-cyan-400',
  'bg-red-100 dark:bg-red-900/60 border-l-red-500 dark:border-l-red-400',
]

export default function TimetableBlock({ section, colorIndex }) {
  const color = SECTION_COLORS[colorIndex % SECTION_COLORS.length]

  return (
    <div
      className={`h-full border-l-4 rounded px-1.5 py-1 ${color}`}
      dir="rtl"
    >
      <div className="font-semibold truncate leading-tight">{section.course_title || section.course_id}</div>
      <div className="truncate text-xs leading-tight opacity-85">{section.teacher}</div>
      <div className="text-xs leading-tight opacity-75">
        {section.start_time}–{section.end_time}
      </div>
      <div className="text-xs leading-tight opacity-75">
        CRN {section.crn}
      </div>
    </div>
  )
}