import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Job, PairAlignmentRow } from '../types'
import * as api from '../api'
import { entityStyle } from '../results'

export default function PairComparison({job, reference, target, onClose}: {job: Job; reference: string; target: string; onClose: () => void}) {
  const [rows, setRows] = useState<PairAlignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [differences, setDifferences] = useState(false)
  const [query, setQuery] = useState('')
  const [entity, setEntity] = useState('')
  useEffect(() => {
    let current = true
    setLoading(true); setRows([]); setError('')
    async function load() {
      const artifact = job.result?.artifacts.find(item => item.filename === 'alignment.target.csv')
      if (!artifact) throw new Error('Enable Generate alignment and rerun the patient analysis to inspect this pair.')
      const result = await api.pairAlignment(job.id, reference)
      if (current) setRows(result.rows)
    }
    void load().catch(reason => {if (current) setError(String(reason))}).finally(() => {if (current) setLoading(false)})
    return () => {current = false}
  }, [job.id, reference])
  const entities = [...new Set(rows.map(row => row.entity))].sort()
  const visible = rows.filter(row => (!entity || row.entity === entity) && (!differences || row.distance !== 0) && `${row.label} ${row.path}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="pair-comparison" aria-label="Patient pair comparison">
    <div className="result-actions"><h2>Pair comparison</h2><button onClick={onClose}><ArrowLeft aria-hidden="true"/>Back to ranking</button></div>
    <p className="alignment-note"><strong>Reference:</strong> {reference}<br/><strong>Target:</strong> {target}</p>
    {loading ? <p role="status">Loading pair alignment...</p> : error ? <p role="alert">{error}</p> : <>
      <div className="entity-legend"><button aria-pressed={!entity} onClick={() => setEntity('')}>All entities</button>{entities.map(name => <button key={name} style={entityStyle(name)} aria-pressed={entity === name} onClick={() => setEntity(entity === name ? '' : name)}>{name}</button>)}</div>
      <p className="alignment-note">{rows.length} terms · weighted Hamming distance {rows.reduce((sum, row) => sum + row.distance, 0)}. Values show presence (1) or absence (0) in the encoded profiles.</p>
      <div className="result-actions"><label><input type="checkbox" checked={differences} onChange={event => setDifferences(event.target.checked)}/>Differences only</label><input aria-label="Search pair terms" placeholder="Find a term or path" value={query} onChange={event => setQuery(event.target.value)}/><span>{visible.length} terms; showing up to 500</span></div>
      {!rows.length && <p>No alignment rows were exported for this reference.</p>}
      <table className="result-table pair-table"><thead><tr>{['Entity', 'Term', 'Reference', 'Target', 'Weight', 'Distance'].map(name => <th key={name}>{name}</th>)}</tr></thead><tbody>{[...visible].sort((a, b) => a.entity.localeCompare(b.entity)).slice(0, 500).map((row, i) => <tr key={i}><td><span className="entity-chip" style={entityStyle(row.entity)}>{row.entity}</span></td><td>{row.label}<details><summary>JSON path</summary><code>{row.path}</code></details></td><td>{row.ref}</td><td>{row.tar}</td><td>{row.weight}</td><td>{row.distance}</td></tr>)}</tbody></table>
    </>}
  </section>
}
