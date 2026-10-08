import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import RunProjections from './RunProjections'
import * as api from '../api'
import type { Job } from '../types'

vi.mock('../api', () => ({request: vi.fn()}))
const source: Job = {id: 'source', name: 'ORPHA', conversion: 'cohort', created: 0, status: 'completed', sources: [], options: {}, result: {warnings: [], artifacts: [{id: 'matrix', filename: 'matrix.txt', bytes: 100, kind: 'txt', mediaType: 'text/plain'}]}}
it('submits a linked UMAP projection without resubmitting cohort inputs', async () => {
  const created = {...source, id: 'projection', conversion: 'projection', status: 'queued' as const}
  vi.mocked(api.request).mockResolvedValue(created)
  const onCreated = vi.fn()
  render(<RunProjections job={source} runs={[source]} onSelect={vi.fn()} onCreated={onCreated}/>)
  expect(screen.getByRole('button', {name: 'Add projection'})).toHaveClass('primary')
  fireEvent.click(screen.getByRole('button', {name: 'Add projection'}))
  expect(screen.getByText(/Pairwise comparisons are not repeated/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Method'), {target: {value: 'umap'}})
  expect(screen.getByRole('button', {name: 'Create projection'})).toHaveClass('primary')
  fireEvent.click(screen.getByRole('button', {name: 'Create projection'}))
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
  expect(api.request).toHaveBeenCalledWith('/api/jobs/source/projections', {projection: 'umap', 'n-neighbors': 30, 'min-dist': .3, seed: 42})
})
it('links a projection back to its source and hides creation without a dense matrix', () => {
  const select = vi.fn()
  const {rerender} = render(<RunProjections job={{...source, conversion: 'projection', options: {'source-run': 'source', projection: 'umap'}}} runs={[source]} onSelect={select} onCreated={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button', {name: 'ORPHA'}))
  expect(select).toHaveBeenCalledWith('source')
  rerender(<RunProjections job={{...source, result: {warnings: [], artifacts: []}}} runs={[]} onSelect={select} onCreated={vi.fn()}/>)
  expect(screen.queryByRole('button', {name: 'Add projection'})).not.toBeInTheDocument()
})
