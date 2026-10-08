import type { ReactNode } from 'react'
import type { FileHandle, Operation } from '../types'
import ConversionOptions from './ConversionOptions'
import TermSelection from './TermSelection'

const customize = new Set(['sort-by', 'max-out', 'similarity-metric-cohort'])
const outputs = new Set(['export', 'align', 'matrix-format', 'cytoscape-json', 'graph-stats',
  'graph-min-weight', 'graph-max-weight', 'projection', 'n-neighbors', 'min-dist', 'seed', 'mds'])

export default function AnalysisSettings({operation, files, values, onChange, advancedInputs, outputLocation}: {
  operation: Operation; files: Record<string, FileHandle[]>; values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void; advancedInputs: ReactNode; outputLocation: ReactNode
}) {
  const definitions = operation.options.filter(option => !['include-terms', 'exclude-terms'].includes(option.name))
  const groups = [
    {title: 'Customize analysis', hint: 'Terms, metric, and ranking limit', options: definitions.filter(option => customize.has(option.name))},
    {title: 'Output options', hint: 'Files, plots, and output folder', options: definitions.filter(option => outputs.has(option.name))},
    {title: 'Advanced settings', hint: 'Configuration, weights, precomputed inputs, and resource limits', options: definitions.filter(option => !customize.has(option.name) && !outputs.has(option.name))},
  ]
  return <div className="analysis-settings">
    {groups.map((group, index) => <details className="setup-section conversion-card" key={group.title}>
      <summary><strong>{group.title}</strong><span>{group.hint}</span></summary>
      <div className="setup-section-content">
        {index === 0 && <TermSelection files={files} values={values} onChange={onChange}/>}
        {index === 2 && advancedInputs}
        <ConversionOptions embedded definitions={group.options} values={values} onChange={onChange}/>
        {index === 1 && outputLocation}
      </div>
    </details>)}
  </div>
}
