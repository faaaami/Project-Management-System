export const MIN_TASK_ZOOM = 60
export const MAX_TASK_ZOOM = 150
export const TASK_ZOOM_STEP = 10

export function normalizeTaskZoom(value: number): number {
  return Number.isFinite(value) ? Math.max(MIN_TASK_ZOOM, Math.min(MAX_TASK_ZOOM, Math.round(value / TASK_ZOOM_STEP) * TASK_ZOOM_STEP)) : 100
}
