import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OutputHandoff from './OutputHandoff'
import type { Operation } from '../types'

const operations: Operation[] = [
  {id: 'cohort', label: 'Cohort comparison', description: '', available: true, options: [], input: {files: [
    {name: 'reference', label: 'Reference cohorts', required: true, multiple: true},
    {name: 'config', label: 'Configuration', required: false, multiple: false},
  ]}},
  {id: 'summary', label: 'Summary plot', description: '', available: true, options: [], input: {files: [
    {name: 'source', label: 'BFF or PXF records', required: true, multiple: false},
  ]}},
]

describe('output handoff', () => {
  it('requires an explicit operation and role and forwards both', async () => {
    const onUse = vi.fn().mockResolvedValue(undefined)
    render(<OutputHandoff artifact={{id: 'a', filename: 'simulated.json', kind: 'json', mediaType: 'application/json', bytes: 4}}
      operations={operations} onUse={onUse} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Operation'), {target: {value: 'summary'}})
    expect(screen.getByLabelText('Input role')).toHaveValue('source')
    fireEvent.click(screen.getByRole('button', {name: 'Use selected output'}))
    await waitFor(() => expect(onUse).toHaveBeenCalledWith('summary', 'source'))
  })

  it('keeps the dialog open and shows handoff failures', async () => {
    render(<OutputHandoff artifact={{id: 'a', filename: 'bad.json', kind: 'json', mediaType: 'application/json', bytes: 4}}
      operations={operations} onUse={vi.fn().mockRejectedValue(new Error('Output is unavailable'))} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', {name: 'Use selected output'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Output is unavailable')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
