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
  const canGenerate = gender && selectedCourses.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {loading && <LoadingModal />}
      <h2 className="text-2xl font-bold text-center mb-6">{t('selectGender')}</h2>
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
          className="px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('generate')}
        </button>
      </div>
      {!catalogLoading && colleges.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm text-gray-500 dark:text-gray-400">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-center font-semibold">
              {t('supportedColleges')}
            </div>
            {colleges.map((c, i) => (
              <div key={c.id} className="flex border-t border-gray-200 dark:border-gray-700">
                <div className="px-4 py-1.5 text-center text-gray-400 w-8 shrink-0">{i + 1}.</div>
                <div className="px-4 py-1.5 text-center flex-1">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}