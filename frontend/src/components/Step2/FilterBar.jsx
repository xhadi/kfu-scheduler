import { useState, useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { Filter, X, Search } from 'lucide-react'

const DAYS = [
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
  const [instructorSearch, setInstructorSearch] = useState('')
  const [crnSearch, setCrnSearch] = useState('')

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

  const crns = useMemo(() => {
    if (!results) return []
    const set = new Set()
    results.options.forEach(schedule =>
      schedule.sections.forEach(sec => {
        set.add(String(sec.crn))
      })
    )
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [results])

  const filteredInstructors = useMemo(() => {
    if (!instructorSearch) return instructors
    const q = instructorSearch.toLowerCase()
    return instructors.filter(i => i.toLowerCase().includes(q))
  }, [instructors, instructorSearch])

  const filteredCrns = useMemo(() => {
    if (!crnSearch) return crns
    return crns.filter(c => c.includes(crnSearch))
  }, [crns, crnSearch])

  const toggleDay = (day) => {
    setFilters(prev => {
      const next = new Set(prev.daysOff)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return { ...prev, daysOff: next }
    })
  }

  const toggleInstructor = (name) => {
    setFilters(prev => {
      const next = new Set(prev.instructors)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return { ...prev, instructors: next }
    })
  }

  const toggleCrn = (crn) => {
    setFilters(prev => {
      const next = new Set(prev.crns)
      if (next.has(crn)) next.delete(crn)
      else next.add(crn)
      return { ...prev, crns: next }
    })
  }

  const clearFilters = () => {
    setFilters({ daysOff: new Set(), instructors: new Set(), crns: new Set(), availability: 'all' })
    setInstructorSearch('')
    setCrnSearch('')
  }

  const activeCount = filters.daysOff.size + filters.instructors.size + filters.crns.size + (filters.availability !== 'all' ? 1 : 0)

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
        <span className="text-sm text-gray-500">{activeCount > 0 ? `(${activeCount})` : ''}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-border dark:border-border-dark space-y-4">
          {/* Day Off */}
          <div>
            <label className="text-sm font-medium block mb-1">{t('dayOff')}</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <label
                  key={day.key}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm cursor-pointer select-none ${
                    filters.daysOff.has(day.key)
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filters.daysOff.has(day.key)}
                    onChange={() => toggleDay(day.key)}
                    className="sr-only"
                  />
                  {lang === 'ar' ? day.ar : day.en}
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="text-sm font-medium block mb-1">{t('availability')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  checked={filters.availability === 'all'}
                  onChange={() => setFilters(prev => ({ ...prev, availability: 'all' }))}
                />
                {t('all')}
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  checked={filters.availability === 'available_only'}
                  onChange={() => setFilters(prev => ({ ...prev, availability: 'available_only' }))}
                />
                {t('availableOnly')}
              </label>
            </div>
          </div>

          {/* Instructor */}
          <div>
            <label className="text-sm font-medium block mb-1">{t('instructor')}</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={instructorSearch}
                onChange={e => setInstructorSearch(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-border dark:border-border-dark bg-white dark:bg-gray-800"
              />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {filteredInstructors.map(name => (
                <label key={name} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.instructors.has(name)}
                    onChange={() => toggleInstructor(name)}
                    className="rounded"
                  />
                  <span className="truncate">{name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CRN */}
          <div>
            <label className="text-sm font-medium block mb-1">{t('crn')}</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={crnSearch}
                onChange={e => setCrnSearch(e.target.value)}
                placeholder={t('search')}
                className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-border dark:border-border-dark bg-white dark:bg-gray-800"
              />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {filteredCrns.map(crn => (
                <label key={crn} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.crns.has(crn)}
                    onChange={() => toggleCrn(crn)}
                    className="rounded"
                  />
                  <span className="font-mono">{crn}</span>
                </label>
              ))}
            </div>
          </div>

          {activeCount > 0 && (
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
