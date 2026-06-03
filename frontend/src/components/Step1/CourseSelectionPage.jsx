import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import GenderSelector from './GenderSelector'
import CourseSearch from './CourseSearch'
import WantedList from './WantedList'
import LoadingModal from './LoadingModal'

export default function CourseSelectionPage() {
  const { gender, selectedCourses, handleGenerate, loading, error } = useSchedule()
  const { t } = useLanguage()
  const canGenerate = gender && selectedCourses.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {loading && <LoadingModal />}
      <h2 className="text-2xl font-bold text-center mb-6">{t('selectGender')}</h2>
      <GenderSelector />
      <div className="mt-6">
        <CourseSearch />
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
    </div>
  )
}