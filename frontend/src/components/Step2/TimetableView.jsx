import { useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import TimetableBlock from './TimetableBlock'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu']
const ABBREV_TO_KEY = { 'ح': 'sun', 'ن': 'mon', 'ث': 'tue', 'ر': 'wed', 'خ': 'thu' }
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 7)
const ROW_HEIGHT = 64

export default function TimetableView({ schedule, courseColorMap }) {
  const { t } = useLanguage()

  const sectionsByDay = useMemo(() => {
    const map = {}
    DAYS.forEach(d => { map[d] = [] })
    if (!schedule || !schedule.sections) return map
    schedule.sections.forEach(sec => {
      sec.days.forEach(dayAbbrev => {
        const dayKey = ABBREV_TO_KEY[dayAbbrev.trim()]
        if (dayKey) {
          map[dayKey].push(sec)
        }
      })
    })
    return map
  }, [schedule])

  if (!schedule || !schedule.sections) return null

  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h + m / 60
  }

  const getTimePosition = (timeStr) => {
    const time = parseTime(timeStr)
    return ((time - 7) / 14) * 100
  }

  const getTimeHeight = (startStr, endStr) => {
    const start = parseTime(startStr)
    const end = parseTime(endStr)
    return Math.max(((end - start) / 14) * 100, 4)
  }

  const dayLabels = {
    sun: t('sun'),
    mon: t('mon'),
    tue: t('tue'),
    wed: t('wed'),
    thu: t('thu'),
  }

  return (
    <div className="overflow-x-auto mt-4" dir="ltr">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-border dark:border-border-dark" style={{ minWidth: '800px' }}>
        <div className="grid grid-cols-6 border-b border-border dark:border-border-dark bg-gray-50 dark:bg-gray-800">
          <div className="p-2 text-sm text-center font-medium text-gray-500 border-e border-border dark:border-border-dark">
            {t('time')}
          </div>
          {DAYS.map(day => (
            <div key={day} className="p-2.5 text-center font-semibold border-e border-border dark:border-border-dark last:border-e-0">
              {dayLabels[day]}
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-6" style={{ height: `${TIME_SLOTS.length * ROW_HEIGHT}px` }}>
          <div className="relative border-e border-border dark:border-border-dark">
            {TIME_SLOTS.map(hour => (
              <div
                key={hour}
                className="absolute w-full text-xs text-gray-400 text-end pe-2 -translate-y-1/2"
                style={{ top: `${((hour - 7) / 14) * 100}%` }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {DAYS.map(day => (
            <div
              key={day}
              className="relative border-e border-border dark:border-border-dark last:border-e-0"
            >
              {TIME_SLOTS.map(hour => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-dashed border-gray-100 dark:border-gray-800"
                  style={{ top: `${((hour - 7) / 14) * 100}%` }}
                />
              ))}
              {sectionsByDay[day]?.map((sec, idx) => {
                const courseIdx = schedule.sections.indexOf(sec)
                return (
                  <div
                    key={`${sec.crn}-${idx}`}
                    className="absolute inset-x-1"
                    style={{
                      top: `${getTimePosition(sec.start_time)}%`,
                      height: `${getTimeHeight(sec.start_time, sec.end_time)}%`,
                    }}
                  >
                    <TimetableBlock
                      section={sec}
                      colorIndex={courseColorMap?.[sec.course_id] ?? courseIdx}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}