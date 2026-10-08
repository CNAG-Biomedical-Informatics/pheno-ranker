import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { request } from '../api'
import ReferenceStatus from './ReferenceStatus'

vi.mock('../api', () => ({request: vi.fn()}))
const files = {reference: [{id: 'reference-id', filename: 'orpha.pxf.json.gz', bytes: 1, directory: false}]}

it('shows the backend cache decision and updates it when settings change', async () => {
  vi.mocked(request).mockResolvedValue({dataset: 'ORPHA', mode: 'cached'})
  const {rerender} = render(<ReferenceStatus operation="cohort" files={files} options={{'include-terms': ['phenotypicFeatures']}}/>)
  expect(await screen.findByText(/Using precomputed reference/)).toBeInTheDocument()
  expect(request).toHaveBeenLastCalledWith('/api/reference-plan', {
    conversion: 'cohort', input: {files: {reference: ['reference-id']}}, options: {'include-terms': ['phenotypicFeatures']},
  })
  vi.mocked(request).mockResolvedValue({dataset: 'ORPHA', mode: 'raw', reason: 'Custom settings.'})
  rerender(<ReferenceStatus operation="cohort" files={files} options={{age: true}}/>)
  expect(screen.queryByText(/Using precomputed reference/)).not.toBeInTheDocument()
  expect(await screen.findByText(/Reference will be rebuilt/)).toBeInTheDocument()
  expect(screen.getByText('Custom settings.')).toBeInTheDocument()
  rerender(<ReferenceStatus operation="cohort" files={{}} options={{}}/>)
  expect(screen.queryByText(/Reference will be rebuilt/)).not.toBeInTheDocument()
})

it('does not show an outdated response after changing the inputs', async () => {
  let resolve!: (plan: unknown) => void
  vi.mocked(request).mockImplementationOnce(() => new Promise(done => {resolve = done}))
  const {rerender} = render(<ReferenceStatus operation="patient" files={files} options={{}}/>)
  await waitFor(() => expect(resolve).toBeDefined())
  rerender(<ReferenceStatus operation="patient" files={{}} options={{}}/>)
  resolve({dataset: 'ORPHA', mode: 'cached'})
  expect(screen.queryByText(/Using precomputed reference/)).not.toBeInTheDocument()
})

it('reports a failed status check without claiming the cache will be used', async () => {
  vi.mocked(request).mockRejectedValue(new Error('offline'))
  render(<ReferenceStatus operation="patient" files={files} options={{}}/>)
  expect(await screen.findByText(/Reference preparation status unavailable/)).toBeInTheDocument()
})
