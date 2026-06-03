import { createContext, useContext, useState, useCallback, useMemo } from 'react'
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

  const filteredOptions = useMemo(() => {
    if (!results) return []
    let options = results.options

    if (filters.daysOff.length > 0) {
      const KEY_TO_ABBREV = { sat: 'س', sun: 'ح', mon: 'ن', tue: 'ث', wed: 'ر', thu: 'خ' }
      const excludedAbbrevs = filters.daysOff.map(d => KEY_TO_ABBREV[d])
      options = options.filter(schedule =>
        !schedule.sections.some(sec =>
          sec.days.some(day => excludedAbbrevs.includes(day.trim()))
        )
      )
    }

    if (filters.instructor) {
      const q = filters.instructor.toLowerCase()
      options = options.filter(schedule =>
        schedule.sections.some(sec =>
          sec.teacher && sec.teacher.toLowerCase().includes(q)
        )
      )
    }

    if (filters.crn) {
      options = options.filter(schedule =>
        schedule.sections.some(sec => String(sec.crn).includes(filters.crn))
      )
    }

    return options
  }, [results, filters])

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
    setResults(null)
    setFilters({ daysOff: [], instructor: '', crn: '' })
    setCurrentScheduleIndex(0)
  }, [])

  return (
    <ScheduleContext.Provider value={{
      gender, setGender,
      selectedCourses, addCourse, removeCourse,
      results, loading, error,
      currentScheduleIndex, setCurrentScheduleIndex,
      step, setStep,
      handleGenerate, goBack,
      filters, setFilters, filteredOptions,
    }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  return useContext(ScheduleContext)
}