import { createContext, useContext } from 'react'
import { uiText } from '../uiText'

const UiTextContext = createContext()

/**
 * Provides UI string localization and document direction (RTL).
 * Supports string key lookups and optional parameter interpolation (e.g. {count}).
 */
export function UiTextProvider({ children }) {
  const dir = 'rtl'

  /**
   * Retrieves localized UI string for the given key, interpolating {param} placeholders if provided.
   * @param {string} key - Dictionary key in uiText.js
   * @param {Object} [params] - Key-value map for parameter replacements
   */
  const text = (key, params) => {
    let str = uiText[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v)
      })
    }
    return str
  }


  return (
    <UiTextContext.Provider value={{ dir, text }}>
      {children}
    </UiTextContext.Provider>
  )
}

export function useUiText() {
  return useContext(UiTextContext)
}
