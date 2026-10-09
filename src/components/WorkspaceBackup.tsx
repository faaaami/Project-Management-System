import { useState } from 'react'
import { useStore } from '../store'
import { localDateKey } from '../lib/tasks'
import { parseWorkspaceBackup } from '../lib/backup'
import type { WorkspaceBackup as Backup } from '../lib/backup'
import { Modal } from './Modal'

export function WorkspaceBackup({ onClose }: { onClose: () => void }) {
  const [backup, setBackup] = useState<Backup | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [restoredId, setRestoredId] = useState('')
  const [loading, setLoading] = useState(false)
  const exportWorkspace = () => {
    const { projects, tasks, todos, notes } = useStore.getState()
    const blob = new Blob([JSON.stringify({ format: 'devboard-backup', version: 1, exportedAt: new Date().toISOString(), projects, tasks, todos, notes }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `devboard-backup-${localDateKey()}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setFeedback('Workspace backup downloaded.')
  }
  return <Modal title="Workspace backup" subtitle="Take your boards with you or restore a saved copy." onClose={onClose}>
    <div className="modal-body form-stack">
      <section className="backup-panel"><h3>Download your workspace</h3><p>Save every project, card, checklist, note, and to-do in a JSON file.</p><button type="button" className="secondary-action" onClick={exportWorkspace}>Download backup</button></section>
      <section className="backup-panel"><h3>Restore a backup</h3><p>Restored projects appear as new boards. Your current work stays in place.</p><label>Choose a backup file<input type="file" accept=".json,application/json" disabled={loading} onChange={async event => {
        const file = event.target.files?.[0]
        setBackup(null); setError(''); setFeedback(''); setRestoredId('')
        if (!file) return
        if (file.size > 10 * 1024 * 1024) { setError('Choose a backup smaller than 10 MB.'); return }
        setLoading(true)
        try { setBackup(parseWorkspaceBackup(JSON.parse(await file.text()))) }
        catch (error) { setError(error instanceof SyntaxError ? 'This file is not valid JSON.' : error instanceof Error ? error.message : 'Unable to read this backup.') }
        finally { setLoading(false) }
      }} /></label>
      {loading && <p role="status">Reading backup…</p>}
      {backup && <div className="backup-preview"><strong>Ready to restore</strong><p>{backup.projects.length} projects · {backup.tasks.length} cards · {backup.todos.length} to-dos · {backup.notes.length} notes</p><button type="button" className="primary-action" onClick={() => {
        try { const projects = useStore.getState().restoreWorkspace(backup); setRestoredId(projects[0].id); setFeedback(`Restored ${projects.length} project${projects.length === 1 ? '' : 's'} as new boards.`); setBackup(null) }
        catch (error) { setError(error instanceof Error ? error.message : 'Unable to restore this backup.') }
      }}>Restore as new boards</button></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      </section>
      <p role="status" className="backup-feedback">{feedback}</p>
      {restoredId && <button type="button" className="primary-action" onClick={() => { useStore.getState().setActiveProject(restoredId); onClose() }}>Open restored board</button>}
    </div><div className="modal-footer"><button type="button" className="secondary-action" onClick={onClose}>Close</button></div>
  </Modal>
}
