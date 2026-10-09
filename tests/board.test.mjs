import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/lib/board.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { DEFAULT_LISTS, boardLists, taskListId, orderedCards, moveCard, labelColor } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const task = (id, extra = {}) => ({ id, projectId: 'p1', title: id, status: 'todo', createdAt: '2026-10-01', ...extra })
test('legacy projects and cards map to their existing stages', () => {
  assert.deepEqual(boardLists({ id: 'p1' }), DEFAULT_LISTS)
  assert.equal(taskListId(task('x', { status: 'review' }), DEFAULT_LISTS), 'review')
})
test('custom list membership wins over progress category', () => {
  const lists = [...DEFAULT_LISTS, { id: 'blocked', title: 'Blocked', status: 'todo' }]
  assert.equal(taskListId(task('x', { listId: 'blocked' }), lists), 'blocked')
  assert.equal(taskListId(task('x', { listId: 'removed' }), lists), 'todo')
})
test('moving to another list updates membership, progress, and ordering', () => {
  const tasks = [task('a'), task('b', { status: 'doing', order: 0 }), task('c', { status: 'doing', order: 1 })]
  const moved = moveCard(tasks, 'a', DEFAULT_LISTS[1], DEFAULT_LISTS, 'c')
  assert.equal(moved[0].status, 'doing')
  assert.equal(moved[0].listId, 'doing')
  assert.deepEqual(orderedCards(moved.filter(t => t.status === 'doing')).map(t => t.id), ['b', 'a', 'c'])
  assert.equal(tasks[0].status, 'todo')
})
test('same-list reorder and append work without duplicates', () => {
  const tasks = [task('a', { order: 0 }), task('b', { order: 1 }), task('c', { order: 2 })]
  const before = moveCard(tasks, 'c', DEFAULT_LISTS[0], DEFAULT_LISTS, 'a')
  assert.deepEqual(orderedCards(before).map(t => t.id), ['c', 'a', 'b'])
  const appended = moveCard(before, 'c', DEFAULT_LISTS[0], DEFAULT_LISTS)
  assert.deepEqual(orderedCards(appended).map(t => t.id), ['a', 'b', 'c'])
})
test('moves leave archived cards and other projects unchanged', () => {
  const archived = task('archived', { status: 'doing', archived: true, order: 40 })
  const other = task('other', { projectId: 'p2', status: 'doing', order: 50 })
  const moved = moveCard([task('a'), archived, other], 'a', DEFAULT_LISTS[1], DEFAULT_LISTS)
  assert.equal(moved[1], archived)
  assert.equal(moved[2], other)
})
test('labels receive stable readable colors', () => assert.equal(labelColor('release'), labelColor('release')))

test('dropping below a card moves downward rather than leaving the order unchanged', () => {
  const tasks = [task('a', { order: 0 }), task('b', { order: 1 }), task('c', { order: 2 })]
  const moved = moveCard(tasks, 'a', DEFAULT_LISTS[0], DEFAULT_LISTS, 'b', 'after')
  assert.deepEqual(orderedCards(moved).map(task => task.id), ['b', 'a', 'c'])
})
