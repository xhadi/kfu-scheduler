import { createContext, useContext, useState, useCallback } from 'react'
import { generateSchedules } from '../api/scheduleApi'

const ScheduleContext = createContext()

export function ScheduleProvider({ children }) {
  const [gender, setGender] = useState(null)
  const [selectedCourses, setSelectedCourses] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0)
  const [step, setStep] = useState(1)
  const [filters, setFilters] = useState({ daysOff: [], instructor: '', crn: '' })

  const addCourse = useCallback((course) => {
    setSelectedCourses(prev => {
      if (prev.some(c => c.id === course.id)) return prev
      return [...prev, course]
    })
  }, [])

  const removeCourse = useCallback((courseId) => {
    setSelectedCourses(prev => prev.filter(c => c.id !== courseId))
  }, [])

  const handleGenerate = useCallback(async (courseIds) => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateSchedules(courseIds)
      setResults(data)
      setCurrentScheduleIndex(0)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const goBack = useCallback(() => {
    setStep(1)
    setError(null)
  }, [])

  return (
    <ScheduleContext.Provider value={{
      gender, setGender,
      selectedCourses, addCourse, removeCourse,
      results, loading, error,
      currentScheduleIndex, setCurrentScheduleIndex,
      step, setStep,
      handleGenerate, goBack,
      filters, setFilters,
    }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  return useContext(ScheduleContext)
}