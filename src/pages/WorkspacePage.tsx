import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CanvasObjectCard } from '../components/CanvasObjectCard'
import { ComposerCard } from '../components/ComposerCard'
import { InspectorPanel } from '../components/InspectorPanel'
import { canvasBounds, workspaces } from '../data/workspaces'
import type {
  ActivityItem,
  AudioCanvasObject,
  CanvasObject,
  FileCanvasObject,
  GraphCanvasObject,
  ImageCanvasObject,
  PaletteForm,
  TextCanvasObject,
  Workspace,
} from '../types'

interface ViewportState {
  x: number
  y: number
  zoom: number
}

interface ComposerState {
  x: number
  y: number
}

interface PanState {
  pointerId: number
  startX: number
  startY: number
  initialX: number
  initialY: number
  moved: boolean
}

const defaultViewport: ViewportState = {
  x: -280,
  y: -140,
  zoom: 0.92,
}

const palettePresets: PaletteForm[] = [
  {
    primary: '#1C356C',
    secondary: '#F3BE4F',
    accent: '#F46A5A',
  },
  {
    primary: '#0E534E',
    secondary: '#8DE0C6',
    accent: '#F2A15D',
  },
  {
    primary: '#352B6B',
    secondary: '#D8B8FF',
    accent: '#56C8E9',
  },
]

