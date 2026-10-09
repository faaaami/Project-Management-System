import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentProps, PointerEvent, ReactNode } from 'react'
import { DndContext } from '@dnd-kit/core'
import { CANVAS_PADDING, MAX_CANVAS_SCALE, MIN_CANVAS_SCALE, clampCanvasScale, fitCanvasScale, zoomScroll } from '../lib/canvas'
import type { Point } from '../lib/canvas'
import { Icon } from './Icon'
import { CanvasScale, useCanvasScale } from '../hooks/useCanvasScale'

// Sortable translations are local CSS pixels; their parent canvas scales them.
export function CanvasDndContext(props: ComponentProps<typeof DndContext>) {
  const scale = useCanvasScale()
  const measure = useCallback((node: HTMLElement) => {
    const rect = node.getBoundingClientRect()
    const transform = getComputedStyle(node).transform
    const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform)
    const x = (matrix?.m41 ?? 0) * scale
    const y = (matrix?.m42 ?? 0) * scale
    return { width: rect.width, height: rect.height, left: rect.left - x, right: rect.right - x, top: rect.top - y, bottom: rect.bottom - y }
  }, [scale])
  return <DndContext {...props} autoScroll={false} measuring={{ draggable: { measure }, droppable: { measure } }} />
}

function isBackground(target: EventTarget | null): boolean {
  return target instanceof Element && !target.closest('.trello-list, .add-list-panel, button, input, textarea, a, dialog')
}

