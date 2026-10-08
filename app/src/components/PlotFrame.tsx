import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize, Minimize } from 'lucide-react'

export default function PlotFrame({children, title}: {children: ReactNode; title: string}) {
  const [expanded, setExpanded] = useState(false)
  const frame = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!expanded) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    toggle.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); setExpanded(false); toggle.current?.focus()
      }
      if (event.key === 'Tab') {
        const controls = [...frame.current!.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], iframe, [tabindex="0"]')]
          .filter(element => element.getClientRects().length > 0)
        const first = controls[0], last = controls.at(-1)
        if (!first) {event.preventDefault(); return}
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus()}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus()}
      }
    }
    document.addEventListener('keydown', keydown, true)
    return () => {document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown, true)}
  }, [expanded])
  return <section ref={frame} className={`plot-frame${expanded ? ' plot-frame-expanded' : ''}`}
    role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label={title}>
    <div className="plot-frame-toolbar"><strong>{title}</strong><button ref={toggle}
      aria-label={expanded ? 'Restore plot size' : 'Expand plot'} title={expanded ? 'Restore plot size (Esc)' : 'Expand plot'}
      aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? <Minimize/> : <Maximize/>}{expanded ? 'Restore' : 'Expand'}
    </button></div>
    {children}
  </section>
}
