export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskType = 'feature' | 'bug' | 'improvement' | 'chore'

export interface Subtask {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  module: string
  dueDate: string
  plannedDate?: string
  plannedTime?: string
  listId?: string
  order?: number
  archived?: boolean
  cover?: string
  comments?: { id: string; text: string; createdAt: string }[]
  attachments?: { id: string; name: string; url: string }[]
  tags: string[]
  subtasks: Subtask[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  modules: string[]
  startDate?: string
  lists?: BoardList[]
  background?: string
}

export interface BoardList { id: string; title: string; status: TaskStatus }

export interface Todo {
  id: string
  projectId: string
  text: string
  done: boolean
  createdAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface SubtaskInput {
  id?: string
  text: string
  done?: boolean
}
