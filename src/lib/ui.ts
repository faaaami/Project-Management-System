import type { TaskPriority, TaskStatus, TaskType } from '../types'

export const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'review', 'done']

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To Do',
  doing: 'Doing',
  review: 'Review',
  done: 'Done',
}

export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: 'bg-slate-400',
  doing: 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  medium: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  high: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  urgent: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

export const TYPE_LABEL: Record<TaskType, string> = {
  feature: 'Feature',
  bug: 'Bug',
  improvement: 'Improvement',
  chore: 'Chore',
}

export const TYPE_CLASS: Record<TaskType, string> = {
  feature: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  bug: 'bg-red-500/15 text-red-700 dark:text-red-300',
  improvement: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  chore: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
}
