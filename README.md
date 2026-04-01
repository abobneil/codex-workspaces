# Codex Workspaces

A Vite + React + TypeScript prototype for a workspace-focused infinite canvas UI.

The current app is a single full-screen canvas experience with lightweight workspace management. It is focused on navigation, overlays, and presentation polish rather than backend integration or persistent data storage.

## What the app does today

- Renders a full-screen infinite canvas shell with a stylized grid background
- Supports pointer drag panning
- Supports wheel zooming plus zoom controls for zoom in, zoom out, and reset to 100%
- Opens a top-left menu with `Settings` and `Help`
- Opens a workspace switcher from the current workspace chip
- Shows recent workspaces and a larger "All workspaces" library
- Lets you create, rename, soft-delete, and restore workspaces
- Includes a recovery view for deleted workspaces
- Lets you customize the grid with visibility, boldness, and color controls

## Current behavior and limitations

- The app renders a single page; there is no router or multi-page flow
- Workspace data is seeded in the client and stored only in React state
- Changes are not persisted across refreshes
- The `Share` button is present in the UI but does not trigger any action yet
- The canvas currently renders the viewport and grid only; it does not yet place notes, files, media, or AI-generated objects on the board
- Help content is placeholder copy inside the app

## Tech stack

- Vite 8
- React 19
- TypeScript 5
- ESLint 9

## Local development

```bash
npm install
npm run dev
```

The app will be available through the Vite dev server shown in the terminal.

## Validation

```bash
npm run lint
npm run build
```

## Project structure

- `src/main.tsx`: React entry point
- `src/App.tsx`: mounts the main page component
- `src/pages/InfiniteCanvasPage.tsx`: canvas interactions, overlays, and workspace state
- `src/styles.css`: application styling for the canvas, menus, modals, and responsive layout
- `src/index.css`: imports the main stylesheet
- `public/favicon.svg`: app favicon

## Implementation notes

- Initial workspaces are defined directly in `InfiniteCanvasPage.tsx`
- The camera is centered on mount based on the viewport size
- Zoom is clamped between `10%` and `300%`
- Deleting a workspace moves it into a recovery state instead of removing it permanently
- If the current workspace is deleted, the app automatically switches to another active workspace

## Next logical improvements

- Persist workspaces and canvas preferences
- Add actual canvas objects and object-level interactions
- Wire up sharing and collaboration behavior
- Replace placeholder help copy with product guidance
- Split page logic into smaller components as the UI grows
