import { FolderOpen, History, FlaskConical, Database, Globe, RotateCcw } from 'lucide-react'

export type InputSourceKind = 'files' | 'runs' | 'examples' | 'use-cases' | 'beacon'
const sources = [
  {id: 'files', label: 'User files', icon: FolderOpen, description: 'Select local input files. Original files are never overwritten.'},
  {id: 'use-cases', label: 'Use cases', icon: Database, description: 'Use OMIM or ORPHA disease profiles, or Phenopacket Store collections, in patient or cohort mode. Loading does not start an analysis.'},
  {id: 'examples', label: 'Examples', icon: FlaskConical, description: 'Try a small dataset to explore the selected analysis mode. Loading does not start an analysis.'},
  {id: 'runs', label: 'Previous runs', icon: History, description: 'Reuse compatible outputs from completed runs. Converted CSV data keeps its matching configuration.'},
  {id: 'beacon', label: 'Beacon', icon: Globe, description: 'Retrieve reference records from a Beacon v2 endpoint. This requires a network connection.'},
] as const

export default function InputSource({value, onChange, onReset, disabled}: {
  value: InputSourceKind; onChange: (value: InputSourceKind) => void; onReset: () => void; disabled: boolean
}) {
  return <section aria-label="Input source">
    <div className="cohort-views" role="group" aria-label="Choose input source">
      {sources.map(({id, label, icon: Icon}) => <button key={id} disabled={disabled}
        aria-pressed={value === id} onClick={() => onChange(id)}><Icon size={16} aria-hidden="true"/>{label}</button>)}
    </div>
    <div className="input-source-note">
      <p className="muted">{sources.find(source => source.id === value)?.description} Choosing another source clears the current inputs and resets settings. Previous runs are unchanged.</p>
      <button disabled={disabled} title="Clear the current setup; runs and source files are unchanged" aria-label={`Reset ${sources.find(source => source.id === value)?.label}`} onClick={onReset}><RotateCcw aria-hidden="true"/>Reset setup</button>
    </div>
  </section>
}
