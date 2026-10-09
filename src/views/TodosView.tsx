import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../store'
import type { Todo } from '../types'

export function TodosView() {
  const todos = useStore((state) => state.todos)
  const activeProjectId = useStore((state) => state.activeProjectId)
  const addTodo = useStore((state) => state.addTodo)
  const toggleTodo = useStore((state) => state.toggleTodo)
  const deleteTodo = useStore((state) => state.deleteTodo)
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('all')
  const [deleted, setDeleted] = useState<Todo | null>(null)

  const projectTodos = todos.filter((t) => t.projectId === activeProjectId)
  const completed = projectTodos.filter(todo => todo.done).length
  const visible = projectTodos.filter(todo => filter === 'all' || (filter === 'done' ? todo.done : !todo.done))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    addTodo(text)
    setText('')
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="entry-form flex gap-2">
        <label className="sr-only" htmlFor="new-todo">To-do description</label>
        <input
          id="new-todo"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a quick to-do…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Add
        </button>
      </form>

      <div className="todo-summary"><div className="view-toggle">{[['all', 'All'], ['open', 'Active'], ['done', 'Completed']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><span>{completed} of {projectTodos.length} completed</span></div>
      <progress className="todo-progress" aria-label="To-do completion" value={completed} max={projectTodos.length || 1} />
      {deleted && <div className="undo-banner" role="status">To-do deleted.<button onClick={() => { useStore.setState(state => ({ todos: [...state.todos, deleted] })); setDeleted(null) }}>Undo</button><button aria-label="Dismiss notification" onClick={() => setDeleted(null)}>×</button></div>}
      <ul className="flex flex-col gap-1">
        {visible.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800">
            {projectTodos.length ? 'No to-dos in this view.' : 'No to-dos yet. Add a small step above.'}
          </li>
        )}
        {visible.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
              aria-label={todo.text}
              className="size-4 accent-violet-600"
            />
            <span
              className={`flex-1 text-sm ${
                todo.done
                  ? 'text-slate-400 line-through'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {todo.text}
            </span>
            <button
              type="button"
              onClick={() => { setDeleted(todo); deleteTodo(todo.id) }}
              aria-label={`Delete ${todo.text}`}
              className="text-slate-400 hover:text-red-500"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
