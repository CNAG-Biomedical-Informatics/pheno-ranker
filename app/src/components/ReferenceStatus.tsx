import { useEffect, useState } from 'react'
import { request } from '../api'
import type { FileHandle } from '../types'

type Plan = {dataset?: string; mode?: 'raw' | 'cached'; reason?: string}

export default function ReferenceStatus({operation, files, options}: {
  operation: string; files: Record<string, FileHandle[]>; options: Record<string, unknown>
}) {
  const [result, setResult] = useState<{key: string; plan: Plan; error?: boolean}>()
  const key = JSON.stringify({conversion: operation, input: {files: Object.fromEntries(
    Object.entries(files).map(([role, entries]) => [role, entries.map(file => file.id)])
  )}, options})
  useEffect(() => {
    if (!files.reference?.length) return
    let current = true
    const timer = setTimeout(() => {
      request<Plan>('/api/reference-plan', JSON.parse(key)).then(plan => {
        if (current) setResult({key, plan})
      }).catch(() => {if (current) setResult({key, plan: {}, error: true})})
    }, 150)
    return () => {current = false; clearTimeout(timer)}
  }, [key, files.reference?.length])
  if (!files.reference?.length || !result || result.key !== key) return null
  if (result.error) return <p className="muted">Reference preparation status unavailable. It will be checked when the analysis starts.</p>
  if (!result.plan.dataset) return null
  return <p aria-live="polite"><strong>{result.plan.dataset}: {result.plan.mode === 'cached'
    ? 'Using precomputed reference'
    : 'Reference will be rebuilt with these settings'}</strong>
    {result.plan.reason && <><br/><span className="muted">{result.plan.reason}</span></>}
  </p>
}
