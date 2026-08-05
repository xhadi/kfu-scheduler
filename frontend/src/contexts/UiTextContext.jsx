import { createContext, useContext } from 'react'
import { uiText } from '../uiText'

const UiTextContext = createContext()

export function UiTextProvider({ children }) {
  const dir = 'rtl'

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
