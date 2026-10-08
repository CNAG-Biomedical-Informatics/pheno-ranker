import type { FileHandle } from './types'

export function missingAnalysisInputs(operation: string, files: Record<string, FileHandle[]>): string[] {
  if (!['patient', 'cohort'].includes(operation)) return []
  return [
    ...(!(files.reference?.length || files.precomputed?.length) ? ['reference data'] : []),
    ...(operation === 'patient' && !files.target?.length ? ['a target record'] : []),
  ]
}
