import { useMemo } from 'react'
import './schedule.css'
import TimetableBlock from './TimetableBlock'

const DAYS = [
  { key: 'الأحد', abbrev: 'ح' },
  { key: 'الاثنين', abbrev: 'ن' },
  { key: 'الثلاثاء', abbrev: 'ث' },
  { key: 'الأربعاء', abbrev: 'ر' },
  { key: 'الخميس', abbrev: 'خ' },
]

// Converts HH:MM string to fractional decimal hours (e.g., "08:30" -> 8.5)
function parseTime(t) {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

// Converts 24-hour integer to 12-hour AM/PM label (e.g., 14 -> "2:00 PM")
function to12Hour(h) {
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:00 ${period}`
}

const SLOT_H = 60 // Pixel height per 1-hour grid slot

/**
 * 5-Day Weekly Timetable Grid (Sunday to Thursday).
 * Dynamically computes first/last hour bounds from active schedule time slots
 * and renders absolutely-positioned section blocks.
 */
export default function WeekGrid({ schedule, courseColorMap }) {


  const { firstHour, lastHour, sectionsByDay } = useMemo(() => {
    if (!schedule || !schedule.sections) return { firstHour: 7, lastHour: 20, sectionsByDay: {} }

    const allSlots = schedule.sections.flatMap(sec =>
      sec.time_slots.map(slot => ({
        ...sec,
        day: slot.day,
        start_time: slot.start,
        end_time: slot.end,
      }))
    )

    const starts = allSlots.map(s => parseTime(s.start_time))
    const ends = allSlots.map(s => parseTime(s.end_time))
    const first = starts.length ? Math.floor(Math.min(...starts)) : 7
    const last = ends.length ? Math.ceil(Math.max(...ends)) : 20

    const byDay = {}
    DAYS.forEach(d => { byDay[d.abbrev] = [] })
    allSlots.forEach(item => {
      if (byDay[item.day]) byDay[item.day].push(item)
    })

    return { firstHour: first, lastHour: last, sectionsByDay: byDay }
  }, [schedule])

  if (!schedule || !schedule.sections) return null

  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i)
  const totalH = hours.length
  const gridH = totalH * SLOT_H

  return (
    <div className="overflow-hidden rounded-b-lg" dir="ltr">
      <div className="flex bg-white dark:bg-gray-900">
        {/* Time column */}
        <div className="shrink-0 weekgrid-time-col relative select-none" style={{ height: gridH }}>
          {hours.map(h => (
            <div key={h}>
              {/* Solid Hour Line & Label */}
              <div
                className="absolute left-0 right-0 border-t border-border dark:border-border-dark"
                style={{ top: (h - firstHour) * SLOT_H }}
              />
              <div
                className="absolute w-full text-[10px] font-medium text-gray-500 dark:text-gray-400 text-end pe-1.5 -translate-y-1/2 pointer-events-none"
                style={{ top: (h - firstHour) * SLOT_H }}
              >
                {to12Hour(h)}
              </div>

              {/* Dashed Half-Hour Label */}
              <div
                className="absolute w-full text-[9px] text-gray-400 dark:text-gray-500 text-end pe-1.5 -translate-y-1/2 pointer-events-none"
                style={{ top: (h - firstHour + 0.5) * SLOT_H }}
              >
                :30
              </div>
            </div>
          ))}
          {/* Closing Hour Line & Label at bottom boundary */}
          <div
            className="absolute left-0 right-0 border-t border-border dark:border-border-dark"
            style={{ top: totalH * SLOT_H }}
          />
          <div
            className="absolute w-full text-[10px] font-medium text-gray-500 dark:text-gray-400 text-end pe-1.5 -translate-y-1/2 pointer-events-none"
            style={{ top: totalH * SLOT_H }}
          >
            {to12Hour(lastHour)}
          </div>
        </div>

        {/* Day columns */}
        <div className="flex-1 grid grid-cols-5" style={{ height: gridH }}>
          {DAYS.map(day => {
            const abbrev = day.abbrev
            return (
              <div
                key={day.key}
                className="relative border-l border-border dark:border-border-dark"
              >
                {/* 30-min dashed lines */}
                {hours.map(h => (
                  <div
                    key={`${day.key}-${h}`}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      top: (h - firstHour + 0.5) * SLOT_H,
                      borderTop: '1px dashed var(--color-border-tertiary, #D1D5DB)',
                      zIndex: 0,
                    }}
                  />
                ))}
                {/* Hour boundary lines */}
                {hours.map(h => (
                  <div
                    key={`${day.key}-hr-${h}`}
                    className="absolute left-0 right-0 border-t border-border dark:border-border-dark"
                    style={{ top: (h - firstHour) * SLOT_H }}
                  />
                ))}
                {/* Section blocks */}
                {(sectionsByDay[abbrev] || []).map((sec, i) => {
                  const top = (parseTime(sec.start_time) - firstHour) * SLOT_H
                  const height = (parseTime(sec.end_time) - parseTime(sec.start_time)) * SLOT_H
                  return (
                    <div
                      key={`${sec.crn}-${i}`}
                      className="absolute left-[2px] right-[2px] overflow-hidden"
                      style={{
                        top,
                        height: Math.max(height - 2, 10), // Subtract 2px to leave a small gap between blocks
                        zIndex: 1,
                      }}
                    >
                      <TimetableBlock
                        section={sec}
                        colorIndex={courseColorMap?.[sec.course_id] ?? 0}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
