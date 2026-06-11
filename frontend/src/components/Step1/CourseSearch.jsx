import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSchedule } from '../../contexts/ScheduleContext'
import { Search, Plus } from 'lucide-react'

export default function CourseSearch({ searchCourses }) {
  const { t, dir } = useLanguage()
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
      <div className="relative group">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary dark:group-focus-within:text-primary-light transition-colors" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? t('selectGender') : t('searchPlaceholder')}
          disabled={disabled}
          className="w-full ps-11 pe-4 py-3.5 rounded-xl border border-border dark:border-border-dark bg-white dark:bg-gray-800 shadow-sm focus:shadow-md focus:border-primary dark:focus:border-primary-light focus:ring-4 focus:ring-primary/15 dark:focus:ring-primary-light/10 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          dir={dir}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown && !!query}
          aria-haspopup="listbox"
          aria-controls="course-search-results"
        />
      </div>
      {showDropdown && query && results.length > 0 && (
        <ul
          id="course-search-results"
          ref={dropdownRef}
          role="listbox"
          className="absolute z-10 w-full mt-2 backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border border-border/80 dark:border-border-dark/80 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-border/40 dark:divide-border-dark/40 py-1"
        >
          {results.map(course => (
            <li
              key={course.id}
              onClick={() => handleSelect(course)}
              role="option"
              aria-selected={false}
              className="group px-4 py-3 hover:bg-primary/5 dark:hover:bg-primary-light/5 cursor-pointer flex items-center justify-between transition-colors duration-150"
            >
              <div className="flex items-center">
                <span className="font-mono font-bold text-primary dark:text-primary-light bg-primary/5 dark:bg-primary-light/10 px-2 py-0.5 rounded text-xs select-none me-3">
                  {course.id}
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {course.title}
                </span>
              </div>
              <div className="text-gray-400 group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                <Plus size={16} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {showDropdown && query && results.length === 0 && (
        <div className="absolute z-10 w-full mt-2 backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border border-border/80 dark:border-border-dark/80 rounded-xl shadow-xl p-4 text-center text-gray-500 dark:text-gray-400">
          {t('noCourses')}
        </div>
      )}
    </div>
  )
}