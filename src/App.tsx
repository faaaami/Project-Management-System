import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { NAV_ITEMS } from './lib/nav'
import type { ViewId } from './lib/nav'
import { useTheme } from './hooks/useTheme'
import { useStore } from './store'
import { Dashboard } from './views/Dashboard'
import { NotesView } from './views/NotesView'
import { TasksView } from './views/TasksView'
import { TodosView } from './views/TodosView'
import { Icon } from './components/Icon'

function MainArea({ view }: { view: ViewId }) {
  switch (view) {
    case 'dashboard':
      return <Dashboard />
    case 'tasks':
      return <TasksView />
    case 'todos':
      return <TodosView />
    case 'notes':
      return <NotesView />
  }
}

export default function App() {
  const [view, setView] = useState<ViewId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const activeProject = useStore((state) =>
    state.projects.find((p) => p.id === state.activeProjectId),
  )
  useTheme()

  const title = NAV_ITEMS.find((item) => item.id === view)?.label ?? 'DevBoard'

  const selectView = (next: ViewId) => {
    setView(next)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell flex h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-900/60">
        <Sidebar view={view} onSelectView={selectView} />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Sidebar view={view} onSelectView={selectView} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-300"
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="breadcrumb">Workspace <span>/</span> {activeProject?.name ?? 'No project selected'} <span>/</span> <strong>{title}</strong></p>
          </div>
          <span className="header-badge">Personal workspace</span>
          <span className="user-avatar" title="Your workspace">ME</span>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="page-heading"><div><p className="eyebrow">{activeProject?.name ?? 'YOUR WORKSPACE'}</p><h1>{view === 'dashboard' ? 'Project overview' : title}</h1><p>{view === 'dashboard' ? 'A clear view of your progress and what needs your attention.' : view === 'tasks' ? 'Organize your work and move it forward.' : view === 'todos' ? 'Capture the small things. Keep your day on track.' : 'Ideas, decisions, and details — all in one place.'}</p></div>{view === 'dashboard' && <button className="primary-action" onClick={() => selectView('tasks')}><Icon name="plus" size={18} /> Add task</button>}</div>
          <MainArea key={activeProject?.id} view={view} />
        </main>
      </div>
    </div>
  )
}
