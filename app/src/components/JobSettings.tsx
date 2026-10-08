import { useEffect, useState } from 'react'
import { getJobSettings, updateJobSettings, updateOutputFolder, type JobSettings as SchedulerSettings } from '../api'
import { selectPaths } from '../desktop'
import { FolderOpen } from 'lucide-react'
import LimitSettings from './LimitSettings'

export default function JobSettings({onChange}: {onChange?: (settings: SchedulerSettings) => void}) {
  const [settings, setSettings] = useState<SchedulerSettings>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  function receive(value: SchedulerSettings) {setSettings(value); onChange?.(value)}
  useEffect(() => {
    let current = true
    setError('')
    getJobSettings().then(value => { if (current) setSettings(value) })
      .catch((reason: Error) => { if (current) setError(reason.message) })
    return () => { current = false }
  }, [attempt])

  async function change(limit: number) {
    setSaving(true); setError('')
    try { receive(await updateJobSettings(limit)) }
    catch (reason) { setError((reason as Error).message) }
    finally { setSaving(false) }
  }
  async function changeFolder(reset = false) {
    setSaving(true); setError('')
    try {
      const selected = reset ? undefined : (await selectPaths(true))[0]
      if (reset || selected) receive(await updateOutputFolder(selected?.id || null))
    } catch (reason) {setError((reason as Error).message)}
    finally {setSaving(false)}
  }

  return <section aria-labelledby="job-settings-heading">
    <h2 id="job-settings-heading">Jobs</h2>
    <div className="appearance-settings">
      {settings ? <label>Maximum concurrent jobs
        <select value={settings.maxConcurrentJobs} disabled={saving}
          aria-describedby="job-settings-help" onChange={event => void change(Number(event.target.value))}>
          {Array.from({ length: settings.maxAllowedConcurrentJobs }, (_, index) => index + 1)
            .map(value => <option key={value} value={value}>{value}{value === 1 ? ' (default)' : ''}</option>)}
        </select>
      </label> : !error && <p role="status">Loading job settings...</p>}
      <p id="job-settings-help">{settings && <>Up to {settings.maxAllowedConcurrentJobs} jobs at once on this device. </>}Running more jobs uses more memory.</p>
      {settings && <section aria-label="Default results folder"><h3>Default results folder</h3>
        <p className="output-path">{settings.defaultOutputFolder || settings.managedOutputRoot || 'Application-managed run folder'}</p>
        <button disabled={saving} onClick={() => void changeFolder()}><FolderOpen/>Choose results folder</button>
        {settings.defaultOutputFolder && <button disabled={saving} onClick={() => void changeFolder(true)}>Use application folder</button>}
        <p>Remembered on this device. Each new run gets a separate subfolder. A folder chosen in Setup overrides this default.</p>
        <p>Existing and queued runs stay where they are. Internal metadata and temporary processing remain in the application data folder.</p>
      </section>}
      {settings && <LimitSettings settings={settings} disabled={saving} onBusy={setSaving} onSaved={receive}/>}
      {saving && <p role="status">Saving job settings...</p>}
      {error && <p role="alert">{error}</p>}
      {!settings && error && <button onClick={() => setAttempt(value => value + 1)}>Retry loading settings</button>}
    </div>
  </section>
}
