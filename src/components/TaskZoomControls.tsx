import { useStore } from '../store'
import { MAX_TASK_ZOOM, MIN_TASK_ZOOM, TASK_ZOOM_STEP, normalizeTaskZoom } from '../lib/zoom'
import { Icon } from './Icon'

export function TaskZoomControls() {
  const zoom = useStore(state => normalizeTaskZoom(state.taskZoom))
  const setZoom = useStore(state => state.setTaskZoom)
  return <div className="task-zoom-controls" role="group" aria-label="Task zoom">
    <span className="task-zoom-label">Zoom</span>
    <button type="button" aria-label="Zoom out tasks" title="Zoom out" disabled={zoom <= MIN_TASK_ZOOM} onClick={() => setZoom(zoom - TASK_ZOOM_STEP)}><Icon name="minus" size={16} /></button>
    <output aria-live="polite" aria-label="Task zoom level">{zoom}%</output>
    <button type="button" aria-label="Zoom in tasks" title="Zoom in" disabled={zoom >= MAX_TASK_ZOOM} onClick={() => setZoom(zoom + TASK_ZOOM_STEP)}><Icon name="plus" size={16} /></button>
    <button type="button" className="task-zoom-reset" disabled={zoom === 100} onClick={() => setZoom(100)} title="Reset zoom to 100%">Reset</button>
  </div>
}
