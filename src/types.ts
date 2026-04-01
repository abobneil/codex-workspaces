export type ObjectKind =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'file'
  | 'website'
  | 'graph'
  | 'diagram'
  | 'shape'

export interface BaseCanvasObject {
  id: string
  kind: ObjectKind
  title: string
  subtitle: string
  badge: string
  x: number
  y: number
  width: number
  height: number
}

export interface TextCanvasObject extends BaseCanvasObject {
  kind: 'text'
  content: string
  bullets: string[]
}

export interface ImageCanvasObject extends BaseCanvasObject {
  kind: 'image'
  caption: string
  swatches: string[]
  treatment: string
}

export interface AudioCanvasObject extends BaseCanvasObject {
  kind: 'audio'
  transcript: string
  duration: string
  audioUrl?: string
}

export interface VideoCanvasObject extends BaseCanvasObject {
  kind: 'video'
  frames: string[]
  duration: string
  note: string
}

export interface FileCanvasObject extends BaseCanvasObject {
  kind: 'file'
  filename: string
  pages: number
  summary: string
}

export interface WebsiteCanvasObject extends BaseCanvasObject {
  kind: 'website'
  domain: string
  callout: string
  highlights: string[]
}

export interface GraphCanvasObject extends BaseCanvasObject {
  kind: 'graph'
  series: Array<{ label: string; value: number }>
  insight: string
}

export interface DiagramCanvasObject extends BaseCanvasObject {
  kind: 'diagram'
  steps: [string, string, string]
  note: string
}

export interface ShapeCanvasObject extends BaseCanvasObject {
  kind: 'shape'
  tokens: string[]
  note: string
}

export type CanvasObject =
  | TextCanvasObject
  | ImageCanvasObject
  | AudioCanvasObject
  | VideoCanvasObject
  | FileCanvasObject
  | WebsiteCanvasObject
  | GraphCanvasObject
  | DiagramCanvasObject
  | ShapeCanvasObject

export interface ActivityItem {
  id: string
  label: string
  detail: string
  time: string
}

export interface PaletteForm {
  primary: string
  secondary: string
  accent: string
}

export interface Workspace {
  id: string
  name: string
  category: string
  status: string
  tagline: string
  description: string
  halo: string
  accent: string
  summary: {
    objects: number
    automations: number
    copilots: number
  }
  promptIdeas: string[]
  recentActivity: ActivityItem[]
  objects: CanvasObject[]
}
