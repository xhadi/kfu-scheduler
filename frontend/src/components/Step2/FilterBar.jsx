import { useState, useMemo } from 'react'
import { useUiText } from '../../contexts/UiTextContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { Filter, X, Search, ChevronDown, ChevronUp } from 'lucide-react'

const DAYS = [
  { key: 'sun', label: 'الأحد' },
  { key: 'mon', label: 'الاثنين' },
  { key: 'tue', label: 'الثلاثاء' },
  { key: 'wed', label: 'الأربعاء' },
  { key: 'thu', label: 'الخميس' },
]

export default function FilterBar() {
  const { text } = useUiText()
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
    <div className="border border-border/80 dark:border-border-dark/80 rounded-2xl mb-6 shadow-sm overflow-hidden bg-white/70 dark:bg-surface-dark/45 backdrop-blur-md transition-all duration-300">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition-colors duration-200 outline-none cursor-pointer"
      >
        <span className="flex items-center gap-2.5 font-semibold text-sm text-gray-700 dark:text-gray-200">
          <Filter size={16} className="text-primary dark:text-primary-light" />
          <span>{text('dayOff')} / {text('instructor')} / {text('crn')}</span>
        </span>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-extrabold bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light rounded-full">
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 py-4 border-t border-border/50 dark:border-border-dark/50 space-y-5">
          {/* Day Off */}
          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5 block">{text('dayOff')}</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => {
                const isSelected = filters.daysOff.has(day.key)
                return (
                  <label
                    key={day.key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm cursor-pointer select-none transition-all duration-200 ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/35 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-semibold'
                        : 'bg-gray-50 dark:bg-slate-900 border-border/60 dark:border-border-dark/60 text-gray-600 dark:text-gray-400 hover:border-primary/40 dark:hover:border-primary-light/40 hover:bg-gray-100/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDay(day.key)}
                      className="sr-only"
                    />
                    {day.label}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5 block">{text('availability')}</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  checked={filters.availability === 'all'}
                  onChange={() => setFilters(prev => ({ ...prev, availability: 'all' }))}
                  className="rounded-full text-primary focus:ring-primary border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
                {text('all')}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="availability"
                  checked={filters.availability === 'available_only'}
                  onChange={() => setFilters(prev => ({ ...prev, availability: 'available_only' }))}
                  className="rounded-full text-primary focus:ring-primary border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
                {text('availableOnly')}
              </label>
            </div>
          </div>

          {/* Side by side searches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Instructor */}
            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{text('instructor')}</label>
              <div className="relative mb-2">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={instructorSearch}
                  onChange={e => setInstructorSearch(e.target.value)}
                  placeholder={text('search')}
                  className="w-full ps-9 pe-3 py-2 text-sm rounded-xl border border-border dark:border-border-dark bg-white/50 dark:bg-slate-900/40 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:focus:ring-primary-light/10 transition-all duration-200"
                />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 border border-border/40 dark:border-border-dark/40 rounded-xl p-1 bg-white/20 dark:bg-slate-900/10">
                {filteredInstructors.map(name => (
                  <label key={name} className="flex items-center gap-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary-light/5 hover:text-primary dark:hover:text-primary-light px-2 py-1.5 rounded-lg transition-all duration-150">
                    <input
                      type="checkbox"
                      checked={filters.instructors.has(name)}
                      onChange={() => toggleInstructor(name)}
                      className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary"
                    />
                    <span className="truncate">{name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CRN */}
            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">{text('crn')}</label>
              <div className="relative mb-2">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={crnSearch}
                  onChange={e => setCrnSearch(e.target.value)}
                  placeholder={text('search')}
                  className="w-full ps-9 pe-3 py-2 text-sm rounded-xl border border-border dark:border-border-dark bg-white/50 dark:bg-slate-900/40 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:focus:ring-primary-light/10 transition-all duration-200"
                />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 border border-border/40 dark:border-border-dark/40 rounded-xl p-1 bg-white/20 dark:bg-slate-900/10">
                {filteredCrns.map(crn => (
                  <label key={crn} className="flex items-center gap-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary-light/5 hover:text-primary dark:hover:text-primary-light px-2 py-1.5 rounded-lg transition-all duration-150">
                    <input
                      type="checkbox"
                      checked={filters.crns.has(crn)}
                      onChange={() => toggleCrn(crn)}
                      className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary"
                    />
                    <span className="font-mono">{crn}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 bg-red-50/20 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-red-200/30 dark:border-red-900/30 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
              >
                <X size={14} />
                {text('clearFilters')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
