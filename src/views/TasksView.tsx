import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../store'
import type { Task } from '../types'
import { Select } from '../components/Select'
import { TaskEditor } from '../components/TaskEditor'
import { TrelloBoard } from '../components/TrelloBoard'
import { boardLists, taskListId } from '../lib/board'
import { SchedulePicker } from '../components/SchedulePicker'
import { addDays, filterTasks, formatTime, localDateKey, scopeTasks } from '../lib/tasks'
import type { TaskScope } from '../lib/tasks'
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_CLASS,
  TYPE_LABEL,
} from '../lib/ui'

function TaskCard({ task, preview = false, onSaved }: { task: Task; preview?: boolean; onSaved?: (task: Task) => void }) {
  const updateTask = useStore((state) => state.updateTask)
  const [editing, setEditing] = useState(false)
  const project = useStore(state => state.projects.find(p => p.id === task.projectId))
  const lists = boardLists(project)

  return (
    <article className={`task-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${preview ? 'task-preview' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {preview ? task.title : <button type="button" className="task-title-button" onClick={() => setEditing(true)}>{task.title}</button>}
        </h4>
        {!preview && <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${task.title}`}
          className="shrink-0 text-slate-400 hover:text-red-500"
        >
          ⋯
        </button>}
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {task.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_CLASS[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TYPE_CLASS[task.type]}`}
        >
          {TYPE_LABEL[task.type]}
        </span>
        {task.module && (
          <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {task.module}
          </span>
        )}
      </div>

      {task.subtasks.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}{' '}
          subtasks
        </p>
      )}

      {!preview && <div className="mt-2 flex items-center gap-2">
        <label className="sr-only" htmlFor={`status-${task.id}`}>
          Status
        </label>
        <Select
          id={`status-${task.id}`}
          value={taskListId(task, lists)}
          label="Move to stage"
          onChange={value => updateTask(task.id, { listId: value, status: lists.find(list => list.id === value)!.status })}
          options={lists.map(list => ({ value: list.id, label: list.title }))}
        />
      </div>}
      {preview && <div className="task-preview-status">{STATUS_LABEL[task.status]}</div>}

      {task.dueDate && (
        <p className={`task-due ${task.status !== 'done' && task.dueDate < localDateKey() ? 'overdue' : ''}`}>{task.status !== 'done' && task.dueDate < localDateKey() ? 'Overdue · ' : 'Due '}{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
      )}
      {task.plannedDate && <p className="task-planned">Planned {new Date(`${task.plannedDate}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}{task.plannedTime ? ` at ${formatTime(task.plannedTime)}` : ' · Any time'}</p>}
      {task.tags.length > 0 && <div className="task-tags">{task.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
      {editing && <TaskEditor task={task} onClose={() => setEditing(false)} onSaved={onSaved} />}
    </article>
  )
}

function AddTaskForm({ plannedDate, onSaved }: { plannedDate: string; onSaved: (task: Task) => void }) {
  const addTask = useStore((state) => state.addTask)
  const project = useStore((state) =>
    state.projects.find((p) => p.id === state.activeProjectId),
  )
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [date, setDate] = useState(plannedDate)
  const [time, setTime] = useState('')
  const [feedback, setFeedback] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !project) return
    const created = addTask({ title, module: project?.modules[0] ?? '', plannedDate: date, plannedTime: date ? time : '' })
    onSaved(created)
    setFeedback(date ? `Task scheduled for ${date}${time ? ' at ' + formatTime(time) : ''}. Find it in the five-week plan or All tasks.` : 'Task added to Backlog.')
    setTitle('')
  }

  return (
    <form onSubmit={submit} className="entry-form quick-schedule-form flex gap-2">
      <label className="sr-only" htmlFor="new-task">Task title</label>
      <input
        id="new-task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task…"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        Add
      </button>
      <button type="button" className="secondary-action" onClick={() => setCreating(true)}>Add details</button>
      <SchedulePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} /><p className="schedule-feedback" role="status">{feedback}</p>{creating && <TaskEditor defaultPlannedDate={date} defaultPlannedTime={time} defaultTitle={title} onClose={() => setCreating(false)} onSaved={task => { setTitle(''); onSaved(task) }} />}
    </form>
  )
}

