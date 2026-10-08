import {useEffect, useRef, useState, type ReactNode} from 'react'
import {Download, FileText} from 'lucide-react'
import * as api from '../api'
import type {Job, OutputFile} from '../types'
import type {RunAction} from '../handoffs'
import {useLimits} from '../limits'
import QrString from './QrString'

const name = (file: OutputFile) => file.filename.replaceAll('\\', '/').split('/').at(-1)!.replace(/\.png$/i, '')
const pageSize = 50

export default function QrResults({job, onSave, onPrepare, disabled, pdfAvailable = true, children}: {
  job: Job; onSave: (file: OutputFile) => Promise<void>; onPrepare: (action: RunAction) => Promise<void>
  disabled: boolean; pdfAvailable?: boolean; children: ReactNode
}) {
  const limits = useLimits()
  const artifacts = job.result?.artifacts || []
  const images = artifacts.filter(file => /^qr\/[^/]+\.png$/i.test(file.filename.replaceAll('\\', '/')))
  const decoded = artifacts.find(file => file.filename.replaceAll('\\', '/') === 'qr/decoded.json')
  const template = artifacts.find(file => file.filename.replaceAll('\\', '/') === 'qr/glob_hash.json')
  const labels = artifacts.find(file => file.filename.replaceAll('\\', '/') === 'qr/labels.json')
  const [filesView, setFilesView] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [activeId, setActiveId] = useState(images[0]?.id)
  const recordList = useRef<HTMLUListElement>(null)
  const focusRecord = useRef(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [url, setUrl] = useState('')
  const [imageError, setImageError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profiles, setProfiles] = useState<Map<string, unknown>>()
  const [profileError, setProfileError] = useState('')
  const matches = images.filter(file => name(file).toLowerCase().includes(query.toLowerCase()))
  const active = matches.find(file => file.id === activeId) || matches[0]
  const visible = matches.slice(page * pageSize, (page + 1) * pageSize)
  useEffect(() => {
    if (focusRecord.current) {
      recordList.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()
      focusRecord.current = false
    }
  }, [activeId, page])
  useEffect(() => {
    if (!active || filesView) return
    let current = true; let objectUrl = ''
    setUrl(''); setImageError('')
    if (active.bytes > limits.previewMiB * 1024 * 1024) {setImageError('QR image exceeds the file preview limit in Settings.'); return}
    api.download(job.id, active.id).then(blob => {
      if (!current) return
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    }).catch(reason => {if (current) setImageError(String(reason))})
    return () => {current = false; if (objectUrl) URL.revokeObjectURL(objectUrl)}
  }, [job.id, active?.id, filesView, limits.previewMiB])
  useEffect(() => {
    if (!showProfile || !decoded || profiles) return
    let current = true
    setProfileError('')
    if (decoded.bytes > limits.previewMiB * 1024 * 1024) {
      setProfileError('Decoded profiles exceed the file preview limit in Settings. PDF creation is still available.'); return
    }
    api.download(job.id, decoded.id).then(blob => blob.text()).then(text => {
      const records: unknown = JSON.parse(text)
      if (!Array.isArray(records)) throw new Error('Expected an array of decoded profiles')
      const mapped = new Map<string, unknown>()
      for (const record of records) {
        if (!record || typeof record.id_from_qr !== 'string') throw new Error('Missing decoded record identifier')
        const key = record.id_from_qr.toLowerCase()
        if (mapped.has(key)) throw new Error('Duplicate decoded record identifiers')
        mapped.set(key, record)
      }
      if (current) setProfiles(mapped)
    }).catch(reason => {if (current) setProfileError(String(reason))})
    return () => {current = false}
  }, [job.id, decoded?.id, showProfile, profiles, limits.previewMiB])
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError('')
    try {await action()} catch (reason) {setError(String(reason))} finally {setBusy(false)}
  }
  function prepare(chosen: OutputFile[]) {
    if (decoded && chosen.length) void perform(() => onPrepare({label: 'Create PDF reports', operation: 'pdf', files: {source: [decoded], qr: chosen,
      ...(labels && template ? {labels: [labels], template: [template]} : {})}}))
  }
  const profile = active && profiles?.get(name(active).toLowerCase())
  const profileText = profile ? JSON.stringify(profile, null, 2) : ''
  return <section aria-label="QR results">
    <nav className="cohort-views" aria-label="QR result views">
      <button aria-pressed={!filesView} onClick={() => setFilesView(false)}>Records ({images.length.toLocaleString()})</button>
      <button aria-pressed={filesView} onClick={() => setFilesView(true)}>Output files</button>
    </nav>
    {filesView ? children : <>
      <div className="result-actions">
        <label>Find record<input type="search" value={query} onChange={event => {setQuery(event.target.value); setPage(0)}}/></label>
        <span>{selected.size.toLocaleString()} selected</span>
        <button disabled={!visible.length} onClick={() => setSelected(old => new Set([...old, ...visible.map(file => file.id)]))}>Select page</button>
        <button disabled={!selected.size} onClick={() => setSelected(new Set())}>Clear selection</button>
        {decoded && <button className="primary" disabled={disabled || busy || !pdfAvailable || !selected.size} onClick={() => prepare(images.filter(file => selected.has(file.id)))}><FileText/>Create PDFs for selected records</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {!decoded && <p className="alignment-note">To view profiles or create PDFs, encode again with the matching global hash.</p>}
      <div className="qr-record-browser">
        <div>
          <ul ref={recordList} className="qr-record-list" aria-label="QR records">{visible.map(file => <li key={file.id}>
            <input type="checkbox" aria-label={`Select ${name(file)}`} checked={selected.has(file.id)} onChange={event => setSelected(old => {
              const next = new Set(old); if (event.target.checked) next.add(file.id); else next.delete(file.id); return next
            })}/>
            <button aria-pressed={file.id === active?.id} onClick={() => setActiveId(file.id)} onKeyDown={event => {
              if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
              event.preventDefault()
              const index = matches.findIndex(item => item.id === file.id) + (event.key === 'ArrowDown' ? 1 : -1)
              if (index < 0 || index >= matches.length) return
              focusRecord.current = true; setActiveId(matches[index].id); setPage(Math.floor(index / pageSize))
            }}>{name(file)}</button>
          </li>)}</ul>
          {!matches.length && <p>No matching records.</p>}
          <div className="result-actions">
            <button disabled={!page} onClick={() => setPage(value => value - 1)}>Previous</button>
            <span>Page {page + 1} of {Math.max(1, Math.ceil(matches.length / pageSize))}</span>
            <button disabled={(page + 1) * pageSize >= matches.length} onClick={() => setPage(value => value + 1)}>Next</button>
          </div>
        </div>
        {active && <section className="qr-record-preview" aria-label="Selected QR record">
          <h3>{name(active)}</h3>
          {imageError ? <p role="alert">{imageError}</p> : url ? <img src={url} alt={`QR code for ${name(active)}`}/> : <p role="status">Loading QR image...</p>}
          <div className="result-actions">
            <button disabled={busy || disabled} onClick={() => void perform(() => onSave(active))}><Download/>Save QR</button>
            {decoded && <button className="primary" disabled={busy || disabled || !pdfAvailable} onClick={() => prepare([active])}><FileText/>Create PDF for this record</button>}
          </div>
          <QrString jobId={job.id} artifact={artifacts.find(file => file.filename.replaceAll('\\', '/') === active.filename.replaceAll('\\', '/').replace(/\.png$/i, '.payload.txt'))}
            metadata={artifacts.find(file => file.filename.replaceAll('\\', '/') === active.filename.replaceAll('\\', '/').replace(/\.png$/i, '.qr.json'))}/>
          {decoded && <>
            <label><input type="checkbox" checked={showProfile} onChange={event => setShowProfile(event.target.checked)}/>Show decoded profile</label>
            {showProfile && <><p className="muted">Reconstructed encoded features, not the complete original record.</p>
              {profileError ? <p role="alert">{profileError}</p> : !profiles ? <p role="status">Loading profiles...</p> : profileText
                ? <pre>{profileText.slice(0, 65536)}{profileText.length > 65536 ? '\n[Preview limited to 64 KiB]' : ''}</pre>
                : <p>No matching decoded profile.</p>}</>}
          </>}
        </section>}
      </div>
    </>}
  </section>
}
