import { useEffect, useState } from 'react'
import * as api from '../api'
import type { FileHandle } from '../types'

type Choices = {allowed: string[]; present: string[]; note: string}
export default function TermSelection({files, values, onChange}: {files: Record<string, FileHandle[]>; values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void}) {
  const included = Array.isArray(values['include-terms']) ? values['include-terms'] as string[] : []
  const excluded = Array.isArray(values['exclude-terms']) ? values['exclude-terms'] as string[] : []
  const [emptyMode, setMode] = useState('all')
  const mode = included.length ? 'include' : excluded.length ? 'exclude' : emptyMode
  const [choices, setChoices] = useState<Choices>({allowed: [], present: [], note: ''})
  const [error, setError] = useState('')
  const [custom, setCustom] = useState('')
  const [more, setMore] = useState(false)
  const request = JSON.stringify({config: files.config?.[0]?.id, sources: [...files.reference || [], ...files.target || []].map(file => file.id)})
  useEffect(() => {
    let current = true
    setChoices({allowed: [], present: [], note: ''}); setError('')
    void api.request<Choices>('/api/terms', JSON.parse(request)).then(value => {
      if (!value || !Array.isArray(value.allowed) || !Array.isArray(value.present)) throw new Error('Invalid term suggestions')
      if (current) setChoices(value)
    }).catch(reason => {if (current) setError(String(reason))})
    return () => {current = false}
  }, [request])
  const selection = mode === 'include' ? included : excluded
  const update = (nextMode: string, terms: string[]) => {
    setMode(nextMode)
    onChange({...values, 'include-terms': nextMode === 'include' ? terms : [], 'exclude-terms': nextMode === 'exclude' ? terms : []})
  }
  const available = [...new Set([...selection, ...(more || !choices.present.length ? choices.allowed : choices.present)])]
  return <section className="term-selection" aria-label="Term selection">
    <h2>Terms to compare</h2>
    <label>Selection mode <select value={mode} onChange={event => update(event.target.value, event.target.value === 'all' ? [] : selection)}><option value="all">All terms</option><option value="include">Include selected</option><option value="exclude">Exclude selected</option></select></label>
    <p className="muted">{mode === 'all' || !selection.length ? 'All terms are included, subject to configuration filtering.' : mode === 'include' ? 'Only the selected terms will be compared.' : 'The selected terms will be left out.'}</p>
    {mode !== 'all' && <>
      <div className="term-chips">{available.map(term => <button key={term} type="button" aria-pressed={selection.includes(term)} onClick={() => update(mode, selection.includes(term) ? selection.filter(value => value !== term) : [...selection, term])}>{term}{selection.includes(term) ? ' ×' : ' +'}</button>)}</div>
      {choices.present.length > 0 && <button type="button" onClick={() => setMore(value => !value)}>{more ? 'Show terms found in inputs' : 'Show all configured terms'}</button>}
      <div className="custom-term"><input aria-label="Custom term" placeholder="Custom term" value={custom} onChange={event => setCustom(event.target.value)} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); if (custom.trim()) {update(mode, [...new Set([...selection, custom.trim()])]); setCustom('')}}}}/><button type="button" disabled={!custom.trim()} onClick={() => {update(mode, [...new Set([...selection, custom.trim()])]); setCustom('')}}>Add term</button></div>
      <small>Custom terms must be allowed by your configuration.</small>
    </>}
    {choices.note && <p className="muted">{choices.note}</p>}{error && <p role="status">Term suggestions unavailable. You can still enter configured terms manually.</p>}
  </section>
}
