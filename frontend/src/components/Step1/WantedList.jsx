import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { X } from 'lucide-react'

export default function WantedList() {
  const { t } = useLanguage()
  const { selectedCourses, removeCourse } = useSchedule()

  if (selectedCourses.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 block">
        {t('wantedCourses')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {selectedCourses.map(course => (
          <span
            key={course.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 dark:bg-primary-light/10 border border-primary/10 dark:border-primary-light/20 text-primary dark:text-primary-light text-sm shadow-sm hover:border-primary/30 dark:hover:border-primary-light/30 transition-all duration-200 animate-fade-in"
          >
            <span className="font-mono font-bold text-xs bg-primary/10 dark:bg-primary-light/20 px-1.5 py-0.5 rounded">
              {course.id}
            </span>
            <span className="font-medium truncate max-w-[150px]" title={course.title}>
              {course.title}
            </span>
            <button
              onClick={() => removeCourse(course.id)}
              className="ms-1.5 p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label={t('removeCourse')}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}