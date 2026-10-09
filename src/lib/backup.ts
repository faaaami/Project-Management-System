import type { BoardList, Note, Project, Task, Todo } from '../types'
import { boardLists } from './board'

export interface WorkspaceBackup {
  format: 'devboard-backup'
  version: 1
  projects: Project[]
  tasks: Task[]
  todos: Todo[]
  notes: Note[]
}

type RecordValue = Record<string, unknown>
const fail = (message: string): never => { throw new Error(message) }
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('The backup contains an invalid entry.')
  return value as RecordValue
}
function text(value: unknown, label: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback
  return typeof value === 'string' ? value : fail(`${label} must be text.`)
}
function id(value: unknown): string { const result = text(value, 'ID'); return result.trim() ? result : fail('An entry is missing its ID.') }
function array(value: unknown, label: string): unknown[] { return Array.isArray(value) ? value : fail(`${label} must be a list.`) }
function boolean(value: unknown, fallback = false): boolean { return value === undefined ? fallback : typeof value === 'boolean' ? value : fail('A checkbox value is invalid.') }
function choice<T extends string>(value: unknown, options: readonly T[], label: string): T {
  return options.includes(value as T) ? value as T : fail(`${label} is invalid.`)
}
function date(value: unknown): string {
  const result = text(value, 'Date', '')
  if (!result) return ''
  const parsed = new Date(`${result}T12:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(result) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === result ? result : fail('A date is invalid.')
}
function timestamp(value: unknown): string {
  const result = text(value, 'Timestamp')
  return Number.isFinite(Date.parse(result)) ? result : fail('A timestamp is invalid.')
}
function unique<T extends { id: string }>(values: T[], label: string): T[] {
  if (new Set(values.map(value => value.id)).size !== values.length) fail(`${label} contain duplicate IDs.`)
  return values
}
const statuses = ['todo', 'doing', 'review', 'done'] as const

export function parseWorkspaceBackup(value: unknown): WorkspaceBackup {
  const source = record(value)
  if (source.format !== 'devboard-backup' || source.version !== 1) fail('Choose a DevBoard workspace backup (version 1).')
  const projects = unique(array(source.projects, 'Projects').map(value => {
    const project = record(value)
    const result: Project = { id: id(project.id), name: text(project.name, 'Project name'), modules: array(project.modules, 'Modules').map(value => text(value, 'Module')) }
    if (!result.name.trim()) fail('A project is missing its name.')
    if (project.startDate !== undefined) result.startDate = date(project.startDate)
    if (project.background !== undefined) result.background = choice(project.background, ['blue', 'purple', 'green', 'rose'], 'Board background')
    if (project.lists !== undefined) {
      result.lists = unique(array(project.lists, 'Board lists').map(value => {
        const list = record(value)
        const title = text(list.title, 'List title')
        if (!title.trim()) fail('A list is missing its title.')
        return { id: id(list.id), title, status: choice(list.status, statuses, 'List status') } as BoardList
      }), 'Lists')
    }
    return result
  }), 'Projects')
  if (!projects.length) fail('The backup has no projects to restore.')
  const projectMap = new Map(projects.map(project => [project.id, project]))
  const membership = (entry: RecordValue) => {
    const projectId = id(entry.projectId)
    if (!projectMap.has(projectId)) fail('An entry belongs to a missing project.')
    return projectId
  }
  const tasks = unique(array(source.tasks, 'Tasks').map(value => {
    const task = record(value)
    const projectId = membership(task)
    const plannedDate = date(task.plannedDate)
    const plannedTime = text(task.plannedTime, 'Planned time', '')
    if (plannedTime && (!plannedDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(plannedTime))) fail('A scheduled time is invalid.')
    const listId = task.listId === undefined ? undefined : id(task.listId)
    const lists = boardLists(projectMap.get(projectId))
    if (listId && !lists.some(list => list.id === listId)) fail('A card belongs to a missing list.')
    const taskId = id(task.id)
    if (lists.some(list => list.id === taskId)) fail('A card and list have the same ID.')
    if (task.order !== undefined && (typeof task.order !== 'number' || !Number.isFinite(task.order))) fail('A card order is invalid.')
    const result: Task = {
      id: taskId, projectId, title: text(task.title, 'Card title'), description: text(task.description, 'Description', ''),
      status: choice(task.status, statuses, 'Card status'), priority: choice(task.priority, ['low', 'medium', 'high', 'urgent'], 'Priority'),
      type: choice(task.type, ['feature', 'bug', 'improvement'], 'Card type'), module: text(task.module, 'Module', ''),
      dueDate: date(task.dueDate), plannedDate, plannedTime, listId, order: task.order as number | undefined,
      archived: boolean(task.archived), cover: text(task.cover, 'Cover', ''),
      tags: array(task.tags, 'Tags').map(value => text(value, 'Tag')),
      subtasks: unique(array(task.subtasks, 'Checklist').map(value => { const item = record(value); return { id: id(item.id), text: text(item.text, 'Checklist text'), done: boolean(item.done) } }), 'Checklist items'),
      createdAt: timestamp(task.createdAt), updatedAt: timestamp(task.updatedAt),
      comments: unique(array(task.comments ?? [], 'Comments').map(value => { const comment = record(value); return { id: id(comment.id), text: text(comment.text, 'Comment'), createdAt: timestamp(comment.createdAt) } }), 'Comments'),
      attachments: unique(array(task.attachments ?? [], 'Attachments').map(value => {
        const attachment = record(value)
        const url = text(attachment.url, 'Attachment URL')
        let parsed: URL
        try { parsed = new URL(url) } catch { return fail('An attachment URL is invalid.') }
        if (!['http:', 'https:'].includes(parsed.protocol)) fail('Attachment links must use http or https.')
        return { id: id(attachment.id), name: text(attachment.name, 'Attachment name'), url: parsed.href }
      }), 'Attachments'),
    }
    if (!result.title.trim()) fail('A card is missing its title.')
    if (result.cover && !/^#[\da-f]{6}$/i.test(result.cover)) fail('A card cover color is invalid.')
    return result
  }), 'Tasks')
  const todos = unique(array(source.todos, 'To-dos').map(value => { const todo = record(value); return { id: id(todo.id), projectId: membership(todo), text: text(todo.text, 'To-do text'), done: boolean(todo.done), createdAt: timestamp(todo.createdAt) } }), 'To-dos')
  const notes = unique(array(source.notes, 'Notes').map(value => { const note = record(value); return { id: id(note.id), projectId: membership(note), title: text(note.title, 'Note title'), body: text(note.body, 'Note body'), createdAt: timestamp(note.createdAt), updatedAt: timestamp(note.updatedAt) } }), 'Notes')
  return { format: 'devboard-backup', version: 1, projects, tasks, todos, notes }
}

export function copyWorkspaceBackup(backup: WorkspaceBackup, makeId: () => string): Pick<WorkspaceBackup, 'projects' | 'tasks' | 'todos' | 'notes'> {
  const projectIds = new Map(backup.projects.map(project => [project.id, makeId()]))
  const listIds = new Map<string, Map<string, string>>()
  const projects = backup.projects.map(project => {
    const lists = boardLists(project)
    const mapping = new Map(lists.map(list => [list.id, makeId()]))
    listIds.set(project.id, mapping)
    return { ...project, id: projectIds.get(project.id)!, name: `${project.name} (restored)`, modules: [...project.modules], lists: lists.map(list => ({ ...list, id: mapping.get(list.id)! })) }
  })
  const tasks = backup.tasks.map(task => {
    const originalLists = boardLists(backup.projects.find(project => project.id === task.projectId))
    const originalList = originalLists.find(list => list.id === task.listId) ?? originalLists.find(list => list.status === task.status) ?? originalLists[0]
    return { ...task, id: makeId(), projectId: projectIds.get(task.projectId)!, listId: listIds.get(task.projectId)!.get(originalList.id)!, status: originalList.status, tags: [...task.tags], subtasks: task.subtasks.map(item => ({ ...item, id: makeId() })), comments: task.comments?.map(comment => ({ ...comment, id: makeId() })), attachments: task.attachments?.map(attachment => ({ ...attachment, id: makeId() })) }
  })
  const todos: Todo[] = backup.todos.map(todo => ({ ...todo, id: makeId(), projectId: projectIds.get(todo.projectId)! }))
  const notes: Note[] = backup.notes.map(note => ({ ...note, id: makeId(), projectId: projectIds.get(note.projectId)! }))
  return { projects, tasks, todos, notes }
}
