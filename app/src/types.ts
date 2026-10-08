export type OptionDefinition = {
  name: string; label: string; description?: string
  visibleWhen?: Record<string, string[]>
  kind: 'boolean' | 'integer' | 'number' | 'select' | 'string' | 'multiselect'
  values?: string[]; default?: string | number | boolean | string[]
  minimum?: number; maximum?: number
}
export type FileDefinition = {name: string; label: string; required: boolean; multiple: boolean; accept?: string[]}
export type Operation = {id: string; label: string; description: string; available: boolean; options: OptionDefinition[]; input: {files: FileDefinition[]}}
export type FileHandle = {id: string; filename: string; directory: boolean; bytes: number; displayPath?: string}
export type OutputFile = {id: string; filename: string; kind: string; mediaType: string; bytes: number}
export type PairAlignmentRow = {ref: string; tar: string; weight: string; distance: number; path: string; label: string; entity: string}
export type Job = {
  id: string; name?: string; conversion: string; created: number; finished?: number
  status: 'queued' | 'running' | 'cancelling' | 'completed' | 'failed' | 'cancelled' | 'interrupted'
  sources: string[]; options: Record<string, unknown>; message?: string
  directory?: string; outputDirectory?: string; queuePosition?: number
  started?: number; stage?: string; safety?: SafetyAssessment
  inputs?: {role: string; filename: string; path: string}[]
  fingerprints?: {filename: string; role: string; sha256: string}[]
  result?: {artifacts: OutputFile[]; warnings: string[]; notes?: string[]}
}
export type SafetyAssessment = {recordCount?: number | null; possibleEdges?: number | null; skipGraph?: boolean; warnings: string[]; notes?: string[]}
export type Preview = {text: string; data?: unknown; truncated: boolean; kind?: string}
export type Project = {
  file: FileHandle
  settings: {conversion: string; options: Record<string, unknown>; output: Record<string, unknown>}
  files: Record<string, FileHandle[]>; destination?: FileHandle
  missing: {role: string; path: string}[]; runs: string[]
}
