import { useState } from 'react'
import { useStore } from '../store'
import { uid } from '../store/seed'
import type { Task, TaskPriority, TaskStatus, TaskType } from '../types'
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER, TYPE_LABEL } from '../lib/ui'
import { Modal } from './Modal'
import { Select } from './Select'
import { localDateKey } from '../lib/tasks'

export function TaskEditor({ task, onClose, defaultPlannedDate = '' }: { task?: Task; onClose: () => void; defaultPlannedDate?: string }) {
  const store = useStore()
  const project = store.projects.find(p => p.id === store.activeProjectId)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [type, setType] = useState<TaskType>(task?.type ?? 'feature')
  const [module, setModule] = useState(task?.module ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [plannedDate, setPlannedDate] = useState(task ? task.plannedDate ?? '' : defaultPlannedDate)
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [subtasks, setSubtasks] = useState(task?.subtasks ?? [])
  const [subtask, setSubtask] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  return <Modal title={task ? 'Task details' : 'Create a task'} subtitle={project?.name} onClose={onClose}><form onSubmit={event => {
    event.preventDefault()
    if (!title.trim() || !project) return
    const data = { title: title.trim(), description: description.trim(), status, priority, type, module, dueDate, plannedDate, tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))], subtasks }
    if (task) store.updateTask(task.id, data); else store.addTask(data)
    onClose()
  }}><div className="modal-body form-stack"><label>Task title<input autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to get done?" /></label><label>Description<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Context, acceptance criteria, or useful links…" /></label><div className="form-grid"><label>Stage<Select label="Task stage" value={status} options={STATUS_ORDER.map(value => ({ value, label: STATUS_LABEL[value] }))} onChange={value => setStatus(value as TaskStatus)} /></label><label>Priority<Select label="Priority" value={priority} options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))} onChange={value => setPriority(value as TaskPriority)} /></label><label>Type<Select label="Task type" value={type} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} onChange={value => setType(value as TaskType)} /></label><label>Module<Select label="Module" value={module} options={[{ value: '', label: 'No module' }, ...[...new Set([...(project?.modules ?? []), ...(module ? [module] : [])])].map(value => ({ value, label: value }))]} onChange={setModule} /></label><label>Planned work day<input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} /><small>Leave blank to keep this task in Backlog.</small><button type="button" className="text-action" onClick={() => setPlannedDate(localDateKey())}>Schedule for today</button></label><label>Deadline<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label><label>Tags<input value={tags} onChange={e => setTags(e.target.value)} placeholder="frontend, release" /><small>Separate tags with commas.</small></label></div><div className="subtask-editor"><h3>Checklist <span>{subtasks.filter(item => item.done).length}/{subtasks.length}</span></h3>{subtasks.map(item => <div className="checklist-row" key={item.id}><input type="checkbox" aria-label={item.text} checked={item.done} onChange={() => setSubtasks(subtasks.map(s => s.id === item.id ? { ...s, done: !s.done } : s))} /><span className={item.done ? 'completed-text' : ''}>{item.text}</span><button type="button" className="icon-button" aria-label={`Remove ${item.text}`} onClick={() => setSubtasks(subtasks.filter(s => s.id !== item.id))}>×</button></div>)}<div className="inline-entry"><input aria-label="New checklist item" value={subtask} onChange={e => setSubtask(e.target.value)} placeholder="Add a small step…" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (subtask.trim()) { setSubtasks([...subtasks, { id: uid(), text: subtask.trim(), done: false }]); setSubtask('') } } }} /><button type="button" className="secondary-action" disabled={!subtask.trim()} onClick={() => { setSubtasks([...subtasks, { id: uid(), text: subtask.trim(), done: false }]); setSubtask('') }}>Add</button></div></div></div><div className="modal-footer">{task && <button type="button" className="danger-action" onClick={() => { if (confirmDelete) { store.deleteTask(task.id); onClose() } else setConfirmDelete(true) }}>{confirmDelete ? 'Confirm deletion' : 'Delete task'}</button>}<button type="button" className="secondary-action" onClick={onClose}>Cancel</button><button type="submit" className="primary-action" disabled={!title.trim() || !project}>{task ? 'Save changes' : 'Create task'}</button></div></form></Modal>
}
