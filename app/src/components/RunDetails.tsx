import { useEffect, useState } from 'react'
import type { Job } from '../types'
import RunLog from './RunLog'
import { CheckCircle2, CircleAlert, LoaderCircle, Clock3, CircleStop } from 'lucide-react'

export default function RunDetails({job, onShowResults}: {job: Job; onShowResults?: () => void}) {
  const [now, setNow] = useState(() => Date.now() / 1000)
  const active = ['running', 'cancelling'].includes(job.status)
  useEffect(() => {
    if (!active) return
    setNow(Date.now() / 1000)
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(timer)
  }, [active])
  const elapsed = Math.max(0, Math.floor((job.finished || now) - (job.started || job.created)))
  const warnings = [...new Set([...(job.safety?.warnings || []), ...(job.result?.warnings || [])])]
  const notes = [...new Set([...(job.safety?.notes || []), ...(job.result?.notes || [])])]
  const terminal = ['completed', 'failed', 'cancelled', 'interrupted'].includes(job.status)
  const title = {queued: 'Run queued', running: 'Run in progress', cancelling: 'Stopping run',
    completed: 'Run completed', failed: 'Run failed', cancelled: 'Run cancelled', interrupted: 'Run interrupted'}[job.status]
  const Icon = job.status === 'completed' ? CheckCircle2 : job.status === 'running' ? LoaderCircle
    : job.status === 'queued' ? Clock3 : job.status === 'failed' ? CircleAlert : CircleStop
  return <section className="run-input-summary" aria-label="Run details">
    <div className={`run-completion ${job.status}`} role="status" aria-live="polite" aria-atomic="true">
      <Icon className={job.status === 'running' ? 'run-spinner' : undefined} size={20} aria-hidden="true"/>
      <div><strong>{title}</strong><p>{job.status === 'completed'
        ? `Outputs are ready.${warnings.length ? ' Review the warnings below.' : ''}`
        : terminal ? 'This run has stopped. Review its details below.'
        : job.status === 'queued' ? 'Waiting for an available job slot.'
        : job.status === 'cancelling' ? 'Waiting for the engine to stop.' : job.stage || 'The engine is working.'}</p></div>
      {job.status === 'completed' && onShowResults && <button onClick={onShowResults}>View results</button>}
    </div>
    <p>{job.status === 'queued' ? 'Queued' : `Elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
      {job.conversion === 'cohort' && ` · Records: ${job.safety?.recordCount == null ? 'not counted in preflight' : job.safety.recordCount.toLocaleString()}`}
    </p>
    {notes.map(message => <p key={message}>{message}</p>)}
    {warnings.map(message => <p className="run-warning" key={message}>{message}</p>)}
    <RunLog key={job.id} job={job}/>
    <details><summary>Inputs used ({job.inputs?.length ?? job.sources.length})</summary>
      <ul>{job.inputs ? job.inputs.map((input, index) => <li key={index}><strong>{input.role}: {input.filename}</strong><small>{input.path}</small></li>)
        : job.sources.map((name, index) => <li key={index}>{name}</li>)}</ul>
    </details>
  </section>
}
