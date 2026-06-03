import { useState, useEffect, useCallback } from 'react'
import { fetchColleges, fetchDepartments, fetchCourses } from '../api/scheduleApi'

export function useCourseCatalog() {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      setLoading(true)
      try {
        const colleges = await fetchColleges()
        const allCourses = []

        for (const college of colleges) {
          const departments = await fetchDepartments(college.id)
          for (const dept of departments) {
            const courses = await fetchCourses(dept.id)
            for (const course of courses) {
              allCourses.push({
                id: course.id,
                title: course.title,
                code: course.id,
                departmentId: dept.id,
                departmentName: dept.name,
                collegeId: college.id,
                collegeName: college.name,
                hours: course.hours,
              })
            }
          }
        }

        if (!cancelled) {
          setCatalog(allCourses)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load catalog:', err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCatalog()
    return () => { cancelled = true }
  }, [])

  const searchCourses = useCallback((query) => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return catalog.filter(c =>
      c.title.includes(q) || c.id.toLowerCase().includes(q)
    )
  }, [catalog])

  return { catalog, loading, searchCourses }
}