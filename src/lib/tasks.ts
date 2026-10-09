import type { Task } from '../types'

export interface TaskFilters { query: string; priority: string; module: string; deadline: string; sort: string }
export type TaskScope = 'today' | 'week' | 'backlog' | 'all'
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return localDateKey(value)
}
export function scopeTasks(tasks: Task[], scope: TaskScope, today: string, startDate: string, week: number, showCompleted: boolean): Task[] {
  const from = addDays(startDate, (week - 1) * 7)
  const to = addDays(from, 7)
  return tasks.filter(task => (showCompleted || task.status !== 'done') &&
    (scope === 'all' || (scope === 'backlog' ? !task.plannedDate : scope === 'today' ? task.plannedDate === today : !!task.plannedDate && task.plannedDate >= from && task.plannedDate < to)))
}
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function filterTasks(tasks: Task[], filters: TaskFilters, today = localDateKey()): Task[] {
  const query = filters.query.trim().toLowerCase()
  const priorities = { urgent: 0, high: 1, medium: 2, low: 3 }
  return tasks.filter(task =>
    (!query || [task.title, task.description, task.module, ...task.tags].join(' ').toLowerCase().includes(query)) &&
    (!filters.priority || task.priority === filters.priority) &&
    (!filters.module || task.module === filters.module) &&
    (!filters.deadline || (task.status !== 'done' && task.dueDate && (filters.deadline === 'overdue' ? task.dueDate < today : task.dueDate === today))),
  ).sort((a, b) => filters.sort === 'priority' ? priorities[a.priority] - priorities[b.priority] : filters.sort === 'due' ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : filters.sort === 'title' ? a.title.localeCompare(b.title) : b.createdAt.localeCompare(a.createdAt))
}
