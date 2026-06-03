import { useLanguage } from '../../contexts/LanguageContext'

export default function LoadingModal() {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-semibold">{t('generating')}</p>
      </div>
    </div>
  )
}