export function TasksView() {
  const tasks = useStore((state) => state.tasks)
  const activeProjectId = useStore((state) => state.activeProjectId)
  const updateTask = useStore(state => state.updateTask)
  const projects = useStore(state => state.projects)
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [module, setModule] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sort, setSort] = useState('scheduled')
  const [layout, setLayout] = useState('board')
  const [scope, setScope] = useState<TaskScope>('today')
  const [showCompleted, setShowCompleted] = useState(false)
  const [today, setToday] = useState(localDateKey)
  const project = projects.find(p => p.id === activeProjectId)
  const firstTaskDate = tasks.filter(task => task.projectId === activeProjectId).map(task => task.createdAt).sort()[0]
  const startDate = project?.startDate ?? (firstTaskDate ? localDateKey(new Date(firstTaskDate)) : today)
  const [week, setWeek] = useState(1)
  const [newDay, setNewDay] = useState(today)
  const weekStart = addDays(startDate, (week - 1) * 7)
  const selectedDay = newDay >= weekStart && newDay <= addDays(weekStart, 6) ? newDay : weekStart
  useEffect(() => {
    const refresh = () => setToday(localDateKey())
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])

  const projectTasks = tasks.filter(t => t.projectId === activeProjectId && !t.archived)
  const modules = [...new Set([...(projects.find(p => p.id === activeProjectId)?.modules ?? []), ...projectTasks.map(task => task.module).filter(Boolean)])]
  const matching = filterTasks(projectTasks, { query, priority, module, deadline, sort }, today)
  const filtered = scopeTasks(matching, scope, today, startDate, week, scope === 'all' || showCompleted)
  const overdue = matching.filter(task => task.status !== 'done' && ((task.plannedDate && task.plannedDate < today) || (task.dueDate && task.dueDate < today)))
  const pending = projectTasks.filter(task => task.status !== 'done')
  const plannedDate = scope === 'today' ? today : scope === 'week' ? selectedDay : ''
  const saved = (task: Task) => { setQuery(''); setPriority(''); setModule(''); setDeadline(''); if (!task.archived) { setScope(task.plannedDate === today ? 'today' : task.plannedDate ? 'all' : 'backlog'); setShowCompleted(task.status === 'done') } setFeedback(task.archived ? `Archived “${task.title}”. Find it in the board Archive.` : `Saved “${task.title}”${task.plannedDate ? ` for ${task.plannedDate}${task.plannedTime ? ` at ${formatTime(task.plannedTime)}` : ''}` : ' to Backlog'}.`) }
  const changeScope = (next: TaskScope) => { setScope(next); setDeadline(''); setShowCompleted(false); if (next === 'week') setNewDay(weekStart) }

  return (
    <div className="flex flex-col gap-4">
      <div className="planner-navigation" aria-label="Task time view">{([['today', 'Today'], ['week', '5-week plan'], ['backlog', 'Backlog'], ['all', 'All tasks']] as const).map(([value, label]) => <button key={value} aria-pressed={scope === value} onClick={() => changeScope(value)}>{label}<span>{value === 'today' ? pending.filter(t => t.plannedDate === today).length : value === 'backlog' ? pending.filter(t => !t.plannedDate).length : value === 'all' ? projectTasks.length : ''}</span></button>)}</div>
      <section className="planner-heading"><div><h2>{scope === 'today' ? 'Focus on today' : scope === 'week' ? `Week ${week}` : scope === 'backlog' ? 'Your unscheduled ideas' : 'Project history'}</h2><p>{scope === 'today' ? `${new Date(`${today}T12:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} · Only tasks planned for today` : scope === 'week' ? `${weekStart} to ${addDays(weekStart, 6)} · Set your plan’s start date in Manage project` : scope === 'backlog' ? 'Open a task to choose a planned work day. Deadlines are tracked separately.' : 'Every task, including completed work. Search here whenever you need it.'}</p></div>{scope !== 'all' && <label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />Show completed</label>}</section>
      {scope === 'week' && <div className="week-picker">{[1, 2, 3, 4, 5].map(value => <button key={value} aria-pressed={week === value} onClick={() => { setWeek(value); setNewDay(addDays(startDate, (value - 1) * 7)) }}>Week {value}</button>)}<label>New tasks for<input type="date" value={selectedDay} min={weekStart} max={addDays(weekStart, 6)} onChange={e => setNewDay(e.target.value)} required /></label></div>}
      <div className="task-create-bar"><button className="primary-action" onClick={() => setCreating(true)}>+ Create task</button><p role="status">{feedback || 'Choose a list, planned date, and time in one place.'}</p></div>{creating && <TaskEditor defaultPlannedDate={plannedDate} onClose={() => setCreating(false)} onSaved={saved} />}
      <details className="quick-add-disclosure"><summary>＋ Create a card with date and time</summary><AddTaskForm key={plannedDate} plannedDate={plannedDate} onSaved={saved} /></details>
      
      <div className="task-toolbar"><label className="search-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input aria-label="Search tasks" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, tags, or descriptions" /></label><div className="view-toggle" aria-label="Task view"><button aria-pressed={layout === 'board'} onClick={() => setLayout('board')}>Board</button><button aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>List</button></div></div>
      <div className="task-filters"><Select label="Filter priority" value={priority} onChange={setPriority} options={[{ value: '', label: 'All priorities' }, ...Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))]} /><Select label="Filter module" value={module} onChange={setModule} options={[{ value: '', label: 'All modules' }, ...modules.map(value => ({ value, label: value }))]} /><Select label="Filter deadlines" value={deadline} onChange={setDeadline} options={[{ value: '', label: 'All deadlines' }, { value: 'overdue', label: 'Overdue', color: '#d4665c' }, { value: 'today', label: 'Due today', color: '#d9a546' }]} /><Select label="Sort tasks" value={sort} onChange={setSort} options={[{ value: 'scheduled', label: 'Scheduled time' }, { value: 'newest', label: 'Newest first' }, { value: 'priority', label: 'Priority first' }, { value: 'due', label: 'Due date' }, { value: 'title', label: 'Title A–Z' }]} />{(query || priority || module || deadline) && <button className="text-action" onClick={() => { setQuery(''); setPriority(''); setModule(''); setDeadline('') }}>Clear filters</button>}<span className="result-count">{filtered.length} of {projectTasks.length} tasks</span></div>
      {layout === 'board' && <details className="board-instructions"><summary>How to move tasks</summary>Drag a card with its handle to reorder it or move it to another list. Keyboard: Space to pick up, arrows to move, Space to drop, Escape to cancel.</details>}
      {scope === 'today' && overdue.length > 0 && <details className="overdue-section"><summary>Overdue work <span>{overdue.length}</span><small>Expand when you’re ready to catch up</small></summary><div className="overdue-items">{overdue.map(task => <div key={task.id}><button className="task-title-button" onClick={() => { setScope('all'); setQuery(task.title); setPriority(''); setModule(''); setDeadline('') }}>{task.title}</button><span>{task.plannedDate && task.plannedDate < today ? `Planned ${task.plannedDate}` : `Deadline ${task.dueDate}`}</span>{task.plannedDate !== today && <button className="secondary-action" onClick={() => updateTask(task.id, { plannedDate: today })}>Move to today</button>}</div>)}</div></details>}
      {layout === 'board' ? <TrelloBoard tasks={filtered} plannedDate={plannedDate} onSaved={saved} /> : <div className="task-list-view">{filtered.map(task => <TaskCard key={task.id} task={task} onSaved={saved} />)}</div>}
      {filtered.length === 0 && <div className="empty-state"><h3>{scope === 'today' ? 'Your day is clear' : 'No cards in this view'}</h3><p>Use Add a card in a list, schedule work from Backlog, or open All tasks.</p></div>}
    </div>
  )
}