export function BoardCanvas({ children, zoom, onZoomChange, disabled = false }: { children: ReactNode; zoom: number; onZoomChange: (percent: number) => void; disabled?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const [scale, setScale] = useState(() => clampCanvasScale(zoom))
  const scaleRef = useRef(scale)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const origin = useRef<Point>({ x: CANVAS_PADDING, y: CANVAS_PADDING })
  const [panning, setPanning] = useState(false)
  const desiredScroll = useRef<Point | null>(null)
  const wheelSave = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const pan = useRef<{ point: Point; scroll: Point } | null>(null)
  const pinch = useRef<{ distance: number; scale: number; world: Point } | null>(null)
  const dragPointer = useRef<Point | null>(null)
  const commit = useRef(onZoomChange)
  useLayoutEffect(() => { commit.current = onZoomChange }, [onZoomChange])

  const applyScale = useCallback((value: number, anchor?: Point) => {
    const node = viewport.current
    const next = clampCanvasScale(value)
    if (!node || Math.abs(next - scaleRef.current) < .0001) return
    const point = anchor ?? { x: node.clientWidth / 2, y: node.clientHeight / 2 }
    desiredScroll.current = zoomScroll({ x: node.scrollLeft, y: node.scrollTop }, point, scaleRef.current, next, origin.current)
    scaleRef.current = next
    setScale(next)
  }, [])

  useLayoutEffect(() => {
    if (desiredScroll.current && viewport.current) {
      viewport.current.scrollLeft = desiredScroll.current.x
      viewport.current.scrollTop = desiredScroll.current.y
      desiredScroll.current = null
    }
  }, [scale, size])

  useLayoutEffect(() => {
    const next = { x: viewportSize.width + CANVAS_PADDING, y: viewportSize.height + CANVAS_PADDING }
    if (viewport.current) {
      viewport.current.scrollLeft += next.x - origin.current.x
      viewport.current.scrollTop += next.y - origin.current.y
    }
    origin.current = next
  }, [viewportSize])

  useLayoutEffect(() => { applyScale(zoom) }, [zoom, applyScale])

  useLayoutEffect(() => {
    const node = world.current
    if (!node) return
    const resize = () => {
      setSize({ width: node.offsetWidth, height: node.offsetHeight })
      if (viewport.current) setViewportSize({ width: viewport.current.clientWidth, height: viewport.current.clientHeight })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(node)
    if (viewport.current) observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const wheel = (event: WheelEvent) => {
      if (!isBackground(event.target) && !event.ctrlKey && !event.metaKey) return
      if ((event.target as Element).closest('input, textarea, select, dialog')) return
      event.preventDefault()
      if (disabled) return
      const rect = node.getBoundingClientRect()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1)
      applyScale(scaleRef.current * Math.exp(-Math.max(-240, Math.min(240, delta)) * .002), { x: event.clientX - rect.left, y: event.clientY - rect.top })
      if (wheelSave.current) clearTimeout(wheelSave.current)
      wheelSave.current = setTimeout(() => { commit.current(scaleRef.current * 100); wheelSave.current = null }, 180)
    }
    const touch = (event: TouchEvent) => { if (!disabled && isBackground(event.target)) event.preventDefault() }
    node.addEventListener('wheel', wheel, { passive: false })
    node.addEventListener('touchstart', touch, { passive: false })
    return () => {
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('touchstart', touch)
      if (wheelSave.current) { clearTimeout(wheelSave.current); wheelSave.current = null; commit.current(scaleRef.current * 100) }
    }
  }, [applyScale, disabled])

  // Limit drag-edge scrolling to real board content, rather than its blank buffer.
  useEffect(() => {
    if (!disabled) return
    let frame = 0
    const track = (event: globalThis.PointerEvent) => { dragPointer.current = { x: event.clientX, y: event.clientY } }
    const tick = () => {
      const node = viewport.current
      const point = dragPointer.current
      if (node && point) {
        const rect = node.getBoundingClientRect()
        const edge = 60
        if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
          const x = point.x - rect.left
          const y = point.y - rect.top
          const dx = x < edge ? -(edge - x) / 5 : x > node.clientWidth - edge ? (x - node.clientWidth + edge) / 5 : 0
          const dy = y < edge ? -(edge - y) / 5 : y > node.clientHeight - edge ? (y - node.clientHeight + edge) / 5 : 0
          const minX = origin.current.x - CANVAS_PADDING
          const minY = origin.current.y - CANVAS_PADDING
          const maxX = Math.max(minX, origin.current.x + size.width * scaleRef.current + CANVAS_PADDING - node.clientWidth)
          const maxY = Math.max(minY, origin.current.y + size.height * scaleRef.current + CANVAS_PADDING - node.clientHeight)
          if (dx) node.scrollLeft = Math.max(minX, Math.min(maxX, node.scrollLeft + dx))
          if (dy) node.scrollTop = Math.max(minY, Math.min(maxY, node.scrollTop + dy))
        }
      }
      frame = requestAnimationFrame(tick)
    }
    document.addEventListener('pointermove', track)
    frame = requestAnimationFrame(tick)
    return () => { document.removeEventListener('pointermove', track); cancelAnimationFrame(frame) }
  }, [disabled, size])

  const pointerPoint = (event: PointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0) || !isBackground(event.target)) return
    const node = event.currentTarget
    const point = pointerPoint(event)
    pointers.current.set(event.pointerId, point)
    node.setPointerCapture(event.pointerId)
    if (pointers.current.size === 1) pan.current = { point, scroll: { x: node.scrollLeft, y: node.scrollTop } }
    else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      pinch.current = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: scaleRef.current, world: { x: (node.scrollLeft + center.x - origin.current.x) / scaleRef.current, y: (node.scrollTop + center.y - origin.current.y) / scaleRef.current } }
    }
    setPanning(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    dragPointer.current = { x: event.clientX, y: event.clientY }
    if (!pointers.current.has(event.pointerId)) return
    const node = event.currentTarget
    const point = pointerPoint(event)
    pointers.current.set(event.pointerId, point)
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const next = clampCanvasScale(pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance)
      desiredScroll.current = { x: pinch.current.world.x * next + origin.current.x - center.x, y: pinch.current.world.y * next + origin.current.y - center.y }
      if (Math.abs(next - scaleRef.current) < .0001) { node.scrollLeft = desiredScroll.current.x; node.scrollTop = desiredScroll.current.y; desiredScroll.current = null }
      scaleRef.current = next
      setScale(next)
    } else if (pan.current) {
      node.scrollLeft = pan.current.scroll.x - (point.x - pan.current.point.x)
      node.scrollTop = pan.current.scroll.y - (point.y - pan.current.point.y)
    }
  }
  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (pinch.current) { commit.current(scaleRef.current * 100); pinch.current = null }
    const remaining = [...pointers.current.values()][0]
    pan.current = remaining ? { point: remaining, scroll: { x: event.currentTarget.scrollLeft, y: event.currentTarget.scrollTop } } : null
    setPanning(pointers.current.size > 0)
  }
  const changeZoom = (next: number) => { if (wheelSave.current) { clearTimeout(wheelSave.current); wheelSave.current = null }; applyScale(next); commit.current(clampCanvasScale(next) * 100) }
  const reset = () => { changeZoom(1); desiredScroll.current = null; viewport.current?.scrollTo({ left: origin.current.x - CANVAS_PADDING, top: origin.current.y - CANVAS_PADDING }); }
  const fit = () => {
    const node = viewport.current
    if (!node) return
    const next = fitCanvasScale({ width: node.clientWidth, height: node.clientHeight }, size)
    changeZoom(next)
    desiredScroll.current = { x: origin.current.x - (node.clientWidth - size.width * next) / 2, y: origin.current.y - (node.clientHeight - size.height * next) / 2 }
    node.scrollTo({ left: desiredScroll.current.x, top: desiredScroll.current.y })
  }
  return <div className="board-canvas">
    <div ref={viewport} className={`board-canvas-viewport ${panning ? 'is-panning' : ''}`} tabIndex={0} role="region" aria-label="Board canvas" aria-describedby={hintId} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan} onKeyDown={event => {
      if (event.target !== event.currentTarget || disabled) return
      if (['+', '=', '-', '0'].includes(event.key)) { event.preventDefault(); if (event.key === '0') reset(); else changeZoom(scaleRef.current + (event.key === '-' ? -.1 : .1)) }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.currentTarget.scrollBy({ left: event.key === 'ArrowLeft' ? -80 : event.key === 'ArrowRight' ? 80 : 0, top: event.key === 'ArrowUp' ? -80 : event.key === 'ArrowDown' ? 80 : 0 }) }
    }}>
      <div className="board-canvas-spacer" style={{ width: Math.max(1, size.width * scale + (viewportSize.width + CANVAS_PADDING) * 2), height: Math.max(1, size.height * scale + (viewportSize.height + CANVAS_PADDING) * 2) }}>
        <div ref={world} className="board-canvas-world" style={{ left: viewportSize.width + CANVAS_PADDING, top: viewportSize.height + CANVAS_PADDING, transform: `scale(${scale})` }}><CanvasScale value={scale}>{children}</CanvasScale></div>
      </div>
    </div>
    <div className="canvas-controls" role="group" aria-label="Canvas zoom controls">
      <button type="button" disabled={disabled || scale >= MAX_CANVAS_SCALE} aria-label="Zoom in board canvas" title="Zoom in" onClick={() => changeZoom(scaleRef.current + .1)}><Icon name="plus" size={21} /></button>
      <output aria-label="Canvas zoom level">{Math.round(scale * 100)}%</output>
      <button type="button" disabled={disabled || scale <= MIN_CANVAS_SCALE} aria-label="Zoom out board canvas" title="Zoom out" onClick={() => changeZoom(scaleRef.current - .1)}><Icon name="minus" size={21} /></button>
      <button type="button" disabled={disabled} aria-label="Fit board in view" title="Fit board" onClick={fit}><Icon name="fit" size={19} /></button>
      <button type="button" disabled={disabled} aria-label="Reset board view" title="Reset to 100%" onClick={reset}><Icon name="reset" size={19} /></button>
    </div>
    <p className="canvas-hint" id={hintId}>Drag blue space to pan · Scroll to zoom<span className="sr-only">. Pinch on the background to zoom on touch screens. Ctrl or Command plus scroll zooms over cards. Focus the canvas and use arrow keys to pan, plus or minus to zoom, and zero to reset.</span></p>
  </div>
}
