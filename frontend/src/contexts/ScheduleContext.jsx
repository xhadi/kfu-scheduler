import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { generateSchedules } from '../api/scheduleApi'

const ScheduleContext = createContext()

const KEY_TO_ABBREV = { sun: 'ح', mon: 'ن', tue: 'ث', wed: 'ر', thu: 'خ' }

export function ScheduleProvider({ children }) {
  const [gender, setGender] = useState(null)
  const [selectedCourses, setSelectedCourses] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0)
  const [step, setStep] = useState(1)
  const [filters, setFilters] = useState({
    daysOff: new Set(),
    instructors: new Set(),
    crns: new Set(),
    availability: 'all',
  })

  const filteredOptions = useMemo(() => {
    if (!results) return []

    return results.options.filter(schedule => {
      if (filters.availability === 'available_only') {
        if (schedule.sections.some(s => s.status !== 'متاحة')) {
          return false
        }
      }

      if (filters.daysOff.size > 0) {
        const excludedAbbrevs = [...filters.daysOff].map(d => KEY_TO_ABBREV[d])
        const usedDays = new Set(schedule.sections.flatMap(s =>
          s.time_slots.map(slot => slot.day)
        ))
        for (const d of excludedAbbrevs) {
          if (usedDays.has(d)) return false
        }
      }

      if (filters.instructors.size > 0) {
        if (!schedule.sections.some(s => filters.instructors.has(s.teacher))) {
          return false
        }
      }

      if (filters.crns.size > 0) {
        if (!schedule.sections.some(s => filters.crns.has(String(s.crn)))) {
          return false
        }
      }

      return true
    })
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
      const data = await generateSchedules(courseIds, gender)
      setResults(data)
      setCurrentScheduleIndex(0)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [gender])

  const goBack = useCallback(() => {
    setStep(1)
    setError(null)
    setResults(null)
    setFilters({ daysOff: new Set(), instructors: new Set(), crns: new Set(), availability: 'all' })
    setCurrentScheduleIndex(0)
  }, [])

  const courseColorMap = useMemo(() => {
    if (!results) return {}
    const map = {}
    let idx = 0
    results.options.forEach(schedule =>
      schedule.sections.forEach(sec => {
        if (!(sec.course_id in map)) {
          map[sec.course_id] = idx++
        }
      })
    )
    return map
  }, [results])

  return (
    <ScheduleContext.Provider value={{
      gender, setGender,
      selectedCourses, addCourse, removeCourse,
      results, loading, error,
      currentScheduleIndex, setCurrentScheduleIndex,
      step, setStep,
      handleGenerate, goBack,
      filters, setFilters, filteredOptions,
      courseColorMap,
    }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  return useContext(ScheduleContext)
}
