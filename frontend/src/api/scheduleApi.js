const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

export async function fetchColleges() {
  const res = await fetch(`${API_BASE}/colleges`)
  if (!res.ok) throw new Error('Failed to fetch colleges')
  return res.json()
}

export async function fetchDepartments(collegeId) {
  const res = await fetch(`${API_BASE}/colleges/${collegeId}/departments`)
  if (!res.ok) throw new Error('Failed to fetch departments')
  return res.json()
}

export async function fetchCourses(deptId) {
  const res = await fetch(`${API_BASE}/departments/${deptId}/courses`)
  if (!res.ok) throw new Error('Failed to fetch courses')
  return res.json()
}

export async function generateSchedules(courseIds, gender) {
  const res = await fetch(`${API_BASE}/schedules/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_ids: courseIds, gender }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }))
    throw new Error(err.detail || 'Failed to generate schedules')
  }
  return res.json()
}

export async function fetchScrapeStatus() {
  const res = await fetch(`${API_BASE}/scraping/last-update`)
  if (!res.ok) throw new Error('Failed to fetch scrape status')
  return res.json()
}