import { useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import TimetableBlock from './TimetableBlock'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const KEY_TO_ABBREV = { 'الأحد': 'ح', 'الاثنين': 'ن', 'الثلاثاء': 'ث', 'الأربعاء': 'ر', 'الخميس': 'خ' }

function to12Hour(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function TimetableView({ schedule, courseColorMap, active }) {
  const { t } = useLanguage()

  const dayLabels = {
    sun: t('sun'),
    mon: t('mon'),
    tue: t('tue'),
    wed: t('wed'),
    thu: t('thu'),
  }

  const slots = useMemo(() => {
    if (!schedule || !schedule.sections || schedule.sections.length === 0) return null

    const timePoints = [...new Set(
      schedule.sections.flatMap(s => [s.start_time, s.end_time])
    )].sort()

    const pointIndex = {}
    timePoints.forEach((tp, i) => { pointIndex[tp] = i })

    const n = timePoints.length - 1
    const cellsByDay = {}
    DAYS.forEach(d => { cellsByDay[d] = new Array(n).fill(null) })

    DAYS.forEach(day => {
      const dayAbbrev = KEY_TO_ABBREV[day]
      let coveredUntil = -1

      for (let r = 0; r < n; r++) {
        if (r <= coveredUntil) {
          cellsByDay[day][r] = 'covered'
          continue
        }

        const sectionsHere = schedule.sections.filter(sec => {
          if (!sec.days.includes(dayAbbrev)) return false
          const si = pointIndex[sec.start_time]
          const ei = pointIndex[sec.end_time]
          return si <= r && r < ei
        })

        if (sectionsHere.length === 0) continue

        const maxEnd = Math.max(...sectionsHere.map(s => pointIndex[s.end_time]))
        coveredUntil = maxEnd - 1

        cellsByDay[day][r] = {
          sections: sectionsHere,
          rowspan: maxEnd - r,
        }
      }
    })

    const result = []
    for (let i = 0; i < n; i++) {
      result.push({
        start: timePoints[i],
        end: timePoints[i + 1],
        cells: DAYS.reduce((acc, d) => { acc[d] = cellsByDay[d][i]; return acc }, {}),
      })
    }
    return result
  }, [schedule])

  if (!slots) return null

  return (
    <div
      className={`overflow-x-auto mt-4 rounded-lg border-2 transition-colors ${
        active
          ? 'border-primary dark:border-primary'
          : 'border-transparent'
      }`}
      dir="ltr"
    >
      <table className="w-full min-w-[700px] border-collapse bg-white dark:bg-gray-900">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-border dark:border-border-dark">
            <th className="p-2 text-xs font-medium text-gray-500 border border-border dark:border-border-dark w-28">
              {t('time')}
            </th>
            {DAYS.map(day => (
              <th key={day} className="p-2 text-sm font-semibold border border-border dark:border-border-dark">
                {dayLabels[day]} ({KEY_TO_ABBREV[day]})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, r) => (
            <tr key={r}>
              <td className="p-2 text-xs text-gray-500 border border-border dark:border-border-dark whitespace-nowrap align-top">
                {to12Hour(slot.start)} - {to12Hour(slot.end)}
              </td>
              {DAYS.map(day => {
                const cell = slot.cells[day]
                if (cell === 'covered') return null
                if (!cell) {
                  return <td key={day} className="p-1 border-l border-r border-border dark:border-border-dark align-top w-[18%]" />
                }

                return (
                  <td key={day} rowSpan={cell.rowspan} className="p-1 border-l border-r border-border dark:border-border-dark align-top w-[18%]">
                    {cell.sections.map((sec, i) => (
                      <div key={`${sec.crn}-${i}`} className="mb-1 last:mb-0">
                        <TimetableBlock
                          section={sec}
                          colorIndex={courseColorMap?.[sec.course_id] ?? 0}
                        />
                      </div>
                    ))}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
