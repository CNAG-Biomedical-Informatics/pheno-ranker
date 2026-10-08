import {useEffect, useRef, useState} from 'react'
import {LoaderCircle} from 'lucide-react'
import * as api from '../api'
import type {FileHandle} from '../types'

export default function BeaconImport({onImport, onClose}: {
  onImport: (files: FileHandle[], message: string) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [filters, setFilters] = useState('')
  const [terms, setTerms] = useState<{id: string; label: string}[]>([])
  const [selected, setSelected] = useState<{id: string; label: string}[]>([])
  const [search, setSearch] = useState('')
  const [discovery, setDiscovery] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [allowPartial, setAllowPartial] = useState(true)
  const [pageSize, setPageSize] = useState(100)
  const [maxPages, setMaxPages] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {dialog.current?.showModal()}, [])
  function resetFilters() {setTerms([]); setSelected([]); setFilters(''); setSearch(''); setDiscovery('')}
  async function discover() {
    setDiscovering(true); setDiscovery(''); setTerms([])
    try {
      const result = await api.beaconFilters({url, token})
      setTerms(result.terms)
      setDiscovery(result.terms.length ? 'Search the terms returned by this Beacon. More terms may be available through manual entry.' : 'No selectable terms returned. You can enter identifiers manually.')
    } catch {setDiscovery('Filter discovery is unavailable. You can still enter identifiers manually.')}
    finally {setDiscovering(false)}
  }
  const locked = busy || discovering
  const portugueseBeacon = /^https:\/\/beacon\.biodata\.pt(?:\/|$)/i.test(url)
  const matches = search.trim() ? terms.filter(term => !selected.some(item => item.id === term.id) && `${term.label} ${term.id}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 20) : []
  async function submit() {
    setBusy(true); setError('')
    try {
      const result = await api.importBeacon({url, token, filters: [...new Set([...selected.map(term => term.id), ...filters.split('\n').map(value => value.trim()).filter(Boolean)])], pageSize, maxPages, allowPartial})
      onImport(result.files, `Imported ${result.records} Beacon records from ${result.pages} page${result.pages === 1 ? '' : 's'}.` + (result.pageLimitReached ? ' Page limit reached; this may be a subset of the matching cohort.' : ''))
    } catch (reason) {setError(String(reason)); setBusy(false)}
  }
  return <dialog ref={dialog} className="project-modal beacon-modal" onCancel={event => {event.preventDefault(); if (!locked) onClose()}}>
    <h2>Import Beacon v2 individuals</h2>
    <p>Discover the individuals endpoint, retrieve record-level results, and add each result set as a reference cohort.</p>
    <button disabled={locked} onClick={() => {setUrl('https://beacon.biodata.pt/api/individuals'); setToken(''); resetFilters(); setPageSize(100); setMaxPages(100); setError('')}}>Use BioData.pt example</button>
    <p className="muted">Loads connection settings for a public Beacon. Select Import records to retrieve its current data; an internet connection is required.</p>
    <label>Beacon API URL<input type="url" required placeholder="https://beacon.example.org/api/individuals" value={url} disabled={locked} onChange={event => {setUrl(event.target.value); resetFilters()}} /></label>
    <small>Use an individuals endpoint or an API base URL.</small>
    <label>Bearer token (optional)<input type="password" autoComplete="off" value={token} disabled={locked} onChange={event => {setToken(event.target.value); resetFilters()}} /></label>
    <small>The token is used only for this request. It is not saved in projects, run history, logs, or provenance.</small>
    <section aria-label="Beacon filters">
      <button disabled={locked || !url} onClick={() => void discover()}>{discovering && <LoaderCircle size={16} className="run-spinner" aria-hidden="true"/>}{discovering ? 'Discovering filters...' : 'Discover filters'}</button>
      {discovery && <p className="muted" role="status">{discovery}</p>}
      {!!terms.length && <label>Find a filter<input type="search" placeholder="Term name or CURIE" value={search} disabled={locked} onChange={event => setSearch(event.target.value)} /></label>}
      <div className="beacon-filter-choices">{matches.map(term => <button key={term.id} disabled={locked} onClick={() => {setSelected([...selected, term]); setSearch('')}}>{term.label} ({term.id})</button>)}</div>
      <div className="beacon-filter-chips">{selected.map(term => <button key={term.id} disabled={locked} aria-label={`Remove ${term.label}`} onClick={() => setSelected(selected.filter(item => item.id !== term.id))}>{term.label} ({term.id}) <span aria-hidden="true">×</span></button>)}</div>
      <details><summary>Enter filter identifiers manually</summary>
        <label>Ontology filters (one per line)<textarea placeholder={portugueseBeacon ? 'NCIT:C16576' : 'HP:0001250'} value={filters} disabled={locked} onChange={event => setFilters(event.target.value)} /></label>
        {portugueseBeacon && <p className="muted">Examples observed in BioData.pt records: female (<code>NCIT:C16576</code>), England (<code>GAZ:00002641</code>), and BMI (<code>LOINC:35925-4</code>). Presence in a record does not guarantee filter support; this Beacon currently returns an empty filter catalogue.</p>}
      </details>
      <p className="muted">Match all selected filters (AND). Leave empty to import without filters. These select the reference cohort, not the patient similarity ranking.</p>
    </section>
    <div className="beacon-limits"><label>Records per page<input type="number" min="1" max="1000" value={pageSize} disabled={busy} onChange={event => setPageSize(Number(event.target.value))} /></label>
      <label>Maximum pages<input type="number" min="1" max="100" value={maxPages} disabled={busy} onChange={event => setMaxPages(Number(event.target.value))} /></label></div>
    <label><input type="checkbox" checked={allowPartial} disabled={locked} onChange={event => setAllowPartial(event.target.checked)} />Keep records up to the page limit</label>
    <p className="muted">Imports are limited to 10,000 records. Records per page applies to each result set. Limited imports are labelled as potentially incomplete, not random samples.</p>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status" className="muted">Retrieving records from the Beacon. This may take a moment.</p>}
    <div className="modal-actions"><button className="primary" disabled={locked || !url} onClick={() => void submit()}>{busy && <LoaderCircle size={16} className="run-spinner" aria-hidden="true"/>}{busy ? 'Importing...' : 'Import records'}</button>
      <button disabled={locked} onClick={onClose}>Cancel</button></div>
  </dialog>
}
