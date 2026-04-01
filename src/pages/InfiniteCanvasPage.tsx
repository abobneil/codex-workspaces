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
  sharedWith: string[]
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
    sharedWith: ['Ava Brooks', 'Jordan Lee', 'Priya Shah'],
    deletedAt: null,
  },
  {
    id: 'launch-room',
    name: 'Launch Room',
    lastModified: '2026-03-31T18:12:00',
    sharedWith: ['Mia Chen', 'Theo Carter', 'Cam Flores'],
    deletedAt: null,
  },
  {
    id: 'client-ops',
    name: 'Client Ops',
    lastModified: '2026-03-31T15:40:00',
    sharedWith: ['Nina Patel', 'Sam Rivera'],
    deletedAt: null,
  },
  {
    id: 'brand-system',
    name: 'Brand System',
    lastModified: '2026-03-30T17:05:00',
    sharedWith: ['Drew Morgan', 'Elise Park', 'Max Turner'],
    deletedAt: null,
  },
  {
    id: 'roadmap-room',
    name: 'Roadmap Room',
    lastModified: '2026-03-29T14:18:00',
    sharedWith: ['Kai Bennett', 'Lena Ortiz', 'Omar Hassan'],
    deletedAt: null,
  },
  {
    id: 'research-vault',
    name: 'Research Vault',
    lastModified: '2026-03-28T11:32:00',
    sharedWith: ['Tara Ng', 'Jules Mercer'],
    deletedAt: null,
  },
  {
    id: 'partner-hub',
    name: 'Partner Hub',
    lastModified: '2026-03-26T09:20:00',
    sharedWith: ['Rae Kim', 'Dominic Price', 'Will Adams'],
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

function getMemberInitials(name: string) {
  const segments = name.trim().split(/\s+/).filter(Boolean)

  if (segments.length === 0) {
    return '??'
  }

  const firstInitial = segments[0][0] ?? ''
  const lastInitial = segments.length > 1 ? segments[segments.length - 1][0] ?? '' : segments[0][1] ?? firstInitial

  return `${firstInitial}${lastInitial}`.toUpperCase()
}

function createWorkspaceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `workspace-${Date.now()}`
}

function ActiveIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M3 7.75A2.75 2.75 0 0 1 5.75 5h4.1a2 2 0 0 1 1.42.59l1.14 1.16a2 2 0 0 0 1.43.59h4.41A2.75 2.75 0 0 1 21 10.09v6.16A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function DeletedIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M4 7h16m-10 4v5m4-5v5m-7-9V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V7m-11 0 1 11a2 2 0 0 0 2 1.82h6a2 2 0 0 0 2-1.82L18 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path
        d="M4 20h4l10.5-10.5a1.94 1.94 0 0 0 0-2.74l-1.26-1.26a1.94 1.94 0 0 0-2.74 0L4 16z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path
        d="M5 7h14M9 7V5h6v2m-7 3v7m4-7v7m4-7v7M7 7l1 12h8l1-12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
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
        sharedWith: ['Only You'],
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
                        aria-label="Show active workspaces"
                        aria-selected={workspaceLibraryView === 'active'}
                        className={`canvas-modal__toggle-option${
                          workspaceLibraryView === 'active' ? ' is-active' : ''
                        }`}
                        onClick={() => setWorkspaceLibraryView('active')}
                        role="tab"
                        title="Active workspaces"
                        type="button"
                      >
                        <ActiveIcon />
                      </button>
                      <button
                        aria-label="Show deleted workspaces"
                        aria-selected={workspaceLibraryView === 'recovery'}
                        className={`canvas-modal__toggle-option${
                          workspaceLibraryView === 'recovery' ? ' is-active' : ''
                        }`}
                        disabled={deletedWorkspaces.length === 0}
                        onClick={() => setWorkspaceLibraryView('recovery')}
                        role="tab"
                        title="Deleted workspaces"
                        type="button"
                      >
                        <DeletedIcon />
                      </button>
                    </div>
                    {workspaceLibraryView === 'active' ? (
                      <button
                        aria-label="Create a new workspace"
                        className="canvas-modal__action-primary"
                        onClick={() => openWorkspaceEditor('create')}
                        title="New workspace"
                        type="button"
                      >
                        <PlusIcon />
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  aria-label="Close workspace library"
                  className="canvas-modal__close"
                  onClick={closeAllOverlays}
                  title="Close"
                  type="button"
                >
                  <CloseIcon />
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
                          <div className="workspace-card__title-group">
                            <h3>{workspace.name}</h3>
                            <p className="workspace-card__subtitle">
                              {formatWorkspaceDate(workspace.lastModified)}
                            </p>
                          </div>
                          <div className="workspace-card__header-actions">
                            <button
                              aria-label={`Rename ${workspace.name}`}
                              className="workspace-card__edit"
                              onClick={(event) => {
                                event.stopPropagation()
                                openWorkspaceEditor('rename', workspace)
                              }}
                              title="Rename workspace"
                              type="button"
                            >
                              <EditIcon />
                            </button>
                            <button
                              aria-label={`Delete ${workspace.name}`}
                              className="workspace-card__trash"
                              disabled={activeWorkspaces.length <= 1}
                              onClick={(event) => {
                                event.stopPropagation()
                                setWorkspaceDeleteTarget(workspace)
                              }}
                              title="Delete workspace"
                              type="button"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                        <div
                          aria-label={`Shared with ${workspace.sharedWith.join(', ')}`}
                          className="workspace-card__members"
                        >
                          {workspace.sharedWith.map((member) => (
                            <span className="workspace-card__member" key={member}>
                              <span className="workspace-card__member-badge" aria-hidden="true">
                                {getMemberInitials(member)}
                              </span>
                              <span className="workspace-card__member-tooltip">{member}</span>
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </section>
                ) : (
                  <section className="workspace-library workspace-library--recovery">
                    {deletedWorkspaces.length > 0 ? (
                      deletedWorkspaces.map((workspace) => (
                        <article className="workspace-card workspace-card--recovery" key={workspace.id}>
                          <div className="workspace-card__header">
                            <div className="workspace-card__title-group">
                              <h3>{workspace.name}</h3>
                              <p className="workspace-card__subtitle">
                                {formatWorkspaceDate(workspace.lastModified)}
                              </p>
                            </div>
                            <button
                              className="workspace-card__restore"
                              onClick={() => restoreWorkspace(workspace.id)}
                              type="button"
                            >
                              Restore
                            </button>
                          </div>
                          <div
                            aria-label={`Shared with ${workspace.sharedWith.join(', ')}`}
                            className="workspace-card__members"
                          >
                            {workspace.sharedWith.map((member) => (
                              <span className="workspace-card__member" key={member}>
                                <span className="workspace-card__member-badge" aria-hidden="true">
                                  {getMemberInitials(member)}
                                </span>
                                <span className="workspace-card__member-tooltip">{member}</span>
                              </span>
                            ))}
                          </div>
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
