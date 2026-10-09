import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable, pointerWithin, closestCenter } from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { BoardList, Task } from '../types'
import { useStore } from '../store'
import { boardLists, labelColor, moveCard, orderedCards, taskListId } from '../lib/board'
import { formatTime, localDateKey } from '../lib/tasks'
import { uid } from '../store/seed'
import { TaskEditor } from './TaskEditor'
import { Select } from './Select'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { BoardCanvas, CanvasDndContext } from './BoardCanvas'
import { useCanvasScale } from '../hooks/useCanvasScale'
import { canvasTranslation } from '../lib/canvas'
import { WorkspaceBackup } from './WorkspaceBackup'
import { BoardFrame } from './BoardFrame'

function Card({ task, preview = false, onSaved, onCompleted, zoom = 1 }: { task: Task; preview?: boolean; onSaved?: (task: Task) => void; onCompleted?: (task: Task) => void; zoom?: number }) {
  const [editing, setEditing] = useState(false)
  return <article style={{ zoom }} className={`trello-card ${preview ? 'trello-card-overlay' : ''}`} onClick={event => { if (!preview && !(event.target as HTMLElement).closest('button, input, textarea, a, dialog')) setEditing(true) }}>
    {task.cover && <div className="card-cover" style={{ background: task.cover }} />}
    <div className="trello-card-content">{task.tags.length > 0 && <div className="card-labels">{task.tags.map(tag => <span key={tag} style={{ background: labelColor(tag) }}>{tag}</span>)}</div>}
    <div className="card-title-row">{!preview && <button type="button" className={`card-complete-button ${task.status === 'done' ? 'is-complete' : ''}`} aria-label={task.status === 'done' ? `Reopen ${task.title}` : `Complete ${task.title}`} aria-pressed={task.status === 'done'} title={task.status === 'done' ? 'Reopen card' : 'Mark complete'} onClick={() => { useStore.getState().toggleTaskComplete(task.id); onCompleted?.(task) }}><Icon name="check" size={14} /></button>}<button className={`trello-card-title ${task.status === 'done' ? 'completed-title' : ''}`} disabled={preview} onClick={() => setEditing(true)}>{task.title}</button></div>
    <div className="card-indicators">{task.plannedDate && <span className="card-date"><Icon name="clock" size={13} /> {task.plannedDate.slice(5)}{task.plannedTime ? ` ${formatTime(task.plannedTime)}` : ''}</span>}{task.dueDate && <span className={`card-deadline ${task.status === 'done' ? 'complete' : task.dueDate < localDateKey() ? 'late' : ''}`}>Due {task.dueDate.slice(5)}</span>}{task.description && <span title="Has description" aria-label="Has description"><Icon name="notes" size={14} /></span>}{task.subtasks.length > 0 && <span title="Checklist progress"><Icon name="check" size={14} /> {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}</span>}{!!task.comments?.length && <span title="Comments">Comments {task.comments.length}</span>}{!!task.attachments?.length && <span title="Attachments">Links {task.attachments.length}</span>}<span className="card-priority">{task.priority}</span></div></div>
    {editing && <TaskEditor task={task} onClose={() => setEditing(false)} onSaved={onSaved} />}
  </article>
}

function SortableCard({ task, listId, onSaved, onCompleted, zoom }: { task: Task; listId: string; onSaved?: (task: Task) => void; onCompleted: (task: Task) => void; zoom: number }) {
  const canvasScale = useCanvasScale()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { listId } })
  const translated = transform ? canvasTranslation(transform, canvasScale) : null
  return <div ref={setNodeRef} className={`trello-sortable ${isDragging ? 'dragging' : ''}`} style={{ transform: translated && !isDragging ? `translate3d(${translated.x}px,${translated.y}px,0)` : undefined, transition }}><Card task={task} onSaved={onSaved} onCompleted={onCompleted} zoom={zoom} /><button ref={setActivatorNodeRef} {...attributes} {...listeners} className="trello-grip" aria-label={`Drag ${task.title}`} title="Drag card"><Icon name="grip" size={20} /></button></div>
}

