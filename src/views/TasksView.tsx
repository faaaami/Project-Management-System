import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core'
import type { DragEndEvent, KeyboardCoordinateGetter, CollisionDetection } from '@dnd-kit/core'
import { useStore } from '../store'
import type { Task, TaskStatus } from '../types'
import { Select } from '../components/Select'
import { TaskEditor } from '../components/TaskEditor'
import { filterTasks, localDateKey } from '../lib/tasks'
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_ORDER,
  TYPE_CLASS,
  TYPE_LABEL,
} from '../lib/ui'

const stageCollision: CollisionDetection = (args) => {
  if (args.pointerCoordinates) return pointerWithin(args)
  return rectIntersection(args)
}

const stageCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const directions: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  const direction = directions[event.code]
  if (!direction || !context.collisionRect) return
  event.preventDefault()
  const current = context.over?.id ?? context.active?.data.current?.status
  const index = STATUS_ORDER.indexOf(current as TaskStatus)
  const next = STATUS_ORDER[index + direction]
  const target = next && context.droppableRects.get(next)
  if (!target) return
  return {
    x: currentCoordinates.x + target.left + target.width / 2 - context.collisionRect.left - context.collisionRect.width / 2,
    y: currentCoordinates.y + target.top + target.height / 2 - context.collisionRect.top - context.collisionRect.height / 2,
  }
}

function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: task.id, data: { status: task.status } })
  return <div ref={setNodeRef} className={`draggable-task ${isDragging ? 'is-dragging' : ''}`}>
    <TaskCard task={task} handle={<button ref={setActivatorNodeRef} {...attributes} {...listeners} className="task-drag-handle" aria-label={`Move ${task.title}`} title="Drag to another stage"><svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">{[6, 10, 14].flatMap(y => [5, 11].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}</svg></button>} />
  </div>
}

