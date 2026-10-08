import { invoke, isTauri } from '@tauri-apps/api/core'
import type { FileHandle } from './types'

export type Connection = { url: string; token: string; outputRoot: string }
let pending: Promise<Connection> | undefined
export function connection(): Promise<Connection> {
  if (!isTauri()) return Promise.reject(new Error('Launch Pheno-Ranker as a desktop application.'))
  if (!pending) pending = invoke<Connection>('connection')
  return pending
}
export async function selectPaths(directory = false, multiple = false): Promise<FileHandle[]> {
  if (!isTauri()) throw new Error('Native file selection requires the Pheno-Ranker desktop app.')
  return invoke<FileHandle[]>('select_paths', { directory, multiple })
}
export async function revealRun(id: string): Promise<void> {
  if (!isTauri()) throw new Error('Open the output folder from the desktop application.')
  await invoke('reveal_run', { id })
}
export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) throw new Error('Launch Pheno-Ranker as a desktop application.')
  await invoke('open_external', { url })
}
export async function confirmAction(title: string, message: string): Promise<boolean> {
  if (!isTauri()) throw new Error('Launch Pheno-Ranker as a desktop application.')
  return invoke<boolean>('confirm_action', { title, message })
}
export async function projectFile<T>(operation: 'open' | 'save', data?: unknown, handle?: string): Promise<T | null> {
  return invoke<T | null>('project_file', { operation, data: data ?? null, handle: handle ?? null })
}
export async function finishQuit(): Promise<void> {
  await invoke('finish_quit')
}
