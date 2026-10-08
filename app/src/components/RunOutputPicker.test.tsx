import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import RunOutputPicker, { reusableOutputs } from './RunOutputPicker'
import type { Job, OutputFile } from '../types'

const artifact = (filename: string): OutputFile => ({id: filename, filename, kind: 'json', mediaType: 'application/json', bytes: 10})
const job: Job = {id: 'source-run', name: 'Example cohort', conversion: 'simulate', status: 'completed', created: 0,
  sources: [], options: {}, result: {artifacts: [artifact('simulated.json'), artifact('run.json')], warnings: []}}

it('selects the source run explicitly without depending on sidebar selection', async () => {
  const onUse = vi.fn().mockResolvedValue(undefined)
  render(<RunOutputPicker runs={[job]} operation="cohort" role="reference" label="Reference cohorts" onUse={onUse}/> )
  expect(screen.queryByRole('option', {name: 'run.json'})).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox'), {target: {value: JSON.stringify([job.id, 'simulated.json'])}})
  await waitFor(() => expect(onUse).toHaveBeenCalledWith(job, job.result!.artifacts[0]))
})

it('filters incomplete runs and requires a matching CSV configuration', () => {
  expect(reusableOutputs({...job, status: 'running'}, 'cohort', 'reference')).toEqual([])
  const csv = {...job, conversion: 'csv', result: {artifacts: [artifact('example.json')], warnings: []}}
  expect(reusableOutputs(csv, 'cohort', 'reference')).toEqual([])
  csv.result.artifacts.push(artifact('example_config.yaml'))
  expect(reusableOutputs(csv, 'cohort', 'reference').map(file => file.filename)).toEqual(['example.json'])
  expect(reusableOutputs(csv, 'summary', 'source')).toEqual([])
})

it('distinguishes binary profiles, templates and precomputed files', () => {
  const analysis = {...job, result: {artifacts: ['export.ref_binary_hash.json', 'export.glob_hash.json', 'export.ref_hash.json', 'export.coverage_stats.json', 'graph.json'].map(artifact), warnings: []}}
  expect(reusableOutputs(analysis, 'qr-encode', 'source').map(file => file.filename)).toEqual(['export.ref_binary_hash.json'])
  expect(reusableOutputs(analysis, 'qr-encode', 'template').map(file => file.filename)).toEqual(['export.glob_hash.json'])
  expect(reusableOutputs(analysis, 'cohort', 'precomputed')).toHaveLength(4)
  expect(reusableOutputs(analysis, 'cohort', 'reference')).toEqual([])
})

it('reports unavailable files without submitting a job', async () => {
  render(<RunOutputPicker runs={[job]} operation="cohort" role="reference" label="Reference cohorts" onUse={vi.fn().mockRejectedValue(new Error('File no longer exists'))}/> )
  fireEvent.change(screen.getByRole('combobox'), {target: {value: JSON.stringify([job.id, 'simulated.json'])}})
  expect(await screen.findByRole('alert')).toHaveTextContent('File no longer exists')
  expect(screen.getByRole('combobox')).toBeEnabled()
})
