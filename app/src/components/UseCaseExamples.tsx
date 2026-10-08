import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import PhenopacketStore from './PhenopacketStore'
import type {FileHandle} from '../types'

export const useCases = {
  omim: {
    label: 'OMIM disease profiles',
    description: 'Rank the published patient PMID_35344616_A2 against the bundled OMIM disease profiles, using phenotypic features and Jaccard similarity.',
    provenance: 'Patient: Monarch Initiative Phenopacket Corpus (BSD-3-Clause). OMIM profiles: HPO annotations, January 25, 2025. Demonstration, not diagnostic advice.',
  },
  orpha: {
    label: 'ORPHA disease profiles',
    description: 'Rank the same published patient PMID_35344616_A2 against the bundled ORPHA disease profiles, using phenotypic features and Jaccard similarity.',
    provenance: 'Patient: Monarch Initiative Phenopacket Corpus (BSD-3-Clause). ORPHA profiles: HPO annotations, January 25, 2025. Demonstration, not diagnostic advice.',
  },
}
export type UseCaseId = keyof typeof useCases

export function useCaseOptions(operation: string): Record<string, unknown> {
  return operation === 'patient'
    ? {'include-terms': ['phenotypicFeatures'], 'sort-by': 'jaccard', 'max-out': 50, align: true}
    : {'include-terms': ['phenotypicFeatures'], 'similarity-metric-cohort': 'hamming', 'cytoscape-json': true, mds: true}
}

export default function UseCaseExamples({operation, loadedReference, disabled, onLoad, onStoreLoad, onBusy}: {operation: string; loadedReference?: string; disabled: boolean; onLoad: (id: UseCaseId) => void; onStoreLoad: (files: FileHandle[], message: string) => void; onBusy: (busy: boolean) => void}) {
  const [id, setId] = useState<UseCaseId | 'store'>('omim')
  const example = id === 'store' ? undefined : useCases[id]
  return <section className="conversion-card use-case-examples" aria-label="Reference use cases">
    <h2>Reference use cases</h2>
    <div className="use-case-controls">
      <label>Use case <select disabled={disabled} value={id} onChange={event => setId(event.target.value as UseCaseId | 'store')}>
        {Object.entries(useCases).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        <option value="store">Phenopacket Store collections</option>
      </select></label>
      {id !== 'store' && <button className={loadedReference === `${id}.pxf.json.gz` ? undefined : 'primary'} disabled={disabled} onClick={() => onLoad(id)}><FlaskConical/>Load use case</button>}
    </div>
    {example ? <><p>{operation === 'patient' ? example.description : `Compare all ${id.toUpperCase()} disease profiles against one another using phenotypic features and Hamming distance. This full-cohort calculation can take several minutes; large-result safeguards may omit graph and MDS previews.`}</p>
    <p className="muted">{example.provenance}</p>
    <p className="muted">Works offline. Replaces the current inputs and settings; review them, then click Run analysis.</p></>
      : <PhenopacketStore operation={operation} disabled={disabled} onBusy={onBusy} onLoad={onStoreLoad}/>}
  </section>
}
