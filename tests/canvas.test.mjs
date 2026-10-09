import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/canvas.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { zoomScroll, canvasTranslation, fitCanvasScale, clampCanvasScale } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('zoom keeps a world position under the pointer across buffered canvas coordinates', () => {
  const origin = { x: 1032, y: 632 }
  const scroll = { x: 1200, y: 720 }
  const pointer = { x: 200, y: 150 }
  const next = zoomScroll(scroll, pointer, 1, 2, origin)
  assert.deepEqual(next, { x: 1568, y: 958 })
  const oldWorldPoint = { x: scroll.x + pointer.x - origin.x, y: scroll.y + pointer.y - origin.y }
  assert.equal(origin.x + oldWorldPoint.x * 2 - next.x, pointer.x)
  assert.equal(origin.y + oldWorldPoint.y * 2 - next.y, pointer.y)
  assert.deepEqual(zoomScroll(next, pointer, 2, 1, origin), scroll)
})

test('fit brings a wide board into the viewport while respecting zoom limits', () => {
  assert.equal(fitCanvasScale({ width: 1064, height: 664 }, { width: 2000, height: 600 }), .5)
  assert.equal(fitCanvasScale({ width: 1064, height: 664 }, { width: 100, height: 100 }), 1)
  assert.equal(clampCanvasScale(0), .25)
  assert.equal(clampCanvasScale(9), 2)
  assert.equal(clampCanvasScale(Number.NaN), 1)
})

test('card drag movement stays aligned with the pointer at every canvas zoom level', () => {
  for (const scale of [.25, .5, 1, 1.5, 2]) {
    const local = canvasTranslation({ x: 100, y: -60 }, scale)
    assert.equal(local.x * scale, 100)
    assert.equal(local.y * scale, -60)
  }
})
