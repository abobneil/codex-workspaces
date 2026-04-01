import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
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
  hasMoved: boolean
}

interface CanvasActionMenuState {
  x: number
  y: number
  worldX: number
  worldY: number
}

interface TextBoxRecord {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  html: string
  isPlaceholder: boolean
  fontFamily: string
  color: string
}

type ShapeKind = 'rectangle' | 'triangle' | 'circle' | 'ellipse'

interface ShapeRecord {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  kind: ShapeKind
  fillColor: string | null
  strokeColor: string
}

interface ResizeState {
  pointerId: number
  textBoxId: string
  handle: ResizeHandle
  startClientX: number
  startClientY: number
  initialBox: TextBoxRecord
}

interface SavedSelectionState {
  textBoxId: string
  range: Range
}

interface TextBoxDragState {
  pointerId: number
  textBoxId: string
  startClientX: number
  startClientY: number
  initialX: number
  initialY: number
  hasMoved: boolean
  source: 'box' | 'editor'
}

interface ShapeDragState {
  pointerId: number
  shapeId: string
  startClientX: number
  startClientY: number
  initialX: number
  initialY: number
  hasMoved: boolean
}

interface ShapeResizeState {
  pointerId: number
  shapeId: string
  handle: ResizeHandle
  startClientX: number
  startClientY: number
  initialShape: ShapeRecord
}

interface GridSettings {
  visible: boolean
  boldness: number
  color: string
}

