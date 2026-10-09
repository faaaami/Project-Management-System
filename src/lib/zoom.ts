export const MIN_TASK_ZOOM = 25
export const MAX_TASK_ZOOM = 200
export const TASK_ZOOM_STEP = 10
export const MIN_BOARD_SIZE = 50
export const MAX_BOARD_SIZE = 150
export const BOARD_SIZE_STEP = 25

export function normalizeBoardSize(value: number): number {
  return Number.isFinite(value) ? Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_SIZE, Math.round(value))) : 100
}

export function normalizeTaskZoom(value: number): number {
  return Number.isFinite(value) ? Math.max(MIN_TASK_ZOOM, Math.min(MAX_TASK_ZOOM, Math.round(value))) : 100
}
