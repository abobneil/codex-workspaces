import { WorkspaceCard } from '../components/WorkspaceCard'
import { workspaces } from '../data/workspaces'

const principles = [
  {
    title: 'Canvas-first input',
    copy: 'The user should be able to click empty space, type or record a request, and let Codex figure out the rest.',
  },
  {
    title: 'Object-aware actions',
    copy: 'Images, files, audio, websites, and diagrams each expose the next most intuitive AI interactions.',
  },
  {
    title: 'Server-side Codex',
    copy: 'The front end stays simple while Codex builds or runs bespoke tools, transforms assets, and returns results back to the canvas.',
  },
]

export function HomePage() {
  return (
    <div className="app-shell home-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Codex workspaces for non-technical teams</span>
          <h1 className="section-title">
            A calmer front door to powerful, bespoke AI workflows.
          </h1>
          <p className="section-copy">
            This prototype is inspired by the kind of product experience that feels
            approachable to teams using tools like OpenClaw, Claude Cowork,
            Freepik Spaces, and Mural: visual, direct, collaborative, and far less
            intimidating than a code-first environment.
          </p>
          <p className="section-copy">
            The home page centers on workspaces. Each workspace is a focused area
            of work. Open one and you land on an endless canvas where every note,
            image, voice memo, site, file, diagram, or graph becomes something
            Codex can understand and act on.
          </p>
          <div className="button-row">
            <span className="pill">Click a workspace to explore</span>
            <span className="pill">Select objects to reveal AI actions</span>
            <span className="pill">Ask Codex from empty canvas space</span>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <strong>1 interface</strong>
            <span>for visuals, notes, audio, files, and Codex-powered outputs</span>
          </div>
          <div className="hero-stat-card">
            <strong>0 code exposure</strong>
            <span>
              for the end user, even when bespoke tools are being created behind the
              scenes
            </span>
          </div>
          <div className="hero-stat-card">
            <strong>Infinite surface</strong>
            <span>
              to keep work artifacts connected instead of scattered across tabs and
              chats
            </span>
          </div>
        </div>
      </section>

      <section>
        <span className="eyebrow">Workspace cards</span>
        <h2 className="section-title">Start where the work already lives.</h2>
        <p className="section-copy">
          Each card acts like a purpose-built room. The card communicates the
          focus area, the current activity, and the kinds of prompts that make
          sense there.
        </p>
      </section>

      <section className="workspace-grid">
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} />
        ))}
      </section>

      <section className="principles-grid">
        {principles.map((principle) => (
          <article className="principle-card" key={principle.title}>
            <span className="pill">Product principle</span>
            <h3>{principle.title}</h3>
            <p className="workspace-card__description">{principle.copy}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
