import { useState, useEffect, useCallback } from 'react'
import { fetchColleges, fetchDepartments, fetchCourses } from '../api/scheduleApi'

export function useCourseCatalog() {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [colleges, setColleges] = useState([])
  const [retryTrigger, setRetryTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      setLoading(true)
      setError(null)
      try {
        const collegesList = await fetchColleges()
        if (cancelled) return
        setColleges(collegesList)

        // Fetch all departments in parallel
        const deptPromises = collegesList.map(async (college) => {
          const depts = await fetchDepartments(college.id)
          return depts.map(dept => ({ ...dept, college }))
        })
        const deptsNested = await Promise.all(deptPromises)
        if (cancelled) return
        const allDepts = deptsNested.flat()

        // Fetch all courses in parallel
        const coursePromises = allDepts.map(async (dept) => {
          const courses = await fetchCourses(dept.id)
          return courses.map(course => ({
            id: course.id,
            title: course.title,
            code: course.id,
            departmentId: dept.id,
            departmentName: dept.name,
            collegeId: dept.college.id,
            collegeName: dept.college.name,
            hours: course.hours,
          }))
        })
        const coursesNested = await Promise.all(coursePromises)
        if (cancelled) return
        const allCourses = coursesNested.flat()

        setCatalog(allCourses)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load catalog:', err)
          setError(err.message || 'Failed to load catalog')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCatalog()
    return () => { cancelled = true }
  }, [retryTrigger])

  const searchCourses = useCallback((query) => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return catalog.filter(c =>
      c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    )
  }, [catalog])

  const retry = useCallback(() => {
    setRetryTrigger(prev => prev + 1)
  }, [])

  return { catalog, colleges, loading, error, searchCourses, retry }
}