export const MIN_TASK_ZOOM = 25
export const MAX_TASK_ZOOM = 200
export const TASK_ZOOM_STEP = 10

export function normalizeTaskZoom(value: number): number {
  return Number.isFinite(value) ? Math.max(MIN_TASK_ZOOM, Math.min(MAX_TASK_ZOOM, Math.round(value))) : 100
}
