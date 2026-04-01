import type { KeyboardEvent } from 'react'
import type { CanvasObject, GraphCanvasObject, ImageCanvasObject } from '../types'

interface CanvasObjectCardProps {
  object: CanvasObject
  selected: boolean
  onSelect: (id: string) => void
}

function getImagePreviewStyle(object: ImageCanvasObject) {
  const [primary, secondary = primary, accent = secondary] = object.swatches

  return {
    background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 48%, ${accent} 100%)`,
  }
}

function getGraphMax(object: GraphCanvasObject) {
  return object.series.reduce((max, point) => Math.max(max, point.value), 0)
}

export function CanvasObjectCard({
  object,
  selected,
  onSelect,
}: CanvasObjectCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(object.id)
    }
  }

  return (
    <article
      className={`canvas-object ${selected ? 'is-selected' : ''}`}
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        minHeight: object.height,
        zIndex: selected ? 3 : 1,
      }}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(object.id)
      }}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className="canvas-object__header">
        <div>
          <p className="canvas-object__subtitle">{object.subtitle}</p>
          <h3 className="canvas-object__title">{object.title}</h3>
        </div>
        <span className="canvas-object__kind">{object.badge}</span>
      </div>

      {object.kind === 'text' ? (
        <>
          <p className="canvas-object__body">{object.content}</p>
          <div className="canvas-object__chips">
            {object.bullets.map((bullet) => (
              <span className="object-chip" key={bullet}>
                {bullet}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {object.kind === 'image' ? (
        <>
          <div className="image-preview" style={getImagePreviewStyle(object)}>
            <div className="logo-mark">A</div>
          </div>
          <p className="canvas-object__body">{object.caption}</p>
          <div className="swatch-row">
            {object.swatches.map((swatch) => (
              <span
                className="swatch"
                key={swatch}
                style={{ background: swatch }}
                title={swatch}
              />
            ))}
          </div>
          <p className="canvas-object__footer">{object.treatment}</p>
        </>
      ) : null}

      {object.kind === 'website' ? (
        <>
          <div className="website-preview">
            <div className="browser-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <p className="canvas-object__label">{object.domain}</p>
            </div>
            <div className="website-body">
              <div className="website-strip" />
              <div className="website-card" />
              <div className="website-strip" />
            </div>
          </div>
          <p className="canvas-object__body">{object.callout}</p>
          <div className="canvas-object__chips">
            {object.highlights.map((item) => (
              <span className="object-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {object.kind === 'file' ? (
        <div className="file-preview">
          <span className="pill">{object.pages} pages</span>
          <strong>{object.filename}</strong>
          <p className="canvas-object__body">{object.summary}</p>
        </div>
      ) : null}

      {object.kind === 'audio' ? (
        <>
          <div className="audio-wave" aria-hidden="true">
            {[32, 58, 44, 72, 40, 68, 34, 54, 28, 60, 38, 70].map((height) => (
              <span key={height} style={{ height }} />
            ))}
          </div>
          <p className="canvas-object__body">{object.transcript}</p>
          <p className="canvas-object__footer">{object.duration}</p>
          {object.audioUrl ? (
            <audio
              controls
              src={object.audioUrl}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
        </>
      ) : null}

      {object.kind === 'video' ? (
        <>
          <div className="video-preview">
            <div className="mini-frames">
              {object.frames.map((frame) => (
                <div className="mini-frame" key={frame} title={frame} />
              ))}
            </div>
            <div className="timeline" />
          </div>
          <p className="canvas-object__body">{object.note}</p>
          <p className="canvas-object__footer">{object.duration}</p>
        </>
      ) : null}

      {object.kind === 'graph' ? (
        <>
          <div className="graph-preview">
            {object.series.map((point) => (
              <div className="graph-bar" key={point.label}>
                <div
                  className="graph-bar__fill"
                  style={{
                    height: `${(point.value / getGraphMax(object)) * 140}px`,
                  }}
                />
                <span className="graph-bar__label">{point.label}</span>
              </div>
            ))}
          </div>
          <p className="canvas-object__body">{object.insight}</p>
        </>
      ) : null}

      {object.kind === 'diagram' ? (
        <>
          <div className="diagram-preview">
            <div className="diagram-line" aria-hidden="true" />
            <div className="diagram-line diagram-line--vertical" aria-hidden="true" />
            <div className="diagram-node diagram-node--start">{object.steps[0]}</div>
            <div className="diagram-node diagram-node--middle">{object.steps[1]}</div>
            <div className="diagram-node diagram-node--end">{object.steps[2]}</div>
          </div>
          <p className="canvas-object__body">{object.note}</p>
        </>
      ) : null}

      {object.kind === 'shape' ? (
        <>
          <div className="shape-cluster">
            {object.tokens.map((token) => (
              <span className="shape-token" key={token}>
                {token}
              </span>
            ))}
          </div>
          <p className="canvas-object__body">{object.note}</p>
        </>
      ) : null}
    </article>
  )
}