function Stage({ status, tasks, dragging }: { status: TaskStatus; tasks: Task[]; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return <section ref={setNodeRef} aria-label={`${STATUS_LABEL[status]} stage`} className={`kanban-column flex flex-col gap-2 ${dragging ? 'drop-enabled' : ''} ${isOver ? 'drop-active' : ''}`}>
    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"><span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[status]}`} />{STATUS_LABEL[status]}<span className="text-slate-400">({tasks.length})</span></h3>
    <div className="flex flex-col gap-2">
      {tasks.map(task => <DraggableTask key={task.id} task={task} />)}
      {tasks.length === 0 && <p className="stage-empty">{dragging ? 'Drop a task here' : 'No tasks here yet'}</p>}
    </div>
    {dragging && tasks.length > 0 && <div className="stage-drop-hint">{isOver ? `Move to ${STATUS_LABEL[status]}` : 'Drop here'}</div>}
  </section>
}

function TaskCard({ task, handle, preview = false }: { task: Task; handle?: ReactNode; preview?: boolean }) {
  const updateTask = useStore((state) => state.updateTask)
  const [editing, setEditing] = useState(false)

  return (
    <article className={`task-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${preview ? 'task-preview' : ''}`}>
      {handle}
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
          value={task.status}
          label="Move to stage"
          onChange={value => updateTask(task.id, { status: value as TaskStatus })}
          options={STATUS_ORDER.map(value => ({ value, label: STATUS_LABEL[value], color: { todo: '#94a3b8', doing: '#6385ec', review: '#d9a546', done: '#39a886' }[value] }))}
        />
      </div>}
      {preview && <div className="task-preview-status">{STATUS_LABEL[task.status]}</div>}

      {task.dueDate && (
        <p className={`task-due ${task.status !== 'done' && task.dueDate < localDateKey() ? 'overdue' : ''}`}>{task.status !== 'done' && task.dueDate < localDateKey() ? 'Overdue · ' : 'Due '}{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
      )}
      {task.tags.length > 0 && <div className="task-tags">{task.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
      {editing && <TaskEditor task={task} onClose={() => setEditing(false)} />}
    </article>
  )
}

function AddTaskForm() {
  const addTask = useStore((state) => state.addTask)
  const project = useStore((state) =>
    state.projects.find((p) => p.id === state.activeProjectId),
  )
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    addTask({ title, module: project?.modules[0] ?? '' })
    setTitle('')
  }

  return (
    <form onSubmit={submit} className="entry-form flex gap-2">
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
      {creating && <TaskEditor onClose={() => setCreating(false)} />}
    </form>
  )
}

export function TasksView() {
  const tasks = useStore((state) => state.tasks)
  const activeProjectId = useStore((state) => state.activeProjectId)
  const updateTask = useStore(state => state.updateTask)
  const projects = useStore(state => state.projects)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('')
  const [module, setModule] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sort, setSort] = useState('newest')
  const [layout, setLayout] = useState('board')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: stageCoordinates }),
  )
  const activeTask = tasks.find(task => task.id === activeId && task.projectId === activeProjectId)
  const finishDrag = ({ active, over }: DragEndEvent) => {
    const task = tasks.find(item => item.id === active.id && item.projectId === activeProjectId)
    if (task && over && STATUS_ORDER.includes(over.id as TaskStatus) && task.status !== over.id) {
      updateTask(task.id, { status: over.id as TaskStatus })
      setAnnouncement(`${task.title} moved to ${STATUS_LABEL[over.id as TaskStatus]}.`)
    }
    setActiveId(null)
  }

  const projectTasks = tasks.filter(t => t.projectId === activeProjectId)
  const modules = [...new Set([...(projects.find(p => p.id === activeProjectId)?.modules ?? []), ...projectTasks.map(task => task.module).filter(Boolean)])]
  const filtered = useMemo(() => filterTasks(tasks.filter(t => t.projectId === activeProjectId), { query, priority, module, deadline, sort }), [tasks, activeProjectId, query, priority, module, deadline, sort])
  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>(
      (acc, status) => {
        acc[status] = filtered.filter((t) => t.status === status)
        return acc
      },
      { todo: [], doing: [], review: [], done: [] },
    )
  }, [filtered])

  return (
    <div className="flex flex-col gap-4">
      <AddTaskForm />
      <div className="task-toolbar"><label className="search-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input aria-label="Search tasks" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, tags, or descriptions" /></label><div className="view-toggle" aria-label="Task view"><button aria-pressed={layout === 'board'} onClick={() => setLayout('board')}>Board</button><button aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>List</button></div></div>
      <div className="task-filters"><Select label="Filter priority" value={priority} onChange={setPriority} options={[{ value: '', label: 'All priorities' }, ...Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))]} /><Select label="Filter module" value={module} onChange={setModule} options={[{ value: '', label: 'All modules' }, ...modules.map(value => ({ value, label: value }))]} /><Select label="Filter deadlines" value={deadline} onChange={setDeadline} options={[{ value: '', label: 'All deadlines' }, { value: 'overdue', label: 'Overdue', color: '#d4665c' }, { value: 'today', label: 'Due today', color: '#d9a546' }]} /><Select label="Sort tasks" value={sort} onChange={setSort} options={[{ value: 'newest', label: 'Newest first' }, { value: 'priority', label: 'Priority first' }, { value: 'due', label: 'Due date' }, { value: 'title', label: 'Title A–Z' }]} />{(query || priority || module || deadline) && <button className="text-action" onClick={() => { setQuery(''); setPriority(''); setModule(''); setDeadline('') }}>Clear filters</button>}<span className="result-count">{filtered.length} of {projectTasks.length} tasks</span></div>
      {layout === 'board' && <details className="board-instructions"><summary>How to move tasks</summary>Drag the six-dot handle to another stage. Keyboard: Space to pick up, arrow keys to move, Space to drop, Esc to cancel.</details>}
      <p className="sr-only" role="status">{announcement}</p>
      <DndContext key={activeProjectId} sensors={sensors} collisionDetection={stageCollision} onDragStart={({ active }) => { setActiveId(String(active.id)); setAnnouncement('') }} onDragEnd={finishDrag} onDragCancel={() => setActiveId(null)} accessibility={{ screenReaderInstructions: { draggable: 'Press Space to pick up a task. Use arrow keys to choose a stage. Press Space to drop or Escape to cancel.' } }}>
        {layout === 'board' ? <div className="kanban-board grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STATUS_ORDER.map(status => <Stage key={status} status={status} tasks={grouped[status]} dragging={!!activeTask} />)}
        </div> : <div className="task-list-view">{filtered.map(task => <TaskCard key={task.id} task={task} />)}</div>}
        {filtered.length === 0 && <div className="empty-state"><h3>{projectTasks.length ? 'No matching tasks' : 'Your next project starts here'}</h3><p>{projectTasks.length ? 'Try another search or clear your filters.' : 'Add your first task above, then break it into small steps.'}</p></div>}
        {createPortal(<DragOverlay dropAnimation={reducedMotion ? null : { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }} transition={reducedMotion ? 'none' : undefined}>{activeTask ? <TaskCard task={activeTask} preview /> : null}</DragOverlay>, document.body)}
      </DndContext>
    </div>
  )
}
