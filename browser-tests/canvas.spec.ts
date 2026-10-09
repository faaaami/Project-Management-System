import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openBoard(page: Page, zoom = 100) {
  await page.addInitScript(zoom => {
    if (sessionStorage.getItem('canvas-test-seeded')) return
    sessionStorage.setItem('canvas-test-seeded', 'true')
    const now = '2026-10-09T10:00:00Z'
    const card = (id: string, status: string) => ({ id, projectId: 'p1', title: `Card ${id}`, description: '', status, listId: status, priority: 'medium', type: 'feature', module: '', dueDate: '', plannedDate: '', plannedTime: '', tags: [], subtasks: [], createdAt: now, updatedAt: now, order: 0 })
    localStorage.setItem('devboard-storage', JSON.stringify({ version: 2, state: { version: 2, projects: [{ id: 'p1', name: 'Canvas project', modules: [] }], tasks: [card('a', 'todo'), card('b', 'doing'), card('c', 'review')], notes: [], todos: [], activeProjectId: 'p1', theme: 'dark', taskZoom: zoom } }))
  }, zoom)
  await page.goto('/')
  await page.locator('.board-canvas').scrollIntoViewIfNeeded()
  await expect(page.locator('.canvas-controls output')).toHaveText(`${zoom}%`)
}

test('zoom scales the canvas world without resizing its viewport or header', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openBoard(page)
  const viewport = page.locator('.board-canvas-viewport')
  const before = await viewport.boundingBox()
  const header = await page.locator('.trello-board-top').boundingBox()
  const list = page.getByRole('region', { name: 'Board canvas' }).getByRole('region', { name: 'To do list' })
  const width = (await list.boundingBox())!.width
  await page.getByRole('button', { name: 'Zoom in board canvas', exact: true }).click()
  await expect(page.locator('.canvas-controls output')).toHaveText('110%')
  expect((await viewport.boundingBox())!.width).toBe(before!.width)
  expect((await viewport.boundingBox())!.height).toBe(before!.height)
  expect((await page.locator('.trello-board-top').boundingBox())!.height).toBe(header!.height)
  expect((await list.boundingBox())!.width).toBeCloseTo(width * 1.1, 0)
  await page.getByRole('button', { name: 'Reset board view' }).click()
  await expect(page.locator('.canvas-controls output')).toHaveText('100%')
  expect(errors).toEqual([])
})

test('background panning and pointer-centred wheel zoom preserve canvas coordinates', async ({ page }) => {
  await openBoard(page)
  const viewport = page.locator('.board-canvas-viewport')
  const rect = (await viewport.boundingBox())!
  const before = await viewport.evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }))
  const point = { x: rect.x + 300, y: rect.y + rect.height - 90 }
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 120, point.y - 50, { steps: 10 })
  await page.mouse.up()
  const after = await viewport.evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }))
  expect(after.x).toBeCloseTo(before.x - 120, 0)
  expect(after.y).toBeCloseTo(before.y + 50, 0)
  const world = page.locator('.board-canvas-world')
  const worldBefore = (await world.boundingBox())!
  await page.mouse.move(point.x, point.y)
  await page.mouse.wheel(0, -100)
  await expect.poll(() => page.locator('.canvas-controls output').textContent()).not.toBe('100%')
  // Wait for the gesture to commit the persisted zoom to the same geometry.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('devboard-storage')!).state.taskZoom)).toBe(122)
  const worldAfter = (await world.boundingBox())!
  const scale = worldAfter.width / worldBefore.width
  expect(Math.abs(worldAfter.x + (point.x - worldBefore.x) * scale - point.x)).toBeLessThan(1)
  expect(Math.abs(worldAfter.y + (point.y - worldBefore.y) * scale - point.y)).toBeLessThan(1)
})

test('fit board, keyboard navigation, and card editing remain usable after zoom', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('button', { name: 'Fit board in view' }).click()
  const viewport = page.locator('.board-canvas-viewport')
  const visible = (await viewport.boundingBox())!
  const world = (await page.locator('.board-canvas-world').boundingBox())!
  expect(world.x).toBeGreaterThanOrEqual(visible.x)
  expect(world.x + world.width).toBeLessThanOrEqual(visible.x + visible.width + 1)
  await viewport.focus()
  const left = await viewport.evaluate(node => node.scrollLeft)
  await page.keyboard.press('ArrowRight')
  expect(await viewport.evaluate(node => node.scrollLeft)).toBe(left + 80)
  await page.keyboard.press('0')
  await expect(page.locator('.canvas-controls output')).toHaveText('100%')
  await page.getByRole('button', { name: 'Card a', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Card details', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Priority', exact: true }).click()
  await page.getByRole('option', { name: 'Urgent', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('devboard-storage')!).state.tasks.find((card: { id: string }) => card.id === 'a').priority)).toBe('urgent')
  await page.screenshot({ path: 'test-results/canvas-preview.png', fullPage: true })
})

for (const zoom of [25, 50, 100, 200]) test(`cards drop into the correct list at ${zoom}% zoom`, async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openBoard(page, zoom)
  const grip = (await page.getByRole('button', { name: 'Drag Card a', exact: true }).boundingBox())!
  const target = (await page.locator('.trello-sortable').filter({ has: page.getByRole('button', { name: 'Card b', exact: true }) }).boundingBox())!
  const viewport = (await page.locator('.board-canvas-viewport').boundingBox())!
  const x = Math.min(target.x + Math.min(50, target.width / 2), viewport.x + viewport.width - 20)
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2 + 8, grip.y + grip.height / 2, { steps: 2 })
  await page.mouse.move(x, target.y + target.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('devboard-storage')!).state.tasks.find((card: { id: string }) => card.id === 'a').listId)).toBe('doing')
  expect(errors).toEqual([])
})

for (const zoom of [50, 100]) test(`same-list downward reorder works at ${zoom}% zoom`, async ({ page }) => {
  await openBoard(page, zoom)
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('devboard-storage')!)
    const first = saved.state.tasks.find((card: { id: string }) => card.id === 'a')
    saved.state.tasks.push({ ...first, id: 'd', title: 'Card d', order: 1 }, { ...first, id: 'e', title: 'Card e', order: 2 })
    localStorage.setItem('devboard-storage', JSON.stringify(saved))
  })
  await page.reload()
  await page.locator('.board-canvas').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Drag Card a', exact: true }).hover()
  const grip = (await page.getByRole('button', { name: 'Drag Card a', exact: true }).boundingBox())!
  const target = (await page.locator('.trello-sortable').filter({ has: page.getByRole('button', { name: 'Card e', exact: true }) }).boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + 30, target.y + target.height - 5, { steps: 14 })
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('devboard-storage')!).state.tasks.filter((card: { listId: string }) => card.listId === 'todo').sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((card: { id: string }) => card.id))).toEqual(['d', 'e', 'a'])
})

test.describe('touch canvas', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  test('pinch on the blue background zooms the board on mobile', async ({ page }) => {
    await openBoard(page)
    const viewport = (await page.locator('.board-canvas-viewport').boundingBox())!
    const x = viewport.x + viewport.width / 2
    const y = viewport.y + viewport.height - 120
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40, y, id: 1 }, { x: x + 40, y, id: 2 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 60, y, id: 1 }, { x: x + 60, y, id: 2 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.canvas-controls output')).toHaveText('200%')
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('devboard-storage')!).state.taskZoom)).toBe(200)
  })
})
