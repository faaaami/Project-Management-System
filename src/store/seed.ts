import type { Note, Project, Task, Todo } from '../types'

/** Stable-ish unique id generator (crypto.randomUUID in modern browsers). */
export const uid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const now = () => new Date().toISOString()

export const SEED_PROJECT_ID = 'project-erp'

export const seedProjects: Project[] = [
  {
    id: SEED_PROJECT_ID,
    name: 'My board',
    modules: [],
  },
]

const projectId = SEED_PROJECT_ID

// Original samples identify untouched demo cards during the one-time upgrade.
export const legacySampleTasks: Task[] = [
  {
    id: 'task-seed-1',
    projectId,
    title: 'Implement JWT refresh flow',
    description: 'Rotate refresh tokens and revoke on logout.',
    status: 'doing',
    priority: 'high',
    type: 'feature',
    module: 'Auth',
    dueDate: '2026-10-20',
    tags: ['security', 'backend'],
    subtasks: [
      { id: 'sub-seed-1a', text: 'Add /refresh endpoint', done: true },
      { id: 'sub-seed-1b', text: 'Store refresh token hash', done: false },
    ],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'task-seed-2',
    projectId,
    title: 'Fix negative stock on returns',
    description: 'Inventory quantity can go below zero when a return is processed twice.',
    status: 'todo',
    priority: 'urgent',
    type: 'bug',
    module: 'Inventory',
    dueDate: '2026-10-15',
    tags: ['inventory'],
    subtasks: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'task-seed-3',
    projectId,
    title: 'Purchase order approval workflow',
    description: 'Two-step approval with thresholds by amount.',
    status: 'review',
    priority: 'medium',
    type: 'feature',
    module: 'Purchase',
    dueDate: '2026-11-01',
    tags: ['workflow'],
    subtasks: [
      { id: 'sub-seed-3a', text: 'Manager approval step', done: true },
      { id: 'sub-seed-3b', text: 'Finance approval step', done: true },
      { id: 'sub-seed-3c', text: 'Email notifications', done: false },
    ],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'task-seed-4',
    projectId,
    title: 'Upgrade shared UI table component',
    description: 'Consolidate the three table implementations into one reusable component.',
    status: 'done',
    priority: 'low',
    type: 'improvement',
    module: 'Reports',
    dueDate: '2026-10-05',
    tags: ['frontend', 'refactor'],
    subtasks: [],
    createdAt: now(),
    updatedAt: now(),
  },
]

export const seedTasks: Task[] = []
export const seedTodos: Todo[] = []
export const seedNotes: Note[] = []

export function removeUntouchedSampleCards(tasks: Task[]): Task[] {
  const contentFields = ['projectId', 'title', 'description', 'status', 'priority', 'type', 'module', 'dueDate', 'tags', 'subtasks'] as const
  return tasks.filter(task => {
    const sample = legacySampleTasks.find(sample => sample.id === task.id)
    if (!sample) return true
    // Keep samples the user has repurposed, moved, scheduled, or annotated.
    if (task.plannedDate || task.plannedTime || task.cover || task.archived || task.comments?.length || task.attachments?.length) return true
    if (task.listId && task.listId !== sample.status) return true
    return contentFields.some(field => JSON.stringify(task[field]) !== JSON.stringify(sample[field]))
  })
}
