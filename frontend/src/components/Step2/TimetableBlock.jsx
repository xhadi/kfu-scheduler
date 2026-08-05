import './schedule.css'
import { Check, Users, Lock, HelpCircle } from 'lucide-react'

const STATUS_CLASS = {
  'متاحة': 'status-available',
  'ممتلئة': 'status-full',
  'غير متاحة': 'status-not-available',
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'متاحة':
      return <Check size={12} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
    case 'ممتلئة':
      return <Users size={12} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
    case 'غير متاحة':
      return <Lock size={11} className="text-red-500 dark:text-red-400" aria-hidden="true" />
    default:
      return <HelpCircle size={12} className="text-gray-400" aria-hidden="true" />
  }
}

export default function TimetableBlock({ section, colorIndex }) {
  const statusClass = STATUS_CLASS[section.status] || 'status-unknown'
  const bgClass = `course-bg-${colorIndex % 8}`
  const sectionLabel = `${section.section_type} #${section.section_number}`
  const statusIcon = getStatusIcon(section.status)

  return (
    <div
      className={`section-block ${statusClass} ${bgClass} course-text`}
      aria-label={`${section.course_id} ${sectionLabel} ${section.teacher} ${section.status}`}
    >
      <div className="px-1 pt-1 flex items-center justify-between gap-1">
        <span className="font-bold truncate text-[11px] leading-none">{section.course_id}</span>
        <span className="flex items-center shrink-0 ml-auto me-0.5" title={section.status}>
          {statusIcon}
        </span>
      </div>
      <div className="px-1 truncate text-[10px] course-text-secondary">{section.course_title}</div>
      <div className="px-1 truncate text-[10px] course-text-secondary">{sectionLabel}</div>
      <div className="px-1 truncate text-[10px] course-text-secondary">CRN: {section.crn}</div>
      <div className="px-1 truncate text-[10px] course-text-secondary">{section.teacher}</div>
    </div>
  )
}
