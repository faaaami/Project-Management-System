# DevBoard

A personal project management app built with React, TypeScript, and Vite. Boards start empty so you can organize your own work.

## Using your board

- Create projects from the project picker and configure their name, modules, and planning start date in **Manage project**.
- Use **Add a card** in any list, or **Create task** for a card with a description, checklist, labels, links, comments, and dates.
- Drag cards by their handle to reorder or move them. Keyboard: Space to pick up, arrows to move, Space to drop, Escape to cancel.
- Create, rename, reorder, and categorize lists. The category controls progress reporting.
- Use the check button on a card to complete or reopen it. The notification offers **Undo**.
- **Archive completed** clears finished cards from the board. Use **Undo** or restore them from **Archive**.
- Switch between **All cards**, **Today**, **5-week plan**, and **Backlog**. Search and filters help find specific work.
- Zoom from 60% to 150% using the board header controls. The title, toolbar, cards, and lists resize, and the setting is remembered.
- **Focus mode** fills the window with your board. Use **Exit focus** or Escape to leave.

## Saving and restoring

Projects, cards, notes, to-dos, theme, and zoom are saved in this browser using localStorage. There is no server or account synchronization.

Open **Backup** on the board, or **Manage project → Restore backup**, to download or restore a JSON workspace backup. Restore previews the contents and imports each project as a new board with fresh IDs. Existing projects remain in place. This also lets you move your work to another browser or device manually.

The import accepts DevBoard backup version 1, validates project and list relationships, and supports older backups without custom lists or card extras. Files must be smaller than 10 MB.

## Development

```sh
npm install
npm run dev
```

```sh
npm test
npm run lint
npm run build
```

Tests cover task scheduling and filtering, card movement, persistence, sample-card migration, completion, archiving, and backup restore. Vercel deploys automatically from the connected GitHub repository.
