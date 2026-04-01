# Codex Workspaces Style Guide

## Design intent

Codex Workspaces should feel like a calm observatory: spacious, atmospheric, and precise. The canvas is the hero. UI chrome should feel like smoked glass floating over a dark spatial background.

The visual system should communicate:

- focus over spectacle
- premium calm over consumer brightness
- atmosphere over decoration
- precision over clutter

## Core principles

1. Let the canvas lead.
All floating UI should support the workspace, not compete with it.

2. Use one material language.
Menus, cards, docks, chips, and modals should all feel like variations of the same cool glass surface.

3. Favor cool light.
Primary emphasis should come from icy blue and muted indigo, not saturated warm colors.

4. Keep contrast intentional.
High contrast is for headings, key actions, and selected states. Secondary metadata should stay quiet.

5. Avoid obvious decoration.
Background effects should be atmospheric and abstract, never illustrative or hotspot-heavy.

## Color system

### Background

- Base: deep blue-black
- Atmosphere: subtle indigo haze
- Texture: very faint stars or grain only when needed
- Overlay: dark veil to keep UI readable

### Text

- Primary text: bright cool white
- Secondary text: softened blue-gray
- Tertiary metadata: dim blue-gray

### Accents

- Primary accent: icy blue
- Secondary accent: muted indigo
- Destructive accent: dusty ember

### Rules

- Do not introduce strong purple, neon cyan, or bright orange as dominant UI colors.
- Warm colors should be reserved for destructive or rare emphasis states.
- Avoid pure white fills outside of tiny highlights.

## Surface language

Use layered translucent surfaces instead of flat blocks.

Recommended traits:

- dark blue-black translucent fills
- soft blur
- subtle inner top highlight
- restrained outer shadow
- thin cool border

Surfaces should feel stacked, but light. They should not look like solid plastic or matte black cards.

## Buttons and controls

### Default controls

- Use the shared smoked-glass material
- Hover with a cool wash, not a gray fill
- Slight lift on hover is acceptable
- Keep icon buttons compact and round enough to feel tactile

### Primary actions

- Use icy blue to indigo gradients
- Keep them luminous, not candy-bright
- Use them sparingly so they still mean something

### Destructive actions

- Use dusty ember gradients
- Keep them softer than standard app-danger red

### Focus states

- Use a cool blue ring with low-to-medium opacity
- Focus should be clearly visible without overwhelming the control

## Cards

Workspace cards should feel like framed glass panels.

Use:

- subtle top-edge highlight
- quiet border
- restrained metadata contrast
- soft active glow for selected cards

Avoid:

- thick outlines
- heavy drop shadows
- bright badges unless they communicate truly new information

## Typography

### Fonts

- Headings: `Space Grotesk`
- Body/UI copy: `IBM Plex Sans`

### Tone

- Headings should feel crisp and slightly futuristic
- Body copy should remain highly readable and neutral

### Usage

- Keep uppercase labels sparse
- Use reduced letter spacing on metadata labels so they feel refined rather than loud
- Prefer short labels and concise button copy

## Spacing and shape

- Corners should be rounded but not bubbly
- Floating containers should generally sit in the `12px` to `20px` radius range
- Tight controls should feel compact and intentional
- Use spacing to create calm; avoid dense stacks of unrelated actions

## Motion

- Use short, soft transitions
- Favor opacity, shadow, and slight lift over dramatic transforms
- Motion should signal responsiveness, not call attention to itself

## Background rules

Backgrounds should feel like "space through smoked glass."

Allowed:

- one broad atmospheric band
- very subtle celestial texture
- soft vignetting
- low-contrast cool gradients

Avoid:

- multiple bright glows
- obvious hotspots behind controls
- literal photo treatment
- highly detailed stars competing with the grid

## Do and don't

Do:

- reuse shared tokens for borders, surfaces, and accents
- keep UI layers visually related
- make selected states feel illuminated from within
- preserve strong readability over decorative ambition

Don't:

- add random one-off colors
- mix warm and cool accents casually
- use flat black panels
- introduce glossy gradients that feel consumer-app bright
- make the background busier than the foreground

## Implementation notes

When adding new UI:

- start from existing surface tokens in `src/styles.css`
- match existing blur, border, and shadow behavior before inventing a new treatment
- use the primary icy-blue gradient only for true primary actions
- keep new background effects below the readability threshold of the grid and controls
