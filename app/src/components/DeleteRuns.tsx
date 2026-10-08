import { useEffect, useRef, useState } from 'react'

export default function DeleteRuns({name, onDelete, onClose}: {name?: string; onDelete: (files: boolean) => Promise<void>; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [files, setFiles] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {dialog.current?.showModal()}, [])
  return <dialog ref={dialog} className="project-modal" aria-labelledby="delete-runs-title" onCancel={event => {event.preventDefault(); if (!busy) onClose()}}>
    <h2 id="delete-runs-title">{name ? `Remove ${name}?` : 'Remove finished runs?'}</h2>
    <fieldset className="delete-run-choices" disabled={busy}><legend>What should be removed?</legend>
      <label><input type="radio" name="delete-scope" checked={!files} onChange={() => setFiles(false)}/>History only</label>
      <p>Hide runs from the list. Keep all output files.</p>
      <label><input type="radio" name="delete-scope" checked={files} onChange={() => setFiles(true)}/>History and output files</label>
      <p>Permanently delete run outputs, including results in a custom folder. The parent folder is kept.</p>
    </fieldset>
    <p>Original input files are kept. Running and queued jobs are not removed.</p>
    {files && <p className="run-warning">This cannot be undone. {name ? 'Files reused by an active job are protected.' : 'This also includes outputs of runs previously hidden from history.'}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="result-actions"><button disabled={busy} onClick={async () => {
      setBusy(true); setError('')
      try {await onDelete(files); onClose()} catch (reason) {setError(String(reason)); setBusy(false)}
    }}>{busy ? 'Removing...' : files ? 'Delete runs and files' : 'Remove from history'}</button>
    <button autoFocus disabled={busy} onClick={onClose}>Cancel</button></div>
  </dialog>
}
