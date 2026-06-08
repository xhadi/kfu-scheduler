import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { Search } from 'lucide-react'

export default function CourseSearch({ searchCourses }) {
  const { t } = useLanguage()
  const { addCourse, gender } = useSchedule()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const results = searchCourses(query).slice(0, 10)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (course) => {
    addCourse(course)
    setQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0])
    }
  }

  const disabled = !gender

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? t('selectGender') : t('searchPlaceholder')}
          disabled={disabled}
          className="w-full ps-10 pe-4 py-3 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          dir="ltr"
        />
      </div>
      {showDropdown && query && results.length > 0 && (
        <ul ref={dropdownRef} className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map(course => (
            <li
              key={course.id}
              onClick={() => handleSelect(course)}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-border dark:border-border-dark last:border-0"
            >
              <span className="font-semibold">{course.id}</span>
              <span className="mx-2">—</span>
              <span>{course.title}</span>
            </li>
          ))}
        </ul>
      )}
      {showDropdown && query && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg shadow-lg p-4 text-center text-gray-500">
          No courses found
        </div>
      )}
    </div>
  )
}