import {useEffect, useState} from 'react'
import {Download, LoaderCircle} from 'lucide-react'
import * as api from '../api'
import type {FileHandle} from '../types'
import {useLimits} from '../limits'

export default function PhenopacketStore({operation, disabled, onBusy, onLoad}: {
  operation: string; disabled: boolean; onBusy: (busy: boolean) => void
  onLoad: (files: FileHandle[], message: string) => void
}) {
  const limits = useLimits()
  const [releases, setReleases] = useState<api.StoreRelease[]>([])
  const [tag, setTag] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let stale = false
    void api.storeCached().then(items => {
      if (!stale) {
        const sorted = [...items].sort((a, b) => a.tag.localeCompare(b.tag, undefined, {numeric: true}))
        setReleases(sorted); setTag(sorted.at(-1)?.tag || '')
      }
    }).catch(reason => {if (!stale) setError(String(reason))})
    return () => {stale = true}
  }, [])
  const release = releases.find(item => item.tag === tag)
  const collections = release?.collections || []
  const visible = collections.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  const count = collections.filter(item => selected.includes(item.name)).reduce((total, item) => total + item.records, 0)
  const locked = disabled || !!stage
  async function perform(message: string, action: () => Promise<void>) {
    setStage(message); setError(''); onBusy(true)
    try {await action()} catch (reason) {setError(String(reason))}
    finally {setStage(''); onBusy(false)}
  }
  function remember(item: api.StoreRelease) {
    setReleases(old => [...old.filter(entry => entry.tag !== item.tag), item])
    setTag(item.tag); setSelected([]); setQuery('')
  }
  return <div className="phenopacket-store">
    <p>Compare individual case reports from Phenopacket Store. Download a release once, then select collections to combine into one reference cohort.</p>
    <div className="use-case-controls">
      <button disabled={locked} onClick={() => void perform('Checking releases...', async () => {
        const latest = await api.storeLatest()
        remember(releases.find(item => item.tag === latest.tag && item.collections) || latest)
      })}>Check latest release</button>
      {!!releases.length && <label>Release<select disabled={locked} value={tag} onChange={event => {setTag(event.target.value); setSelected([]); setQuery('')}}>
        {releases.map(item => <option key={item.tag} value={item.tag}>{item.tag}{item.collections ? ' (downloaded)' : ''}</option>)}
      </select></label>}
      {release && !release.collections && <button className="primary" disabled={locked} onClick={() => void perform('Downloading and checking release...', async () => remember(await api.storeDownload(tag)))}><Download size={16}/>Download ({(release.bytes / 1024 / 1024).toFixed(1)} MB)</button>}
    </div>
    <p className="muted">These data retain their original <a href="https://github.com/monarch-initiative/phenopacket-store/blob/main/LICENSE" target="_blank" rel="noreferrer">BSD-3-Clause license</a>, separate from the app license.</p>
    {!!collections.length && <>
      <label>Find collections<input type="search" value={query} disabled={locked} placeholder="Collection or gene name" onChange={event => setQuery(event.target.value)}/></label>
      <div className="use-case-controls">
        <button disabled={locked} onClick={() => setSelected(collections.map(item => item.name))}>Select all collections</button>
        <button disabled={locked || !visible.length} onClick={() => setSelected(old => [...new Set([...old, ...visible.map(item => item.name)])])}>Select matching</button>
        <button disabled={locked || !selected.length} onClick={() => setSelected([])}>Clear selection</button>
      </div>
      <div className="store-collections" aria-label="Collections">
        {visible.map(item => <label key={item.name}><input type="checkbox" disabled={locked} checked={selected.includes(item.name)} onChange={event => setSelected(old => event.target.checked ? [...old, item.name] : old.filter(name => name !== item.name))}/><span>{item.name}</span><small>{item.records.toLocaleString()} records</small></label>)}
        {!visible.length && <p>No matching collections.</p>}
      </div>
      <p>{selected.length.toLocaleString()} collections selected · {count.toLocaleString()} records · one reference cohort</p>
      {operation === 'cohort' && count > limits.mdsRecords && <p className="muted">This selection exceeds the current MDS limit of {limits.mdsRecords.toLocaleString()} records. Adjust it in Settings or select fewer collections; full matrix export remains available.</p>}
      {operation === 'patient' && <p className="muted">Load these reference records, then select your own target patient.</p>}
      <button className="primary" disabled={locked || !count} onClick={() => void perform('Preparing combined cohort...', async () => {
        const result = await api.storeImport(tag, selected)
        onLoad(result.files, `Phenopacket Store ${result.tag}: ${result.records.toLocaleString()} records from ${result.collections} collections loaded as one reference cohort.`)
      })}>Load as one cohort</button>
    </>}
    {stage && <p className="store-progress" role="status"><LoaderCircle size={18} className="run-spinner" aria-hidden="true"/>{stage}</p>}
    {error && <p role="alert">{error}</p>}
    <p className="muted">Downloaded releases remain available offline. Checking for updates does not replace existing cohorts or runs. Collection labels are used for plot colouring, not similarity scoring.</p>
    <p className="muted">Source: <a href="https://monarch-initiative.github.io/phenopacket-store/" target="_blank" rel="noreferrer">Monarch Initiative Phenopacket Store</a>. Please cite Danis et al. (2025) when using these data.</p>
  </div>
}
