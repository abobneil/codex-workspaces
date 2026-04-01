import { Link } from 'react-router-dom'
import type { Workspace } from '../types'

interface WorkspaceCardProps {
  workspace: Workspace
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <Link className="workspace-card" to={`/workspace/${workspace.id}`}>
      <div className="workspace-card__halo" style={{ background: workspace.halo }} />
      <div className="workspace-card__meta">
        <span className="pill">{workspace.category}</span>
        <span className="pill">{workspace.status}</span>
      </div>

      <div>
        <h2 className="workspace-card__title">{workspace.name}</h2>
        <p className="workspace-card__description">{workspace.tagline}</p>
      </div>

      <div className="workspace-card__stats">
        <div className="workspace-card__stat">
          <strong>{workspace.summary.objects}</strong>
          <span>live objects</span>
        </div>
        <div className="workspace-card__stat">
          <strong>{workspace.summary.automations}</strong>
          <span>automations</span>
        </div>
        <div className="workspace-card__stat">
          <strong>{workspace.summary.copilots}</strong>
          <span>server copilots</span>
        </div>
      </div>

      <div className="workspace-card__prompts">
        {workspace.promptIdeas.slice(0, 2).map((prompt) => (
          <span className="workspace-card__prompt" key={prompt}>
            {prompt}
          </span>
        ))}
      </div>
    </Link>
  )
}
