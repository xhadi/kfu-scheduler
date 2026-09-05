import { useEffect } from 'react'
import { CalendarX2 } from 'lucide-react'
import { useSchedule } from '../../contexts/ScheduleContext'
import { useUiText } from '../../contexts/UiTextContext'

export default function NoScheduleModal() {
  const { closeNoScheduleModal } = useSchedule()
  const { text } = useUiText()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeNoScheduleModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeNoScheduleModal])

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={closeNoScheduleModal}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full text-center shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center"
      >
        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center mb-4">
          <CalendarX2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {text('noConflictFreeScheduleTitle')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          {text('noConflictFreeScheduleDesc')}
        </p>
        <button
          type="button"
          onClick={closeNoScheduleModal}
          className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
        >
          {text('ok')}
        </button>
      </div>
    </div>
  )
}
