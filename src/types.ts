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
}

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
