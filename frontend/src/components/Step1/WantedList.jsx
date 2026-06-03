import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { X } from 'lucide-react'

export default function WantedList() {
  const { t } = useLanguage()
  const { selectedCourses, removeCourse } = useSchedule()

  if (selectedCourses.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">{t('wantedCourses')}</h3>
      <div className="flex flex-wrap gap-2">
        {selectedCourses.map(course => (
          <span
            key={course.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-light/20 dark:bg-primary-light/30 text-primary-dark dark:text-primary-light text-sm"
          >
            <span className="font-semibold">{course.id}</span>
            <span>— {course.title}</span>
            <button
              onClick={() => removeCourse(course.id)}
              className="ms-1 hover:text-red-500"
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