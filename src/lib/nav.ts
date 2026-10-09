export type ViewId = 'dashboard' | 'tasks' | 'todos' | 'notes'

export const NAV_ITEMS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'tasks', label: 'Tasks', icon: '✔' },
  { id: 'todos', label: 'Quick To-dos', icon: '☰' },
  { id: 'notes', label: 'Notes', icon: '✎' },
]
