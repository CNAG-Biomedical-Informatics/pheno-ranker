import {useEffect, useState} from 'react'
import {updateLimits, type JobSettings} from '../api'
import {defaultLimits, type AnalysisLimits} from '../limits'

const labels: Record<keyof AnalysisLimits, string> = {
  mdsRecords: 'MDS records', umapRecords: 'UMAP records',
  heatmapRecords: 'Heatmap records', graphNodes: 'Network preview nodes', graphEdges: 'Network preview edges',
  graphExportRecords: 'Automatic graph export records', matrixRows: 'Matrix preview rows',
  matrixColumns: 'Matrix preview columns', tableRows: 'Other table preview rows', previewMiB: 'File preview size (MiB)',
}
export default function LimitSettings({settings, disabled, onBusy, onSaved}: {
  settings: JobSettings; disabled: boolean; onBusy: (busy: boolean) => void; onSaved: (settings: JobSettings) => void
}) {
  const [draft, setDraft] = useState<AnalysisLimits>(settings.limits || defaultLimits)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {setDraft(settings.limits || defaultLimits)}, [settings.limits])
  async function save(value: AnalysisLimits) {
    onBusy(true); setError(''); setSaved(false)
    try {onSaved(await updateLimits(value)); setSaved(true)}
    catch (reason) {setError(String(reason))}
    finally {onBusy(false)}
  }
  function limitInput(key: keyof AnalysisLimits) {
    return <label key={key}>{labels[key]}
      <input type="number" required min="1" max="2147483647" step="1" disabled={disabled} value={Number.isNaN(draft[key]) ? '' : draft[key]}
        onChange={event => {setDraft({...draft, [key]: event.target.value === '' ? NaN : Number(event.target.value)}); setSaved(false)}}/>
    </label>
  }
  return <section aria-label="Analysis and preview limits">
    <h3>Analysis and preview limits</h3>
    <p>Choose limits for this device. Higher values use more memory and can take longer.</p>
    <form onSubmit={event => {event.preventDefault(); void save(draft)}}>
      <div className="options-grid">{limitInput('mdsRecords')}{limitInput('umapRecords')}</div>
      <details className="setup-section">
        <summary>Advanced limits</summary>
        <div className="options-grid">{(Object.keys(labels) as (keyof AnalysisLimits)[])
          .filter(key => key !== 'mdsRecords' && key !== 'umapRecords').map(limitInput)}</div>
      </details>
      <p className="muted">Calculation limits apply to new jobs. Preview limits also apply to existing results. Saved output files are unchanged.</p>
      <button type="submit" className="primary" disabled={disabled}>Save limits</button>{' '}
      <button type="button" disabled={disabled} onClick={() => void save(defaultLimits)}>Restore default limits</button>
    </form>
    {saved && <p role="status">Limits saved.</p>}
    {error && <p role="alert">{error}</p>}
  </section>
}
