import { useState } from 'react'
import type { Job, OutputFile } from '../types'
import { runActions } from '../handoffs'

export function reusableOutputs(job: Job, operation: string, role: string): OutputFile[] {
  if (job.status !== 'completed') return []
  return (job.result?.artifacts || []).filter(file => {
    const name = file.filename.replaceAll('\\', '/')
    if (role === 'config') return /_config\.yaml$/.test(name)
    if (role === 'precomputed') return /\.(glob_hash|ref_hash|ref_binary_hash|coverage_stats)\.json$/.test(name)
    if (role === 'template') return /(?:\.|\/)glob_hash\.json$/.test(name)
    if (operation === 'qr-encode' && role === 'source') return /\.ref_binary_hash\.json$/.test(name)
    if (role === 'qr' || (operation === 'qr-decode' && role === 'source')) return /^qr\/[^/]+\.png$/.test(name)
    if (operation === 'pdf' && role === 'source') return /(?:^|\/)decoded\.json$/.test(name)
    if (['reference', 'target'].includes(role) || (operation === 'summary' && role === 'source')) {
      if (job.conversion === 'csv') return operation !== 'summary' && runActions(job).some(action => action.files.reference?.some(item => item.id === file.id))
      return (job.conversion === 'simulate' && name === 'simulated.json') || /(?:^|\/)decoded\.json$/.test(name)
    }
    return false
  })
}

export default function RunOutputPicker({runs, operation, role, label, disabled, showEmpty, onUse}: {
  runs: Job[]; operation: string; role: string; label: string; disabled?: boolean; showEmpty?: boolean
  onUse: (job: Job, artifact: OutputFile) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const groups = runs.map(job => ({job, files: reusableOutputs(job, operation, role)})).filter(group => group.files.length)
  if (!groups.length) return showEmpty ? <small>No compatible outputs from completed runs for {label.toLowerCase()} yet. Select Files or Examples, or prepare data with Tools.</small> : null
  return <div className="run-output-picker">
    <select aria-label={`Select ${label} from previous run`} value="" disabled={disabled || busy} onChange={async event => {
      const [jobId, artifactId] = JSON.parse(event.target.value) as string[]
      const group = groups.find(item => item.job.id === jobId)!
      const artifact = group.files.find(item => item.id === artifactId)!
      setBusy(true); setError('')
      try {await onUse(group.job, artifact)} catch (reason) {setError(String(reason))} finally {setBusy(false)}
    }}>
      <option value="" disabled>{busy ? 'Selecting output...' : 'From previous run...'}</option>
      {groups.map(({job, files}) => <optgroup key={job.id} label={`${job.name || job.conversion} - ${job.id.slice(0, 8)}`}>
        {files.map(file => <option key={file.id} value={JSON.stringify([job.id, file.id])}>{file.filename}</option>)}
      </optgroup>)}
    </select>
    {error && <small role="alert">{error}</small>}
  </div>
}
