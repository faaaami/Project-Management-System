import { useState } from 'react'
import { useStore } from '../store'
import { uid } from '../store/seed'
import type { Task, TaskPriority, TaskType } from '../types'
import { PRIORITY_LABEL, TYPE_LABEL } from '../lib/ui'
import { Modal } from './Modal'
import { Select } from './Select'
import { SchedulePicker } from './SchedulePicker'
import { CardExtras } from './CardExtras'
import { boardLists, taskListId } from '../lib/board'

export function TaskEditor({ task, onClose, defaultPlannedDate = '', defaultPlannedTime = '', defaultTitle = '', defaultListId = '', onSaved }: { task?: Task; onClose: () => void; onSaved?: (task: Task) => void; defaultListId?: string; defaultPlannedDate?: string; defaultPlannedTime?: string; defaultTitle?: string }) {
  const store = useStore()
  const project = store.projects.find(p => p.id === store.activeProjectId)
  const [title, setTitle] = useState(task?.title ?? defaultTitle)
  const [description, setDescription] = useState(task?.description ?? '')
  const lists = boardLists(project)
  const [listId, setListId] = useState(task ? taskListId(task, lists) : defaultListId || lists[0].id)
  const status = lists.find(list => list.id === listId)?.status ?? 'todo'
  const [cover, setCover] = useState(task?.cover ?? '')
  const [comments, setComments] = useState(task?.comments ?? [])
  const [attachments, setAttachments] = useState(task?.attachments ?? [])
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [type, setType] = useState<TaskType>(task?.type ?? 'feature')
  const [module, setModule] = useState(task?.module ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [plannedDate, setPlannedDate] = useState(task ? task.plannedDate ?? '' : defaultPlannedDate)
  const [plannedTime, setPlannedTime] = useState(task?.plannedTime ?? defaultPlannedTime)
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [subtasks, setSubtasks] = useState(task?.subtasks ?? [])
  const [subtask, setSubtask] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const draft = { title: title.trim(), description: description.trim(), status, listId, cover, comments, attachments, priority, type, module, dueDate, plannedDate, plannedTime: plannedDate ? plannedTime : '', tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))], subtasks }
  const initial = { title: task?.title ?? defaultTitle, description: task?.description ?? '', status: task?.status ?? lists.find(list => list.id === (defaultListId || lists[0].id))?.status ?? 'todo', listId: task ? taskListId(task, lists) : defaultListId || lists[0].id, cover: task?.cover ?? '', comments: task?.comments ?? [], attachments: task?.attachments ?? [], priority: task?.priority ?? 'medium', type: task?.type ?? 'feature', module: task?.module ?? '', dueDate: task?.dueDate ?? '', plannedDate: task ? task.plannedDate ?? '' : defaultPlannedDate, plannedTime: task?.plannedTime ?? defaultPlannedTime, tags: task?.tags ?? [], subtasks: task?.subtasks ?? [] }
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const close = () => { if (dirty) setConfirmDiscard(true); else onClose() }
  const save = (archive = false) => {
    if (!draft.title || !project) return
    let saved: Task
    if (task) { store.updateTask(task.id, { ...draft, archived: archive }); saved = useStore.getState().tasks.find(item => item.id === task.id)! }
    else saved = store.addTask(draft)
    onSaved?.(saved)
    onClose()
  }
  return <Modal title={task ? 'Card details' : 'Create a card'} subtitle={project?.name} onClose={close}><form onSubmit={event => {
    event.preventDefault()
    if (!title.trim() || !project) return
    save()
  }}><div className="modal-body form-stack"><label>Task title<input autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to get done?" /></label><label>Description<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Context, acceptance criteria, or useful links…" /></label><div className="form-grid"><label>List<Select label="Move to list" value={listId} options={lists.map(list => ({ value: list.id, label: list.title }))} onChange={setListId} /></label><label>Priority<Select label="Priority" value={priority} options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))} onChange={value => setPriority(value as TaskPriority)} /></label><label>Type<Select label="Task type" value={type} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} onChange={value => setType(value as TaskType)} /></label><label>Module<Select label="Module" value={module} options={[{ value: '', label: 'No module' }, ...[...new Set([...(project?.modules ?? []), ...(module ? [module] : [])])].map(value => ({ value, label: value }))]} onChange={setModule} /></label><SchedulePicker date={plannedDate} time={plannedTime} onDateChange={setPlannedDate} onTimeChange={setPlannedTime} /><label>Deadline<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label><label>Tags<input value={tags} onChange={e => setTags(e.target.value)} placeholder="frontend, release" /><small>Separate tags with commas.</small></label></div><div className="subtask-editor"><h3>Checklist <span>{subtasks.filter(item => item.done).length}/{subtasks.length}</span></h3>{subtasks.map(item => <div className="checklist-row" key={item.id}><input type="checkbox" aria-label={item.text} checked={item.done} onChange={() => setSubtasks(subtasks.map(s => s.id === item.id ? { ...s, done: !s.done } : s))} /><span className={item.done ? 'completed-text' : ''}>{item.text}</span><button type="button" className="icon-button" aria-label={`Remove ${item.text}`} onClick={() => setSubtasks(subtasks.filter(s => s.id !== item.id))}>×</button></div>)}<div className="inline-entry"><input aria-label="New checklist item" value={subtask} onChange={e => setSubtask(e.target.value)} placeholder="Add a small step…" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (subtask.trim()) { setSubtasks([...subtasks, { id: uid(), text: subtask.trim(), done: false }]); setSubtask('') } } }} /><button type="button" className="secondary-action" disabled={!subtask.trim()} onClick={() => { setSubtasks([...subtasks, { id: uid(), text: subtask.trim(), done: false }]); setSubtask('') }}>Add</button></div></div><CardExtras cover={cover} onCover={setCover} comments={comments} onComments={setComments} attachments={attachments} onAttachments={setAttachments} /></div>{confirmDiscard && <Modal title="Save your changes?" subtitle="Your card has unsaved edits." onClose={() => setConfirmDiscard(false)}><div className="editor-discard"><button type="button" className="secondary-action" onClick={() => setConfirmDiscard(false)}>Keep editing</button><button type="button" className="danger-action" onClick={onClose}>Discard changes</button><button type="button" className="primary-action" onClick={() => save()}>Save and close</button></div></Modal>}<div className="modal-footer">{task && <><button type="button" className="secondary-action" disabled={!title.trim()} onClick={() => { save(true) }}>Archive</button><button type="button" className="secondary-action" disabled={!title.trim()} onClick={() => { const copied = store.addTask({ ...draft, title: `${draft.title} (copy)`, subtasks: subtasks.map(s => ({ ...s, id: uid() })), comments: [], archived: false }); onSaved?.(copied); onClose() }}>Copy</button></>}{task && <button type="button" className="danger-action" onClick={() => { if (confirmDelete) { store.deleteTask(task.id); onClose() } else setConfirmDelete(true) }}>{confirmDelete ? 'Confirm deletion' : 'Delete task'}</button>}<button type="button" className="secondary-action" onClick={close}>Cancel</button><button type="submit" className="primary-action" disabled={!title.trim() || !project}>{task ? 'Save changes' : 'Create task'}</button></div></form></Modal>
}
