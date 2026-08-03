import { useRef, useEffect, useState } from 'react'
import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { ChevronLeft, ChevronRight, Check, Users, Lock } from 'lucide-react'
import FilterBar from './FilterBar'
import ScheduleCard from './ScheduleCard'

const PAGE_SIZE = 50
const WINDOW = 5

export default function ResultsPage() {
  const { results, filteredOptions, currentScheduleIndex, goBack, courseColorMap } = useSchedule()
  const { t, lang } = useLanguage()
  const scrollRef = useRef(null)
  const [page, setPage] = useState(0)
  const [windowStart, setWindowStart] = useState(0)

  const totalPages = Math.ceil(filteredOptions.length / PAGE_SIZE)
  const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1)
  const pageOptions = filteredOptions.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const visiblePages = Array.from({ length: Math.min(WINDOW, totalPages) }, (_, i) => windowStart + i)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const card = container.children[currentScheduleIndex]
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentScheduleIndex])

  if (!results || results.total_options_found === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="mt-8 text-gray-500">{t('noResults')}</p>
      </div>
    )
  }

  if (filteredOptions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <FilterBar />
        <p className="mt-4 text-center text-gray-500">{t('noFilters')}</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-2">
      <FilterBar />
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
        {t('scheduleCount', { found: results.total_options_found, displayed: filteredOptions.length })}
      </div>
      {results.total_options_found > 100 && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
          {t('largeResults')}
        </div>
      )}

      <div className="flex justify-center gap-6 mb-4 text-xs font-semibold select-none" dir="ltr">
        <span className="flex items-center gap-1.5">
          <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-gray-600 dark:text-gray-300">متاحة</span>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <span className="text-gray-400 dark:text-gray-500">Available</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-amber-600 dark:text-amber-400" />
          <span className="text-gray-600 dark:text-gray-300">ممتلئة</span>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <span className="text-gray-400 dark:text-gray-500">Full</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Lock size={13} className="text-red-500 dark:text-red-400" />
          <span className="text-gray-600 dark:text-gray-300">غير متاحة</span>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <span className="text-gray-400 dark:text-gray-500">Not Available</span>
        </span>
      </div>

      <div className="text-center mb-3">
        <button
          onClick={goBack}
          className="px-6 py-2 rounded-lg border border-border dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t('editCourses')}
        </button>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mb-3" dir="ltr">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="p-1.5 rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWindowStart(w => Math.max(0, w - WINDOW))}
            disabled={windowStart === 0}
            className="px-2 py-1 text-sm rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ...
          </button>
          {visiblePages.map(i => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`min-w-[32px] px-2 py-1 text-sm rounded border transition-colors ${
                i === safePage
                  ? 'bg-primary text-white border-primary'
                  : 'border-border dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setWindowStart(w => Math.min(totalPages - WINDOW, w + WINDOW))}
            disabled={windowStart >= totalPages - WINDOW}
            className="px-2 py-1 text-sm rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ...
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="p-1.5 rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="md:hidden text-center text-xs text-gray-400 dark:text-gray-500 mb-4 select-none animate-pulse">
        {lang === 'ar' ? '← اسحب لمشاهدة الجدول كاملاً →' : '← Swipe horizontally to view full schedule →'}
      </div>

      {/* Schedule list — vertical stack */}
      <div ref={scrollRef} className="flex flex-col gap-4 pb-4">
        {pageOptions.map((schedule) => (
          <div key={schedule.schedule_id}>
            <ScheduleCard
              scheduleId={schedule.schedule_id}
              schedule={schedule}
              courseColorMap={courseColorMap}
            />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-3 pb-4" dir="ltr">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="p-1.5 rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWindowStart(w => Math.max(0, w - WINDOW))}
            disabled={windowStart === 0}
            className="px-2 py-1 text-sm rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ...
          </button>
          {visiblePages.map(i => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`min-w-[32px] px-2 py-1 text-sm rounded border transition-colors ${
                i === safePage
                  ? 'bg-primary text-white border-primary'
                  : 'border-border dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setWindowStart(w => Math.min(totalPages - WINDOW, w + WINDOW))}
            disabled={windowStart >= totalPages - WINDOW}
            className="px-2 py-1 text-sm rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ...
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="p-1.5 rounded border border-border dark:border-border-dark disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