function List({ list, cards, plannedDate, lists, onSaved, onCompleted, zoom }: { list: BoardList; cards: Task[]; plannedDate: string; lists: BoardList[]; onSaved?: (task: Task) => void; onCompleted: (task: Task) => void; zoom: number }) {
  const projectId = useStore(state => state.activeProjectId)
  const updateProject = useStore(state => state.updateProject)
  const addTask = useStore(state => state.addTask)
  const { setNodeRef, isOver } = useDroppable({ id: list.id, data: { listId: list.id } })
  const [details, setDetails] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [menu, setMenu] = useState(false)
  const [name, setName] = useState(list.title)
  const index = lists.findIndex(item => item.id === list.id)
  const hasCards = useStore(state => state.tasks.some(task => task.projectId === projectId && taskListId(task, lists) === list.id))
  const reorder = (offset: number) => { const next = [...lists]; const [item] = next.splice(index, 1); next.splice(index + offset, 0, item); updateProject(projectId, { lists: next }) }
  return <section ref={setNodeRef} className={`trello-list ${isOver ? 'list-over' : ''}`} aria-label={`${list.title} list`}><div className="trello-list-heading"><h3>{list.title} <span>{cards.length}</span></h3><button className="list-menu-trigger" aria-label={`Settings for ${list.title}`} aria-expanded={menu} onClick={() => setMenu(!menu)}>⋯</button></div>
    {menu && <div className="list-settings"><label>List name<input value={name} onChange={e => setName(e.target.value)} /></label><button className="secondary-action" disabled={!name.trim()} onClick={() => { updateProject(projectId, { lists: lists.map(l => l.id === list.id ? { ...l, title: name.trim() } : l) }); setMenu(false) }}>Save name</button><Select value={list.status} label="List progress category" options={[{ value: 'todo', label: 'To do' }, { value: 'doing', label: 'In progress' }, { value: 'review', label: 'Review' }, { value: 'done', label: 'Completed' }]} onChange={status => { updateProject(projectId, { lists: lists.map(l => l.id === list.id ? { ...l, status: status as BoardList['status'] } : l) }) }} /><div><button disabled={index === 0} onClick={() => reorder(-1)}>← Move left</button><button disabled={index === lists.length - 1} onClick={() => reorder(1)}>Move right →</button></div><button disabled={hasCards || lists.length <= 1} className="danger-action" title={hasCards ? 'Move or delete every card in this list first, including archived cards.' : 'Remove this empty list'} onClick={() => updateProject(projectId, { lists: lists.filter(l => l.id !== list.id) })}>Remove empty list</button></div>}
    <SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}><div className="trello-list-cards">{cards.map(task => <SortableCard key={task.id} task={task} listId={list.id} onSaved={onSaved} onCompleted={onCompleted} zoom={zoom} />)}</div></SortableContext>
    {adding ? <form className="inline-card-create" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; const created = addTask({ title: title.trim(), listId: list.id, status: list.status, plannedDate }); onSaved?.(created); setTitle('') }}><textarea autoFocus aria-label={`New card in ${list.title}`} placeholder="Enter a title for this card…" value={title} onChange={e => setTitle(e.target.value)} rows={2} onKeyDown={event => { if (event.key === 'Escape') setAdding(false); if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} /><div><button className="trello-primary" disabled={!title.trim()}>Add card</button><button type="button" onClick={() => setDetails(true)}>Add details</button><button type="button" aria-label="Cancel new card" onClick={() => setAdding(false)}>×</button></div></form> : <button className="add-card-button" onClick={() => setAdding(true)}>＋ Add a card</button>}
    {details && <TaskEditor defaultTitle={title} defaultListId={list.id} defaultPlannedDate={plannedDate} onClose={() => setDetails(false)} onSaved={task => { setTitle(''); setAdding(false); onSaved?.(task) }} />}
  </section>
}

function CanvasDragCard({ task }: { task: Task }) { const scale = useCanvasScale(); return <Card task={task} preview zoom={scale} /> }

