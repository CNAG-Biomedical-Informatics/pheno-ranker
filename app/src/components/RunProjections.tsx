import { useState } from 'react'
import { Plus, Play } from 'lucide-react'
import * as api from '../api'
import type { Job } from '../types'
import {useLimits} from '../limits'

export default function RunProjections({job, runs, onSelect, onCreated}: {
  job: Job; runs: Job[]; onSelect: (id: string) => void; onCreated: (job: Job) => void
}) {
  const limits = useLimits()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('mds')
  const [neighbors, setNeighbors] = useState(30)
  const [distance, setDistance] = useState(0.3)
  const [seed, setSeed] = useState(42)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const parent = runs.find(item => item.id === job.options['source-run'])
  if (job.conversion === 'projection') return <p className="alignment-note">Source cohort: {parent
    ? <button onClick={() => onSelect(parent.id)}>{parent.name || parent.id}</button>
    : `${job.options['source-run']} (not in run history)`}. Method: {String(job.options.projection || 'mds').toUpperCase()}.
    {job.options.projection === 'umap' && ` Neighbours: ${job.options['n-neighbors'] ?? 30}; minimum distance: ${job.options['min-dist'] ?? 0.3}; seed: ${job.options.seed ?? 42}.`}</p>
  if (job.conversion !== 'cohort' || job.status !== 'completed') return null
  const children = runs.filter(item => item.conversion === 'projection' && item.options['source-run'] === job.id)
  const matrix = job.result?.artifacts.some(item => item.filename === 'matrix.txt')
  return <section aria-label="Projections">
    <div className="result-actions">{matrix && <button className="primary" disabled={busy} aria-expanded={open} onClick={() => setOpen(!open)}><Plus/>Add projection</button>}
      {children.map(item => <button key={item.id} onClick={() => onSelect(item.id)}>{item.name || String(item.options.projection || 'mds').toUpperCase()} · {item.status}</button>)}</div>
    {open && <form className="projection-form" onSubmit={async event => {
      event.preventDefault()
      if (busy) return
      setBusy(true); setError('')
      try {
        const result = await api.request<Job>(`/api/jobs/${job.id}/projections`, {
          projection: method, ...(method === 'umap' ? {'n-neighbors': neighbors, 'min-dist': distance, seed} : {}),
        })
        setOpen(false); onCreated(result)
      } catch (reason) {setError(String(reason))} finally {setBusy(false)}
    }}>
      <p>Reuse matrix.txt from <strong>{job.name || job.id}</strong>. Pairwise comparisons are not repeated; the new projection is saved as a separate run.</p>
      <div className="options-grid">
        <label>Method<select value={method} disabled={busy} onChange={event => setMethod(event.target.value)}><option value="mds">MDS</option><option value="umap">UMAP</option></select></label>
        {method === 'umap' && <>
          <label>Neighbours<input type="number" required min="2" max="200" step="1" value={neighbors} disabled={busy} onChange={event => setNeighbors(Number(event.target.value))}/></label>
          <label>Minimum distance<input type="number" required min="0" max="1" step="any" value={distance} disabled={busy} onChange={event => setDistance(Number(event.target.value))}/></label>
          <label>Random seed<input type="number" required min="0" max="2147483647" step="1" value={seed} disabled={busy} onChange={event => setSeed(Number(event.target.value))}/></label>
        </>}
      </div>
      <p className="alignment-note">Current limit: {(method === 'umap' ? limits.umapRecords : limits.mdsRecords).toLocaleString()} records; adjustable in Settings. {method === 'umap' ? 'UMAP emphasizes local neighborhoods; distances between clusters should not be interpreted as original distances.' : 'MDS approximates pairwise distances in two dimensions.'}</p>
      {error && <p role="alert">{error}</p>}
      <div className="projection-form-actions"><button className="primary" type="submit" disabled={busy}><Play/>{busy ? 'Submitting...' : 'Create projection'}</button></div>
    </form>}
  </section>
}
