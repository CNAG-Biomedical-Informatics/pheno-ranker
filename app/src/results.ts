import Papa from 'papaparse'
import type { Job } from './types'
import {defaultLimits} from './limits'

// Match COHORTome's cohort and entity colour conventions.
const cohortColors = ['#2563eb', '#ea580c', '#16a34a', '#7c3aed', '#dc2626', '#0891b2', '#ca8a04', '#4f46e5']
export type Cohort = {key: string; label: string; color: string}
export function collectionCohorts(membership: Record<string, string>): Map<string, Cohort> {
  const labels = [...new Set(Object.values(membership))].sort()
  const groups = new Map(labels.map((label, index) => [label, {key: `collection:${label}`, label, color: cohortColors[index % cohortColors.length]}]))
  return new Map(Object.entries(membership).map(([id, label]) => [id, groups.get(label)!]))
}
export function recordCohort(id: string, job: Job): Cohort {
  const references = (job.fingerprints || []).filter(file => file.role === 'reference')
  const prefixes = Array.isArray(job.options['append-prefixes']) ? job.options['append-prefixes'] as string[] : []
  const candidates = references.map((file, index) => ({key: String(index), label: references.length === 1 ? file.filename : `${prefixes[index] || `C${index + 1}`} (${file.filename})`, color: cohortColors[index % cohortColors.length], prefix: `${prefixes[index] || `C${index + 1}`}_`}))
  if (candidates.length === 1) return candidates[0]
  const matching = candidates.filter(item => id.startsWith(item.prefix))
  // Overlapping custom prefixes cannot prove which source a record came from.
  if (matching.length === 1) return matching[0]
  return {key: 'unknown', label: 'Source cohort unavailable', color: '#718096'}
}
const entityColors: Record<string, [string, string]> = {
  diseases: ['#dbeafe', '#1d4ed8'], phenotypicFeatures: ['#dcfce7', '#166534'],
  treatments: ['#fef3c7', '#92400e'], procedures: ['#fee2e2', '#b91c1c'],
  exposures: ['#ede9fe', '#6d28d9'], measures: ['#cffafe', '#0f766e'],
  measurements: ['#cffafe', '#0f766e'], medicalActions: ['#fef3c7', '#92400e'],
  sex: ['#fce7f3', '#be185d'], ethnicity: ['#e0f2fe', '#0369a1'],
}
export function entityStyle(entity: string) {
  const [backgroundColor, color] = entityColors[entity] || ['#e5e7eb', '#374151']
  return {backgroundColor, color}
}
export function parseTable(text: string, filename: string) {
  const delimiter = filename.endsWith('.csv') ? ';' : '\t'
  const parsed = Papa.parse<string[]>(text, {delimiter, skipEmptyLines: true})
  if (parsed.errors.some(error => error.type === 'Quotes')) throw new Error('Malformed delimited output')
  const [headers = [], ...rows] = parsed.data
  return {headers, rows}
}
export function compareCells(a: string, b: string) {
  if (a.trim() && b.trim() && Number.isFinite(Number(a)) && Number.isFinite(Number(b))) return Number(a) - Number(b)
  return a.localeCompare(b, undefined, {numeric: true})
}
export function parseMatrixTable(text: string, rowLimit = defaultLimits.matrixRows, columnLimit = defaultLimits.matrixColumns) {
  // Bound cells before parsing or rendering, not after building the full table.
  const lines = text.split('\n', rowLimit + 1).filter(line => line.trim())
  const rows = lines.map(line => line.replace(/\r$/, '').split('\t', columnLimit + 1))
  return {headers: rows[0] || [], rows: rows.slice(1)}
}
export function filterResultRows(rows: string[][], query: string, distanceColumn = -1, differencesOnly = false) {
  const normalized = query.toLowerCase()
  return rows.filter(row => (!normalized || row.join(' ').toLowerCase().includes(normalized)) &&
    (!differencesOnly || distanceColumn < 0 || Number(row[distanceColumn]) !== 0))
}
export function parseMatrix(text: string, limit = defaultLimits.heatmapRecords) {
  const {headers, rows} = parseTable(text, 'matrix.txt')
  if (headers.length - 1 > limit) throw new Error(`Interactive matrices are limited to ${limit.toLocaleString()} records in Settings. The full export remains available.`)
  const labels = headers.slice(1)
  if (!labels.length || rows.length !== labels.length || new Set(labels).size !== labels.length ||
      rows.some((row, i) => row[0] !== labels[i] || row.length !== labels.length + 1 || row.slice(1).some(v => !v.trim() || !Number.isFinite(Number(v))))) throw new Error('Matrix labels or dimensions are inconsistent')
  return {labels, values: rows.map(row => row.slice(1).map(Number))}
}
export type GraphElement = {data: {id?: string; source?: string; target?: string; weight?: number | string; [key: string]: unknown}}
export function styleGraphEdges(edges: GraphElement[], metric: string, dark: boolean) {
  const weights = edges.map(edge => Number(edge.data.weight)).filter(Number.isFinite)
  const min = weights.reduce((a, b) => Math.min(a, b), Infinity)
  const max = weights.reduce((a, b) => Math.max(a, b), -Infinity)
  return edges.map(edge => {
    const weight = Number(edge.data.weight)
    const strength = max === min ? .7 : metric === 'jaccard' ? (weight - min) / (max - min) : (max - weight) / (max - min)
    const perfect = Math.abs(weight - (metric === 'jaccard' ? 1 : 0)) < 1e-6
    return {...edge, data: {...edge.data, edgeWidth: 1 + strength * 8, edgeOpacity: .22 + strength * .72, edgeColor: perfect ? (dark ? '#e2e8f0' : '#020617') : '#94a3b8'}}
  })
}
export function filterEdges(edges: GraphElement[], metric: string, threshold?: number) {
  return edges.filter(edge => {
    const weight = Number(edge.data.weight)
    return Number.isFinite(weight) && (threshold === undefined || (metric === 'jaccard' ? weight >= threshold : weight <= threshold))
  })
}
