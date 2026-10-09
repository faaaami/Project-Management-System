import { useStore } from '../store'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from './Icon'
import { Select } from './Select'
import { ProjectSettings } from './ProjectSettings'

export function ProjectSwitcher() {
  const projects = useStore((state) => state.projects)
  const activeProjectId = useStore((state) => state.activeProjectId)
  const setActiveProject = useStore((state) => state.setActiveProject)
  const addProject = useStore((state) => state.addProject)

  const id = useId()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [settings, setSettings] = useState(false)
  const handleNew = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    addProject(name.trim())
    setName('')
    setCreating(false)
  }

  return (
    <div className="project-picker">
      <label className="nav-caption" htmlFor={id}>
        Active project
      </label>
      <div className="flex items-center gap-2">
      <Select
        id={id}
        value={activeProjectId}
        onChange={setActiveProject}
        label="Switch project"
        disabled={!projects.length}
        options={projects.map(project => ({ value: project.id, label: project.name, description: `${project.modules.length} modules`, color: '#8173e1' }))}
      />
      <button
        type="button"
        onClick={() => setCreating(!creating)}
        aria-expanded={creating}
        title="New project"
        aria-label="New project"
        className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Icon name="plus" size={18} />
      </button>
      </div>
      {!!activeProjectId && <button type="button" className="project-settings-link" onClick={() => setSettings(true)}>Manage project <span>↗</span></button>}
      {settings && <ProjectSettings key={activeProjectId} onClose={() => setSettings(false)} />}
      {creating && <form onSubmit={handleNew} className="project-create"><label htmlFor={`${id}-name`}>Project name</label><input autoFocus id={`${id}-name`} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Website redesign" required maxLength={80} /><div><button type="button" onClick={() => setCreating(false)}>Cancel</button><button type="submit" className="primary-action" disabled={!name.trim()}>Create</button></div></form>}
    </div>
  )
}
