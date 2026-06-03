import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '../i18n/translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('kfu-lang') || 'ar'
  })

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    localStorage.setItem('kfu-lang', lang)
  }, [lang])

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang])

  const t = (key, params) => {
    let text = translations[lang][key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v)
      })
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}