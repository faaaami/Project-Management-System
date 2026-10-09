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
const { parseWorkspaceBackup } = await import(moduleUrl(new URL('../src/lib/backup.ts', import.meta.url)))

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
  useStore.setState({ projects: [{ id: 'p1', name: 'Test', modules: [], lists: [{ id: 'todo', title: 'Ideas', status: 'todo' }, { id: 'work', title: 'Work', status: 'doing' }] }], tasks: [], todos: [], notes: [], activeProjectId: 'p1' })
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

test('task zoom persists and survives navigation or reload without changing cards', async () => {
  reset()
  const card = useStore.getState().addTask({ title: 'Keep my card' })
  useStore.getState().setTaskZoom(80)
  assert.equal(JSON.parse(storage.get(STORAGE_KEY)).state.taskZoom, 80)
  useStore.setState({ taskZoom: 100 })
  const snapshot = JSON.parse(storage.get(STORAGE_KEY))
  snapshot.state.taskZoom = 80
  storage.set(STORAGE_KEY, JSON.stringify(snapshot))
  await useStore.persist.rehydrate()
  assert.equal(useStore.getState().taskZoom, 80)
  assert.deepEqual(useStore.getState().tasks, [card])
})

test('task zoom stays within readable bounds and resets to normal size', () => {
  useStore.getState().setTaskZoom(-100)
  assert.equal(useStore.getState().taskZoom, 25)
  useStore.getState().setTaskZoom(999)
  assert.equal(useStore.getState().taskZoom, 200)
  useStore.getState().setTaskZoom(Number.NaN)
  assert.equal(useStore.getState().taskZoom, 100)
})

test('whole-board size persists independently from canvas zoom and task content', async () => {
  reset()
  const card = useStore.getState().addTask({ title: 'Keep this task' })
  useStore.getState().setTaskZoom(120)
  useStore.getState().setBoardSize(50)
  const snapshot = JSON.parse(storage.get(STORAGE_KEY))
  assert.equal(snapshot.state.boardSize, 50)
  useStore.getState().setBoardSize(150)
  storage.set(STORAGE_KEY, JSON.stringify(snapshot))
  await useStore.persist.rehydrate()
  assert.equal(useStore.getState().boardSize, 50)
  assert.equal(useStore.getState().taskZoom, 120)
  assert.deepEqual(useStore.getState().tasks, [card])
  useStore.getState().setBoardSize(-1)
  assert.equal(useStore.getState().boardSize, 50)
  useStore.getState().setBoardSize(500)
  assert.equal(useStore.getState().boardSize, 150)
  useStore.getState().setBoardSize(Number.NaN)
  assert.equal(useStore.getState().boardSize, 100)
})

test('one-click completion creates a Done list when needed and reopening moves to To do', () => {
  reset()
  const card = useStore.getState().addTask({ title: 'Ship it', listId: 'work' })
  useStore.getState().toggleTaskComplete(card.id)
  const completed = useStore.getState().tasks[0]
  const doneList = useStore.getState().projects[0].lists.find(list => list.status === 'done')
  assert.equal(completed.status, 'done')
  assert.equal(completed.listId, doneList.id)
  assert.equal(useStore.getState().projects[0].lists.length, 3)
  useStore.getState().toggleTaskComplete(card.id)
  assert.equal(useStore.getState().tasks[0].status, 'todo')
  assert.equal(useStore.getState().tasks[0].listId, 'todo')
  useStore.getState().toggleTaskComplete(card.id)
  assert.equal(useStore.getState().projects[0].lists.length, 3)
})

test('archive completed affects only this project and skips open or already archived cards', () => {
  reset()
  const completed = useStore.getState().addTask({ title: 'Done' })
  const open = useStore.getState().addTask({ title: 'Still working' })
  const other = useStore.getState().addProject('Other')
  const otherCard = useStore.getState().addTask({ title: 'Other done' })
  useStore.getState().toggleTaskComplete(completed.id)
  useStore.getState().toggleTaskComplete(otherCard.id)
  const changed = useStore.getState().archiveCompleted('p1')
  assert.deepEqual(changed.map(card => card.id), [completed.id])
  assert.equal(useStore.getState().tasks.find(card => card.id === completed.id).archived, true)
  assert.equal(useStore.getState().tasks.find(card => card.id === open.id).archived, false)
  assert.equal(useStore.getState().tasks.find(card => card.projectId === other.id).archived, false)
  assert.deepEqual(useStore.getState().archiveCompleted('p1'), [])
})

