import { useStore } from '../store'
import { useState } from 'react'
import type { Note } from '../types'

export function NotesView() {
  const notes = useStore((state) => state.notes)
  const activeProjectId = useStore((state) => state.activeProjectId)
  const addNote = useStore((state) => state.addNote)
  const updateNote = useStore((state) => state.updateNote)
  const deleteNote = useStore((state) => state.deleteNote)
  const [query, setQuery] = useState('')
  const [deleted, setDeleted] = useState<Note | null>(null)

  const projectNotes = notes.filter(n => n.projectId === activeProjectId && `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex flex-col gap-4">
      <div className="task-toolbar"><label className="search-field"><input aria-label="Search notes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your notes…" /></label><span className="result-count">Saved automatically</span></div>
      <button
        type="button"
        onClick={() => { setQuery(''); addNote() }}
        className="self-start rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        New note
      </button>
      {deleted && <div className="undo-banner" role="status">Note deleted.<button onClick={() => { useStore.setState(state => ({ notes: [...state.notes, deleted] })); setDeleted(null) }}>Undo</button><button aria-label="Dismiss notification" onClick={() => setDeleted(null)}>×</button></div>}

      {projectNotes.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800">
          {query ? 'No notes match your search.' : 'No notes yet. Capture your first idea above.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {projectNotes.map((note) => (
          <article
            key={note.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2">
              <input
                value={note.title}
                onChange={(event) =>
                  updateNote(note.id, { title: event.target.value })
                }
                aria-label="Note title"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => { setDeleted(note); deleteNote(note.id) }}
                aria-label={`Delete ${note.title}`}
                className="text-slate-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
            <textarea
              value={note.body}
              onChange={(event) =>
                updateNote(note.id, { body: event.target.value })
              }
              aria-label="Note body"
              rows={4}
              placeholder="Write something…"
              className="resize-y rounded-lg border border-slate-200 bg-transparent p-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-500 dark:border-slate-700 dark:text-slate-200"
            />
            <p className="note-updated">Edited {new Date(note.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
