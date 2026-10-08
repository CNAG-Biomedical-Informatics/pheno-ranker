import { useEffect, useRef, useState } from 'react'
import type { Operation, OutputFile } from '../types'
export default function OutputHandoff({artifact, operations, onUse, onClose}: {
  artifact: OutputFile; operations: Operation[]
  onUse: (operation: string, role: string) => Promise<void>; onClose: () => void
}) {
  const [operation, setOperation] = useState('cohort')
  const [role, setRole] = useState('reference')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const spec = operations.find(item => item.id === operation)
  useEffect(() => {dialog.current?.showModal()}, [])
  return <dialog ref={dialog} className="project-modal" onCancel={event => {event.preventDefault(); if (!busy) onClose()}}>
    <h2>Use output in another operation</h2><p>{artifact.filename}</p>
    <label>Operation <select value={operation} disabled={busy} onChange={event => {
      const id = event.target.value; setOperation(id); setRole(operations.find(item => item.id === id)?.input.files[0]?.name || '')
    }}>{operations.filter(item => item.input.files.length).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>Input role <select value={role} disabled={busy} onChange={event => setRole(event.target.value)}>
      {spec?.input.files.map(item => <option key={item.name} value={item.name}>{item.label}</option>)}
    </select></label>
    <p className="muted">This selects the existing output file. It does not move or alter it.</p>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy || !role} onClick={async () => {setBusy(true); try {await onUse(operation, role); onClose()} catch (reason) {setError(String(reason)); setBusy(false)}}}>Use selected output</button>
    <button disabled={busy} onClick={onClose}>Cancel</button>
  </dialog>
}
