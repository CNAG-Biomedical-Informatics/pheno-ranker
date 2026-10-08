import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Job } from '../types'

const headings = ['Active runs', 'Today', 'Yesterday', 'Previous 7 days', 'Older']

export function groupRuns(runs: Job[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week = new Date(today); week.setDate(today.getDate() - 7)
  const groups: Job[][] = headings.map(() => [])
  for (const run of [...runs].sort((a, b) => b.created - a.created || a.id.localeCompare(b.id))) {
    const date = run.created * 1000
    const index = ['running', 'queued', 'cancelling'].includes(run.status) ? 0
      : date >= +today ? 1 : date >= +yesterday ? 2 : date >= +week ? 3 : 4
    groups[index].push(run)
  }
  return groups
}

function HistoryGroup({index, runs, selected, searching, compact, renderRun}: {
  index: number; runs: Job[]; selected: string; searching: boolean; compact: boolean; renderRun: (run: Job) => ReactNode
}) {
  const key = `ranker-history-group-${index}`
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved !== null) return saved !== 'closed'
    } catch { /* History remains usable when storage is unavailable. */ }
    return index < 3 || !compact
  })
  const pinned = index === 0 || searching || runs.some(run => run.id === selected)
  const open = pinned || expanded
  const heading = headings[index]
  return <section className="history-group" aria-label={heading}>
    {index === 0 ? <h3 className="history-group-heading">{heading}<span>{runs.length}</span></h3>
      : <button className="history-group-heading" aria-expanded={open} aria-controls={`history-group-${index}`} onClick={() => {
        if (pinned) return
        setExpanded(!expanded)
        try { localStorage.setItem(key, expanded ? 'closed' : 'open') } catch { /* Session state still works. */ }
      }} aria-disabled={pinned}>
        {open ? <ChevronDown aria-hidden="true"/> : <ChevronRight aria-hidden="true"/>}{heading}<span>{runs.length}</span>
      </button>}
    <div id={`history-group-${index}`} hidden={!open}>{runs.map(renderRun)}</div>
  </section>
}

export default function RunHistory({runs, selected, searching, finishedCount, children}: {
  runs: Job[]; selected: string; searching: boolean; finishedCount: number; children: (run: Job) => ReactNode
}) {
  return <div className="run-tree">{groupRuns(runs).map((group, index) => group.length > 0 &&
    <HistoryGroup key={index} index={index} runs={group} selected={selected} searching={searching}
      compact={finishedCount > 10} renderRun={children}/>)}</div>
}
