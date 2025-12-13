import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface DevModeContextValue {
  devMode: boolean
  setDevMode: (enabled: boolean) => void
  toggleDevMode: () => void
}

const DevModeContext = createContext<DevModeContextValue | null>(null)

const DEV_MODE_KEY = 'crsc_dev_mode'

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevModeState] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEV_MODE_KEY) === 'true'
    }
    return false
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(DEV_MODE_KEY, devMode.toString())
  }, [devMode])

  const setDevMode = (enabled: boolean) => {
    setDevModeState(enabled)
  }

  const toggleDevMode = () => {
    setDevModeState((prev) => !prev)
  }

  return (
    <DevModeContext.Provider value={{ devMode, setDevMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  )
}

export function useDevMode() {
  const context = useContext(DevModeContext)
  if (!context) {
    throw new Error('useDevMode must be used within a DevModeProvider')
  }
  return context
}