function backupFixture() {
  reset()
  useStore.getState().addTask({ title: 'Release', listId: 'work', plannedDate: '2026-10-20', plannedTime: '14:30', cover: '#579dff', tags: ['release'], subtasks: [{ id: 'step', text: 'Check release', done: true }], comments: [{ id: 'comment', text: 'Looks good', createdAt: '2026-10-09T10:00:00Z' }], attachments: [{ id: 'link', name: 'Design', url: 'https://example.com/design' }] })
  useStore.getState().addTodo('Review release')
  useStore.getState().addNote({ title: 'Plan', body: 'Release notes' })
  const { projects, tasks, todos, notes } = useStore.getState()
  return { format: 'devboard-backup', version: 1, projects, tasks, todos, notes }
}

test('restore keeps existing work and regenerates every ID with correct board relationships', () => {
  const backup = backupFixture()
  const original = useStore.getState().tasks[0]
  const restored = useStore.getState().restoreWorkspace(backup)[0]
  assert.notEqual(restored.id, 'p1')
  assert.equal(restored.name, 'Test (restored)')
  assert.equal(useStore.getState().activeProjectId, 'p1')
  assert.equal(useStore.getState().tasks.find(card => card.id === original.id), original)
  const card = useStore.getState().tasks.find(card => card.projectId === restored.id)
  assert.notEqual(card.id, original.id)
  assert.equal(card.listId, restored.lists.find(list => list.title === 'Work').id)
  assert.equal(card.status, 'doing')
  assert.equal(card.plannedTime, '14:30')
  assert.equal(card.cover, original.cover)
  assert.notEqual(card.subtasks[0].id, original.subtasks[0].id)
  assert.notEqual(card.comments[0].id, original.comments[0].id)
  assert.notEqual(card.attachments[0].id, original.attachments[0].id)
  assert.equal(useStore.getState().notes.find(note => note.projectId === restored.id).body, 'Release notes')
  assert.equal(useStore.getState().todos.find(todo => todo.projectId === restored.id).text, 'Review release')
  const again = useStore.getState().restoreWorkspace(backup)[0]
  assert.notEqual(again.id, restored.id)
  assert.equal(useStore.getState().tasks.length, 3)
  assert.equal(new Set(useStore.getState().tasks.map(card => card.id)).size, 3)
  assert.equal(JSON.parse(storage.get(STORAGE_KEY)).state.projects.length, 3)
})

test('invalid backups are rejected before changing stored data', () => {
  const backup = backupFixture()
  const before = useStore.getState()
  const orphan = structuredClone(backup)
  orphan.tasks[0].projectId = 'missing'
  assert.throws(() => useStore.getState().restoreWorkspace(orphan), /missing project/)
  assert.equal(useStore.getState(), before)
  assert.throws(() => parseWorkspaceBackup({ ...backup, version: 999 }), /version 1/)
  assert.throws(() => parseWorkspaceBackup({ ...backup, tasks: [...backup.tasks, backup.tasks[0]] }), /duplicate/)
  const unsafe = structuredClone(backup)
  unsafe.tasks[0].attachments[0].url = 'javascript:alert(1)'
  assert.throws(() => parseWorkspaceBackup(unsafe), /http or https/)
  const invalidDate = structuredClone(backup)
  invalidDate.tasks[0].plannedDate = '2026-02-30'
  assert.throws(() => parseWorkspaceBackup(invalidDate), /date is invalid/)
  const invalidTime = structuredClone(backup)
  invalidTime.tasks[0].plannedTime = '24:01'
  assert.throws(() => parseWorkspaceBackup(invalidTime), /time is invalid/)
})

test('older backups without custom lists or card extras restore into matching stages', () => {
  reset()
  const backup = { format: 'devboard-backup', version: 1, projects: [{ id: 'project-erp', name: 'Old board', modules: ['Auth'] }], tasks: legacySampleTasks, todos: [], notes: [] }
  const restored = useStore.getState().restoreWorkspace(backup)[0]
  const card = useStore.getState().tasks.find(card => card.projectId === restored.id && card.status === 'review')
  assert.equal(card.listId, restored.lists.find(list => list.status === 'review').id)
  assert.deepEqual(card.comments, [])
  assert.equal(useStore.getState().tasks.length, 4)
})

test('changing a list category updates legacy and archived card progress atomically', () => {
  reset()
  const first = useStore.getState().addTask({ title: 'Legacy task' })
  const archived = useStore.getState().addTask({ title: 'Archived task', archived: true })
  useStore.setState(state => ({ tasks: state.tasks.map(task => task.id === first.id ? { ...task, listId: undefined } : task) }))
  const lists = useStore.getState().projects[0].lists.map(list => list.id === 'todo' ? { ...list, status: 'review' } : list)
  useStore.getState().updateProject('p1', { lists })
  for (const id of [first.id, archived.id]) {
    const card = useStore.getState().tasks.find(card => card.id === id)
    assert.equal(card.listId, 'todo')
    assert.equal(card.status, 'review')
  }
  assert.equal(useStore.getState().tasks.find(card => card.id === archived.id).archived, true)
})
