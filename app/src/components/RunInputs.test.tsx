import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import RunInputs from './RunInputs'
import RunDetails from './RunDetails'
import type { Job } from '../types'

it('shows readiness without duplicating the toolbar action', () => {
  const operation = {id: 'patient', label: 'Patient', description: '', available: true, options: [], input: {files: []}}
  const file = {id: 'one', filename: 'one.json', bytes: 10, directory: false}
  const {rerender} = render(<RunInputs operation={operation} files={{}} runs={[]}/>)
  expect(screen.getByRole('status')).toHaveTextContent('Select reference data and a target record')
  rerender(<RunInputs operation={operation} files={{reference: [file]}} runs={[]}/>)
  expect(screen.getByRole('status')).toHaveTextContent('Select a target record')
  rerender(<RunInputs operation={operation} files={{precomputed: [file], target: [file]}} runs={[]}/>)
  expect(screen.getByRole('status')).toHaveTextContent('Ready to run')
  expect(screen.getByText(/Run analysis in the top toolbar/)).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  rerender(<RunInputs operation={operation} files={{target: [file]}} runs={[]}/>)
  expect(screen.queryByRole('button', {name: 'Start analysis'})).not.toBeInTheDocument()
})

it('shows exact tool inputs and their source run', () => {
  render(<RunInputs operation={{id: 'pdf', label: 'PDF', description: '', available: true, options: [], input: {files: [{name: 'source', label: 'Records', required: true, multiple: false}]}}}
    files={{source: [{id: 'file', filename: 'decoded.json', displayPath: '/runs/abc/outputs/qr/decoded.json', bytes: 10, directory: false}]}}
    runs={[{id: 'abc', name: 'My QR run', conversion: 'qr-encode', directory: '/runs/abc/outputs', status: 'completed', sources: [], options: {}, created: 0}]}/> )
  expect(screen.getByText('Records: decoded.json')).toBeInTheDocument()
  expect(screen.getByText('From My QR run run abc')).toBeInTheDocument()
  expect(screen.getByText('/runs/abc/outputs/qr/decoded.json')).toBeInTheDocument()
  expect(screen.getByText(/sidebar does not change/)).toBeInTheDocument()
})

it('shows timing, cohort count and neutral graph notes', () => {
  const job: Job = {id: 'a', conversion: 'cohort', created: 10, started: 20, finished: 150, status: 'completed', sources: [], options: {},
    safety: {recordCount: 10000, warnings: [], notes: ['Graph export omitted.']}, inputs: [{role: 'reference', filename: 'records.json', path: '/data/records.json'}]}
  render(<RunDetails job={job}/>)
  expect(screen.getByText(/Elapsed: 2m 10s/)).toHaveTextContent('10,000')
  expect(screen.getByText('Graph export omitted.')).not.toHaveClass('run-warning')
  expect(screen.getByText('reference: records.json')).toBeInTheDocument()
})

it('replaces progress with completion and a results action, not a stale stage', () => {
  const job: Job = {id: 'a', conversion: 'cohort', created: 10, started: 20, status: 'running', sources: [], options: {}, stage: 'Preparing MDS projection'}
  const show = vi.fn()
  const {rerender, container} = render(<RunDetails job={job} onShowResults={show}/>)
  expect(screen.getByRole('status')).toHaveTextContent('Preparing MDS projection')
  expect(container.querySelector('.run-spinner')).toBeInTheDocument()
  rerender(<RunDetails job={{...job, status: 'completed', finished: 150}} onShowResults={show}/>)
  expect(screen.getByRole('status')).toHaveTextContent('Run completed')
  expect(screen.getByRole('status')).toHaveTextContent('Outputs are ready.')
  expect(screen.queryByText('Preparing MDS projection')).not.toBeInTheDocument()
  expect(container.querySelector('.run-spinner')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'View results'}))
  expect(show).toHaveBeenCalledOnce()
  for (const status of ['failed', 'cancelled', 'interrupted'] as const) {
    rerender(<RunDetails job={{...job, status, finished: 150}} onShowResults={show}/>)
    expect(screen.getByRole('status')).toHaveTextContent(`Run ${status}`)
    expect(screen.queryByRole('button', {name: 'View results'})).not.toBeInTheDocument()
  }
})
