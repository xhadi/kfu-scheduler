import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useCourseCatalog } from '../../hooks/useCourseCatalog'
import GenderSelector from './GenderSelector'
import CourseSearch from './CourseSearch'
import WantedList from './WantedList'
import LoadingModal from './LoadingModal'
import CatalogLoader from './CatalogLoader'

export default function CourseSelectionPage() {
  const { gender, selectedCourses, handleGenerate, loading, error } = useSchedule()
  const { t } = useLanguage()
  const { colleges, loading: catalogLoading, error: catalogError, searchCourses, retry } = useCourseCatalog()
  const [collegesExpanded, setCollegesExpanded] = useState(false)
  const canGenerate = gender && selectedCourses.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {loading && <LoadingModal />}
      <h2 className="text-xl font-extrabold text-center mb-6 text-gray-800 dark:text-gray-100">{t('selectGender')}</h2>
      <GenderSelector />
      <div className="mt-6">
        {catalogLoading ? (
          <CatalogLoader />
        ) : catalogError ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-center shadow-sm">
            <p className="text-red-700 dark:text-red-400 font-medium mb-3">
              {t('networkError')}
            </p>
            <button
              onClick={retry}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-sm"
            >
              {t('retry')}
            </button>
          </div>
        ) : (
          <CourseSearch searchCourses={searchCourses} />
        )}
      </div>
      <WantedList />
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}
      <div className="mt-8 text-center">
        <button
          onClick={() => handleGenerate(selectedCourses.map(c => c.id))}
          disabled={!canGenerate || loading}
          className="px-8 py-3.5 rounded-xl bg-primary text-white font-bold text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {t('generate')}
        </button>
      </div>
      {!catalogLoading && colleges.length > 0 && (
        <div className="mt-8 w-full max-w-md mx-auto border border-border dark:border-border-dark rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800 transition-all duration-200">
          <button
            type="button"
            onClick={() => setCollegesExpanded(!collegesExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 font-semibold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors outline-none"
          >
            {t('supportedColleges')}
            {collegesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {collegesExpanded && (
            <div className="border-t border-border dark:border-border-dark divide-y divide-border/40 dark:divide-border-dark/40 max-h-56 overflow-y-auto">
              {colleges.map((c, i) => (
                <div
                  key={c.id}
                  className="flex px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                >
                  <div className="w-8 shrink-0 text-gray-400 dark:text-gray-500">{i + 1}.</div>
                  <div className="flex-1">{c.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}