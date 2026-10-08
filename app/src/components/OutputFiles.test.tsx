import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import OutputFiles from './OutputFiles'
import { isAdvancedOutput } from '../outputFiles'

const file = (filename: string) => ({id: filename, filename, kind: 'json', bytes: 100, mediaType: 'application/json'})

it('navigates PNG and PDF outputs with arrows without entering collapsed files', () => {
  const onSelect = vi.fn()
  render(<OutputFiles artifacts={['qr/a.png', 'reports/a.pdf', 'run.json'].map(file)} onSelect={onSelect}/>)
  const png = screen.getByRole('button', {name: /^qr\/a.png/})
  const pdf = screen.getByRole('button', {name: /^reports\/a.pdf/})
  png.focus()
  fireEvent.keyDown(png, {key: 'ArrowDown'})
  expect(pdf).toHaveFocus()
  expect(onSelect).toHaveBeenLastCalledWith('reports/a.pdf')
  fireEvent.keyDown(pdf, {key: 'ArrowDown'})
  expect(pdf).toHaveFocus()
  expect(onSelect).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(pdf, {key: 'ArrowUp'})
  expect(png).toHaveFocus()
  expect(onSelect).toHaveBeenLastCalledWith('qr/a.png')
})

it('keeps main results visible and supporting files collapsed but selectable', () => {
  const onSelect = vi.fn()
  render(<OutputFiles artifacts={['rank.txt', 'alignment.target.csv', 'export.ref_hash.json', 'stdout.log', 'run.json'].map(file)} selected="rank.txt" onSelect={onSelect}/>)
  expect(screen.getByRole('button', {name: /^rank.txt/})).toHaveAttribute('aria-pressed', 'true')
  const summary = screen.getByText('Advanced files (4)')
  const details = summary.closest('details')!
  expect(details).not.toHaveAttribute('open')
  expect(screen.getByRole('button', {name: /^alignment.target.csv/})).not.toBeVisible()
  fireEvent.click(summary)
  expect(details).toHaveAttribute('open')
  fireEvent.click(screen.getByRole('button', {name: /^alignment.target.csv/}))
  expect(onSelect).toHaveBeenCalledWith('alignment.target.csv')
})

it('keeps reports, converted data and unfamiliar outputs visible', () => {
  for (const name of ['matrix.txt', 'matrix.mtx', 'graph.json', 'graph_stats.txt', 'mds.json', 'umap.json', 'summary.html', 'reports/patient.pdf', 'qr/patient.png', 'example.json', 'example_config.yaml', 'simulated.json', 'custom-result.json']) {
    expect(isAdvancedOutput(file(name)), name).toBe(false)
  }
  for (const name of ['alignment.csv', 'alignment.txt', 'export.labels.json', 'omim.ref_hash.json.gz', 'stderr.log', 'run.json']) {
    expect(isAdvancedOutput(file(name)), name).toBe(true)
  }
  render(<OutputFiles artifacts={[file('summary.html')]} onSelect={vi.fn()}/>)
  expect(screen.queryByText(/Advanced files/)).not.toBeInTheDocument()
})
