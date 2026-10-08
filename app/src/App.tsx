import { useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, PanelLeftClose, PanelLeftOpen, Settings, BookOpen, Ellipsis, Trash2, Play, X, Check, Pencil, FolderOpen, FlaskConical, QrCode, FileText } from 'lucide-react'
import * as api from './api'
import { confirmAction, finishQuit, openExternal, projectFile, revealRun, selectPaths } from './desktop'
import type { FileDefinition, FileHandle, Job, Operation, OutputFile, Project, SafetyAssessment } from './types'
import ConversionOptions from './components/ConversionOptions'
import JobSettings from './components/JobSettings'
import Results from './components/Results'
import QrResults from './components/QrResults'
import RunProjections from './components/RunProjections'
import OutputHandoff from './components/OutputHandoff'
import YamlEditor from './components/YamlEditor'
import BeaconImport from './components/BeaconImport'
import AnalysisSettings from './components/AnalysisSettings'
import ToolsMenu from './components/ToolsMenu'
import RunStatus from './components/RunStatus'
import RunInputs from './components/RunInputs'
import InputSource, { type InputSourceKind } from './components/InputSource'
import RunOutputPicker from './components/RunOutputPicker'
import UseCaseExamples, { useCases, useCaseOptions, type UseCaseId } from './components/UseCaseExamples'
import RunDetails from './components/RunDetails'
import DeleteRuns from './components/DeleteRuns'
import { runActions, type RunAction } from './handoffs'
import './ranker.css'
import { toolInputSummary } from './inputSummary'
import { missingAnalysisInputs } from './inputReadiness'
import {LimitsContext, defaultLimits} from './limits'

