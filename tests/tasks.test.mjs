import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/tasks.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { filterTasks, localDateKey, scopeTasks, addDays } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const task = (id, overrides = {}) => ({ id, title: 'Build API', description: 'Authentication flow', module: 'Backend', tags: ['security'], priority: 'medium', status: 'todo', dueDate: '', createdAt: '2026-10-01', ...overrides })
const defaults = { query: '', priority: '', module: '', deadline: '', sort: 'newest' }

test('search matches tags and description, with whitespace and case ignored', () => {
  const tasks = [task('a'), task('b', { tags: [], description: 'Design layout' })]
  assert.deepEqual(filterTasks(tasks, { ...defaults, query: ' SECURITY ' }).map(t => t.id), ['a'])
  assert.deepEqual(filterTasks(tasks, { ...defaults, query: 'authentication' }).map(t => t.id), ['a'])
})
test('priority and module filters intersect', () => {
  const tasks = [task('a', { priority: 'urgent' }), task('b', { priority: 'urgent', module: 'Design' }), task('c')]
  assert.deepEqual(filterTasks(tasks, { ...defaults, priority: 'urgent', module: 'Backend' }).map(t => t.id), ['a'])
})
test('overdue and today filters exclude completed and undated tasks', () => {
  const tasks = [task('a', { dueDate: '2026-10-08' }), task('b', { dueDate: '2026-10-09' }), task('c', { dueDate: '2026-10-08', status: 'done' }), task('d')]
  assert.deepEqual(filterTasks(tasks, { ...defaults, deadline: 'overdue' }, '2026-10-09').map(t => t.id), ['a'])
  assert.deepEqual(filterTasks(tasks, { ...defaults, deadline: 'today' }, '2026-10-09').map(t => t.id), ['b'])
})
test('due date ordering places undated tasks last without mutating source', () => {
  const tasks = [task('a'), task('b', { dueDate: '2026-10-12' }), task('c', { dueDate: '2026-10-10' })]
  assert.deepEqual(filterTasks(tasks, { ...defaults, sort: 'due' }).map(t => t.id), ['c', 'b', 'a'])
  assert.deepEqual(tasks.map(t => t.id), ['a', 'b', 'c'])
})
test('priority sorting puts urgent work first', () => {
  const tasks = [task('a', { priority: 'low' }), task('b', { priority: 'urgent' }), task('c', { priority: 'high' })]
  assert.deepEqual(filterTasks(tasks, { ...defaults, sort: 'priority' }).map(t => t.id), ['b', 'c', 'a'])
})
test('date keys use local calendar fields', () => assert.equal(localDateKey(new Date(2026, 9, 9, 0, 15)), '2026-10-09'))

test('Today only includes planned tasks and hides completed work', () => {
  const tasks = [task('today', { plannedDate: '2026-10-09' }), task('done', { plannedDate: '2026-10-09', status: 'done' }), task('old', { plannedDate: '2026-10-08' }), task('backlog'), task('deadline-only', { dueDate: '2026-10-09' })]
  assert.deepEqual(scopeTasks(tasks, 'today', '2026-10-09', '2026-10-01', 1, false).map(t => t.id), ['today'])
  assert.deepEqual(scopeTasks(tasks, 'today', '2026-10-09', '2026-10-01', 1, true).map(t => t.id), ['today', 'done'])
})
test('each planning week includes exactly seven days across month boundaries', () => {
  const tasks = [task('before', { plannedDate: '2026-10-31' }), task('first', { plannedDate: '2026-11-01' }), task('last', { plannedDate: '2026-11-07' }), task('next', { plannedDate: '2026-11-08' })]
  assert.deepEqual(scopeTasks(tasks, 'week', '2026-10-25', '2026-10-25', 2, false).map(t => t.id), ['first', 'last'])
  assert.equal(addDays('2026-12-30', 7), '2027-01-06')
})
test('legacy tasks remain in backlog and completed tasks stay in history', () => {
  const tasks = [task('legacy'), task('done', { status: 'done' }), task('scheduled', { plannedDate: '2026-11-01' })]
  assert.deepEqual(scopeTasks(tasks, 'backlog', '2026-10-09', '2026-10-01', 1, false).map(t => t.id), ['legacy'])
  assert.deepEqual(scopeTasks(tasks, 'all', '2026-10-09', '2026-10-01', 1, true).map(t => t.id), ['legacy', 'done', 'scheduled'])
})
