import { useEffect } from 'react'
import { useStore } from '../store'

/** Keeps the `dark` class on <html> in sync with the persisted theme. */
export function useTheme(): void {
  const theme = useStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}
