import { useSchedule } from '../../contexts/ScheduleContext'
import { useLanguage } from '../../contexts/LanguageContext'
import GenderSelector from './GenderSelector'
import CourseSearch from './CourseSearch'
import WantedList from './WantedList'

export default function CourseSelectionPage() {
  const { gender, selectedCourses, handleGenerate, loading } = useSchedule()
  const { t } = useLanguage()
  const canGenerate = gender && selectedCourses.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-center mb-6">{t('selectGender')}</h2>
      <GenderSelector />
      <div className="mt-6">
        <CourseSearch />
      </div>
      <WantedList />
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