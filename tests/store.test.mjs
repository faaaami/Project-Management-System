import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const cache = new Map()
function moduleUrl(url) {
  if (cache.has(url.href)) return cache.get(url.href)
  let code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  code = code.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => {
    const resolved = specifier.startsWith('.') ? moduleUrl(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    return `from ${JSON.stringify(resolved)}`
  })
  const result = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  cache.set(url.href, result)
  return result
}
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
const { useStore, STORAGE_KEY } = await import(moduleUrl(new URL('../src/store/index.ts', import.meta.url)))
const { legacySampleTasks } = await import(moduleUrl(new URL('../src/store/seed.ts', import.meta.url)))

test('a new workspace starts with an empty board and no demo content', () => {
  const state = useStore.getState()
  assert.equal(state.tasks.length, 0)
  assert.equal(state.todos.length, 0)
  assert.equal(state.notes.length, 0)
  assert.equal(state.projects[0].name, 'My board')
  assert.deepEqual(state.projects[0].modules, [])
})

test('upgrading removes only untouched sample cards and preserves the user workspace', async () => {
  const changed = { ...legacySampleTasks[0], title: 'My own task now' }
  const scheduled = { ...legacySampleTasks[1], plannedDate: '2026-10-12', plannedTime: '09:00' }
  const ownCard = { ...legacySampleTasks[2], id: 'user-created', title: 'My project' }
  const projects = [{ id: 'project-erp', name: 'My real project', modules: ['My module'] }]
  const tasks = [changed, scheduled, ownCard, legacySampleTasks[2], legacySampleTasks[3]]
  const notes = [{ id: 'my-note', title: 'Keep this' }]
  const oldState = { projects, tasks, notes, activeProjectId: 'project-erp', theme: 'light', version: 1 }
  storage.set(STORAGE_KEY, JSON.stringify({ state: oldState, version: 1 }))
  await useStore.persist.rehydrate()
  const upgraded = useStore.getState()
  assert.deepEqual(upgraded.tasks.map(task => task.id), [changed.id, scheduled.id, ownCard.id])
  assert.deepEqual(upgraded.projects, projects)
  assert.deepEqual(upgraded.notes, notes)
  assert.equal(upgraded.theme, 'light')
  assert.equal(upgraded.version, 2)
  assert.equal(JSON.parse(storage.get(STORAGE_KEY)).version, 2)
  await useStore.persist.rehydrate()
  assert.deepEqual(useStore.getState().tasks, upgraded.tasks)
})
function reset() {
  useStore.setState({ projects: [{ id: 'p1', name: 'Test', modules: [], lists: [{ id: 'todo', title: 'Ideas', status: 'todo' }, { id: 'work', title: 'Work', status: 'doing' }] }], tasks: [], activeProjectId: 'p1' })
}
test('new cards append and derive their progress from the selected custom list', () => {
  reset()
  const a = useStore.getState().addTask({ title: 'First', listId: 'work' })
  const b = useStore.getState().addTask({ title: 'Second', listId: 'work' })
  assert.equal(a.status, 'doing')
  assert.ok(b.order > a.order)
  assert.equal(b.listId, 'work')
})
test('editing list membership synchronizes progress and appends to its destination', () => {
  reset()
  const a = useStore.getState().addTask({ title: 'Move me' })
  const b = useStore.getState().addTask({ title: 'Already here', listId: 'work' })
  useStore.getState().updateTask(a.id, { listId: 'work', description: 'Updated details', plannedDate: '2026-10-12', plannedTime: '14:30' })
  const updated = useStore.getState().tasks.find(task => task.id === a.id)
  assert.equal(updated.status, 'doing')
  assert.ok(updated.order > b.order)
  assert.equal(updated.description, 'Updated details')
  assert.equal(updated.plannedTime, '14:30')
  const persisted = JSON.parse(storage.get(STORAGE_KEY)).state.tasks.find(task => task.id === a.id)
  assert.deepEqual(persisted, updated)
})
test('clearing a planned date clears time and status updates synchronize the board list', () => {
  reset()
  const a = useStore.getState().addTask({ title: 'Task', plannedDate: '2026-10-12', plannedTime: '09:00' })
  useStore.getState().updateTask(a.id, { plannedDate: '', status: 'doing' })
  const updated = useStore.getState().tasks[0]
  assert.equal(updated.plannedTime, '')
  assert.equal(updated.listId, 'work')
})
test('archiving keeps all current edited fields and copying generates independent cards', () => {
  reset()
  const a = useStore.getState().addTask({ title: 'Original' })
  const draft = { title: 'Edited', description: 'Keep this', plannedDate: '2026-10-14', plannedTime: '11:30', tags: ['release'], cover: '#579dff', attachments: [{ id: 'link', name: 'Design', url: 'https://example.com' }] }
  useStore.getState().updateTask(a.id, { ...draft, archived: true })
  const copied = useStore.getState().addTask({ ...draft, title: 'Edited (copy)' })
  assert.notEqual(copied.id, a.id)
  for (const [field, value] of Object.entries(draft)) assert.deepEqual(useStore.getState().tasks.find(task => task.id === a.id)[field], value)
  assert.equal(copied.plannedTime, '11:30')
  assert.deepEqual(copied.attachments, draft.attachments)
  assert.equal(copied.archived, false)
})

test('hundreds of user cards can be created without a limit or duplicate IDs', () => {
  reset()
  for (let i = 0; i < 250; i++) useStore.getState().addTask({ title: `Card ${i + 1}`, listId: 'work' })
  const cards = useStore.getState().tasks
  assert.equal(cards.length, 250)
  assert.equal(new Set(cards.map(task => task.id)).size, 250)
  assert.deepEqual(cards.map(task => task.order).sort((a, b) => a - b), Array.from({ length: 250 }, (_, i) => i))
  assert.equal(JSON.parse(storage.get(STORAGE_KEY)).state.tasks.length, 250)
})