const active = (job: Job) => ['queued', 'running', 'cancelling'].includes(job.status)
const logo = new URL('../../docs-site/static/img/iconhex.svg', import.meta.url).href
export default function App() {
  const [catalog, setCatalog] = useState<Operation[]>([])
  const [operation, setOperation] = useState('cohort')
  const [files, setFiles] = useState<Record<string, FileHandle[]>>({})
  const [inputSource, setInputSource] = useState<InputSourceKind>('files')
  const [options, setOptions] = useState<Record<string, unknown>>({})
  const [runs, setRuns] = useState<Job[]>([])
  const historyRevision = useRef(0)
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState('setup')
  const [navigation, setNavigation] = useState(true)
  const [runQuery, setRunQuery] = useState('')
  const [runFilter, setRunFilter] = useState('all')
  const [runMenu, setRunMenu] = useState('')
  const [renaming, setRenaming] = useState('')
  const [runName, setRunName] = useState('')
  const [deleteRequest, setDeleteRequest] = useState<{item?: Job}>()
  const drafts = useRef<Record<string, {files: Record<string, FileHandle[]>; options: Record<string, unknown>}>>({})
  const resultsPanel = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [project, setProject] = useState<FileHandle>()
  const projectName = project?.filename.replace(/\.phenoranker$/i, '') || 'Untitled project'
  const [destination, setDestination] = useState<FileHandle>()
  const [outputDefaults, setOutputDefaults] = useState<api.JobSettings>()
  const [editor, setEditor] = useState<{role: string; text: string}>()
  const [handoff, setHandoff] = useState<OutputFile>()
  const [beaconImport, setBeaconImport] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('ranker-theme') || 'system')
  const spec = catalog.find(item => item.id === operation)
  const run = runs.find(item => item.id === selected)
  const label = (id: string) => catalog.find(item => item.id === id)?.label || id
  const isAnalysis = ['patient', 'cohort'].includes(operation)
  const missingInputs = isAnalysis ? missingAnalysisInputs(operation, files)
    : (spec?.input.files || []).filter(role => role.required && !files[role.name]?.length).map(role => role.label)
  const visibleRuns = runs.filter(item => (runFilter === 'all' || (runFilter === 'active' ? active(item) : item.status === runFilter)) &&
    [item.name, label(item.conversion), item.id, item.status, ...item.sources, new Date(item.created * 1000).toLocaleString()].join(' ').toLowerCase().includes(runQuery.trim().toLowerCase()))
  const menu = useRef<(name: string) => Promise<void>>(async () => {})

  useEffect(() => {
    let current = true
    api.operations().then(value => {if (current) {setCatalog(value); setReady(true)}}).catch(reason => setError(String(reason)))
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      const revision = historyRevision.current
      try { const value = await api.jobs(); if (current && revision === historyRevision.current) setRuns(value) }
      catch (reason) { if (current) setError(String(reason)) }
      if (current) timer = setTimeout(() => void poll(), 700)
    }
    void poll()
    const listening = listen<string>('desktop-menu', event => {void menu.current(event.payload)})
    return () => {current = false; clearTimeout(timer); void listening.then(unlisten => unlisten())}
  }, [])
  useEffect(() => {
    if (selected && !runs.some(item => item.id === selected)) {
      setSelected(''); setHandoff(undefined); setRunMenu('')
      setTab(current => current === 'results' ? 'setup' : current)
    }
  }, [runs, selected])
  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {document.documentElement.dataset.theme = theme === 'system' ? system.matches ? 'dark' : 'light' : theme}
    apply(); system.addEventListener('change', apply)
    localStorage.setItem('ranker-theme', theme)
    return () => system.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {void getCurrentWindow().setTitle(`${dirty ? '* ' : ''}${projectName} - Pheno-Ranker`).catch(() => {})}, [dirty, projectName])
  useEffect(() => {
    let current = true
    api.getJobSettings().then(value => {if (current) setOutputDefaults(value)}).catch(() => {if (current) setOutputDefaults(undefined)})
    return () => {current = false}
  }, [tab])
  async function perform(task: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {await task()} catch (reason) {setError(String(reason))} finally {setBusy(false)}
  }
  function updateFiles(value: Record<string, FileHandle[]>) {
    if (['qr-decode', 'pdf'].includes(operation)) {
      value = Object.fromEntries(Object.entries(value).map(([role, entries]) => {
        const seen = new Set<string>()
        return [role, entries.filter(file => {
          const key = file.displayPath || file.id
          if (seen.has(key)) return false
          seen.add(key); return true
        })]
      }))
    }
    setFiles(value); setDirty(true)
  }
  function changeInputSource(source: InputSourceKind) {
    if (source === inputSource || busy || editor) return
    setInputSource(source); setFiles({}); setOptions({}); setNotice(''); setError(''); setDirty(true)
    delete drafts.current.patient
    delete drafts.current.cohort
  }
  async function removeRuns(item?: Job, deleteFiles = false) {
    historyRevision.current++
    const result = item ? await api.request(`/api/jobs/${item.id}${deleteFiles ? '/files' : ''}`, undefined, 'DELETE')
      : await api.request<{failed: {message: string}[]}>(deleteFiles ? '/api/jobs/delete-all-files' : '/api/jobs', deleteFiles ? {} : undefined, deleteFiles ? 'POST' : 'DELETE')
    const updated = await api.jobs()
    historyRevision.current++
    setRuns(updated); setRunMenu(''); setDirty(true)
    if (!updated.some(value => value.id === selected)) {setSelected(''); setHandoff(undefined); setTab(current => current === 'results' ? 'setup' : current)}
    if (!item && (result as {failed: {message: string}[]}).failed.length) throw new Error((result as {failed: {message: string}[]}).failed.map(value => value.message).join('; '))
  }
  async function renameRun(id: string) {
    const updated = await api.request<Job>(`/api/jobs/${id}/rename`, {name: runName.trim()})
    setRuns(current => current.map(value => value.id === id ? {...value, name: updated.name} : value))
    setRenaming(''); setDirty(true)
  }
  function changeOperation(id: string) {
    if (editor || busy) return
    if (id === operation) {setTab('setup'); return}
    drafts.current[operation] = {files, options}
    setOperation(id); setOptions(drafts.current[id]?.options || {}); setTab('setup'); setDirty(true)
    const roles = catalog.find(item => item.id === id)?.input.files.map(item => item.name) || []
    setFiles(drafts.current[id]?.files || (isAnalysis && ['patient', 'cohort'].includes(id) ? Object.fromEntries(Object.entries(files).filter(([role]) => roles.includes(role))) : {}))
  }
  async function save(as = false): Promise<boolean> {
    if (editor) throw new Error('Apply or close the YAML editor before saving the project.')
    const value = await projectFile<{file: FileHandle}>('save', {
      settings: {conversion: operation, options, output: {}},
      files: Object.fromEntries(Object.entries(files).map(([role, entries]) => [role, entries.map(f => f.id)])),
      runs: runs.map(item => item.id), destination: destination?.id,
    }, as ? undefined : project?.id)
    if (!value) return false
    setProject(value.file); setDirty(false); setNotice('Project saved.'); return true
  }
  async function discard() {
    return !dirty && !editor || await confirmAction('Unsaved changes', 'Discard unsaved project settings or editor changes? Cancel to save them first.')
  }
  async function openProject() {
    if (!await discard()) return
    const value = await projectFile<Project>('open')
    if (!value) return
    if (!catalog.some(item => item.id === value.settings.conversion)) throw new Error('This project uses an unsupported operation.')
    drafts.current = {}
    setProject(value.file); setOperation(value.settings.conversion); setOptions(value.settings.conversion === 'cohort' && value.settings.options.projection === undefined && value.settings.options.mds !== undefined
      ? {...value.settings.options, projection: value.settings.options.mds ? 'mds' : 'none'} : value.settings.options)
    setFiles(value.files); setDestination(value.destination); setEditor(undefined); setDirty(false); setTab('setup')
    if (value.missing.length) setError('Reselect missing files: ' + value.missing.map(item => `${item.role}: ${item.path}`).join('; '))
    else setNotice('Project reopened.')
  }
  async function launch() {
    if (!spec) return
    if (editor) throw new Error('Apply or close the YAML editor before running.')
    if (missingInputs.length) throw new Error(`Select ${missingInputs.join(' and ')} before running.`)
    const allowed = spec.input.files.map(item => item.name)
    const defaults = Object.fromEntries(spec.options.filter(item => item.default !== undefined).map(item => [item.name, item.default]))
    const effective = {...defaults, ...options}
    for (const [name, value] of Object.entries(effective)) if (value === '') delete effective[name]
    const request = {conversion: operation, input: {files: Object.fromEntries(
      Object.entries(files).filter(([role]) => allowed.includes(role)).map(([role, entries]) => [role, entries.map(file => file.id)]))},
      options: effective, output: {}, ...(destination ? {destination: destination.id} : {})}
    if (operation === 'cohort') {
      const safety = await api.request<SafetyAssessment>('/api/jobs/preflight', request)
      if (safety.warnings.length && !await confirmAction('Confirm large graph export',
        `${safety.recordCount == null ? 'Record count unknown.' : `${safety.recordCount.toLocaleString()} records; up to ${safety.possibleEdges?.toLocaleString()} graph edges.`}\n\n${safety.warnings.join('\n\n')}\n\nContinue?`)) return
    } else if (!isAnalysis && !['csv', 'summary', 'qr-encode', 'qr-decode', 'pdf'].includes(operation)) {
      const summary = toolInputSummary(spec, files)
      if (!await confirmAction(`Run ${spec.label}`, `${summary}\n\nStart this tool with all selected inputs?`)) return
    }
    const result = await api.submit(request)
    setSelected(result.id); setRuns(old => [result, ...old.filter(item => item.id !== result.id)]); setTab('results'); setDirty(true)
    setRunQuery(''); setRunFilter('all')
  }
  async function confirmCsvReplacement() {
    return !Object.values(files).some(entries => entries.length) || await confirmAction(
      'Replace current inputs?',
      'This CSV output needs its own configuration. Replace all selected input files with this CSV output and its matching configuration? Original files and previous runs will not be changed.',
    )
  }
  async function loadUseCase(id: UseCaseId) {
    if (editor) throw new Error('Apply or close the YAML editor before loading a use case.')
    const nextFiles = await api.example(id, operation)
    const example = useCases[id]
    drafts.current[operation] = {files, options}
    setFiles(nextFiles); setOptions(useCaseOptions(operation)); setDirty(true)
    setNotice(`${example.label} loaded. Review the inputs and settings, then run the analysis.`)
  }
  async function useOutput(artifact: OutputFile, operationId: string, role: string, source = run) {
    const run = source
    if (!run) return
    if (editor) throw new Error('Apply or close the YAML editor before reusing an output.')
    const next = catalog.find(item => item.id === operationId)!
    const allowed = next.input.files.map(item => item.name)
    const csvAnalysis = run.conversion === 'csv' && ['patient', 'cohort'].includes(operationId) && ['reference', 'target'].includes(role)
    const retained = csvAnalysis ? {} as Record<string, FileHandle[]> : Object.fromEntries(Object.entries(files).filter(([name]) => allowed.includes(name)))
    const multiple = next.input.files.find(item => item.name === role)?.multiple
    if (csvAnalysis) {
      const pair = runActions(run).find(action => action.files.reference?.[0]?.id === artifact.id)
      if (!pair) throw new Error('Select the converted JSON with its matching generated configuration, or use the CSV run\'s Use in analysis action.')
      if (!await confirmCsvReplacement()) return
      retained.config = [await api.reuse(run.id, pair.files.config[0].id)]
    }
    const handle = await api.reuse(run.id, artifact.id)
    updateFiles({...retained, [role]: multiple ? [...retained[role] || [], handle] : [handle]})
    if (operation !== operationId) {drafts.current[operation] = {files, options}; setOptions({})}
    setOperation(operationId); setTab('setup')
    setNotice(`${handle.filename} selected for ${role}.${run.conversion === 'csv' && ['reference', 'target'].includes(role) && ['patient', 'cohort'].includes(operationId) ? ' Its matching CSV configuration is also selected.' : ''}`)
  }
  async function prepareAction(source: Job, action: RunAction) {
    if (editor) throw new Error('Apply or close the YAML editor before preparing another run.')
    if (source.conversion === 'csv' && ['patient', 'cohort'].includes(action.operation) && !await confirmCsvReplacement()) return
    const nextFiles: Record<string, FileHandle[]> = {}
    for (const [role, artifacts] of Object.entries(action.files)) {
      nextFiles[role] = []
      for (const artifact of artifacts) nextFiles[role].push(await api.reuse(source.id, artifact.id))
    }
    drafts.current[operation] = {files, options}
    setOperation(action.operation); setFiles(nextFiles); setOptions({}); setTab('setup'); setDirty(true)
    if (['patient', 'cohort'].includes(action.operation)) setInputSource('runs')
    setNotice(`Inputs selected from ${source.name || label(source.conversion)} (${source.id.slice(0, 8)}). ${action.operation === 'pdf' ? 'Review the BFF/PXF report format, then run.' : action.operation === 'qr-encode' ? 'QR codes will contain the reference records, with their matching global hash retained for decoding.' : 'Review the analysis mode and settings, then run.'}`)
  }
  async function edit(role: string) {
    const source = files[role]?.[0]
    const preview = source ? await api.request<{text: string; truncated: boolean}>(`/api/inputs/${source.id}/preview`) : {text: '{}\n', truncated: false}
    if (preview.truncated) throw new Error('This file is too large for the editor; edit it externally.')
    setEditor({role, text: preview.text}); setTab('setup')
  }
  menu.current = async name => perform(async () => {
    if (name === 'save' || name === 'save-as') {await save(name === 'save-as')}
    else if (name === 'open') await openProject()
    else if (name === 'new' || name === 'close-project') {
      if (await discard()) {drafts.current = {}; setFiles({}); setOptions({}); setProject(undefined); setDestination(undefined); setEditor(undefined); setDirty(false); setTab('setup')}
    } else if (name === 'run') await launch()
    else if (name === 'cancel' && run && active(run)) await api.cancel(run.id)
    else if (name === 'cancel-pending') await api.request('/api/jobs/cancel-pending', {})
    else if (name === 'settings') setTab('settings')
    else if (name === 'toggle-sidebar') setNavigation(current => !current)
    else if (name === 'quit') {
      if (await discard() && (!runs.some(active) || await confirmAction('Running jobs', 'Quit and cancel unfinished jobs?'))) await finishQuit()
    } else if (name === 'playground') await openExternal('https://cnag-biomedical-informatics.github.io/sql.js-httpvfs-playground/')
    else if (name === 'docs' || name === 'github') await openExternal(name === 'docs'
      ? 'https://cnag-biomedical-informatics.github.io/pheno-ranker/'
      : 'https://github.com/CNAG-Biomedical-Informatics/pheno-ranker')
    else if (name === 'delete-history' || name === 'delete-files') {
      setDeleteRequest({})
    }
  })
  const renderInputs = (roles: FileDefinition[]) => roles.map(role => <div key={role.name} className="file-selection">
    <div><strong>{role.label}{role.required ? ' (required)' : ''}</strong>
      {(files[role.name] || []).map(file => <small key={file.id}>{file.displayPath || file.filename}<button title={`Remove ${file.filename}`} aria-label={`Remove ${file.filename}`} onClick={() => updateFiles({...files, [role.name]: files[role.name].filter(f => f.id !== file.id)})}><X/></button></small>)}
    </div>
    {(!isAnalysis || inputSource === 'files' || role.name === 'target' || !['reference', 'target'].includes(role.name)) && <button className={isAnalysis && ['reference', 'target'].includes(role.name) && !files[role.name]?.length ? 'primary' : undefined} disabled={busy || !!editor} aria-label={`Select ${role.label}`} onClick={() => void perform(async () => {const chosen = await selectPaths(false, role.multiple); if (chosen.length) updateFiles({...files, [role.name]: role.multiple ? [...files[role.name] || [], ...chosen] : chosen})})}><FolderOpen/>Select</button>}
    {(!isAnalysis || inputSource === 'runs') && <RunOutputPicker runs={runs} operation={operation} role={role.name} label={role.label} disabled={busy || !!editor} showEmpty={isAnalysis && ['reference', 'target'].includes(role.name)} onUse={(source, artifact) => useOutput(artifact, operation, role.name, source)}/>}
    {['config', 'weights'].includes(role.name) && <button title={`Edit a copy of ${role.label}`} aria-label={`Edit a copy of ${role.label}`} onClick={() => void perform(() => edit(role.name))}><Pencil/></button>}
  </div>)
  const outputLocation = <>
    <h2>Output location</h2><p className="output-path">{destination?.displayPath || destination?.filename || outputDefaults?.defaultOutputFolder || outputDefaults?.managedOutputRoot || 'Default results folder from Settings'}</p>
    <p className="muted">{destination ? 'Project / run override' : 'Default from Settings'} · Each run uses a separate subfolder.</p>
    <button onClick={() => void perform(async () => {const chosen = await selectPaths(true); if (chosen[0]) {setDestination(chosen[0]); setDirty(true)}})}><FolderOpen/>Choose folder</button>
    {destination && <button onClick={() => {setDestination(undefined); setDirty(true)}}>Use default</button>}
  </>
  const saveOutput = (artifact: OutputFile) => perform(async () => {
    if (run) await invoke('save_output', {job: run.id, artifact: artifact.id, filename: artifact.filename})
  })
  const outputPreview = run && <Results key={run.id} job={run} sourceJob={runs.find(item => item.id === run.options['source-run'])} onOpenFolder={() => perform(() => revealRun(run.id))} onReuse={async artifact => {setHandoff(artifact)}} onSave={saveOutput}/>
  return <LimitsContext.Provider value={outputDefaults?.limits || defaultLimits}><div className="desktop-shell">
    <header className="desktop-titlebar"><img src={logo} alt="" width="30" height="34"/><strong>Pheno-Ranker</strong><span className="local-note">Local analysis workspace</span></header>
    <div className="desktop-toolbar" role="toolbar" aria-label="Workspace actions">
      <button title={navigation ? 'Hide navigation' : 'Show navigation'} aria-label={navigation ? 'Hide navigation' : 'Show navigation'} aria-expanded={navigation} aria-controls="run-navigation" onClick={() => setNavigation(value => !value)}>{navigation ? <PanelLeftClose/> : <PanelLeftOpen/>}</button>
      <button disabled={!ready || busy || !!editor} onClick={() => changeOperation(isAnalysis ? operation : 'cohort')}><Plus/>New analysis</button>
      <ToolsMenu operations={catalog.filter(item => !['patient', 'cohort', 'projection'].includes(item.id))} disabled={!ready || busy || !!editor} onSelect={changeOperation}/>
      <span className="route-title">{tab === 'settings' ? 'Settings' : tab === 'results' && run ? `${run.name || label(run.conversion)} · ${run.id.slice(0, 8)}` : spec?.label || 'Connecting to engine'}</span>
      {tab === 'results' && run && active(run) && <button onClick={() => void perform(async () => {await api.cancel(run.id)})}><X/>Cancel run</button>}
      {tab === 'setup' && <button className={missingInputs.length ? undefined : 'primary'} disabled={!ready || busy || !!editor || missingInputs.length > 0} onClick={() => void perform(launch)}><Play/>{isAnalysis ? 'Run analysis' : 'Run utility'}</button>}
    </div>
    {error && <div className="desktop-alert" role="alert">{error}<button title="Dismiss error" aria-label="Dismiss error" onClick={() => setError('')}><X/></button></div>}
    {notice && <div className="desktop-message" role="status">{notice}</div>}
    <div className="desktop-body">
      {navigation && <aside className="workspace-tree" id="run-navigation" aria-label="Run history">
        <div className="workspace-tree-scroll">
          <div className="runs-heading"><h2>Runs <span>{runs.length}</span></h2><button aria-label="Delete all finished runs" title="Remove finished runs" disabled={busy || !runs.some(item => !active(item))} onClick={() => setDeleteRequest({})}><Trash2/></button></div>
          <label className="run-search"><Search/><input aria-label="Find runs" placeholder="Find a run..." value={runQuery} onChange={event => setRunQuery(event.target.value)}/></label>
          <select className="run-status-filter" aria-label="Filter runs by status" value={runFilter} onChange={event => setRunFilter(event.target.value)}>
            <option value="all">All runs</option><option value="active">Active and queued</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="interrupted">Interrupted</option>
          </select>
          <p className="queue-summary">{runs.filter(item => item.status === 'running' || item.status === 'cancelling').length} running · {runs.filter(item => item.status === 'queued').length} queued</p>
          {!visibleRuns.length && <p className="run-empty">{runs.length ? 'No matching runs.' : 'Your runs will appear here. Start with an example or your own files.'}</p>}
          <div className="run-tree">{visibleRuns.map(item => <div className="run-entry" key={item.id} onKeyDown={event => {if (event.key === 'Escape') {setRunMenu(''); setRenaming('')}}}>
            {renaming === item.id ? <form className="run-rename" onSubmit={event => {event.preventDefault(); void perform(() => renameRun(item.id))}}><input autoFocus aria-label="Run name" maxLength={80} value={runName} onChange={event => setRunName(event.target.value)}/><button title="Save name" aria-label="Save name" disabled={busy || !runName.trim()}><Check/></button><button type="button" title="Cancel renaming" aria-label="Cancel renaming" onClick={() => setRenaming('')}><X/></button></form> : <>
            <button className="tree-run" aria-pressed={tab === 'results' && selected === item.id} onClick={() => {setSelected(item.id); setTab('results'); setRunMenu('')}}>
            <strong>{item.name || label(item.conversion)}</strong><RunStatus status={item.status}/><small>{new Date(item.created * 1000).toLocaleString()}</small><small>{item.id.slice(0, 8)}{item.queuePosition ? ` / queue ${item.queuePosition}` : ''}</small>
            </button><button className="run-more" title="Run actions" aria-label={`Actions for ${item.name || label(item.conversion)}`} aria-expanded={runMenu === item.id} onClick={() => setRunMenu(runMenu === item.id ? '' : item.id)}><Ellipsis/></button>
            {runMenu === item.id && <div className="run-action-menu"><button disabled={busy} onClick={() => {setRenaming(item.id); setRunName(item.name || label(item.conversion)); setRunMenu('')}}><Pencil/>Rename</button><button className="delete-run" disabled={busy || active(item)} onClick={() => setDeleteRequest({item})}><Trash2/>Delete run</button></div>}</>}
          </div>)}</div>
        </div>
        <nav className="workspace-nav" aria-label="Application"><button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}><Settings/>Settings</button><button onClick={() => void menu.current('docs')}><BookOpen/>Documentation</button></nav>
      </aside>}
      <main className="desktop-content">
        <nav className="workspace-tabs" aria-label="Workspace views">{['setup', 'results'].map(name => <button key={name} disabled={name === 'results' && !run} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name === 'setup' ? 'Setup' : 'Selected run'}</button>)}</nav>
        <div className="workspace-view">
          {tab === 'setup' && spec && <section className="conversion-editor">
            {isAnalysis && <div className="analysis-modes" role="group" aria-label="Analysis mode">{catalog.filter(item => ['cohort', 'patient'].includes(item.id)).sort((a, b) => Number(a.id === 'patient') - Number(b.id === 'patient')).map(item => <button key={item.id} disabled={busy || !!editor} aria-pressed={operation === item.id} onClick={() => changeOperation(item.id)}><strong>{item.label}</strong><small>{item.id === 'patient' ? 'Rank reference records for a patient' : 'Compare all records across cohorts'}</small></button>)}</div>}
            <div className="conversion-heading"><div><h1>{spec.label}</h1><p>{spec.description}</p></div>{operation === 'csv' && <button className={files.source?.length ? undefined : 'primary'} disabled={busy || !!editor} onClick={() => void perform(async () => {
              updateFiles(await api.example(operation)); setOptions({separator: ';', 'array-separator': ','})
              setNotice('CSV example loaded with matching separators. Review the settings, then run the conversion.')
            })}><FlaskConical/>Load example</button>}</div>
            {isAnalysis && <InputSource value={inputSource} onChange={changeInputSource} disabled={busy || !!editor}/>}
            {isAnalysis && inputSource === 'examples' && <section className="conversion-card" aria-label="Example inputs">
              <h2>Small example</h2>
              <button className={files.reference?.length ? undefined : 'primary'} disabled={busy || !!editor} onClick={() => void perform(async () => {
                if ((Object.values(files).some(entries => entries.length) || Object.keys(options).length) && !await confirmAction('Load example?', 'Replace the current inputs and settings with this example? Existing runs and original files will not be changed.')) return
                updateFiles(await api.example(operation)); setOptions({}); setNotice('Example loaded. Review the selected inputs, then run the analysis.')
              })}><FlaskConical/>Load example</button>
            </section>}
            {isAnalysis && inputSource === 'use-cases' && <UseCaseExamples operation={operation} loadedReference={files.reference?.[0]?.filename} disabled={busy || !!editor} onLoad={id => void perform(() => loadUseCase(id))} onBusy={setBusy} onStoreLoad={(reference, message) => {
              setFiles({reference}); setOptions({...useCaseOptions(operation), ...(operation === 'cohort' ? {'cytoscape-json': false} : {})}); setDirty(true)
              setNotice(`${message} ${operation === 'patient' ? 'Select a target patient, then run the analysis.' : 'Review the settings, then run the analysis.'}`)
            }}/>}
            {isAnalysis && inputSource === 'beacon' && <button className={files.reference?.length ? undefined : 'primary'} disabled={busy || !!editor} onClick={() => setBeaconImport(true)}><Plus/>Import Beacon v2 reference</button>}
            {operation !== 'simulate' && (!isAnalysis || Object.values(files).some(entries => entries.length > 0)) && <RunInputs operation={spec} files={files} runs={runs} options={options}/>}
            {isAnalysis ? <>
              {(['files', 'runs'].includes(inputSource) || spec.input.files.some(role => role.name === 'target')) && <section className="conversion-card">
                <h2>{['files', 'runs'].includes(inputSource) ? 'Input data' : 'Target record'}</h2>
                {renderInputs(spec.input.files.filter(role => ['files', 'runs'].includes(inputSource) ? ['reference', 'target'].includes(role.name) : role.name === 'target'))}
                {inputSource === 'files' && <p className="muted">Using a precomputed reference? Select it under Advanced settings.</p>}
              </section>}
              <AnalysisSettings key={`${operation}:${inputSource}:${project?.id || ''}`} operation={spec} files={files} values={options} onChange={value => {setOptions(value); setDirty(true)}}
                advancedInputs={renderInputs(spec.input.files.filter(role => !['reference', 'target'].includes(role.name)))} outputLocation={outputLocation}/>
            </> : operation === 'simulate' ? <section className="conversion-card">
              <h2>Simulation settings</h2>
              <ConversionOptions embedded definitions={['number', 'format'].flatMap(name => spec.options.filter(option => option.name === name))} values={options} onChange={value => {setOptions(value); setDirty(true)}}/>
              <details><summary>Advanced settings</summary>
                <ConversionOptions embedded definitions={spec.options.filter(option => !['number', 'format'].includes(option.name))} values={options} onChange={value => {setOptions(value); setDirty(true)}}/>
                {renderInputs(spec.input.files)}
                {outputLocation}
              </details>
            </section> : <div className="ranker-setup-grid">
              <section className="conversion-card"><h2>Input files</h2>{renderInputs(spec.input.files)}</section>
              <section className="conversion-card"><h2>Run settings</h2>
                <ConversionOptions embedded={operation === 'pdf'} definitions={spec.options} values={options} onChange={value => {setOptions(value); setDirty(true)}}/>
                {outputLocation}
              </section>
            </div>}
            {editor && <section className="conversion-card yaml-editor">
              <YamlEditor value={editor.text} filename={editor.role} dirty onChange={text => {setEditor({...editor, text}); setDirty(true)}}
                onValidate={async text => {const handle = await api.request<FileHandle>('/api/mappings', {text}); updateFiles({...files, [editor.role]: [handle]}); setEditor(undefined)}}
                onSave={text => invoke<string | null>('save_yaml_copy', {text})} />
              <button onClick={() => setEditor(undefined)}>Close without applying</button>
            </section>}
          </section>}
          {tab === 'results' && (run ? <section className="output-pane">
            <div className="pane-heading"><h1>{catalog.find(item => item.id === run.conversion)?.label} results</h1><RunStatus status={run.status}/>
              {run.directory && <button onClick={() => void perform(() => revealRun(run.id))}>Open output folder</button>}
            </div>
            {run.message && <pre role="alert">{run.message}</pre>}
            <RunDetails job={run} onShowResults={() => {resultsPanel.current?.scrollIntoView({block: 'start'}); resultsPanel.current?.focus({preventScroll: true})}}/>
            {active(run) && <p className="muted">You can prepare another job while you wait.</p>}
            {run.status === 'completed' && <div className="result-actions" aria-label="Follow-up actions">
              {runActions(run).filter(() => run.conversion !== 'qr-encode').map(action => <button key={action.operation} className={['csv', 'simulate'].includes(run.conversion) && action.operation === 'cohort' ? 'primary' : undefined} disabled={busy || !!editor || !catalog.some(item => item.id === action.operation && item.available)} onClick={() => void perform(() => prepareAction(run, action))}>
                {action.operation === 'pdf' ? <FileText/> : action.operation === 'qr-encode' ? <QrCode/> : <Play/>}{action.label}
              </button>)}
              {['patient', 'cohort'].includes(run.conversion) && !runActions(run).length && <p className="muted">To create QR codes, rerun with "Retain intermediate files" enabled.</p>}
              {run.conversion === 'qr-encode' && !runActions(run).length && <p className="muted">For PDF reports, encode with the matching global hash, or use Tools to decode the QR images first.</p>}
            </div>}
            <RunProjections key={`projections:${run.id}`} job={run} runs={runs} onSelect={id => setSelected(id)} onCreated={created => {setRuns(current => [created, ...current.filter(item => item.id !== created.id)]); setSelected(created.id); setDirty(true)}}/>
            {run.status === 'completed' && <div ref={resultsPanel} tabIndex={-1} aria-label="Run outputs">{run.conversion === 'qr-encode'
              ? <QrResults key={run.id} job={run} onSave={saveOutput} disabled={busy || !!editor} pdfAvailable={catalog.some(item => item.id === 'pdf' && item.available)} onPrepare={action => prepareAction(run, action)}>{outputPreview}</QrResults>
              : outputPreview}</div>}
          </section> : <section className="empty-state"><h1>No run selected</h1><p>Load an example or select your input files, then run an analysis.</p></section>)}
          {tab === 'settings' && <section className="settings-pane"><h1>Settings</h1><label>Appearance <select value={theme} onChange={event => setTheme(event.target.value)}>{['system', 'light', 'dark'].map(value => <option key={value}>{value}</option>)}</select></label><JobSettings onChange={setOutputDefaults}/></section>}
        </div>
      </main>
    </div>
    <footer className="desktop-status">{ready ? 'Engine ready' : 'Starting local engine'}<span>{runs.filter(active).length} unfinished jobs</span><span>No clinical interpretation is inferred from similarity scores.</span></footer>
    {handoff && <OutputHandoff artifact={handoff} operations={catalog.filter(item => item.id !== 'projection')} onClose={() => setHandoff(undefined)} onUse={(operationId, role) => useOutput(handoff, operationId, role)} />}
    {deleteRequest && <DeleteRuns name={deleteRequest.item ? deleteRequest.item.name || label(deleteRequest.item.conversion) : undefined} onClose={() => setDeleteRequest(undefined)} onDelete={files => removeRuns(deleteRequest.item, files)}/>}
    {beaconImport && <BeaconImport onClose={() => setBeaconImport(false)} onImport={(imported, message) => {
      updateFiles({...files, reference: [...files.reference || [], ...imported]}); setNotice(message); setBeaconImport(false)
    }} />}
  </div></LimitsContext.Provider>
}
