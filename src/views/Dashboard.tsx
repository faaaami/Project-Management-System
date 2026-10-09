import { useStore } from '../store'
import { STATUS_LABEL, STATUS_ORDER, PRIORITY_LABEL } from '../lib/ui'
import { Icon } from '../components/Icon'

export function Dashboard() {
  const projects = useStore(state => state.projects)
  const allTasks = useStore(state => state.tasks)
  const activeProjectId = useStore(state => state.activeProjectId)
  const project = projects.find(p => p.id === activeProjectId)
  const tasks = allTasks.filter(t => t.projectId === activeProjectId)
  const completed = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done')
  const upcoming = tasks.filter(t => t.status !== 'done' && t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5)
  const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })

  return <div className="dashboard-content">
    <div className="stat-grid">{STATUS_ORDER.map((status, index) => {
      const count = tasks.filter(t => t.status === status).length
      return <section key={status} className={`stat-card stat-${status}`}><div className="stat-top"><span>{STATUS_LABEL[status]}</span><span className="stat-icon"><Icon name={['todos', 'clock', 'tasks', 'check'][index]} size={18} /></span></div><strong>{count.toString().padStart(2, '0')}</strong><p>{['Ready to get started', 'Work currently underway', 'Waiting for a final look', 'Successfully completed'][index]}</p></section>
    })}</div>
    <section className="progress-panel"><div><p className="eyebrow">PROJECT PROGRESS</p><h2>Every step counts.</h2><p>{completed} of {tasks.length} tasks completed</p></div><div className="progress-summary"><div><span>Completion</span><strong>{progress}%</strong></div><progress value={progress} max={100} aria-label="Project completion" /><p>{tasks.length - completed} tasks remaining</p></div></section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Upcoming deadlines</h2><p>Your next priorities, in order.</p></div><span className="count-badge">{upcoming.length} scheduled</span></div>{upcoming.length === 0 ? <div className="empty-state"><Icon name="check" size={28} /><h3>Room to plan ahead</h3><p>Add a due date to a task to see it here.</p></div> : <ul className="deadline-list">{upcoming.map(task => <li key={task.id}><span className={`deadline-marker ${task.priority === 'urgent' ? 'urgent' : ''}`}><Icon name="clock" size={18} /></span><div><strong>{task.title}</strong><p>{task.module || 'General'} <span>·</span> {STATUS_LABEL[task.status]}</p></div><div className="deadline-meta"><time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time><span className={`priority-text ${task.priority === 'urgent' ? 'urgent' : ''}`}>{PRIORITY_LABEL[task.priority]}</span></div></li>)}</ul>}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Module overview</h2><p>How work is distributed.</p></div><Icon name="dashboard" size={18} /></div><div className="module-list">{(project?.modules ?? []).map(module => {
      const moduleTasks = tasks.filter(t => t.module === module)
      const done = moduleTasks.filter(t => t.status === 'done').length
      return <div className="module-row" key={module}><span>{module}</span><div className="module-track"><span style={{ width: `${moduleTasks.length ? done / moduleTasks.length * 100 : 0}%` }} /></div><span className="module-count">{moduleTasks.length} {moduleTasks.length === 1 ? 'task' : 'tasks'}</span></div>
    })}{!project?.modules.length && <p className="muted">Tasks in this project appear on your task board.</p>}</div>{urgent.length > 0 && <div className="attention-banner"><span className="tip-dot" /><span><strong>{urgent.length} urgent {urgent.length === 1 ? 'task needs' : 'tasks need'} attention</strong><p>Prioritize these to keep your project on track.</p></span></div>}</section></div>
  </div>
}
