import { connection } from './desktop'
import type { FileHandle, Job, Operation, Preview, PairAlignmentRow } from './types'
import type {AnalysisLimits} from './limits'

export async function request<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const service = await connection()
  const response = await fetch(service.url + path, {
    method, headers: {Authorization: `Bearer ${service.token}`, ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  })
  const result = await response.json().catch(() => {
    throw new Error(response.status === 404
      ? 'This engine endpoint is unavailable. Restart Pheno-Ranker to load the updated engine.'
      : `The local engine returned an invalid response (HTTP ${response.status}).`)
  })
  if (!response.ok || !result.ok) throw new Error(result.error?.message || 'The local engine request failed')
  return result.data as T
}
export const operations = () => request<Operation[]>('/api/operations')
export const jobs = () => request<Job[]>('/api/jobs')
export const runLog = (id: string) => request<Preview>(`/api/jobs/${id}/log`)
export const submit = (body: unknown) => request<Job>('/api/jobs', body)
export const cancel = (id: string) => request<Job>(`/api/jobs/${id}/cancel`, {})
export const example = (mode: string, operation?: string) => request<Record<string, FileHandle[]>>(`/api/examples/${mode}`, operation ? {operation} : {})
export type StoreRelease = {tag: string; bytes: number; sha256: string; url: string; records?: number; collections?: {name: string; records: number}[]}
export const storeCached = () => request<StoreRelease[]>('/api/phenopacket-store/cached')
export const storeLatest = () => request<StoreRelease>('/api/phenopacket-store/latest', {})
export const storeDownload = (tag: string) => request<StoreRelease>('/api/phenopacket-store/download', {tag})
export const storeImport = (tag: string, collections: string[]) => request<{files: FileHandle[]; records: number; collections: number; tag: string}>('/api/phenopacket-store/import', {tag, collections})
export const beaconFilters = (body: {url: string; token: string}) =>
  request<{terms: {id: string; label: string}[]}>('/api/beacon/filters', body)
export const importBeacon = (body: {url: string; token: string; filters: string[]; pageSize: number; maxPages: number; allowPartial: boolean}) =>
  request<{files: FileHandle[]; pages: number; records: number; endpoint: string; pageLimitReached?: boolean}>('/api/beacon/import', body)
export const preview = (id: string, artifact: string) => request<Preview>(`/api/jobs/${id}/outputs/${artifact}/preview`)
export const pairAlignment = (id: string, reference: string) => request<{rows: PairAlignmentRow[]}>(`/api/jobs/${id}/alignment`, {reference})
export const reuse = (id: string, artifact: string) => request<FileHandle>(`/api/jobs/${id}/outputs/${artifact}/input`, {})
export type JobSettings = {maxConcurrentJobs: number; maxAllowedConcurrentJobs: number; defaultOutputFolder?: string | null; managedOutputRoot?: string; limits?: AnalysisLimits}
export const updateLimits = (limits: AnalysisLimits) => request<JobSettings>('/api/jobs/settings', {limits})
export const getJobSettings = () => request<JobSettings>('/api/jobs/settings')
export const updateJobSettings = (maxConcurrentJobs: number) => request<JobSettings>('/api/jobs/settings', {maxConcurrentJobs})
export const updateOutputFolder = (handle: string | null) => request<JobSettings>('/api/jobs/settings', {defaultOutputFolder: handle})
export async function download(id: string, artifact: string): Promise<Blob> {
  const service = await connection()
  const response = await fetch(`${service.url}/api/jobs/${id}/outputs/${artifact}/download`, {headers: {Authorization: `Bearer ${service.token}`}})
  if (!response.ok) throw new Error('Output is unavailable')
  return response.blob()
}