interface TextBoxDefaults {
  fontFamily: string
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

interface PersistedCanvasState {
  workspaceRecords: WorkspaceRecord[]
  currentWorkspaceId: string
  workspaceTextBoxes: Record<string, TextBoxRecord[]>
  workspaceShapes: Record<string, ShapeRecord[]>
  gridSettings: GridSettings
  textBoxDefaults: TextBoxDefaults
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const GRID_SIZE = 60
const PAN_CLICK_TOLERANCE = 6
const CANVAS_ACTION_MENU_WIDTH = 232
const CANVAS_ACTION_MENU_HEIGHT = 64
const CANVAS_ACTION_MENU_OFFSET = 18
const TEXT_BOX_DEFAULT_WIDTH = 320
const TEXT_BOX_DEFAULT_HEIGHT = 180
const TEXT_BOX_MIN_WIDTH = 180
const TEXT_BOX_MIN_HEIGHT = 120
const TEXT_BOX_FONT_SIZE = 16
const TEXT_BOX_DRAG_TOLERANCE = 6
const SHAPE_DEFAULT_WIDTH = 220
const SHAPE_DEFAULT_HEIGHT = 140
const SHAPE_MIN_WIDTH = 36
const SHAPE_MIN_HEIGHT = 36
const SHAPE_STROKE_WIDTH = 3
const SHAPE_DEFAULT_FILL_COLOR = '#1d425f'
const SHAPE_DEFAULT_STROKE_COLOR = '#a4deff'
const LOCAL_STORAGE_KEY = 'codex-workspaces.canvas-state.v1'
const FONT_FAMILY_OPTIONS = [
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", "Segoe UI", sans-serif' },
  { label: 'Space Grotesk', value: '"Space Grotesk", "Segoe UI", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
]
const EMPTY_TEXT_BOXES: TextBoxRecord[] = []
const EMPTY_SHAPES: ShapeRecord[] = []

type OverlayView = 'settings' | 'help' | 'workspaces' | null
type WorkspaceLibraryView = 'active' | 'recovery'
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

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

function createTextBoxId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `textbox-${Date.now()}`
}

function createShapeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `shape-${Date.now()}`
}

function normalizeShapeDimensions(kind: ShapeKind, width: number, height: number) {
  if (kind === 'circle') {
    const size = Math.max(width, height)

    return {
      width: size,
      height: size,
    }
  }

  return { width, height }
}

function compareByZIndex(left: { zIndex: number; order: number }, right: { zIndex: number; order: number }) {
  if (left.zIndex !== right.zIndex) {
    return left.zIndex - right.zIndex
  }

  return left.order - right.order
}

function resizeShapeBounds(
  shape: ShapeRecord,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
) {
  if (shape.kind === 'circle') {
    const widthDelta = handle === 'nw' || handle === 'sw' ? -deltaX : deltaX
    const heightDelta = handle === 'nw' || handle === 'ne' ? -deltaY : deltaY
    const nextSize = Math.max(SHAPE_MIN_WIDTH, shape.width + widthDelta, shape.height + heightDelta)

    return {
      x: handle === 'nw' || handle === 'sw' ? shape.x + (shape.width - nextSize) : shape.x,
      y: handle === 'nw' || handle === 'ne' ? shape.y + (shape.height - nextSize) : shape.y,
      width: nextSize,
      height: nextSize,
    }
  }

  let nextX = shape.x
  let nextY = shape.y
  let nextWidth = shape.width
  let nextHeight = shape.height

  if (handle === 'nw' || handle === 'sw') {
    nextWidth = Math.max(SHAPE_MIN_WIDTH, shape.width - deltaX)
    nextX = shape.x + (shape.width - nextWidth)
  } else {
    nextWidth = Math.max(SHAPE_MIN_WIDTH, shape.width + deltaX)
  }

  if (handle === 'nw' || handle === 'ne') {
    nextHeight = Math.max(SHAPE_MIN_HEIGHT, shape.height - deltaY)
    nextY = shape.y + (shape.height - nextHeight)
  } else {
    nextHeight = Math.max(SHAPE_MIN_HEIGHT, shape.height + deltaY)
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  }
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection()

  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function selectAllText(element: HTMLElement) {
  const selection = window.getSelection()

  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

function isSelectionInsideElement(selection: Selection, element: HTMLElement) {
  const anchorNode = selection.anchorNode
  const focusNode = selection.focusNode

  if (!anchorNode || !focusNode) {
    return false
  }

  return element.contains(anchorNode) && element.contains(focusNode)
}

function readPersistedCanvasState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    return JSON.parse(rawValue) as PersistedCanvasState
  } catch {
    return null
  }
}

function getInitialCurrentWorkspaceId(persistedState: PersistedCanvasState | null) {
  const workspaceRecords = persistedState?.workspaceRecords ?? initialWorkspaces
  const activeWorkspaces = workspaceRecords.filter((workspace) => !workspace.deletedAt)

  if (activeWorkspaces.length === 0) {
    return workspaceRecords[0]?.id ?? initialWorkspaces[0].id
  }

  const persistedWorkspaceId = persistedState?.currentWorkspaceId
  const matchingWorkspace = activeWorkspaces.find((workspace) => workspace.id === persistedWorkspaceId)

  return matchingWorkspace?.id ?? activeWorkspaces[0].id
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

function TextBoxIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M5 7.5h14M12 7.5v9m-4-9h8m-7 9h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ShapesIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M6 6h6v6H6zM16.5 7.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5ZM8.5 15l3.25 3.5H5.25z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ConnectorsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M6.5 6.5h3v3h-3zM14.5 14.5h3v3h-3zM9.5 8h3a4 4 0 0 1 4 4v2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function EmbedIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M8 7.5A2.5 2.5 0 0 1 10.5 5h6A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 8 16.5zM5 9.5h2M5 14.5h2M12 9.5h3m-3 3h3"
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
  const resizeRef = useRef<ResizeState | null>(null)
  const textBoxDragRef = useRef<TextBoxDragState | null>(null)
  const shapeDragRef = useRef<ShapeDragState | null>(null)
  const shapeResizeRef = useRef<ShapeResizeState | null>(null)
  const textEditorRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const selectionRef = useRef<SavedSelectionState | null>(null)
  const [persistedState] = useState<PersistedCanvasState | null>(() => readPersistedCanvasState())

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false)
  const [canvasActionMenu, setCanvasActionMenu] = useState<CanvasActionMenuState | null>(null)
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [focusTextBoxId, setFocusTextBoxId] = useState<string | null>(null)
  const [textToolbar, setTextToolbar] = useState({
    color: persistedState?.textBoxDefaults.color ?? '#edf5ff',
  })
  const [activeOverlay, setActiveOverlay] = useState<OverlayView>(null)
  const [workspaceLibraryView, setWorkspaceLibraryView] = useState<WorkspaceLibraryView>('active')
  const [workspaceRecords, setWorkspaceRecords] = useState(
    persistedState?.workspaceRecords ?? initialWorkspaces,
  )
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() =>
    getInitialCurrentWorkspaceId(persistedState),
  )
  const [workspaceTextBoxes, setWorkspaceTextBoxes] = useState<Record<string, TextBoxRecord[]>>(
    persistedState?.workspaceTextBoxes ?? {},
  )
  const [workspaceShapes, setWorkspaceShapes] = useState<Record<string, ShapeRecord[]>>(
    persistedState?.workspaceShapes ?? {},
  )
  const [workspaceEditor, setWorkspaceEditor] = useState<WorkspaceEditorState | null>(null)
  const [workspaceDeleteTarget, setWorkspaceDeleteTarget] = useState<WorkspaceRecord | null>(null)
  const [gridSettings, setGridSettings] = useState<GridSettings>(
    persistedState?.gridSettings ?? {
      visible: true,
      boldness: 18,
      color: '#ffffff',
    },
  )
  const [textBoxDefaults, setTextBoxDefaults] = useState<TextBoxDefaults>(
    persistedState?.textBoxDefaults ?? {
      fontFamily: FONT_FAMILY_OPTIONS[0].value,
      color: '#edf5ff',
    },
  )
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    zoom: 1,
  })
  const activeWorkspaces = workspaceRecords.filter((workspace) => !workspace.deletedAt)
  const deletedWorkspaces = workspaceRecords.filter((workspace) => workspace.deletedAt)
  const currentWorkspace =
    activeWorkspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? activeWorkspaces[0]
  const textBoxes = workspaceTextBoxes[currentWorkspaceId] ?? EMPTY_TEXT_BOXES
  const shapes = workspaceShapes[currentWorkspaceId] ?? EMPTY_SHAPES
  const recentWorkspaces = [...activeWorkspaces]
    .sort(
      (left, right) =>
        new Date(right.lastModified).getTime() - new Date(left.lastModified).getTime(),
    )
    .slice(0, 5)

  const getResolvedShapeZIndex = (shape: ShapeRecord, index: number) => shape.zIndex ?? index
  const getResolvedTextBoxZIndex = (textBox: TextBoxRecord, index: number) =>
    textBox.zIndex ?? shapes.length + index

  const getOrderedCanvasObjects = () =>
    [
      ...shapes.map((shape, index) => ({
        id: shape.id,
        kind: 'shape' as const,
        zIndex: getResolvedShapeZIndex(shape, index),
        order: index,
      })),
      ...textBoxes.map((textBox, index) => ({
        id: textBox.id,
        kind: 'textBox' as const,
        zIndex: getResolvedTextBoxZIndex(textBox, index),
        order: shapes.length + index,
      })),
    ].sort(compareByZIndex)

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
      setCanvasActionMenu(null)
      setSelectedTextBoxId(null)
      setSelectedShapeId(null)
      setWorkspaceEditor(null)
      setWorkspaceDeleteTarget(null)
      setActiveOverlay(null)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!focusTextBoxId) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const editor = textEditorRefs.current[focusTextBoxId]
      const textBox = textBoxes.find((entry) => entry.id === focusTextBoxId)

      if (!editor || !textBox) {
        return
      }

      editor.focus()
      if (textBox.isPlaceholder) {
        selectAllText(editor)
      } else {
        placeCaretAtEnd(editor)
      }
      setFocusTextBoxId(null)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [focusTextBoxId, textBoxes])

  useEffect(() => {
    for (const textBox of textBoxes) {
      const editor = textEditorRefs.current[textBox.id]

      if (!editor) {
        continue
      }

      if (editor.innerHTML !== textBox.html) {
        editor.innerHTML = textBox.html
      }
    }
  }, [textBoxes])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        workspaceRecords,
        currentWorkspaceId,
        workspaceTextBoxes,
        workspaceShapes,
        gridSettings,
        textBoxDefaults,
      } satisfies PersistedCanvasState),
    )
  }, [
    workspaceRecords,
    currentWorkspaceId,
    workspaceTextBoxes,
    workspaceShapes,
    gridSettings,
    textBoxDefaults,
  ])

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

  const clientToWorld = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()

    if (!rect) {
      return null
    }

    const localX = clientX - rect.left
    const localY = clientY - rect.top

    return {
      worldX: (localX - viewport.x) / viewport.zoom,
      worldY: (localY - viewport.y) / viewport.zoom,
    }
  }

  const openCanvasActionMenu = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const worldPoint = clientToWorld(clientX, clientY)

    if (!rect || !worldPoint) {
      return
    }

    const left = clamp(
      clientX - rect.left + CANVAS_ACTION_MENU_OFFSET,
      16,
      rect.width - CANVAS_ACTION_MENU_WIDTH - 16,
    )
    const top = clamp(
      clientY - rect.top + CANVAS_ACTION_MENU_OFFSET,
      16,
      rect.height - CANVAS_ACTION_MENU_HEIGHT - 16,
    )

    setCanvasActionMenu({
      x: left,
      y: top,
      worldX: worldPoint.worldX,
      worldY: worldPoint.worldY,
    })
    setIsMenuOpen(false)
    setIsWorkspaceMenuOpen(false)
  }

  const isCanvasSurfaceTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && target.dataset.canvasSurface === 'true'

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setIsMenuOpen(false)
    setIsWorkspaceMenuOpen(false)
    setCanvasActionMenu(null)

    if (!isCanvasSurfaceTarget(event.target)) {
      return
    }

    setSelectedTextBoxId(null)
    setSelectedShapeId(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: viewport.x,
      initialY: viewport.y,
      hasMoved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - pan.startX
    const deltaY = event.clientY - pan.startY

    if (!pan.hasMoved && (Math.abs(deltaX) > PAN_CLICK_TOLERANCE || Math.abs(deltaY) > PAN_CLICK_TOLERANCE)) {
      pan.hasMoved = true
    }

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

  const handleCanvasDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !isCanvasSurfaceTarget(event.target)) {
      return
    }

    openCanvasActionMenu(event.clientX, event.clientY)
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
    setCanvasActionMenu(null)
    setWorkspaceEditor(null)
    setWorkspaceDeleteTarget(null)
    if (view === 'workspaces') {
      setWorkspaceLibraryView('active')
    }
  }

  const closeAllOverlays = () => {
    setIsMenuOpen(false)
    setIsWorkspaceMenuOpen(false)
    setCanvasActionMenu(null)
    setWorkspaceEditor(null)
    setWorkspaceDeleteTarget(null)
    setActiveOverlay(null)
    setWorkspaceLibraryView('active')
  }

  const stopEvent = (event: SyntheticEvent<HTMLElement>) => {
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

  const updateTextBoxDefault = <Key extends keyof TextBoxDefaults>(
    key: Key,
    value: TextBoxDefaults[Key],
  ) => {
    setTextBoxDefaults((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updateCurrentWorkspaceTextBoxes = (
    updater: TextBoxRecord[] | ((current: TextBoxRecord[]) => TextBoxRecord[]),
  ) => {
    setWorkspaceTextBoxes((current) => {
      const currentTextBoxes = current[currentWorkspaceId] ?? []
      const nextTextBoxes =
        typeof updater === 'function'
          ? (updater as (current: TextBoxRecord[]) => TextBoxRecord[])(currentTextBoxes)
          : updater

      return {
        ...current,
        [currentWorkspaceId]: nextTextBoxes,
      }
    })
  }

  const updateTextBox = (
    textBoxId: string,
    updater: (textBox: TextBoxRecord) => TextBoxRecord,
  ) => {
    updateCurrentWorkspaceTextBoxes((current) =>
      current.map((textBox) => (textBox.id === textBoxId ? updater(textBox) : textBox)),
    )
  }

  const updateCurrentWorkspaceShapes = (
    updater: ShapeRecord[] | ((current: ShapeRecord[]) => ShapeRecord[]),
  ) => {
    setWorkspaceShapes((current) => {
      const currentShapes = current[currentWorkspaceId] ?? []
      const nextShapes =
        typeof updater === 'function'
          ? (updater as (current: ShapeRecord[]) => ShapeRecord[])(currentShapes)
          : updater

      return {
        ...current,
        [currentWorkspaceId]: nextShapes,
      }
    })
  }

  const clearCanvasSelection = () => {
    setSelectedTextBoxId(null)
    setSelectedShapeId(null)
    setFocusTextBoxId(null)
    setCanvasActionMenu(null)
    selectionRef.current = null
  }

  const selectWorkspace = (workspaceId: string) => {
    clearCanvasSelection()
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
      clearCanvasSelection()
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
        clearCanvasSelection()
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

  const createTextBox = () => {
    if (!canvasActionMenu) {
      return
    }

    const orderedObjects = getOrderedCanvasObjects()
    const highestZIndex =
      orderedObjects.length > 0 ? orderedObjects[orderedObjects.length - 1].zIndex : 0
    const nextTextBox: TextBoxRecord = {
      id: createTextBoxId(),
      x: canvasActionMenu.worldX,
      y: canvasActionMenu.worldY,
      width: TEXT_BOX_DEFAULT_WIDTH,
      height: TEXT_BOX_DEFAULT_HEIGHT,
      zIndex: highestZIndex + 1,
      html: '<p>Start typing...</p>',
      isPlaceholder: true,
      fontFamily: textBoxDefaults.fontFamily,
      color: textBoxDefaults.color,
    }

    updateCurrentWorkspaceTextBoxes((current) => [...current, nextTextBox])
    setSelectedTextBoxId(nextTextBox.id)
    setSelectedShapeId(null)
    setFocusTextBoxId(nextTextBox.id)
    setTextToolbar({
      color: nextTextBox.color,
    })
    setCanvasActionMenu(null)
  }

  const createShape = (kind: ShapeKind) => {
    if (!canvasActionMenu) {
      return
    }

    const orderedObjects = getOrderedCanvasObjects()
    const highestZIndex =
      orderedObjects.length > 0 ? orderedObjects[orderedObjects.length - 1].zIndex : 0
    const dimensions = normalizeShapeDimensions(kind, SHAPE_DEFAULT_WIDTH, SHAPE_DEFAULT_HEIGHT)
    const nextShape: ShapeRecord = {
      id: createShapeId(),
      x: canvasActionMenu.worldX,
      y: canvasActionMenu.worldY,
      width: dimensions.width,
      height: dimensions.height,
      zIndex: highestZIndex + 1,
      kind,
      fillColor: SHAPE_DEFAULT_FILL_COLOR,
      strokeColor: SHAPE_DEFAULT_STROKE_COLOR,
    }

    updateCurrentWorkspaceShapes((current) => [...current, nextShape])
    setSelectedShapeId(nextShape.id)
    setSelectedTextBoxId(null)
    setFocusTextBoxId(null)
    selectionRef.current = null
    setCanvasActionMenu(null)
  }

  const selectCanvasAction = () => {
    setCanvasActionMenu(null)
  }

  const updateTextBoxHtml = (textBoxId: string, html: string) => {
    updateCurrentWorkspaceTextBoxes((current) =>
      current.map((textBox) =>
        textBox.id === textBoxId
          ? {
              ...textBox,
              html,
              isPlaceholder: false,
            }
          : textBox,
      ),
    )
  }

  const updateTextBoxFormatting = (
    textBoxId: string,
    patch: Partial<Pick<TextBoxRecord, 'fontFamily' | 'color'>>,
  ) => {
    updateTextBox(textBoxId, (textBox) => ({
      ...textBox,
      ...patch,
    }))
  }

  const focusTextBoxForEditing = (textBox: TextBoxRecord) => {
    setSelectedTextBoxId(textBox.id)
    setSelectedShapeId(null)
    setTextToolbar({
      color: textBox.color,
    })
    setCanvasActionMenu(null)

    const editor = textEditorRefs.current[textBox.id]

    if (!editor) {
      return
    }

    editor.focus()

    if (textBox.isPlaceholder) {
      selectAllText(editor)
    }
  }

  const persistEditorHtml = (textBoxId: string) => {
    const editor = textEditorRefs.current[textBoxId]

    if (!editor) {
      return
    }

    updateTextBoxHtml(textBoxId, editor.innerHTML)
  }

  const saveSelectionForTextBox = (textBoxId: string) => {
    const editor = textEditorRefs.current[textBoxId]
    const selection = window.getSelection()

    if (!editor || !selection || selection.rangeCount === 0) {
      return
    }

    if (!isSelectionInsideElement(selection, editor)) {
      return
    }

    selectionRef.current = {
      textBoxId,
      range: selection.getRangeAt(0).cloneRange(),
    }
  }

  const focusTextBoxEditor = (textBoxId: string) => {
    const editor = textEditorRefs.current[textBoxId]

    if (!editor) {
      return null
    }

    editor.focus()
    return editor
  }

  const getSelectionRangeForTextBox = (textBoxId: string) => {
    const editor = textEditorRefs.current[textBoxId]
    const selection = window.getSelection()

    if (editor && selection && selection.rangeCount > 0 && isSelectionInsideElement(selection, editor)) {
      return selection.getRangeAt(0).cloneRange()
    }

    if (selectionRef.current?.textBoxId === textBoxId) {
      return selectionRef.current.range.cloneRange()
    }

    return null
  }

  const restoreSelectionForTextBox = (textBoxId: string) => {
    const savedSelection = selectionRef.current
    const selection = window.getSelection()
    const editor = focusTextBoxEditor(textBoxId)

    if (!editor || !selection) {
      return editor
    }

    if (savedSelection?.textBoxId === textBoxId) {
      selection.removeAllRanges()
      selection.addRange(savedSelection.range.cloneRange())
      return editor
    }

    placeCaretAtEnd(editor)
    return editor
  }

  const applySelectionStyle = (
    textBoxId: string,
    stylePatch: Partial<Pick<CSSStyleDeclaration, 'fontFamily' | 'color'>>,
  ) => {
    const editor = restoreSelectionForTextBox(textBoxId)
    const selection = window.getSelection()
    const range = getSelectionRangeForTextBox(textBoxId)

    if (!editor || !selection || !range || range.collapsed) {
      return false
    }

    selection.removeAllRanges()
    selection.addRange(range)

    const span = document.createElement('span')

    if (stylePatch.fontFamily) {
      span.style.fontFamily = stylePatch.fontFamily
    }

    if (stylePatch.color) {
      span.style.color = stylePatch.color
    }

    span.appendChild(range.extractContents())
    range.insertNode(span)

    const nextRange = document.createRange()
    nextRange.selectNodeContents(span)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    persistEditorHtml(textBoxId)
    saveSelectionForTextBox(textBoxId)
    return true
  }

  const setTextSelectionColor = (textBox: TextBoxRecord, color: string) => {
    const range = getSelectionRangeForTextBox(textBox.id)

    setTextToolbar((current) => ({
      ...current,
      color,
    }))

    if (range && !range.collapsed) {
      applySelectionStyle(textBox.id, { color })
      return
    }

    updateTextBoxFormatting(textBox.id, { color })
  }

  const handleToolbarPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const handleToolbarActionPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const beginTextBoxDrag =
    (textBox: TextBoxRecord, source: TextBoxDragState['source']) =>
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!event.ctrlKey) {
        event.stopPropagation()
        setSelectedTextBoxId(textBox.id)
        setSelectedShapeId(null)
        setTextToolbar({
          color: textBox.color,
        })
        setCanvasActionMenu(null)

        if (source === 'editor') {
          focusTextBoxForEditing(textBox)
        }

        return
      }

      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      textBoxDragRef.current = {
        pointerId: event.pointerId,
        textBoxId: textBox.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        initialX: textBox.x,
        initialY: textBox.y,
        hasMoved: false,
        source,
      }
      setSelectedTextBoxId(textBox.id)
      setSelectedShapeId(null)
      setTextToolbar({
        color: textBox.color,
      })
      setCanvasActionMenu(null)
    }

  const handleTextBoxPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = textBoxDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.startClientX
    const deltaY = event.clientY - dragState.startClientY

    if (
      !dragState.hasMoved &&
      (Math.abs(deltaX) > TEXT_BOX_DRAG_TOLERANCE || Math.abs(deltaY) > TEXT_BOX_DRAG_TOLERANCE)
    ) {
      dragState.hasMoved = true
    }

    if (!dragState.hasMoved) {
      return
    }

    updateCurrentWorkspaceTextBoxes((current) =>
      current.map((textBox) =>
        textBox.id === dragState.textBoxId
          ? {
              ...textBox,
              x: dragState.initialX + deltaX / viewport.zoom,
              y: dragState.initialY + deltaY / viewport.zoom,
            }
          : textBox,
      ),
    )
  }

  const endTextBoxDrag =
    (textBox: TextBoxRecord) =>
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragState = textBoxDragRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      event.currentTarget.releasePointerCapture(event.pointerId)
      textBoxDragRef.current = null

      if (!dragState.hasMoved && dragState.source === 'editor') {
        focusTextBoxForEditing(textBox)
      }
    }

  const deleteTextBox = (textBoxId: string) => {
    updateCurrentWorkspaceTextBoxes((current) => current.filter((textBox) => textBox.id !== textBoxId))
    setSelectedTextBoxId((current) => (current === textBoxId ? null : current))
    setFocusTextBoxId((current) => (current === textBoxId ? null : current))
    if (selectionRef.current?.textBoxId === textBoxId) {
      selectionRef.current = null
    }
    delete textEditorRefs.current[textBoxId]
  }

  const beginResizeTextBox =
    (textBox: TextBoxRecord, handle: ResizeHandle) =>
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      resizeRef.current = {
        pointerId: event.pointerId,
        textBoxId: textBox.id,
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        initialBox: textBox,
      }
      setSelectedTextBoxId(textBox.id)
    }

  const handleResizePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeRef.current

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = (event.clientX - resizeState.startClientX) / viewport.zoom
    const deltaY = (event.clientY - resizeState.startClientY) / viewport.zoom
    const { initialBox, handle, textBoxId } = resizeState

    let nextX = initialBox.x
    let nextY = initialBox.y
    let nextWidth = initialBox.width
    let nextHeight = initialBox.height

    if (handle === 'nw' || handle === 'sw') {
      nextWidth = Math.max(TEXT_BOX_MIN_WIDTH, initialBox.width - deltaX)
      nextX = initialBox.x + (initialBox.width - nextWidth)
    } else {
      nextWidth = Math.max(TEXT_BOX_MIN_WIDTH, initialBox.width + deltaX)
    }

    if (handle === 'nw' || handle === 'ne') {
      nextHeight = Math.max(TEXT_BOX_MIN_HEIGHT, initialBox.height - deltaY)
      nextY = initialBox.y + (initialBox.height - nextHeight)
    } else {
      nextHeight = Math.max(TEXT_BOX_MIN_HEIGHT, initialBox.height + deltaY)
    }

    updateCurrentWorkspaceTextBoxes((current) =>
      current.map((textBox) =>
        textBox.id === textBoxId
          ? {
              ...textBox,
              x: nextX,
              y: nextY,
              width: nextWidth,
              height: nextHeight,
            }
          : textBox,
      ),
    )
  }

  const endResizeTextBox = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeRef.current

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    resizeRef.current = null
  }

  const updateShape = (
    shapeId: string,
    updater: (shape: ShapeRecord) => ShapeRecord,
  ) => {
    updateCurrentWorkspaceShapes((current) =>
      current.map((shape) => (shape.id === shapeId ? updater(shape) : shape)),
    )
  }

  const updateShapeColors = (
    shapeId: string,
    patch: Partial<Pick<ShapeRecord, 'fillColor' | 'strokeColor'>>,
  ) => {
    updateShape(shapeId, (shape) => ({
      ...shape,
      ...patch,
    }))
  }

  const moveCanvasObjectInLayer = (
    objectId: string,
    objectKind: 'shape' | 'textBox',
    direction: 'backward' | 'forward' | 'back' | 'front',
  ) => {
    const orderedObjects = getOrderedCanvasObjects()
    const targetIndex = orderedObjects.findIndex(
      (entry) => entry.id === objectId && entry.kind === objectKind,
    )

    if (targetIndex === -1) {
      return
    }

    const target = orderedObjects[targetIndex]

    if (direction === 'front') {
      const highestZIndex = orderedObjects[orderedObjects.length - 1]?.zIndex ?? target.zIndex
      const nextZIndex = highestZIndex + 1

      if (objectKind === 'shape') {
        updateShape(objectId, (shape) => ({ ...shape, zIndex: nextZIndex }))
      } else {
        updateTextBox(objectId, (textBox) => ({ ...textBox, zIndex: nextZIndex }))
      }
      return
    }

    if (direction === 'back') {
      const lowestZIndex = orderedObjects[0]?.zIndex ?? target.zIndex
      const nextZIndex = lowestZIndex - 1

      if (objectKind === 'shape') {
        updateShape(objectId, (shape) => ({ ...shape, zIndex: nextZIndex }))
      } else {
        updateTextBox(objectId, (textBox) => ({ ...textBox, zIndex: nextZIndex }))
      }
      return
    }

    const swapIndex = direction === 'forward' ? targetIndex + 1 : targetIndex - 1
    const swapTarget = orderedObjects[swapIndex]

    if (!swapTarget) {
      return
    }

    if (objectKind === 'shape') {
      updateShape(objectId, (shape) => ({ ...shape, zIndex: swapTarget.zIndex }))
    } else {
      updateTextBox(objectId, (textBox) => ({ ...textBox, zIndex: swapTarget.zIndex }))
    }

    if (swapTarget.kind === 'shape') {
      updateShape(swapTarget.id, (shape) => ({ ...shape, zIndex: target.zIndex }))
    } else {
      updateTextBox(swapTarget.id, (textBox) => ({ ...textBox, zIndex: target.zIndex }))
    }
  }

  const updateShapeKind = (shapeId: string, kind: ShapeKind) => {
    updateShape(shapeId, (shape) => {
      const dimensions = normalizeShapeDimensions(kind, shape.width, shape.height)

      return {
        ...shape,
        kind,
        width: dimensions.width,
        height: dimensions.height,
      }
    })
  }

  const beginShapeDrag =
    (shape: ShapeRecord) =>
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      shapeDragRef.current = {
        pointerId: event.pointerId,
        shapeId: shape.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        initialX: shape.x,
        initialY: shape.y,
        hasMoved: false,
      }
      setSelectedShapeId(shape.id)
      setSelectedTextBoxId(null)
      setFocusTextBoxId(null)
      selectionRef.current = null
      setCanvasActionMenu(null)
    }

  const handleShapePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = shapeDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragState.startClientX
    const deltaY = event.clientY - dragState.startClientY

    if (
      !dragState.hasMoved &&
      (Math.abs(deltaX) > TEXT_BOX_DRAG_TOLERANCE || Math.abs(deltaY) > TEXT_BOX_DRAG_TOLERANCE)
    ) {
      dragState.hasMoved = true
    }

    if (!dragState.hasMoved) {
      return
    }

    updateCurrentWorkspaceShapes((current) =>
      current.map((shape) =>
        shape.id === dragState.shapeId
          ? {
              ...shape,
              x: dragState.initialX + deltaX / viewport.zoom,
              y: dragState.initialY + deltaY / viewport.zoom,
            }
          : shape,
      ),
    )
  }

  const endShapeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = shapeDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    shapeDragRef.current = null
  }

  const deleteShape = (shapeId: string) => {
    updateCurrentWorkspaceShapes((current) => current.filter((shape) => shape.id !== shapeId))
    setSelectedShapeId((current) => (current === shapeId ? null : current))
  }

  const beginResizeShape =
    (shape: ShapeRecord, handle: ResizeHandle) =>
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      shapeResizeRef.current = {
        pointerId: event.pointerId,
        shapeId: shape.id,
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        initialShape: shape,
      }
      setSelectedShapeId(shape.id)
      setSelectedTextBoxId(null)
    }

  const handleShapeResizePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = shapeResizeRef.current

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return
    }

    const deltaX = (event.clientX - resizeState.startClientX) / viewport.zoom
    const deltaY = (event.clientY - resizeState.startClientY) / viewport.zoom
    const nextBounds = resizeShapeBounds(
      resizeState.initialShape,
      resizeState.handle,
      deltaX,
      deltaY,
    )

    updateCurrentWorkspaceShapes((current) =>
      current.map((shape) =>
        shape.id === resizeState.shapeId
          ? {
              ...shape,
              ...nextBounds,
            }
          : shape,
      ),
    )
  }

  const endShapeResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = shapeResizeRef.current

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    shapeResizeRef.current = null
  }

  return (
    <main className="infinite-canvas-page">
      <button
        aria-label="Open canvas menu"
        aria-expanded={isMenuOpen}
        className="canvas-icon-button canvas-icon-button--menu"
        onClick={() => {
          setIsWorkspaceMenuOpen(false)
          setCanvasActionMenu(null)
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
          <section className="canvas-menu-panel" onClick={stopEvent}>
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
            setCanvasActionMenu(null)
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
          <section className="workspace-menu-panel" onClick={stopEvent}>
            <div className="workspace-menu-panel__section">
              <p className="workspace-menu-panel__eyebrow">Recent Workspaces</p>
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
                  </button>
                ))}
              </div>
            </div>

            <button className="workspace-menu-all" onClick={() => openOverlay('workspaces')} type="button">
              All Workspaces
            </button>
          </section>
        </>
      ) : null}

      <div
        className="canvas-viewport-shell"
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={viewportRef}
        data-canvas-surface="true"
      >
        {gridSettings.visible ? (
          <div
            className="canvas-grid"
            data-canvas-surface="true"
            style={{
              backgroundImage: `linear-gradient(${gridLineColor} 1px, transparent 1px), linear-gradient(90deg, ${gridLineColor} 1px, transparent 1px)`,
              backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          />
        ) : null}

        <div
          className="canvas-world"
          data-canvas-surface="true"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          }}
        >
          {shapes.map((shape, index) => {
            const isSelected = shape.id === selectedShapeId
            const rectangleWidth = Math.max(shape.width - SHAPE_STROKE_WIDTH, 0)
            const rectangleHeight = Math.max(shape.height - SHAPE_STROKE_WIDTH, 0)
            const circleRadius = Math.max(shape.width / 2 - SHAPE_STROKE_WIDTH / 2, 0)
            const trianglePoints = `${shape.width / 2},${SHAPE_STROKE_WIDTH / 2} ${shape.width - SHAPE_STROKE_WIDTH / 2},${shape.height - SHAPE_STROKE_WIDTH / 2} ${SHAPE_STROKE_WIDTH / 2},${shape.height - SHAPE_STROKE_WIDTH / 2}`

            return (
              <article
                className={`canvas-shape${isSelected ? ' is-selected' : ''}`}
                key={shape.id}
                onPointerCancel={endShapeDrag}
                onPointerDown={beginShapeDrag(shape)}
                onPointerMove={handleShapePointerMove}
                onPointerUp={endShapeDrag}
                style={{
                  left: `${shape.x}px`,
                  top: `${shape.y}px`,
                  width: `${shape.width}px`,
                  height: `${shape.height}px`,
                  zIndex: getResolvedShapeZIndex(shape, index),
                }}
              >
                <svg
                  aria-hidden="true"
                  className="canvas-shape__svg"
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${shape.width} ${shape.height}`}
                >
                  {shape.kind === 'rectangle' ? (
                    <rect
                      fill={shape.fillColor ?? 'none'}
                      height={rectangleHeight}
                      rx="20"
                      stroke={shape.strokeColor}
                      strokeWidth={SHAPE_STROKE_WIDTH}
                      width={rectangleWidth}
                      x={SHAPE_STROKE_WIDTH / 2}
                      y={SHAPE_STROKE_WIDTH / 2}
                    />
                  ) : null}
                  {shape.kind === 'circle' ? (
                    <circle
                      cx={shape.width / 2}
                      cy={shape.height / 2}
                      fill={shape.fillColor ?? 'none'}
                      r={circleRadius}
                      stroke={shape.strokeColor}
                      strokeWidth={SHAPE_STROKE_WIDTH}
                    />
                  ) : null}
                  {shape.kind === 'ellipse' ? (
                    <ellipse
                      cx={shape.width / 2}
                      cy={shape.height / 2}
                      fill={shape.fillColor ?? 'none'}
                      rx={Math.max(shape.width / 2 - SHAPE_STROKE_WIDTH / 2, 0)}
                      ry={Math.max(shape.height / 2 - SHAPE_STROKE_WIDTH / 2, 0)}
                      stroke={shape.strokeColor}
                      strokeWidth={SHAPE_STROKE_WIDTH}
                    />
                  ) : null}
                  {shape.kind === 'triangle' ? (
                    <polygon
                      fill={shape.fillColor ?? 'none'}
                      points={trianglePoints}
                      stroke={shape.strokeColor}
                      strokeLinejoin="round"
                      strokeWidth={SHAPE_STROKE_WIDTH}
                    />
                  ) : null}
                </svg>

                {isSelected ? (
                  <>
                    <div className="canvas-text-box__toolbar" onPointerDown={handleToolbarPointerDown}>
                      <label className="canvas-text-box__toolbar-field">
                        <span>Shape</span>
                        <select
                          aria-label="Shape type"
                          onChange={(event) => updateShapeKind(shape.id, event.target.value as ShapeKind)}
                          value={shape.kind}
                        >
                          <option value="rectangle">Rectangle</option>
                          <option value="triangle">Triangle</option>
                          <option value="circle">Circle</option>
                          <option value="ellipse">Ellipse</option>
                        </select>
                      </label>
                      <label className="canvas-text-box__toolbar-field canvas-text-box__toolbar-field--color">
                        <span>Fill</span>
                        <input
                          onChange={(event) => updateShapeColors(shape.id, { fillColor: event.target.value })}
                          type="color"
                          value={shape.fillColor ?? SHAPE_DEFAULT_FILL_COLOR}
                        />
                      </label>
                      <button
                        aria-label={shape.fillColor === null ? 'Restore shape fill' : 'Remove shape fill'}
                        className={`canvas-text-box__toolbar-button${
                          shape.fillColor === null ? ' canvas-text-box__toolbar-button--active' : ''
                        }`}
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          updateShapeColors(shape.id, {
                            fillColor: shape.fillColor === null ? SHAPE_DEFAULT_FILL_COLOR : null,
                          })
                        }}
                        title={shape.fillColor === null ? 'Restore fill' : 'No fill'}
                        type="button"
                      >
                        None
                      </button>
                      <label className="canvas-text-box__toolbar-field canvas-text-box__toolbar-field--color">
                        <span>Outline</span>
                        <input
                          onChange={(event) =>
                            updateShapeColors(shape.id, { strokeColor: event.target.value })
                          }
                          type="color"
                          value={shape.strokeColor}
                        />
                      </label>
                      <button
                        aria-label="Delete shape"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--danger"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteShape(shape.id)
                        }}
                        title="Delete"
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                      <button
                        aria-label="Send shape to back"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(shape.id, 'shape', 'back')
                        }}
                        title="Send to back"
                        type="button"
                      >
                        Back
                      </button>
                      <button
                        aria-label="Send shape backward"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(shape.id, 'shape', 'backward')
                        }}
                        title="Send backward"
                        type="button"
                      >
                        Down
                      </button>
                      <button
                        aria-label="Bring shape forward"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(shape.id, 'shape', 'forward')
                        }}
                        title="Bring forward"
                        type="button"
                      >
                        Up
                      </button>
                      <button
                        aria-label="Bring shape to front"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(shape.id, 'shape', 'front')
                        }}
                        title="Bring to front"
                        type="button"
                      >
                        Front
                      </button>
                    </div>
                    <button
                      aria-label="Resize shape from top left"
                      className="canvas-text-box__handle canvas-text-box__handle--nw"
                      onPointerCancel={endShapeResize}
                      onPointerDown={beginResizeShape(shape, 'nw')}
                      onPointerMove={handleShapeResizePointerMove}
                      onPointerUp={endShapeResize}
                      type="button"
                    />
                    <button
                      aria-label="Resize shape from top right"
                      className="canvas-text-box__handle canvas-text-box__handle--ne"
                      onPointerCancel={endShapeResize}
                      onPointerDown={beginResizeShape(shape, 'ne')}
                      onPointerMove={handleShapeResizePointerMove}
                      onPointerUp={endShapeResize}
                      type="button"
                    />
                    <button
                      aria-label="Resize shape from bottom left"
                      className="canvas-text-box__handle canvas-text-box__handle--sw"
                      onPointerCancel={endShapeResize}
                      onPointerDown={beginResizeShape(shape, 'sw')}
                      onPointerMove={handleShapeResizePointerMove}
                      onPointerUp={endShapeResize}
                      type="button"
                    />
                    <button
                      aria-label="Resize shape from bottom right"
                      className="canvas-text-box__handle canvas-text-box__handle--se"
                      onPointerCancel={endShapeResize}
                      onPointerDown={beginResizeShape(shape, 'se')}
                      onPointerMove={handleShapeResizePointerMove}
                      onPointerUp={endShapeResize}
                      type="button"
                    />
                  </>
                ) : null}
              </article>
            )
          })}

          {textBoxes.map((textBox, index) => {
            const isSelected = textBox.id === selectedTextBoxId

            return (
              <article
                className={`canvas-text-box${isSelected ? ' is-selected' : ''}`}
                key={textBox.id}
                onPointerCancel={endTextBoxDrag(textBox)}
                onPointerDown={beginTextBoxDrag(textBox, 'box')}
                onPointerMove={handleTextBoxPointerMove}
                onPointerUp={endTextBoxDrag(textBox)}
                style={{
                  left: `${textBox.x}px`,
                  top: `${textBox.y}px`,
                  width: `${textBox.width}px`,
                  height: `${textBox.height}px`,
                  zIndex: getResolvedTextBoxZIndex(textBox, index),
                }}
              >
                <div
                  aria-label="Rich text box"
                  className={`canvas-text-box__editor${textBox.isPlaceholder ? ' is-placeholder' : ''}`}
                  contentEditable
                  dir="ltr"
                  onBlur={() => persistEditorHtml(textBox.id)}
                  onKeyUp={() => saveSelectionForTextBox(textBox.id)}
                  onInput={(event) => updateTextBoxHtml(textBox.id, event.currentTarget.innerHTML)}
                  onMouseUp={() => saveSelectionForTextBox(textBox.id)}
                  onPointerCancel={endTextBoxDrag(textBox)}
                  onPointerDown={beginTextBoxDrag(textBox, 'editor')}
                  onPointerMove={handleTextBoxPointerMove}
                  onPointerUp={endTextBoxDrag(textBox)}
                  ref={(node) => {
                    textEditorRefs.current[textBox.id] = node
                    if (node && node.innerHTML !== textBox.html) {
                      node.innerHTML = textBox.html
                    }
                  }}
                  style={{
                    color: textBox.color,
                    fontFamily: textBox.fontFamily,
                    fontSize: `${TEXT_BOX_FONT_SIZE}px`,
                  }}
                  suppressContentEditableWarning
                />

                {isSelected ? (
                  <>
                    <div className="canvas-text-box__toolbar" onPointerDown={handleToolbarPointerDown}>
                      <label className="canvas-text-box__toolbar-field canvas-text-box__toolbar-field--color">
                        <span>Color</span>
                        <input
                          onChange={(event) => setTextSelectionColor(textBox, event.target.value)}
                          type="color"
                          value={textToolbar.color}
                        />
                      </label>
                      <button
                        aria-label="Delete text box"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--danger"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteTextBox(textBox.id)
                        }}
                        title="Delete"
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                      <button
                        aria-label="Send text box to back"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(textBox.id, 'textBox', 'back')
                        }}
                        title="Send to back"
                        type="button"
                      >
                        Back
                      </button>
                      <button
                        aria-label="Send text box backward"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(textBox.id, 'textBox', 'backward')
                        }}
                        title="Send backward"
                        type="button"
                      >
                        Down
                      </button>
                      <button
                        aria-label="Bring text box forward"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(textBox.id, 'textBox', 'forward')
                        }}
                        title="Bring forward"
                        type="button"
                      >
                        Up
                      </button>
                      <button
                        aria-label="Bring text box to front"
                        className="canvas-text-box__toolbar-button canvas-text-box__toolbar-button--wide"
                        onPointerDown={handleToolbarActionPointerDown}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveCanvasObjectInLayer(textBox.id, 'textBox', 'front')
                        }}
                        title="Bring to front"
                        type="button"
                      >
                        Front
                      </button>
                    </div>
                    <button
                      aria-label="Resize text box from top left"
                      className="canvas-text-box__handle canvas-text-box__handle--nw"
                      onPointerCancel={endResizeTextBox}
                      onPointerDown={beginResizeTextBox(textBox, 'nw')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={endResizeTextBox}
                      type="button"
                    />
                    <button
                      aria-label="Resize text box from top right"
                      className="canvas-text-box__handle canvas-text-box__handle--ne"
                      onPointerCancel={endResizeTextBox}
                      onPointerDown={beginResizeTextBox(textBox, 'ne')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={endResizeTextBox}
                      type="button"
                    />
                    <button
                      aria-label="Resize text box from bottom left"
                      className="canvas-text-box__handle canvas-text-box__handle--sw"
                      onPointerCancel={endResizeTextBox}
                      onPointerDown={beginResizeTextBox(textBox, 'sw')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={endResizeTextBox}
                      type="button"
                    />
                    <button
                      aria-label="Resize text box from bottom right"
                      className="canvas-text-box__handle canvas-text-box__handle--se"
                      onPointerCancel={endResizeTextBox}
                      onPointerDown={beginResizeTextBox(textBox, 'se')}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={endResizeTextBox}
                      type="button"
                    />
                  </>
                ) : null}
              </article>
            )
          })}
        </div>

        {canvasActionMenu ? (
          <section
            aria-label="Canvas actions"
            className="canvas-action-menu"
            onClick={stopEvent}
            onPointerDown={stopEvent}
            role="menu"
            style={{
              left: `${canvasActionMenu.x}px`,
              top: `${canvasActionMenu.y}px`,
            }}
          >
            <button
              aria-label="Insert text box"
              className="canvas-action-menu__item"
              onClick={createTextBox}
              role="menuitem"
              title="Text Box"
              type="button"
            >
              <TextBoxIcon />
            </button>
            <button
              aria-label="Insert shape"
              className="canvas-action-menu__item"
              onClick={() => createShape('rectangle')}
              role="menuitem"
              title="Shapes"
              type="button"
            >
              <ShapesIcon />
            </button>
            <button
              aria-label="Insert connector"
              className="canvas-action-menu__item"
              onClick={selectCanvasAction}
              role="menuitem"
              title="Connectors"
              type="button"
            >
              <ConnectorsIcon />
            </button>
            <button
              aria-label="Embed file, image, website, audio, or video"
              className="canvas-action-menu__item"
              onClick={selectCanvasAction}
              role="menuitem"
              title="Embed"
              type="button"
            >
              <EmbedIcon />
            </button>
          </section>
        ) : null}
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
            onClick={stopEvent}
            role="dialog"
          >
            <div className="canvas-modal__header">
              <div>
                <h2>
                  {activeOverlay === 'settings'
                    ? 'Settings'
                    : activeOverlay === 'workspaces'
                      ? 'All Workspaces'
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

                  <div className="settings-section__header">
                    <div>
                      <p className="settings-section__eyebrow">Objects</p>
                      <h3>Text Boxes</h3>
                    </div>
                  </div>

                  <label className="settings-field">
                    <div className="settings-field__label-row">
                      <span>Default font</span>
                    </div>
                    <select
                      className="settings-select"
                      onChange={(event) => updateTextBoxDefault('fontFamily', event.target.value)}
                      value={textBoxDefaults.fontFamily}
                    >
                      {FONT_FAMILY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="settings-field settings-field--color">
                    <div className="settings-field__label-row">
                      <span>Default font color</span>
                      <strong>{textBoxDefaults.color.toUpperCase()}</strong>
                    </div>
                    <input
                      onChange={(event) => updateTextBoxDefault('color', event.target.value)}
                      type="color"
                      value={textBoxDefaults.color}
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
            onClick={stopEvent}
            role="dialog"
          >
            <div className="canvas-modal__header">
              <div>
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
            onClick={stopEvent}
            role="dialog"
          >
            <div className="canvas-modal__header">
              <div>
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
