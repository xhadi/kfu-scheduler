import './schedule.css'
import { useLanguage } from '../../contexts/LanguageContext'

const STATUS_CLASS = {
  'متاحة': 'status-available',
  'ممتلئة': 'status-full',
  'غير متاحة': 'status-not-available',
}

export default function TimetableBlock({ section, colorIndex }) {
  const { lang } = useLanguage()
  const statusClass = STATUS_CLASS[section.status] || 'status-unknown'
  const bgClass = `course-bg-${colorIndex % 8}`
  const sectionLabel = lang === 'ar'
    ? `${section.section_type} #${section.section_number}`
    : `${section.section_type === 'نظري' ? 'Theory' : 'Practical'} #${section.section_number}`

  return (
    <div
      className={`section-block ${statusClass} ${bgClass} course-text`}
      aria-label={`${section.course_id} ${sectionLabel} ${section.start_time}-${section.end_time} ${section.teacher} ${section.status}`}
    >
      <div className="px-1 pt-0.5 font-bold truncate">
        {section.course_id}
      </div>
      <div className="px-1 truncate text-[10px] course-text-secondary">{section.course_title}</div>
      <div className="px-1 truncate course-text-secondary">{sectionLabel}</div>
      <div className="px-1 truncate course-text-secondary">CRN: {section.crn}</div>
      <div className="px-1 truncate course-text-secondary">{section.teacher}</div>
    </div>
  )
}
