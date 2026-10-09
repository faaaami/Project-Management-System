import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useStore } from '../store'
import { BOARD_SIZE_STEP, MAX_BOARD_SIZE, MIN_BOARD_SIZE, normalizeBoardSize } from '../lib/zoom'
import { CanvasScale } from '../hooks/useCanvasScale'
import { Icon } from './Icon'

/** Resize the complete board while keeping its size controls easy to reach. */
export function BoardFrame({ children, focused, disabled }: { children: ReactNode; focused: boolean; disabled: boolean }) {
  const size = useStore(state => normalizeBoardSize(state.boardSize))
  const setSize = useStore(state => state.setBoardSize)
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const node = frame.current
    if (!node) return
    const measure = () => setWidth(node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const scale = focused ? 1 : size / 100
  return <div className="board-size-layout">
    <div className="board-size-toolbar" role="group" aria-label="Board size controls">
      <div className="board-size-description"><strong>Board size</strong><span>Resize the entire blue board</span></div>
      <div className="board-size-actions">
        <button type="button" disabled={disabled || focused || size <= MIN_BOARD_SIZE} onClick={() => setSize(size - BOARD_SIZE_STEP)} aria-label="Make entire board smaller"><Icon name="minus" size={17} /><span>Smaller</span></button>
        <input type="range" aria-label="Entire board size" min={MIN_BOARD_SIZE} max={MAX_BOARD_SIZE} step={5} value={size} disabled={disabled || focused} onChange={event => setSize(Number(event.target.value))} />
        <output aria-label="Board size percentage" aria-live="polite">{size}%</output>
        <button type="button" disabled={disabled || focused || size >= MAX_BOARD_SIZE} onClick={() => setSize(size + BOARD_SIZE_STEP)} aria-label="Make entire board bigger"><Icon name="plus" size={17} /><span>Bigger</span></button>
        <button type="button" className="board-size-reset" disabled={disabled || focused || size === 100} onClick={() => setSize(100)}>Reset size</button>
      </div>
    </div>
    <div ref={frame} className="board-frame" style={{ '--board-size': scale, '--board-width': width ? `${width}px` : '100%' } as CSSProperties}>
      <CanvasScale value={scale}>{children}</CanvasScale>
    </div>
  </div>
}
