import { useStore } from '../store'
import { Icon } from './Icon'

export function ThemeToggle() {
  const theme = useStore((state) => state.theme)
  const toggleTheme = useStore((state) => state.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
      <Icon name={isDark ? 'moon' : 'sun'} size={18} />
    </button>
  )
}