function createId(prefix: string) {
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`

  return `${prefix}-${token}`
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function formatActivityTime() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isImageObject(object: CanvasObject | null): object is ImageCanvasObject {
  return object?.kind === 'image'
}

function getDefaultPalette(object?: CanvasObject) {
  if (object?.kind === 'image') {
    return {
      primary: object.swatches[0] ?? '#1C356C',
      secondary: object.swatches[1] ?? '#F3BE4F',
      accent: object.swatches[2] ?? '#F46A5A',
    }
  }

  return palettePresets[0]
}

function buildPromptResponse(
  prompt: string,
  composer: ComposerState,
): [TextCanvasObject, TextCanvasObject] {
  const cleanPrompt = prompt.trim()

  return [
    {
      id: createId('request'),
      kind: 'text',
      title: 'New request',
      subtitle: 'Captured on the canvas',
      badge: 'ask',
      x: composer.x,
      y: composer.y,
      width: 320,
      height: 230,
      content: cleanPrompt,
      bullets: [
        'Codex inspects the context nearby',
        'Server-side tools are chosen automatically',
        'Outputs return as linked objects',
      ],
    },
    {
      id: createId('plan'),
      kind: 'text',
      title: 'Codex plan',
      subtitle: 'What the system will do next',
      badge: 'plan',
      x: composer.x + 360,
      y: composer.y + 24,
      width: 320,
      height: 250,
      content:
        'Codex will turn this request into a small, purpose-built workflow and place the results back on the canvas in a format the user can immediately use.',
      bullets: ['Gather nearby context', 'Run the right toolchain', 'Return drafts, variants, or actions'],
    },
  ]
}

export function WorkspacePage() {
  const { workspaceId } = useParams()
  const workspace = workspaces.find((item) => item.id === workspaceId)

  if (!workspace) {
    return <Navigate to="/" replace />
  }

  return <WorkspaceScreen key={workspace.id} workspace={workspace} />
}

function WorkspaceScreen({ workspace }: { workspace: Workspace }) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef<PanState | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const objectUrlsRef = useRef<string[]>([])

  const [objects, setObjects] = useState<CanvasObject[]>(() => workspace.objects)
  const [activity, setActivity] = useState<ActivityItem[]>(() => workspace.recentActivity)
  const [selectedId, setSelectedId] = useState<string | null>(
    () => workspace.objects[0]?.id ?? null,
  )
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [composerPrompt, setComposerPrompt] = useState('')
  const [viewport, setViewport] = useState<ViewportState>(defaultViewport)
  const [palette, setPalette] = useState<PaletteForm>(() =>
    getDefaultPalette(workspace.objects.find((object) => object.kind === 'image')),
  )
  const [palettePresetIndex, setPalettePresetIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  const selectedObject =
    objects.find((object) => object.id === selectedId) ?? null

  const cleanupMedia = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => cleanupMedia, [])

  const addActivity = (label: string, detail: string) => {
    setActivity((current) => [
      {
        id: createId('activity'),
        label,
        detail,
        time: formatActivityTime(),
      },
      ...current,
    ])
  }

  const focusObject = (object: CanvasObject | null) => {
    setSelectedId(object?.id ?? null)
    setComposer(null)
    if (isImageObject(object)) {
      setPalette(getDefaultPalette(object))
    }
  }

  const focusObjectById = (id: string) => {
    const object = objects.find((item) => item.id === id) ?? null
    focusObject(object)
  }

  const addObject = (object: CanvasObject) => {
    setObjects((current) => [...current, object])
    setSelectedId(object.id)
    setComposer(null)
    if (isImageObject(object)) {
      setPalette(getDefaultPalette(object))
    }
  }

  const addObjects = (nextObjects: CanvasObject[]) => {
    setObjects((current) => [...current, ...nextObjects])
    const lastObject = nextObjects.at(-1) ?? null
    setSelectedId(lastObject?.id ?? null)
    setComposer(null)
    if (isImageObject(lastObject)) {
      setPalette(getDefaultPalette(lastObject))
    }
  }

  const getWorldPoint = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()

    if (!rect) {
      return { x: 160, y: 160 }
    }

    const x = (clientX - rect.left - viewport.x) / viewport.zoom
    const y = (clientY - rect.top - viewport.y) / viewport.zoom

    return {
      x: clamp(x, 80, canvasBounds.width - 420),
      y: clamp(y, 80, canvasBounds.height - 320),
    }
  }

  const openComposerAt = (clientX: number, clientY: number, seededPrompt = '') => {
    const point = getWorldPoint(clientX, clientY)
    setComposer(point)
    setComposerPrompt(seededPrompt)
    setRecordingError(null)
    setSelectedId(null)
  }

  const openComposerInCenter = (seededPrompt = '') => {
    const rect = viewportRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    openComposerAt(rect.left + rect.width / 2, rect.top + rect.height / 2, seededPrompt)
  }

  const closeComposer = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }

    setComposer(null)
    setComposerPrompt('')
    setRecordingError(null)
    setIsRecording(false)
  }

  const handleComposerSubmit = () => {
    if (!composer || !composerPrompt.trim()) {
      return
    }

    const created = buildPromptResponse(composerPrompt, composer)
    addObjects(created)
    addActivity(
      'Codex accepted a new request',
      `The prompt "${composerPrompt.trim().slice(0, 72)}" is now being turned into a bespoke workflow.`,
    )
    setComposer(null)
    setComposerPrompt('')
  }

  const startRecording = async () => {
    if (!composer) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Audio capture is not available in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const audioUrl = URL.createObjectURL(blob)
        objectUrlsRef.current.push(audioUrl)

        const audioObject: AudioCanvasObject = {
          id: createId('audio-note'),
          kind: 'audio',
          title: 'Voice request',
          subtitle: 'Recorded directly on the canvas',
          badge: 'audio',
          x: composer.x,
          y: composer.y,
          width: 320,
          height: 240,
          transcript:
            'Voice note captured. Codex can now transcribe it, pull quotes, or spin up a helper workflow.',
          duration: 'new',
          audioUrl,
        }

        addObject(audioObject)
        addActivity(
          'A voice note was added',
          'The recording is now a first-class object that can be summarized, quoted, or transformed into next steps.',
        )

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setComposer(null)
        setComposerPrompt('')
        setIsRecording(false)
        setRecordingError(null)
      }

      recorder.start()
      setIsRecording(true)
      setRecordingError(null)
    } catch {
      setRecordingError('Microphone access was blocked. You can still type your request.')
    }
  }

  const stopRecording = () => {
    if (!recorderRef.current) {
      return
    }

    if (recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
      return
    }

    void startRecording()
  }

  const handleRecommendPalette = () => {
    const nextIndex = (palettePresetIndex + 1) % palettePresets.length
    setPalettePresetIndex(nextIndex)
    setPalette(palettePresets[nextIndex])
    addActivity(
      'Codex recommended a new palette',
      'The recommendation updated the primary, secondary, and accent swatches for the selected image action.',
    )
  }

  const handleAction = (actionId: string) => {
    if (!selectedObject) {
      return
    }

    const anchorX = selectedObject.x + selectedObject.width + 48
    const anchorY = selectedObject.y + 18

    switch (actionId) {
      case 'recolor-variant': {
        const imageObject: ImageCanvasObject = {
          id: createId('recolor'),
          kind: 'image',
          title: `${selectedObject.title} / recolor`,
          subtitle: 'Generated palette variant',
          badge: 'variant',
          x: clamp(anchorX, 90, canvasBounds.width - 420),
          y: clamp(anchorY, 90, canvasBounds.height - 360),
          width: 340,
          height: 320,
          caption:
            'A new concept created from the selected image using the palette from the interaction rail.',
          swatches: [palette.primary, palette.secondary, palette.accent],
          treatment: 'Codex preserved layout intent while exploring a new surface mood.',
        }

        addObject(imageObject)
        addActivity(
          'Created a recolor variant',
          'The selected image now has a sibling concept using the chosen primary, secondary, and accent colors.',
        )
        break
      }

      case 'extract-style-tokens': {
        const textObject: TextCanvasObject = {
          id: createId('tokens'),
          kind: 'text',
          title: 'Style tokens',
          subtitle: 'Extracted from the selected visual',
          badge: 'tokens',
          x: clamp(anchorX, 90, canvasBounds.width - 420),
          y: clamp(anchorY + 40, 90, canvasBounds.height - 320),
          width: 320,
          height: 240,
          content:
            'Codex translated the image into reusable design language that can travel into templates, prompts, and future tooling.',
          bullets: [
            'Tone: optimistic and premium',
            `Primary: ${palette.primary}`,
            `Accent motion: ${palette.accent}`,
          ],
        }

        addObject(textObject)
        addActivity(
          'Extracted reusable tokens',
          'The selected visual has been converted into a lighter-weight system note the team can build from.',
        )
        break
      }

      case 'package-mockup': {
        const fileObject: FileCanvasObject = {
          id: createId('mockup-pack'),
          kind: 'file',
          title: 'Mockup pack',
          subtitle: 'Generated downstream assets',
          badge: 'file',
          x: clamp(anchorX, 90, canvasBounds.width - 360),
          y: clamp(anchorY + 32, 90, canvasBounds.height - 320),
          width: 300,
          height: 240,
          filename: 'brand-mockup-pack.zip',
          pages: 6,
          summary:
            'Contains signage, slide, and social usage directions spun out from the chosen concept.',
        }

        addObject(fileObject)
        addActivity(
          'Built a mockup pack',
          'Codex prepared follow-on asset directions from the selected image concept.',
        )
        break
      }

      case 'convert-to-plan':
      case 'extract-checklist': {
        const planObject: TextCanvasObject = {
          id: createId('plan'),
          kind: 'text',
          title: 'Execution checklist',
          subtitle: 'Generated from the selected context',
          badge: 'plan',
          x: clamp(anchorX, 90, canvasBounds.width - 420),
          y: clamp(anchorY, 90, canvasBounds.height - 320),
          width: 320,
          height: 250,
          content:
            'Codex broke the selected item into a shareable, ordered plan so the next steps are visible without opening another tool.',
          bullets: ['Clarify owner', 'Capture dependencies', 'Prepare a first output'],
        }

        addObject(planObject)
        addActivity(
          'Created an execution plan',
          'The selected item now has a checklist-style companion object on the canvas.',
        )
        break
      }

      case 'draft-brief':
      case 'summarize-file':
      case 'analyze-website':
      case 'explain-graph':
      case 'diagram-to-sop':
      case 'cluster-themes':
      case 'transcribe-audio':
      case 'make-teaser': {
        const briefObject: TextCanvasObject = {
          id: createId('brief'),
          kind: 'text',
          title: 'Codex summary',
          subtitle: 'Plain-language output',
          badge: 'brief',
          x: clamp(anchorX, 90, canvasBounds.width - 420),
          y: clamp(anchorY + 18, 90, canvasBounds.height - 320),
          width: 320,
          height: 240,
          content:
            'This object holds the simpler explanation a non-technical user can share right away while Codex handles the deeper tool work behind the scenes.',
          bullets: ['What changed', 'Why it matters', 'What to do next'],
        }

        addObject(briefObject)
        addActivity(
          'Generated a shareable summary',
          'Codex translated the selected object into a clearer, lower-friction artifact for the team.',
        )
        break
      }

      case 'draft-script': {
        const scriptObject: TextCanvasObject = {
          id: createId('script'),
          kind: 'text',
          title: 'Narrative draft',
          subtitle: 'Written from the selected audio',
          badge: 'script',
          x: clamp(anchorX, 90, canvasBounds.width - 420),
          y: clamp(anchorY + 14, 90, canvasBounds.height - 320),
          width: 320,
          height: 240,
          content:
            'Codex reshaped spoken direction into a tighter story with smoother pacing and more reusable language.',
          bullets: ['Opening hook', 'Middle proof', 'Closing instruction'],
        }

        addObject(scriptObject)
        addActivity(
          'Drafted a script from audio',
          'The voice memo now has a polished narrative companion on the canvas.',
        )
        break
      }

      case 'create-shot-list': {
        const shotListObject: FileCanvasObject = {
          id: createId('shot-list'),
          kind: 'file',
          title: 'Shot list',
          subtitle: 'Production-ready structure',
          badge: 'file',
          x: clamp(anchorX, 90, canvasBounds.width - 360),
          y: clamp(anchorY, 90, canvasBounds.height - 320),
          width: 300,
          height: 230,
          filename: 'teaser-shot-list.csv',
          pages: 1,
          summary:
            'Frames, beats, captions, and duration targets extracted from the selected video.',
        }

        addObject(shotListObject)
        addActivity(
          'Generated a shot list',
          'The selected video now has a production-friendly companion file.',
        )
        break
      }

      case 'generate-tests':
      case 'forecast-next-step':
      case 'diagram-to-automation':
      case 'name-directions': {
        const recommendation: GraphCanvasObject = {
          id: createId('recommendation'),
          kind: 'graph',
          title: 'Recommendation map',
          subtitle: 'Codex-generated next moves',
          badge: 'graph',
          x: clamp(anchorX, 90, canvasBounds.width - 400),
          y: clamp(anchorY + 16, 90, canvasBounds.height - 340),
          width: 340,
          height: 270,
          series: [
            { label: 'Impact', value: 88 },
            { label: 'Ease', value: 61 },
            { label: 'Speed', value: 72 },
            { label: 'Confidence', value: 79 },
          ],
          insight:
            'Codex scored a few possible next moves so the team can decide quickly without diving into implementation details.',
        }

        addObject(recommendation)
        addActivity(
          'Generated recommendation paths',
          'The selected object now has a decision-support artifact attached to it.',
        )
        break
      }

      default:
        break
    }
  }

  const handleSurfacePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: viewport.x,
      initialY: viewport.y,
      moved: false,
    }
    setComposer(null)
  }

  const handleSurfacePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - pan.startX
    const deltaY = event.clientY - pan.startY
    const moved = Math.abs(deltaX) + Math.abs(deltaY) > 8

    panRef.current = {
      ...pan,
      moved,
    }

    if (!moved) {
      return
    }

    setViewport((current) => ({
      ...current,
      x: pan.initialX + deltaX,
      y: pan.initialY + deltaY,
    }))
  }

  const handleSurfacePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    panRef.current = null

    if (!pan.moved) {
      openComposerAt(event.clientX, event.clientY)
    }
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const rect = viewportRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    const nextZoom = clamp(viewport.zoom - event.deltaY * 0.001, 0.58, 1.4)
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

  return (
    <div className="app-shell workspace-page">
      <header className="workspace-toolbar">
        <div className="workspace-toolbar__meta">
          <div className="workspace-toolbar__title-row">
            <Link className="ghost-button" to="/">
              Back to workspaces
            </Link>
            <span className="pill">{workspace.category}</span>
            <span className="pill">{workspace.status}</span>
          </div>
          <h1 className="workspace-toolbar__title">{workspace.name}</h1>
          <p className="toolbar-copy">{workspace.description}</p>
        </div>

        <div className="button-row">
          <button
            className="secondary-button"
            onClick={() => openComposerInCenter()}
            type="button"
          >
            New canvas request
          </button>
          <button
            className="ghost-button"
            onClick={() => setViewport(defaultViewport)}
            type="button"
          >
            Reset view
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <section className="workspace-summary-card">
            <span className="eyebrow">How this workspace behaves</span>
            <h2>{workspace.tagline}</h2>
            <p className="workspace-summary-copy">
              Codex lives behind the surface. The UI stays legible for
              non-technical operators while the server can spawn tooling,
              transform media, and keep every output grounded in nearby canvas
              context.
            </p>

            <div className="summary-grid">
              <div className="summary-stat">
                <strong>{objects.length}</strong>
                <span>objects</span>
              </div>
              <div className="summary-stat">
                <strong>{workspace.summary.automations}</strong>
                <span>automations</span>
              </div>
              <div className="summary-stat">
                <strong>{workspace.summary.copilots}</strong>
                <span>Codex roles</span>
              </div>
            </div>
          </section>

          <section>
            <h2>Prompt starters</h2>
            <p className="workspace-help">
              These seed the empty-space composer so users do not need to invent
              the workflow language themselves.
            </p>
            <div className="workspace-hints">
              {workspace.promptIdeas.map((prompt) => (
                <button
                  className="workspace-hint-button"
                  key={prompt}
                  onClick={() => openComposerInCenter(prompt)}
                  type="button"
                >
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>Recent activity</h2>
            <div className="activity-list">
              {activity.slice(0, 4).map((item) => (
                <div className="activity-item" key={item.id}>
                  <div className="activity-item__topline">
                    <strong>{item.label}</strong>
                    <span className="activity-item__time">{item.time}</span>
                  </div>
                  <p className="activity-item__detail">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="canvas-shell">
          <div className="canvas-shell__topline">
            <p className="canvas-shell__caption">
              Drag to pan. Scroll to zoom. Click any free space to ask Codex.
            </p>
            <div className="canvas-controls">
              <button
                aria-label="Zoom out"
                className="canvas-button"
                onClick={() =>
                  setViewport((current) => ({
                    ...current,
                    zoom: clamp(current.zoom - 0.08, 0.58, 1.4),
                  }))
                }
                type="button"
              >
                -
              </button>
              <div className="zoom-chip">{Math.round(viewport.zoom * 100)}% zoom</div>
              <button
                aria-label="Zoom in"
                className="canvas-button"
                onClick={() =>
                  setViewport((current) => ({
                    ...current,
                    zoom: clamp(current.zoom + 0.08, 0.58, 1.4),
                  }))
                }
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <div className="canvas-viewport" onWheel={handleWheel} ref={viewportRef}>
            <div
              className="canvas-surface"
              onPointerDown={handleSurfacePointerDown}
              onPointerMove={handleSurfacePointerMove}
              onPointerUp={handleSurfacePointerUp}
              style={{
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              }}
            >
              {objects.map((object) => (
                <CanvasObjectCard
                  key={object.id}
                  object={object}
                  onSelect={focusObjectById}
                  selected={selectedId === object.id}
                />
              ))}

              {composer ? (
                <ComposerCard
                  isRecording={isRecording}
                  onClose={closeComposer}
                  onPromptChange={setComposerPrompt}
                  onSubmit={handleComposerSubmit}
                  onToggleRecording={toggleRecording}
                  prompt={composerPrompt}
                  recordingError={recordingError}
                  x={composer.x}
                  y={composer.y}
                />
              ) : null}
            </div>
          </div>
        </main>

        <aside className="workspace-inspector">
          <InspectorPanel
            activity={activity}
            onAction={handleAction}
            onPaletteChange={(key, value) =>
              setPalette((current) => ({
                ...current,
                [key]: value,
              }))
            }
            onRecommendPalette={handleRecommendPalette}
            palette={palette}
            selectedObject={selectedObject}
          />
        </aside>
      </div>
    </div>
  )
}
