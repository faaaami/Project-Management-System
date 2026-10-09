export interface Point { x: number; y: number }
export const CANVAS_PADDING = 32
export const MIN_CANVAS_SCALE = .25
export const MAX_CANVAS_SCALE = 2

export const clampCanvasScale = (value: number): number => Number.isFinite(value) ? Math.max(MIN_CANVAS_SCALE, Math.min(MAX_CANVAS_SCALE, value)) : 1

// Keep the same world position beneath the pointer when the camera zoom changes.
export function zoomScroll(scroll: Point, anchor: Point, from: number, to: number, origin: Point = { x: CANVAS_PADDING, y: CANVAS_PADDING }): Point {
  return {
    x: (scroll.x + anchor.x - origin.x) / from * to + origin.x - anchor.x,
    y: (scroll.y + anchor.y - origin.y) / from * to + origin.y - anchor.y,
  }
}

export function fitCanvasScale(viewport: { width: number; height: number }, world: { width: number; height: number }): number {
  if (!world.width || !world.height) return 1
  return clampCanvasScale(Math.min((viewport.width - CANVAS_PADDING * 2) / world.width, (viewport.height - CANVAS_PADDING * 2) / world.height, 1))
}

export function canvasTranslation(translation: Point, scale: number): Point {
  return { x: translation.x / scale, y: translation.y / scale }
}
