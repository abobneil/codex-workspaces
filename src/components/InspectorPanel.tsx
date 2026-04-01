import type { ActivityItem, CanvasObject, ObjectKind, PaletteForm } from '../types'

interface ObjectAction {
  id: string
  label: string
  description: string
}

const actionLibrary: Record<ObjectKind, ObjectAction[]> = {
  text: [
    {
      id: 'convert-to-plan',
      label: 'Turn into a plan',
      description: 'Create an execution checklist and expose the next decisions.',
    },
    {
      id: 'draft-brief',
      label: 'Draft a brief',
      description: 'Reframe the text as a calmer, shareable summary for stakeholders.',
    },
  ],
  image: [
    {
      id: 'recolor-variant',
      label: 'Create recolor variant',
      description: 'Generate a sibling image object using your chosen palette.',
    },
    {
      id: 'extract-style-tokens',
      label: 'Extract style tokens',
      description: 'Turn the visual into reusable color, tone, and motion guidance.',
    },
    {
      id: 'package-mockup',
      label: 'Build a mockup pack',
      description: 'Prepare downstream asset directions from the selected concept.',
    },
  ],
  audio: [
    {
      id: 'transcribe-audio',
      label: 'Transcribe and pull quotes',
      description: 'Create a clean summary object plus language worth reusing.',
    },
    {
      id: 'draft-script',
      label: 'Draft a script',
      description: 'Turn spoken intent into a polished narrative draft.',
    },
  ],
  video: [
    {
      id: 'create-shot-list',
      label: 'Generate shot list',
      description: 'Break the cut into concrete production beats.',
    },
    {
      id: 'make-teaser',
      label: 'Outline a teaser',
      description: 'Create a shorter social-first version of the selected clip.',
    },
  ],
  file: [
    {
      id: 'summarize-file',
      label: 'Summarize for decision makers',
      description: 'Translate the file into an easier-to-share canvas object.',
    },
    {
      id: 'extract-checklist',
      label: 'Extract checklist',
      description: 'Pull tasks, approvals, and follow-ups into a working list.',
    },
  ],
  website: [
    {
      id: 'analyze-website',
      label: 'Analyze the page',
      description: 'Highlight opportunities, risks, and a better next step.',
    },
    {
      id: 'generate-tests',
      label: 'Generate test ideas',
      description: 'Create experiments for copy, structure, and conversion flow.',
    },
  ],
  graph: [
    {
      id: 'explain-graph',
      label: 'Explain the graph',
      description: 'Turn the numbers into a plain-language narrative.',
    },
    {
      id: 'forecast-next-step',
      label: 'Forecast the next move',
      description: 'Create a recommendation object grounded in the visible trend.',
    },
  ],
  diagram: [
    {
      id: 'diagram-to-sop',
      label: 'Turn into SOP',
      description: 'Translate the flow into operating instructions for the team.',
    },
    {
      id: 'diagram-to-automation',
      label: 'Propose automations',
      description: 'Identify which steps can be automated by Codex on the server side.',
    },
  ],
  shape: [
    {
      id: 'cluster-themes',
      label: 'Cluster themes',
      description: 'Group shape tokens into stronger conceptual directions.',
    },
    {
      id: 'name-directions',
      label: 'Name the directions',
      description: 'Create labels and short descriptions for each emerging lane.',
    },
  ],
}

interface InspectorPanelProps {
  selectedObject: CanvasObject | null
  palette: PaletteForm
  activity: ActivityItem[]
  onPaletteChange: (key: keyof PaletteForm, value: string) => void
  onAction: (actionId: string) => void
  onRecommendPalette: () => void
}

export function InspectorPanel({
  selectedObject,
  palette,
  activity,
  onPaletteChange,
  onAction,
  onRecommendPalette,
}: InspectorPanelProps) {
  if (!selectedObject) {
    return (
      <>
        <div>
          <p className="eyebrow">Interaction rail</p>
          <h2>Pick an object or click empty space</h2>
          <p className="inspector-copy">
            The canvas is selection-driven. Choose an object to see the AI actions
            that fit it, or click open space to start a fresh request by typing or
            recording audio.
          </p>
        </div>

        <div className="workspace-inspector__empty">
          <span className="pill">Good defaults</span>
          <p className="canvas-object__body">
            Images expose palette and mockup actions. Notes become plans. Websites
            get summarized. Audio turns into quotes, briefs, and deliverables.
          </p>
        </div>

        <div className="inspector-section">
          <h2>Recent canvas activity</h2>
          <div className="activity-list">
            {activity.slice(0, 3).map((item) => (
              <div className="activity-item" key={item.id}>
                <div className="activity-item__topline">
                  <strong>{item.label}</strong>
                  <span className="activity-item__time">{item.time}</span>
                </div>
                <p className="activity-item__detail">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  const actions = actionLibrary[selectedObject.kind]

  return (
    <>
      <div>
        <p className="eyebrow">Selected object</p>
        <h2>{selectedObject.title}</h2>
        <p className="inspector-copy">{selectedObject.subtitle}</p>
      </div>

      {selectedObject.kind === 'image' ? (
        <div className="inspector-section">
          <h2>Palette studio</h2>
          <p className="inspector-copy">
            This is the model interaction pattern for creative objects: recommend a
            path, let people override it, then create a new sibling object on the
            canvas.
          </p>

          <div className="palette-grid">
            {(['primary', 'secondary', 'accent'] as Array<keyof PaletteForm>).map((key) => (
              <div className="palette-field" key={key}>
                <label htmlFor={`palette-${key}`}>{key}</label>
                <input
                  id={`palette-${key}`}
                  type="color"
                  value={palette[key]}
                  onChange={(event) => onPaletteChange(key, event.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="palette-values">
            {Object.values(palette).map((value) => (
              <span className="palette-value" key={value}>
                {value.toUpperCase()}
              </span>
            ))}
          </div>

          <div className="button-row">
            <button className="secondary-button" onClick={onRecommendPalette} type="button">
              Recommend palette
            </button>
            <button
              className="primary-button"
              onClick={() => onAction('recolor-variant')}
              type="button"
            >
              Create recolor
            </button>
          </div>
        </div>
      ) : null}

      <div className="inspector-section">
        <h2>Contextual AI actions</h2>
        <div className="inspector-actions">
          {actions.map((action) => (
            <button
              className="inspector-action-button"
              key={action.id}
              onClick={() => onAction(action.id)}
              type="button"
            >
              <span>
                <strong>{action.label}</strong>
                <br />
                <span className="canvas-object__footer">{action.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="inspector-section">
        <h2>Why this matters</h2>
        <p className="inspector-copy">
          Non-technical users should not need to decide which model, endpoint, or
          workflow to use. The object already carries enough context for Codex to
          do the orchestration server side.
        </p>
      </div>
    </>
  )
}
