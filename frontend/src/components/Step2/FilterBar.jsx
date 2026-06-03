import { useState, useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { Filter, X } from 'lucide-react'

const DAYS = [
  { key: 'sat', ar: 'السبت', en: 'Sat' },
  { key: 'sun', ar: 'الأحد', en: 'Sun' },
  { key: 'mon', ar: 'الاثنين', en: 'Mon' },
  { key: 'tue', ar: 'الثلاثاء', en: 'Tue' },
  { key: 'wed', ar: 'الأربعاء', en: 'Wed' },
  { key: 'thu', ar: 'الخميس', en: 'Thu' },
]

export default function FilterBar() {
  const { lang, t } = useLanguage()
  const { filters, setFilters, results } = useSchedule()
  const [expanded, setExpanded] = useState(true)

  const instructors = useMemo(() => {
    if (!results) return []
    const set = new Set()
    results.options.forEach(schedule =>
      schedule.sections.forEach(sec => {
        if (sec.teacher) set.add(sec.teacher)
      })
    )
    return [...set].sort()
  }, [results])

  const toggleDay = (day) => {
    setFilters(prev => ({
      ...prev,
      daysOff: prev.daysOff.includes(day)
        ? prev.daysOff.filter(d => d !== day)
        : [...prev.daysOff, day]
    }))
  }

  const clearFilters = () => {
    setFilters({ daysOff: [], instructor: '', crn: '' })
  }

  const hasFilters = filters.daysOff.length > 0 || filters.instructor || filters.crn

  return (
    <div className="border border-border dark:border-border-dark rounded-lg mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <span className="flex items-center gap-2 font-medium">
          <Filter size={16} />
          {t('dayOff')} / {t('instructor')} / {t('crn')}
        </span>
        <span>{hasFilters ? `(${filters.daysOff.length + (filters.instructor ? 1 : 0) + (filters.crn ? 1 : 0)})` : ''}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-border dark:border-border-dark space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">{t('dayOff')}</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    filters.daysOff.includes(day.key)
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  {lang === 'ar' ? day.ar : day.en}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('instructor')}</label>
            <select
              value={filters.instructor}
              onChange={(e) => setFilters(prev => ({ ...prev, instructor: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-gray-800"
            >
              <option value="">—</option>
              {instructors.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('crn')}</label>
            <input
              type="text"
              value={filters.crn}
              onChange={(e) => setFilters(prev => ({ ...prev, crn: e.target.value }))}
              placeholder="e.g. 53210"
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-gray-800"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
            >
              <X size={14} />
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}