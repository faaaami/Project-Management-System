import type { Note, Project, Task, Todo } from '../types'

/** Stable-ish unique id generator (crypto.randomUUID in modern browsers). */
export const uid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const now = () => new Date().toISOString()

const ERP_MODULES = [
  'Auth',
  'Inventory',
  'Sales',
  'Purchase',
  'Accounts',
  'HR',
  'Reports',
  'Infra',
]

export const SEED_PROJECT_ID = 'project-erp'

export const seedProjects: Project[] = [
  {
    id: SEED_PROJECT_ID,
    name: 'ERP Project',
    modules: ERP_MODULES,
  },
]

const projectId = SEED_PROJECT_ID

export const seedTasks: Task[] = [
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

export const seedTodos: Todo[] = [
  {
    id: 'todo-seed-1',
    projectId,
    text: 'Review PR for inventory fix',
    done: false,
    createdAt: now(),
  },
  {
    id: 'todo-seed-2',
    projectId,
    text: 'Write release notes for v0.3',
    done: false,
    createdAt: now(),
  },
]

export const seedNotes: Note[] = [
  {
    id: 'note-seed-1',
    projectId,
    title: 'Architecture',
    body: 'Monorepo with a NestJS API and a React admin. Postgres + Prisma. Redis for queues.',
    createdAt: now(),
    updatedAt: now(),
  },
]
