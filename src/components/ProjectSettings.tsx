import { useState } from 'react'
import { useStore } from '../store'
import { Modal } from './Modal'

export function ProjectSettings({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const project = store.projects.find(p => p.id === store.activeProjectId)
  const [name, setName] = useState(project?.name ?? '')
  const [modules, setModules] = useState(project?.modules ?? [])
  const [module, setModule] = useState('')
  const [feedback, setFeedback] = useState('')
  if (!project) return null
  const exportWorkspace = () => {
    const { projects, tasks, todos, notes } = useStore.getState()
    const blob = new Blob([JSON.stringify({ format: 'devboard-backup', version: 1, exportedAt: new Date().toISOString(), projects, tasks, todos, notes }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `devboard-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setFeedback('Workspace backup downloaded.')
  }
  const addModule = () => { const next = module.trim(); if (next && !modules.includes(next)) setModules([...modules, next]); setModule('') }
  return <Modal title="Project settings" subtitle="Organize your project and keep a copy of your work." onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; store.updateProject(project.id, { name: name.trim(), modules }); onClose() }}><div className="modal-body form-stack"><label>Project name<input autoFocus required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><div><h3>Modules</h3><p className="field-help">Group tasks by area, such as Design, API, or Testing.</p><div className="module-chips">{modules.map(item => <span key={item}>{item}<button type="button" aria-label={`Remove ${item} module`} onClick={() => setModules(modules.filter(m => m !== item))}>×</button></span>)}</div><div className="inline-entry"><input aria-label="New module name" value={module} onChange={e => setModule(e.target.value)} placeholder="New module name" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModule() } }} /><button type="button" className="secondary-action" disabled={!module.trim()} onClick={addModule}>Add module</button></div><p className="field-help">Removing a module keeps its existing tasks.</p></div><div className="backup-panel"><h3>Keep a backup</h3><p>Your work is saved in this browser. Download all projects, tasks, notes, and to-dos as JSON.</p><button type="button" className="secondary-action" onClick={exportWorkspace}>Export workspace</button><p role="status">{feedback}</p></div></div><div className="modal-footer"><button type="button" className="secondary-action" onClick={onClose}>Cancel</button><button type="submit" className="primary-action" disabled={!name.trim()}>Save project</button></div></form></Modal>
}
