import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { localDateKey } from '../lib/tasks'
import type {
  Note,
  Project,
  Subtask,
  SubtaskInput,
  Task,
  Todo,
} from '../types'
import {
  SEED_PROJECT_ID,
  seedNotes,
  seedProjects,
  seedTasks,
  seedTodos,
  uid,
} from './seed'

/** Bump when the persisted shape changes, then handle it in `migrate`. */
export const STORE_VERSION = 1
export const STORAGE_KEY = 'devboard-storage'

export type Theme = 'dark' | 'light'

type TaskPatch = Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>

export interface DevBoardState {
  /** Schema version of the persisted data. */
  version: number
  projects: Project[]
  tasks: Task[]
  todos: Todo[]
  notes: Note[]
  activeProjectId: string
  theme: Theme

  // Projects
  addProject: (name: string, modules?: string[]) => Project
  updateProject: (id: string, patch: Partial<Omit<Project, 'id'>>) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string) => void
  addModule: (projectId: string, module: string) => void

  // Tasks
  addTask: (input: Partial<Task> & { title: string }) => Task
  updateTask: (id: string, patch: TaskPatch) => void
  deleteTask: (id: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  setSubtasks: (taskId: string, subtasks: SubtaskInput[]) => void

  // Todos
  addTodo: (text: string) => Todo
  updateTodo: (id: string, patch: Partial<Omit<Todo, 'id'>>) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void

  // Notes
  addNote: (input?: Partial<Note>) => Note
  updateNote: (id: string, patch: Partial<Omit<Note, 'id'>>) => void
  deleteNote: (id: string) => void

  // UI
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  resetToSeed: () => void
}

const seedState = () => ({
  version: STORE_VERSION,
  projects: seedProjects,
  tasks: seedTasks,
  todos: seedTodos,
  notes: seedNotes,
  activeProjectId: SEED_PROJECT_ID,
  theme: 'dark' as Theme,
})

const normalizeSubtasks = (subtasks: SubtaskInput[]): Subtask[] =>
  subtasks.map((s) => ({
    id: s.id ?? uid(),
    text: s.text,
    done: s.done ?? false,
  }))

export const useStore = create<DevBoardState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      // ---------------------------------------------------------------- Projects
      addProject: (name, modules = []) => {
        const project: Project = {
          id: uid(),
          name: name.trim() || 'Untitled Project',
          modules: [...modules],
          startDate: localDateKey(),
        }
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        }))
        return project
      },

      updateProject: (id, patch) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),

      deleteProject: (id) =>
        set((state) => {
          const projects = state.projects.filter((p) => p.id !== id)
          const activeProjectId =
            state.activeProjectId === id
              ? (projects[0]?.id ?? '')
              : state.activeProjectId
          return {
            projects,
            activeProjectId,
            tasks: state.tasks.filter((t) => t.projectId !== id),
            todos: state.todos.filter((t) => t.projectId !== id),
            notes: state.notes.filter((n) => n.projectId !== id),
          }
        }),

      setActiveProject: (id) => set({ activeProjectId: id }),

      addModule: (projectId, module) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && !p.modules.includes(module)
              ? { ...p, modules: [...p.modules, module] }
              : p,
          ),
        })),

      // ------------------------------------------------------------------- Tasks
      addTask: (input) => {
        const timestamp = new Date().toISOString()
        const task: Task = {
          id: uid(),
          projectId: input.projectId ?? get().activeProjectId,
          title: input.title.trim() || 'Untitled Task',
          description: input.description ?? '',
          status: input.status ?? 'todo',
          priority: input.priority ?? 'medium',
          type: input.type ?? 'feature',
          module: input.module ?? '',
          dueDate: input.dueDate ?? '',
          plannedDate: input.plannedDate ?? '',
          plannedTime: input.plannedDate ? input.plannedTime ?? '' : '',
          tags: input.tags ?? [],
          subtasks: input.subtasks ?? [],
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        set((state) => ({ tasks: [task, ...state.tasks] }))
        return task
      },

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, ...patch, updatedAt: new Date().toISOString() }
              : t,
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      toggleSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, done: !s.done } : s,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        })),

      setSubtasks: (taskId, subtasks) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: normalizeSubtasks(subtasks),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        })),

      // ------------------------------------------------------------------- Todos
      addTodo: (text) => {
        const todo: Todo = {
          id: uid(),
          projectId: get().activeProjectId,
          text: text.trim() || 'Untitled',
          done: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ todos: [todo, ...state.todos] }))
        return todo
      },

      updateTodo: (id, patch) =>
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      toggleTodo: (id) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t,
          ),
        })),

      deleteTodo: (id) =>
        set((state) => ({ todos: state.todos.filter((t) => t.id !== id) })),

      // ------------------------------------------------------------------- Notes
      addNote: (input) => {
        const timestamp = new Date().toISOString()
        const note: Note = {
          id: uid(),
          projectId: input?.projectId ?? get().activeProjectId,
          title: input?.title ?? 'New note',
          body: input?.body ?? '',
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        set((state) => ({ notes: [note, ...state.notes] }))
        return note
      },

      updateNote: (id, patch) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id
              ? { ...n, ...patch, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),

      deleteNote: (id) =>
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

      // ---------------------------------------------------------------------- UI
      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      resetToSeed: () => set({ ...seedState() }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        version: state.version,
        projects: state.projects,
        tasks: state.tasks,
        todos: state.todos,
        notes: state.notes,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
      }),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<DevBoardState>
        if (version !== STORE_VERSION) {
          // Future schema changes go here. For now, fall back to seed data so
          // the app never boots with an incompatible shape.
          return { ...seedState(), ...state, version: STORE_VERSION }
        }
        return state as DevBoardState
      },
    },
  ),
)

/** Convenience selectors. */
export const selectActiveProject = (state: DevBoardState): Project | undefined =>
  state.projects.find((p) => p.id === state.activeProjectId)

export const selectActiveTasks = (state: DevBoardState): Task[] =>
  state.tasks.filter((t) => t.projectId === state.activeProjectId)
