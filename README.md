# Codex Workspaces

A Vite + React + TypeScript prototype for a non-technical Codex product experience.

The app is centered on two ideas:

- Workspace cards on the home page act as focused rooms for different kinds of work.
- Each workspace opens into an endless canvas where notes, images, files, audio, websites, graphs, diagrams, and shapes can all become AI-aware objects.

Instead of asking end users to learn tools, prompts, or code, the interface keeps the interaction model simple:

- Click empty space and type a request.
- Or record audio directly on the canvas.
- Or select an existing object and use contextual AI actions.

The server-side assumption is that Codex handles orchestration, tool creation, and media transformations behind the scenes while the front end stays calm and visual.

## Prototype highlights

- Responsive workspace landing page with visual cards and seeded use cases
- Endless-canvas workspace view with pan and zoom
- Mixed object types rendered directly on the canvas
- Empty-space composer for text prompts
- Browser-based audio capture for quick voice requests
- Selection-driven interaction rail with object-specific actions
- Image recolor workflow with recommended palettes and manual color picking
- Seeded activity feed and product-language framing for non-technical users

## Tech stack

- Vite
- React 19
- TypeScript
- React Router
- ESLint

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Project structure

- `src/pages/HomePage.tsx`: workspace card landing page
- `src/pages/WorkspacePage.tsx`: endless canvas experience
- `src/components/`: reusable UI building blocks
- `src/data/workspaces.ts`: seeded workspace and object data
- `PRD.md`: product requirements document for the fuller product direction

## Product direction

This repository is a front-end prototype, not a full Codex backend implementation.

The attached [PRD](./PRD.md) explains the target audience, core workflows, object model, server-side Codex responsibilities, and the path from this prototype toward a production product.