export function TrelloBoard({ tasks, plannedDate, onSaved, zoom = 1 }: { tasks: Task[]; plannedDate: string; onSaved?: (task: Task) => void; zoom?: number }) {
  const projects = useStore(state => state.projects)
  const projectId = useStore(state => state.activeProjectId)
  const allTasks = useStore(state => state.tasks)
  const updateProject = useStore(state => state.updateProject)
  const updateTask = useStore(state => state.updateTask)
  const setTaskZoom = useStore(state => state.setTaskZoom)
  const project = projects.find(p => p.id === projectId)
  const lists = boardLists(project)
  const root = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState(false)
  const [backup, setBackup] = useState(false)
  const [notice, setNotice] = useState<{ message: string; undo: () => void } | null>(null)
  useEffect(() => {
    if (!focus) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) setFocus(false) }
    const keepFocus = (event: FocusEvent) => { if (!root.current?.contains(event.target as Node) && !document.querySelector('dialog[open]')) root.current?.focus() }
    document.addEventListener('keydown', escape)
    document.addEventListener('focusin', keepFocus)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', escape); document.removeEventListener('focusin', keepFocus); previous?.focus() }
  }, [focus])
  const completed = (before: Task) => setNotice({ message: before.status === 'done' ? `Reopened “${before.title}”` : `Completed “${before.title}”`, undo: () => useStore.setState(state => ({ tasks: state.tasks.map(task => task.id === before.id ? { ...task, status: before.status, listId: before.listId, order: before.order, updatedAt: new Date().toISOString() } : task) })) })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newList, setNewList] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [archive, setArchive] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const collision: CollisionDetection = args => { if (!args.pointerCoordinates) return closestCenter(args); const hits = pointerWithin(args); const cards = hits.filter(hit => !lists.some(list => list.id === hit.id)); return cards.length ? closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(c => cards.some(hit => hit.id === c.id)) }) : hits }
  const finish = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      const target = allTasks.find(t => t.id === over.id)
      const list = lists.find(l => l.id === (target ? taskListId(target, lists) : over.id))
      if (list) { useStore.setState(state => ({ tasks: moveCard(state.tasks, String(active.id), list, lists, target?.id, active.rect.current.translated && active.rect.current.translated.top + active.rect.current.translated.height / 2 > over.rect.top + over.rect.height / 2 ? 'after' : 'before') })); setAnnouncement(`Card moved to ${list.title}`) }
    }
    setActiveId(null)
  }
  const active = allTasks.find(t => t.id === activeId)
  const archived = allTasks.filter(t => t.projectId === projectId && t.archived)
  const boardCards = allTasks.filter(task => task.projectId === projectId && !task.archived)
  const doneCount = boardCards.filter(task => task.status === 'done').length
  const progress = boardCards.length ? Math.round(doneCount / boardCards.length * 100) : 0
  return <BoardFrame focused={focus} disabled={!!activeId}><div ref={root} tabIndex={-1} aria-label={`${project?.name ?? 'Your'} board`} style={{ '--task-scale': 1 } as CSSProperties} className={`trello-board-shell board-${project?.background ?? 'blue'} ${focus ? 'board-focus' : ''}`}><div className="trello-board-top"><div><h2>{project?.name ?? 'Your board'}</h2><span>Private board · Personal workspace</span><div className="board-progress-summary"><span>{boardCards.length} cards</span><span>{doneCount} completed</span><span>{progress}% complete</span><div className="board-progress-track" role="progressbar" aria-label="Board completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div></div></div><div className="board-top-actions"><button type="button" onClick={() => setFocus(!focus)} aria-pressed={focus}>{focus ? 'Exit focus' : 'Focus mode'}</button><button type="button" onClick={() => setBackup(true)}>Backup</button><Select label="Board background" value={project?.background ?? 'blue'} onChange={background => updateProject(projectId, { background })} options={[{ value: 'blue', label: 'Ocean blue' }, { value: 'purple', label: 'Twilight' }, { value: 'green', label: 'Forest' }, { value: 'rose', label: 'Sunset' }]} /><button type="button" disabled={!doneCount} onClick={() => { const cards = useStore.getState().archiveCompleted(projectId); setNotice({ message: `Archived ${cards.length} completed card${cards.length === 1 ? '' : 's'}`, undo: () => { const ids = new Set(cards.map(card => card.id)); useStore.setState(state => ({ tasks: state.tasks.map(task => ids.has(task.id) ? { ...task, archived: false, updatedAt: new Date().toISOString() } : task) })) } }) }}>Archive completed</button><button onClick={() => setArchive(true)}>Archive {archived.length > 0 ? `(${archived.length})` : ''}</button></div></div>
    {notice && <div className="board-notice" role="status"><span>{notice.message}</span><button type="button" onClick={() => { notice.undo(); setNotice(null) }}>Undo</button><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
    <p className="sr-only" role="status">{announcement}</p><BoardCanvas zoom={zoom} onZoomChange={setTaskZoom} disabled={!!activeId}><CanvasDndContext sensors={sensors} collisionDetection={collision} onDragStart={({ active }) => setActiveId(String(active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={finish}><div className="trello-lists">{lists.map(list => <List key={list.id} list={list} lists={lists} cards={orderedCards(tasks.filter(task => taskListId(task, lists) === list.id))} plannedDate={plannedDate} onSaved={onSaved} onCompleted={completed} zoom={1} />)}<div className="add-list-panel">{addingList ? <form onSubmit={e => { e.preventDefault(); if (!newList.trim()) return; updateProject(projectId, { lists: [...lists, { id: uid(), title: newList.trim(), status: 'todo' }] }); setNewList(''); setAddingList(false) }}><input autoFocus aria-label="New list name" placeholder="Enter list name…" value={newList} onChange={e => setNewList(e.target.value)} /><button className="trello-primary" disabled={!newList.trim()}>Add list</button><button type="button" onClick={() => setAddingList(false)} aria-label="Cancel new list">×</button></form> : <button onClick={() => setAddingList(true)}>＋ Add another list</button>}</div></div>{createPortal(<DragOverlay dropAnimation={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? null : { duration: 200, easing: 'ease-out' }}>{active ? <CanvasDragCard task={active} /> : null}</DragOverlay>, document.body)}</CanvasDndContext></BoardCanvas>
    {backup && <WorkspaceBackup onClose={() => setBackup(false)} />}
    {archive && <Modal title="Archived cards" subtitle="Restore a card whenever you need it again." onClose={() => setArchive(false)}><div className="modal-body">{archived.length ? archived.map(task => <div className="archived-row" key={task.id}><span>{task.title}</span><button className="secondary-action" onClick={() => { updateTask(task.id, { archived: false }); const restored = useStore.getState().tasks.find(item => item.id === task.id); if (restored) onSaved?.(restored) }}>Restore</button></div>) : <p className="muted">No archived cards.</p>}</div></Modal>}
  </div></BoardFrame>
}
