import { useEffect, useRef, useState } from 'react'
import { Wrench, ChevronDown } from 'lucide-react'
import type { Operation } from '../types'

export default function ToolsMenu({operations, disabled, onSelect}: {operations: Operation[]; disabled: boolean; onSelect: (id: string) => void}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const ordered = [...operations.filter(item => item.id === 'simulate'), ...operations.filter(item => item.id !== 'simulate')]
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {if (!root.current?.contains(event.target as Node)) setOpen(false)}
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return <div className="tools-picker" ref={root}
    onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)}}
    onKeyDown={event => {if (event.key === 'Escape') {setOpen(false); trigger.current?.focus()}}}>
    <button ref={trigger} disabled={disabled} aria-expanded={open} aria-controls="tools-list" onClick={() => setOpen(value => !value)}><Wrench/>Tools<ChevronDown/></button>
    {open && <div id="tools-list" className="tools-list" role="group" aria-label="Companion tools">
      {ordered.map(item => <button key={item.id} disabled={!item.available} title={!item.available ? 'Required utility dependencies are unavailable' : item.description}
        onClick={() => {onSelect(item.id); setOpen(false); trigger.current?.focus()}}>{item.label}</button>)}
    </div>}
  </div>
}
