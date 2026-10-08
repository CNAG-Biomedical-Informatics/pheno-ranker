import type { FileHandle, Job, Operation } from '../types'
import { CheckCircle2 } from 'lucide-react'
import { missingAnalysisInputs } from '../inputReadiness'
import ReferenceStatus from './ReferenceStatus'

export default function RunInputs({operation, files, runs, options = {}}: {operation: Operation; files: Record<string, FileHandle[]>; runs: Job[]; options?: Record<string, unknown>}) {
  const analysis = ['patient', 'cohort'].includes(operation.id)
  const missing = analysis ? missingAnalysisInputs(operation.id, files) : operation.input.files.filter(role => role.required && !files[role.name]?.length).map(role => role.label.toLowerCase())
  const ready = missing.length === 0
  const inputs = operation.input.files.flatMap(role => (files[role.name] || []).map(file => ({role: role.label, file})))
  const defaults = Object.fromEntries(operation.options.filter(option => option.default !== undefined).map(option => [option.name, option.default]))
  const effective = Object.fromEntries(Object.entries({...defaults, ...options}).filter(([, value]) => value !== ''))
  return <section className={`run-input-summary${analysis && ready ? ' inputs-ready' : ''}`} aria-label="Inputs for next run">
    {analysis && <div className="input-readiness">
      <div role="status"><strong>{ready ? <><CheckCircle2 size={16} aria-hidden="true"/>Ready to run</> : `Select ${missing.join(' and ')}`}</strong>
        {ready && <p>Inputs are selected. Review the settings, then select Run analysis in the top toolbar. Nothing has run yet.</p>}</div>
    </div>}
    {!analysis && !ready && <p role="status">Select {missing.join(' and ')} before running.</p>}
    <h2>Inputs for this {['patient', 'cohort'].includes(operation.id) ? 'analysis' : 'tool'}</h2>
    {operation.id === 'summary' && <p>Phenotype summary accepts BFF or PXF records only, not generic JSON or analysis exports.</p>}
    {analysis && <ReferenceStatus operation={operation.id} files={files} options={effective}/>}
    <p>These files will be used when you click Run. Selecting a run in the sidebar does not change them.</p>
    {!inputs.length ? <p>{operation.id === 'simulate' ? 'Records will be generated using the settings below.' : 'No input files selected yet.'}</p> : <ul>{inputs.map(({role, file}, index) => {
      const source = runs.find(run => run.directory && file.displayPath?.replaceAll('\\', '/').startsWith(run.directory.replaceAll('\\', '/') + '/'))
      return <li key={`${role}:${file.id}:${index}`}><strong>{role}: {file.filename}</strong>
        {source && <span>From {source.name || source.conversion} run {source.id.slice(0, 8)}</span>}
        {file.displayPath && <small>{file.displayPath}</small>}
      </li>
    })}</ul>}
  </section>
}
