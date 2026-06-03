import { useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import TimetableBlock from './TimetableBlock'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu']
const ARABIC_TO_KEY = { 'الأحد': 'sun', 'الاثنين': 'mon', 'الثلاثاء': 'tue', 'الأربعاء': 'wed', 'الخميس': 'thu' }
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 7)

export default function TimetableView({ schedule, courseColorMap }) {
  const { t } = useLanguage()

  const sectionsByDay = useMemo(() => {
    const map = {}
    DAYS.forEach(d => { map[d] = [] })
    if (!schedule || !schedule.sections) return map
    schedule.sections.forEach(sec => {
      sec.days.forEach(dayArabic => {
        const dayKey = ARABIC_TO_KEY[dayArabic]
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
    return ((end - start) / 14) * 100
  }

  const dayLabels = {
    sun: t('sun'),
    mon: t('mon'),
    tue: t('tue'),
    wed: t('wed'),
    thu: t('thu'),
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-6 border-b border-border dark:border-border-dark">
          <div className="p-2 text-xs text-center font-medium text-gray-500">
            {t('time')}
          </div>
          {DAYS.map(day => (
            <div key={day} className="p-2 text-center font-medium border-s border-border dark:border-border-dark">
              {dayLabels[day]}
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-6" style={{ height: `${TIME_SLOTS.length * 50}px` }}>
          <div className="relative">
            {TIME_SLOTS.map(hour => (
              <div
                key={hour}
                className="absolute w-full text-xs text-gray-500 text-end pe-2 -translate-y-1/2"
                style={{ top: `${((hour - 7) / 14) * 100}%` }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {DAYS.map(day => (
            <div
              key={day}
              className="relative border-s border-border dark:border-border-dark"
            >
              {TIME_SLOTS.map(hour => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-dashed border-gray-200 dark:border-gray-700"
                  style={{ top: `${((hour - 7) / 14) * 100}%` }}
                />
              ))}
              {sectionsByDay[day]?.map((sec, idx) => {
                const courseIdx = schedule.sections.indexOf(sec)
                return (
                  <div
                    key={`${sec.crn}-${idx}`}
                    className="absolute w-full px-0.5"
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