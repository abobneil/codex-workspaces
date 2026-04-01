import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'

interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

interface PanState {
  pointerId: number
  startX: number
  startY: number
  initialX: number
  initialY: number
}

interface GridSettings {
  visible: boolean
  boldness: number
  color: string
}

interface WorkspaceRecord {
  id: string
  name: string
  lastModified: string
  sharedWith: string
  deletedAt: string | null
}

interface WorkspaceEditorState {
  mode: 'create' | 'rename'
  targetId: string | null
  name: string
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const GRID_SIZE = 60

type OverlayView = 'settings' | 'help' | 'workspaces' | null
type WorkspaceLibraryView = 'active' | 'recovery'

const helpContent = {
  title: 'Help',
  body: [
    'Help should explain the core interaction model clearly: drag to pan, zoom with the dock or wheel, and use overlays for app-level actions.',
    'Later this can expand into shortcuts, onboarding tips, and links to support content.',
  ],
}

const initialWorkspaces: WorkspaceRecord[] = [
  {
    id: 'northstar-lab',
    name: 'Northstar Lab',
    lastModified: '2026-03-31T20:48:00',
    sharedWith: 'Ava, Jordan, Priya',
    deletedAt: null,
  },
  {
    id: 'launch-room',
    name: 'Launch Room',
    lastModified: '2026-03-31T18:12:00',
    sharedWith: 'Mia, Theo, Cam',
    deletedAt: null,
  },
  {
    id: 'client-ops',
    name: 'Client Ops',
    lastModified: '2026-03-31T15:40:00',
    sharedWith: 'Nina, Sam',
    deletedAt: null,
  },
  {
    id: 'brand-system',
    name: 'Brand System',
    lastModified: '2026-03-30T17:05:00',
    sharedWith: 'Drew, Elise, Max',
    deletedAt: null,
  },
  {
    id: 'roadmap-room',
    name: 'Roadmap Room',
    lastModified: '2026-03-29T14:18:00',
    sharedWith: 'Kai, Lena, Omar',
    deletedAt: null,
  },
  {
    id: 'research-vault',
    name: 'Research Vault',
    lastModified: '2026-03-28T11:32:00',
    sharedWith: 'Tara, Jules',
    deletedAt: null,
  },
  {
    id: 'partner-hub',
    name: 'Partner Hub',
    lastModified: '2026-03-26T09:20:00',
    sharedWith: 'Rae, Dominic, Will',
    deletedAt: null,
  },
]

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function formatZoom(zoom: number) {
  return `${Math.round(zoom * 100)}%`
}

function getZoomStep(zoom: number) {
  return zoom >= 1 ? 0.1 : 0.05
}

function hexToRgb(color: string) {
  const normalized = color.replace('#', '')

  if (normalized.length !== 6) {
    return { r: 255, g: 255, b: 255 }
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function formatWorkspaceDate(date: string) {
  return new Date(date).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function createWorkspaceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `workspace-${Date.now()}`
}

export function InfiniteCanvasPage() {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<PanState | null>(null)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false)
  const [activeOverlay, setActiveOverlay] = useState<OverlayView>(null)
  const [workspaceLibraryView, setWorkspaceLibraryView] = useState<WorkspaceLibraryView>('active')
  const [workspaceRecords, setWorkspaceRecords] = useState(initialWorkspaces)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(initialWorkspaces[0].id)
  const [workspaceEditor, setWorkspaceEditor] = useState<WorkspaceEditorState | null>(null)
  const [workspaceDeleteTarget, setWorkspaceDeleteTarget] = useState<WorkspaceRecord | null>(null)
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    visible: true,
    boldness: 18,
    color: '#ffffff',
  })
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    zoom: 1,
  })

  useEffect(() => {
    const positionCamera = () => {
      const rect = viewportRef.current?.getBoundingClientRect()

      if (!rect) {
        return
      }

      setViewport((current) => {
        if (current.x !== 0 || current.y !== 0 || current.zoom !== 1) {
          return current
        }

        return {
          x: rect.width / 2,
          y: rect.height / 2,
          zoom: 1,
        }
      })
    }

    positionCamera()
    window.addEventListener('resize', positionCamera)

    return () => window.removeEventListener('resize', positionCamera)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      setIsMenuOpen(false)
      setIsWorkspaceMenuOpen(false)
      setWorkspaceEditor(null)
      setWorkspaceDeleteTarget(null)
      setActiveOverlay(null)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const activeWorkspaces = workspaceRecords.filter((workspace) => !workspace.deletedAt)
  const deletedWorkspaces = workspaceRecords.filter((workspace) => workspace.deletedAt)
  const currentWorkspace =
    activeWorkspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? activeWorkspaces[0]
  const recentWorkspaces = [...activeWorkspaces]
    .sort(
      (left, right) =>
        new Date(right.lastModified).getTime() - new Date(left.lastModified).getTime(),
    )
    .slice(0, 5)

  const updateZoom = (nextZoom: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const worldX = (centerX - viewport.x) / viewport.zoom
    const worldY = (centerY - viewport.y) / viewport.zoom

    setViewport({
      x: centerX - worldX * clampedZoom,
      y: centerY - worldY * clampedZoom,
      zoom: clampedZoom,
    })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: viewport.x,
      initialY: viewport.y,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - pan.startX
    const deltaY = event.clientY - pan.startY

    setViewport((current) => ({
      ...current,
      x: pan.initialX + deltaX,
      y: pan.initialY + deltaY,
    }))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    panRef.current = null
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const rect = viewportRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    const direction = Math.sign(event.deltaY)
    const nextZoom = clamp(
      viewport.zoom - direction * getZoomStep(viewport.zoom),
      MIN_ZOOM,
      MAX_ZOOM,
    )
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    const worldX = (pointerX - viewport.x) / viewport.zoom
    const worldY = (pointerY - viewport.y) / viewport.zoom

    setViewport({
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom,
      zoom: nextZoom,
    })
  }

  const gridSize = GRID_SIZE * viewport.zoom
  const gridOffsetX = ((viewport.x % gridSize) + gridSize) % gridSize
  const gridOffsetY = ((viewport.y % gridSize) + gridSize) % gridSize
  const gridColor = hexToRgb(gridSettings.color)
  const gridLineColor = `rgba(${gridColor.r}, ${gridColor.g}, ${gridColor.b}, ${gridSettings.boldness / 100})`

  const openOverlay = (view: Exclude<OverlayView, null>) => {
    setActiveOverlay(view)
    setIsMenuOpen(false)
    setIsWorkspaceMenuOpen(false)
    setWorkspaceEditor(null)
    setWorkspaceDeleteTarget(null)
    if (view === 'workspaces') {
      setWorkspaceLibraryView('active')
    }
  }

  const closeAllOverlays = () => {
    setIsMenuOpen(false)
    setIsWorkspaceMenuOpen(false)
    setWorkspaceEditor(null)
    setWorkspaceDeleteTarget(null)
    setActiveOverlay(null)
    setWorkspaceLibraryView('active')
  }

  const stopOverlayClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const updateGridSetting = <Key extends keyof GridSettings>(
    key: Key,
    value: GridSettings[Key],
  ) => {
    setGridSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const selectWorkspace = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId)
    setIsWorkspaceMenuOpen(false)
    setWorkspaceEditor(null)
    setWorkspaceDeleteTarget(null)
    setActiveOverlay(null)
  }

  const openWorkspaceEditor = (mode: WorkspaceEditorState['mode'], workspace?: WorkspaceRecord) => {
    setWorkspaceEditor({
      mode,
      targetId: workspace?.id ?? null,
      name: workspace?.name ?? '',
    })
  }

  const submitWorkspaceEditor = () => {
    if (!workspaceEditor) {
      return
    }

    const trimmedName = workspaceEditor.name.trim()

    if (!trimmedName) {
      return
    }

    if (workspaceEditor.mode === 'create') {
      const nextWorkspace: WorkspaceRecord = {
        id: createWorkspaceId(),
        name: trimmedName,
        lastModified: new Date().toISOString(),
        sharedWith: 'Only you',
        deletedAt: null,
      }

      setWorkspaceRecords((current) => [nextWorkspace, ...current])
      setCurrentWorkspaceId(nextWorkspace.id)
      closeAllOverlays()
      return
    }

    setWorkspaceRecords((current) =>
      current.map((workspace) =>
        workspace.id === workspaceEditor.targetId
          ? {
              ...workspace,
              name: trimmedName,
              lastModified: new Date().toISOString(),
            }
          : workspace,
      ),
    )
    setWorkspaceEditor(null)
  }

  const confirmDeleteWorkspace = () => {
    if (!workspaceDeleteTarget || activeWorkspaces.length <= 1) {
      setWorkspaceDeleteTarget(null)
      return
    }

    setWorkspaceRecords((current) =>
      current.map((workspace) =>
        workspace.id === workspaceDeleteTarget.id
          ? {
              ...workspace,
              deletedAt: new Date().toISOString(),
            }
          : workspace,
      ),
    )

    if (workspaceDeleteTarget.id === currentWorkspaceId) {
      const fallbackWorkspace = activeWorkspaces.find(
        (workspace) => workspace.id !== workspaceDeleteTarget.id,
      )

      if (fallbackWorkspace) {
        setCurrentWorkspaceId(fallbackWorkspace.id)
      }
    }

    setWorkspaceDeleteTarget(null)
  }

  const restoreWorkspace = (workspaceId: string) => {
    setWorkspaceRecords((current) =>
      current.map((workspace) =>
        workspace.id === workspaceId
          ? {
              ...workspace,
              deletedAt: null,
              lastModified: new Date().toISOString(),
            }
          : workspace,
      ),
    )
  }

  return (
    <main className="infinite-canvas-page">
      <button
        aria-label="Open canvas menu"
        aria-expanded={isMenuOpen}
        className="canvas-icon-button canvas-icon-button--menu"
        onClick={() => {
          setIsWorkspaceMenuOpen(false)
          setIsMenuOpen((current) => !current)
        }}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      {isMenuOpen ? (
        <>
          <div
            className="canvas-overlay-backdrop canvas-overlay-backdrop--clear"
            onClick={() => setIsMenuOpen(false)}
          />
          <section className="canvas-menu-panel" onClick={stopOverlayClick}>
            <button className="canvas-menu-item" onClick={() => openOverlay('settings')} type="button">
              Settings
            </button>
            <button className="canvas-menu-item" onClick={() => openOverlay('help')} type="button">
              Help
            </button>
          </section>
        </>
      ) : null}

      <div className="canvas-header-actions">
        <button
          aria-expanded={isWorkspaceMenuOpen}
          className="canvas-chip-button"
          onClick={() => {
            setIsMenuOpen(false)
            setIsWorkspaceMenuOpen((current) => !current)
          }}
          type="button"
        >
          {currentWorkspace.name}
        </button>
        <button className="canvas-primary-button" type="button">
          Share
        </button>
      </div>

      {isWorkspaceMenuOpen ? (
        <>
          <div
            className="canvas-overlay-backdrop canvas-overlay-backdrop--clear"
            onClick={() => setIsWorkspaceMenuOpen(false)}
          />
          <section className="workspace-menu-panel" onClick={stopOverlayClick}>
            <div className="workspace-menu-panel__section">
              <p className="workspace-menu-panel__eyebrow">Recent workspaces</p>
              <div className="workspace-menu-panel__list">
                {recentWorkspaces.map((workspace) => (
                  <button
                    className={`workspace-menu-item${
                      workspace.id === currentWorkspaceId ? ' is-active' : ''
                    }`}
                    key={workspace.id}
                    onClick={() => selectWorkspace(workspace.id)}
                    type="button"
                  >
                    <span>{workspace.name}</span>
                    <small>{formatWorkspaceDate(workspace.lastModified)}</small>
                  </button>
                ))}
              </div>
            </div>

            <button className="workspace-menu-all" onClick={() => openOverlay('workspaces')} type="button">
              All workspaces
            </button>
          </section>
        </>
      ) : null}

      <div
        className="canvas-viewport-shell"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={viewportRef}
      >
        {gridSettings.visible ? (
          <div
            className="canvas-grid"
            style={{
              backgroundImage: `linear-gradient(${gridLineColor} 1px, transparent 1px), linear-gradient(90deg, ${gridLineColor} 1px, transparent 1px)`,
              backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          />
        ) : null}

        <div
          className="canvas-world"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          }}
        />
      </div>

      <div className="canvas-zoom-dock">
        <button
          aria-label="Zoom out"
          onClick={() => updateZoom(viewport.zoom - getZoomStep(viewport.zoom))}
          type="button"
        >
          -
        </button>
        <button
          aria-label="Reset zoom to 100%"
          className="canvas-zoom-value"
          onClick={() => updateZoom(1)}
          type="button"
        >
          {formatZoom(viewport.zoom)}
        </button>
        <button
          aria-label="Zoom in"
          onClick={() => updateZoom(viewport.zoom + getZoomStep(viewport.zoom))}
          type="button"
        >
          +
        </button>
      </div>

      {activeOverlay ? (
        <div className="canvas-overlay-backdrop" onClick={closeAllOverlays}>
          <section
            aria-modal="true"
            className={`canvas-modal${
              activeOverlay === 'workspaces' ? ' canvas-modal--wide' : ''
            }`}
            onClick={stopOverlayClick}
            role="dialog"
          >
            <div className="canvas-modal__header">
              <div>
                <p className="canvas-modal__eyebrow">Menu item</p>
                <h2>
                  {activeOverlay === 'settings'
                    ? 'Settings'
                    : activeOverlay === 'workspaces'
                      ? 'All workspaces'
                      : helpContent.title}
                </h2>
              </div>
              <div className="canvas-modal__actions">
                {activeOverlay === 'workspaces' ? (
                  <>
                    <div className="canvas-modal__toggle" role="tablist" aria-label="Workspace views">
                      <button
                        aria-selected={workspaceLibraryView === 'active'}
                        className={`canvas-modal__toggle-option${
                          workspaceLibraryView === 'active' ? ' is-active' : ''
                        }`}
                        onClick={() => setWorkspaceLibraryView('active')}
                        role="tab"
                        type="button"
                      >
                        Active
                      </button>
                      <button
                        aria-selected={workspaceLibraryView === 'recovery'}
                        className={`canvas-modal__toggle-option${
                          workspaceLibraryView === 'recovery' ? ' is-active' : ''
                        }`}
                        disabled={deletedWorkspaces.length === 0}
                        onClick={() => setWorkspaceLibraryView('recovery')}
                        role="tab"
                        type="button"
                      >
                        Deleted
                      </button>
                    </div>
                    {workspaceLibraryView === 'active' ? (
                      <button
                        className="canvas-modal__action-primary"
                        onClick={() => openWorkspaceEditor('create')}
                        type="button"
                      >
                        New workspace
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button className="canvas-modal__close" onClick={closeAllOverlays} type="button">
                  Close
                </button>
              </div>
            </div>
            <div className="canvas-modal__body">
              {activeOverlay === 'settings' ? (
                <section className="settings-section">
                  <div className="settings-section__header">
                    <div>
                      <p className="settings-section__eyebrow">Canvas</p>
                      <h3>Grid</h3>
                    </div>
                    <label className="settings-toggle">
                      <span>Show grid</span>
                      <input
                        checked={gridSettings.visible}
                        onChange={(event) => updateGridSetting('visible', event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                  </div>

                  <label className="settings-field">
                    <div className="settings-field__label-row">
                      <span>Grid boldness</span>
                      <strong>{gridSettings.boldness}%</strong>
                    </div>
                    <input
                      max="60"
                      min="4"
                      onChange={(event) =>
                        updateGridSetting('boldness', Number.parseInt(event.target.value, 10))
                      }
                      type="range"
                      value={gridSettings.boldness}
                    />
                  </label>

                  <label className="settings-field settings-field--color">
                    <div className="settings-field__label-row">
                      <span>Grid color</span>
                      <strong>{gridSettings.color.toUpperCase()}</strong>
                    </div>
                    <input
                      onChange={(event) => updateGridSetting('color', event.target.value)}
                      type="color"
                      value={gridSettings.color}
                    />
                  </label>
                </section>
              ) : activeOverlay === 'workspaces' ? (
                workspaceLibraryView === 'active' ? (
                  <section className="workspace-library">
                    {activeWorkspaces.map((workspace) => (
                      <button
                        className={`workspace-card${workspace.id === currentWorkspaceId ? ' is-active' : ''}`}
                        key={workspace.id}
                        onClick={() => selectWorkspace(workspace.id)}
                        type="button"
                      >
                        <div className="workspace-card__header">
                          <h3>{workspace.name}</h3>
                          <div className="workspace-card__header-actions">
                            {workspace.id === currentWorkspaceId ? (
                              <span className="workspace-card__badge">Current</span>
                            ) : null}
                            <button
                              aria-label={`Rename ${workspace.name}`}
                              className="workspace-card__edit"
                              onClick={(event) => {
                                event.stopPropagation()
                                openWorkspaceEditor('rename', workspace)
                              }}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              aria-label={`Delete ${workspace.name}`}
                              className="workspace-card__trash"
                              disabled={activeWorkspaces.length <= 1}
                              onClick={(event) => {
                                event.stopPropagation()
                                setWorkspaceDeleteTarget(workspace)
                              }}
                              type="button"
                            >
                              <svg
                                aria-hidden="true"
                                fill="none"
                                height="14"
                                viewBox="0 0 24 24"
                                width="14"
                              >
                                <path
                                  d="M5 7h14M9 7V5h6v2m-7 3v7m4-7v7m4-7v7M7 7l1 12h8l1-12"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.8"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <dl className="workspace-card__meta">
                          <div>
                            <dt>Last modified</dt>
                            <dd>{formatWorkspaceDate(workspace.lastModified)}</dd>
                          </div>
                          <div>
                            <dt>Shared with</dt>
                            <dd>{workspace.sharedWith}</dd>
                          </div>
                        </dl>
                      </button>
                    ))}
                  </section>
                ) : (
                  <section className="workspace-library workspace-library--recovery">
                    {deletedWorkspaces.length > 0 ? (
                      deletedWorkspaces.map((workspace) => (
                        <article className="workspace-card workspace-card--recovery" key={workspace.id}>
                          <div className="workspace-card__header">
                            <h3>{workspace.name}</h3>
                            <button
                              className="workspace-card__restore"
                              onClick={() => restoreWorkspace(workspace.id)}
                              type="button"
                            >
                              Restore
                            </button>
                          </div>
                          <dl className="workspace-card__meta">
                            <div>
                              <dt>Last modified</dt>
                              <dd>{formatWorkspaceDate(workspace.lastModified)}</dd>
                            </div>
                            <div>
                              <dt>Shared with</dt>
                              <dd>{workspace.sharedWith}</dd>
                            </div>
                          </dl>
                        </article>
                      ))
                    ) : (
                      <div className="workspace-recovery-empty">
                        <h3>Nothing to recover</h3>
                        <p>Deleted workspaces will appear here until they are restored.</p>
                      </div>
                    )}
                  </section>
                )
              ) : (
                helpContent.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              )}
            </div>
          </section>
        </div>
      ) : null}

      {workspaceEditor ? (
        <div
          className="canvas-overlay-backdrop canvas-overlay-backdrop--stacked"
          onClick={() => setWorkspaceEditor(null)}
        >
          <section
            aria-modal="true"
            className="canvas-modal canvas-modal--editor"
            onClick={stopOverlayClick}
            role="dialog"
          >
            <div className="canvas-modal__header">
              <div>
                <p className="canvas-modal__eyebrow">Workspace</p>
                <h2>{workspaceEditor.mode === 'create' ? 'New workspace' : 'Rename workspace'}</h2>
              </div>
            </div>
            <div className="workspace-editor">
              <label className="workspace-editor__field">
                <span>Name</span>
                <input
                  onChange={(event) =>
                    setWorkspaceEditor((current) =>
                      current
                        ? {
                            ...current,
                            name: event.target.value,
                          }
                        : current,
                    )
                  }
                  placeholder="Workspace name"
                  type="text"
                  value={workspaceEditor.name}
                />
              </label>
              <div className="workspace-editor__actions">
                <button
                  className="workspace-editor__secondary"
                  onClick={() => setWorkspaceEditor(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="workspace-editor__primary" onClick={submitWorkspaceEditor} type="button">
                  {workspaceEditor.mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {workspaceDeleteTarget ? (
        <div
          className="canvas-overlay-backdrop canvas-overlay-backdrop--stacked"
          onClick={() => setWorkspaceDeleteTarget(null)}
        >
          <section
            aria-modal="true"
            className="canvas-modal canvas-modal--editor"
            onClick={stopOverlayClick}
            role="dialog"
          >
            <div className="canvas-modal__header">
              <div>
                <p className="canvas-modal__eyebrow">Workspace</p>
                <h2>Delete workspace?</h2>
              </div>
            </div>
            <div className="workspace-delete">
              <p>
                <strong>{workspaceDeleteTarget.name}</strong> will be moved to recovery so it can be
                restored later.
              </p>
              <div className="workspace-editor__actions">
                <button
                  className="workspace-editor__secondary"
                  onClick={() => setWorkspaceDeleteTarget(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="workspace-delete__primary" onClick={confirmDeleteWorkspace} type="button">
                  Move to recovery
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
