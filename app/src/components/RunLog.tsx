import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {runLog} from '../api'
import type {Job, Preview} from '../types'

export default function RunLog({job}: {job: Job}) {
  const [open, setOpen] = useState(() => localStorage.getItem('ranker-log-open') === 'true')
  const [preview, setPreview] = useState<Preview>()
  const [error, setError] = useState('')
  const viewport = useRef<HTMLPreElement>(null)
  const following = useRef(true)
  const active = ['queued', 'running', 'cancelling'].includes(job.status)
  useEffect(() => {
    if (!open) return
    let current = true
    let timer: ReturnType<typeof setTimeout>
    async function refresh() {
      try {
        const result = await runLog(job.id)
        if (current) {setPreview(result); setError('')}
      } catch (reason) {if (current) setError(String(reason))}
      if (current && active) timer = setTimeout(() => void refresh(), 1500)
    }
    void refresh()
    return () => {current = false; clearTimeout(timer)}
  }, [open, job.id, job.status, active])
  useLayoutEffect(() => {
    if (open && following.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight
  }, [open, preview?.text])
  return <details className="run-log" open={open} onToggle={event => {
    const expanded = event.currentTarget.open
    setOpen(expanded)
    localStorage.setItem('ranker-log-open', String(expanded))
  }}>
    <summary>Detailed log</summary>
    {open && <>
      {error && <p role="alert">{error}</p>}
      {preview?.truncated && <p className="muted">Showing the latest 64 KiB per output stream. Complete logs are available with completed outputs.</p>}
      <pre ref={viewport} tabIndex={0} aria-label="Run log" onScroll={event => {
        const node = event.currentTarget
        following.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24
      }}>{preview?.text || (preview ? 'No log output yet.' : 'Loading log…')}</pre>
    </>}
  </details>
}
