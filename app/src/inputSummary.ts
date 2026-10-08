import type { FileHandle, Operation } from './types'

export function toolInputSummary(operation: Operation, files: Record<string, FileHandle[]>): string {
  const clean = (value: string) => value.replace(/[\r\n\t]/g, ' ').slice(0, 140)
  return operation.input.files.flatMap(role => {
    const entries = files[role.name] || []
    if (!entries.length) return []
    return [`${role.label}: ${entries.length.toLocaleString('en-US')} file${entries.length === 1 ? '' : 's'}`,
      ...entries.slice(0, 3).map(file => `  ${clean(file.filename)}`),
      ...(entries.length > 3 ? [`  ... and ${(entries.length - 3).toLocaleString('en-US')} more`] : [])]
  }).join('\n') || 'Generate records using the displayed settings.'
}
