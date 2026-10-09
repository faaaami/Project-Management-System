import type { BoardList, Project, Task } from '../types'
export const DEFAULT_LISTS: BoardList[] = [
  { id: 'todo', title: 'To do', status: 'todo' },
  { id: 'doing', title: 'In progress', status: 'doing' },
  { id: 'review', title: 'Review', status: 'review' },
  { id: 'done', title: 'Done', status: 'done' },
]
export const boardLists = (project?: Project): BoardList[] => project?.lists?.length ? project.lists : DEFAULT_LISTS
export function taskListId(task: Task, lists: BoardList[]): string {
  return lists.find(list => list.id === task.listId)?.id ?? lists.find(list => list.status === task.status)?.id ?? lists[0].id
}
export function orderedCards(tasks: Task[]): Task[] { return [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.createdAt.localeCompare(a.createdAt)) }
export function moveCard(tasks: Task[], id: string, destination: BoardList, lists: BoardList[], beforeId?: string, placement: 'before' | 'after' = 'before'): Task[] {
  const moving = tasks.find(task => task.id === id)
  if (!moving) return tasks
  const target = orderedCards(tasks.filter(task => task.id !== id && task.projectId === moving.projectId && !task.archived && taskListId(task, lists) === destination.id))
  const index = beforeId ? target.findIndex(task => task.id === beforeId) : -1
  target.splice(index < 0 ? target.length : index + (placement === 'after' ? 1 : 0), 0, moving)
  const positions = new Map(target.map((task, order) => [task.id, order]))
  return tasks.map(task => task.id === id ? { ...task, listId: destination.id, status: destination.status, order: positions.get(id), updatedAt: new Date().toISOString() } : positions.has(task.id) ? { ...task, order: positions.get(task.id) } : task)
}
export function nextCardOrder(tasks: Task[], projectId: string, listId: string, lists: BoardList[]): number {
  const cards = tasks.filter(task => task.projectId === projectId && !task.archived && taskListId(task, lists) === listId)
  return cards.length ? cards.reduce((highest, task) => Math.max(highest, task.order ?? 0), -Infinity) + 1 : 0
}
export function labelColor(label: string): string { const colors = ['#216e4e', '#974f0c', '#ae2a19', '#5e4db2', '#0055cc', '#206a83']; let hash = 0; for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) | 0; return colors[Math.abs(hash) % colors.length] }
