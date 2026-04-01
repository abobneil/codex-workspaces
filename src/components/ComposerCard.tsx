import type { FormEvent } from 'react'

interface ComposerCardProps {
  x: number
  y: number
  prompt: string
  isRecording: boolean
  recordingError: string | null
  onPromptChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  onToggleRecording: () => void
}

export function ComposerCard({
  x,
  y,
  prompt,
  isRecording,
  recordingError,
  onPromptChange,
  onClose,
  onSubmit,
  onToggleRecording,
}: ComposerCardProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div
      className="composer-card"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
    >
      <form onSubmit={handleSubmit}>
        <div className="canvas-object__header">
          <div>
            <p className="canvas-object__subtitle">Click any open space to talk to Codex</p>
            <h3>New request</h3>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Describe what you want. Codex can turn it into new objects, assets, summaries, or bespoke tools."
        />

        <p className="composer-hint">
          Type a request, or record a quick note and let Codex figure out the workflow from there.
        </p>

        {isRecording ? (
          <span className="recording-pill">
            <span className="recording-dot" aria-hidden="true" />
            Recording audio
          </span>
        ) : null}

        {recordingError ? <p className="canvas-object__footer">{recordingError}</p> : null}

        <div className="composer-actions">
          <button className="primary-button" type="submit">
            Ask Codex
          </button>
          <button className="secondary-button" type="button" onClick={onToggleRecording}>
            {isRecording ? 'Stop recording' : 'Record audio'}
          </button>
        </div>
      </form>
    </div>
  )
}
