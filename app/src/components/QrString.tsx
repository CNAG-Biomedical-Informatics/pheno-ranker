import {useEffect, useState} from 'react'
import * as api from '../api'
import type {OutputFile} from '../types'
import {useLimits} from '../limits'

export default function QrString({jobId, artifact, metadata}: {jobId: string; artifact?: OutputFile; metadata?: OutputFile}) {
  const [open, setOpen] = useState(false)
  return <details className="qr-string" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Show QR string</summary>
    <QrPayload key={`${jobId}:${artifact?.id}`} jobId={jobId} artifact={artifact} metadata={metadata} open={open}/>
  </details>
}

function QrPayload({jobId, artifact, metadata, open}: {jobId: string; artifact?: OutputFile; metadata?: OutputFile; open: boolean}) {
  const [text, setText] = useState<string>()
  const [error, setError] = useState('')
  const limits = useLimits()
  const [version, setVersion] = useState<number>()
  useEffect(() => {
    if (!open || !metadata || version !== undefined) return
    let current = true
    if (metadata.bytes > 4096) return
    api.download(jobId, metadata.id).then(blob => blob.text()).then(value => {
      const info = JSON.parse(value)
      if (!Number.isInteger(info.version) || info.version < 1 || info.version > 40) throw new Error('Invalid QR version metadata')
      if (current) setVersion(info.version)
    }).catch(reason => {if (current) setError(String(reason))})
    return () => {current = false}
  }, [open, jobId, metadata?.id, version])
  useEffect(() => {
    if (!open || !artifact || text !== undefined) return
    let current = true
    if (artifact.bytes > limits.previewMiB * 1024 * 1024) {setError('Payload exceeds the file preview limit.'); return}
    api.download(jobId, artifact.id).then(blob => blob.text()).then(value => {
      if (current) setText(value)
    }).catch(reason => {if (current) setError(String(reason))})
    return () => {current = false}
  }, [open, jobId, artifact?.id, text, limits.previewMiB])
  const uncompressed = text?.startsWith('UNCOMP:') ?? false
  const displayed = uncompressed ? text!.slice('UNCOMP:'.length) : text
  return <>
    {!artifact ? <p>This older run did not retain the payload. Encode again to inspect the exact QR string.</p>
      : error ? <p role="alert">{error}</p> : text === undefined ? <p role="status">Loading QR string...</p>
      : <><p><strong>{uncompressed ? 'Uncompressed' : 'Compressed'}</strong>{version !== undefined && <> · QR version {version} ({17 + 4 * version} × {17 + 4 * version} modules)</>} · {displayed!.length.toLocaleString()} characters</p>
        <textarea readOnly aria-label="QR string" rows={5} value={displayed} onFocus={event => event.currentTarget.select()}/>
        <p className="muted">{uncompressed ? 'Binary vector. The QR includes an UNCOMP: decoding marker, omitted here.' : 'Base64-encoded compressed binary vector.'}</p></>}
  </>
}
