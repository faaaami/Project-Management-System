import { useStore } from '../store'
import { NAV_ITEMS } from '../lib/nav'
import type { ViewId } from '../lib/nav'
import { ProjectSwitcher } from './ProjectSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { Icon } from './Icon'

interface SidebarProps {
  view: ViewId
  onSelectView: (view: ViewId) => void
}

export function Sidebar({ view, onSelectView }: SidebarProps) {
  const projects = useStore((state) => state.projects)
  const tasks = useStore((state) => state.tasks)
  const activeProjectId = useStore((state) => state.activeProjectId)

  const openTaskCount = tasks.filter(
    (task) => task.projectId === activeProjectId && task.status !== 'done',
  ).length

  return (
    <nav className="sidebar flex h-full flex-col gap-4 p-4" aria-label="Main navigation">
      <div className="flex items-center gap-2 px-1">
        <span className="grid size-8 place-items-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          <Icon name="dashboard" size={19} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            DevBoard
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <ProjectSwitcher />

      <p className="nav-caption">WORKSPACE</p>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.id === view
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? 'bg-violet-600/10 font-medium text-violet-700 dark:text-violet-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span aria-hidden="true" className="w-4 text-center">
                  <Icon name={item.id} size={18} />
                </span>
                <span className="flex-1">{item.label}</span>
                {item.id === 'tasks' && openTaskCount > 0 && (
                  <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {openTaskCount}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto">
        <div className="workspace-tip"><span className="tip-dot" /> Your space to make progress.<p>Keep every project moving, one task at a time.</p></div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
