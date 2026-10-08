import type { OutputFile } from '../types'
import { isAdvancedOutput, outputDescription } from '../outputFiles'

export default function OutputFiles({artifacts, selected, onSelect}: {
  artifacts: OutputFile[]; selected?: string; onSelect: (id: string) => void
}) {
  const primary = artifacts.filter(item => !isAdvancedOutput(item))
  const advanced = artifacts.filter(isAdvancedOutput)
  const button = (item: OutputFile) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => onSelect(item.id)} onKeyDown={event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    const buttons = [...event.currentTarget.closest('aside')!.querySelectorAll<HTMLButtonElement>('button')]
      .filter(element => !element.closest('details') || element.closest('details')!.open)
    const index = buttons.indexOf(event.currentTarget)
    const next = buttons[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (next) {next.focus(); next.click()}
  }}>
    {item.filename}{outputDescription(item) && <small>{outputDescription(item)}</small>}<small>{(item.bytes / 1024).toFixed(1)} KiB</small>
  </button>
  return <aside className="output-files">
    <h2>Main results</h2>
    {primary.length ? primary.map(button) : <p className="muted">Only supporting files were produced.</p>}
    {advanced.length > 0 && <details className="advanced-output-files">
      <summary>Advanced files ({advanced.length})</summary>
      <p>Alignments, intermediate data, and logs. All files remain available for saving or reuse.</p>
      {advanced.map(button)}
    </details>}
  </aside>
}
