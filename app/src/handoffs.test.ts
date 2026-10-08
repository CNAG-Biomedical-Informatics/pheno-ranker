import { expect, it } from 'vitest'
import { runActions } from './handoffs'
import type { Job } from './types'

const job = (conversion: string, names: string[]): Job => ({id: 'run', conversion, created: 0, status: 'completed', sources: [], options: {}, result: {warnings: [], artifacts: names.map((filename, index) => ({id: String(index), filename, kind: 'json', bytes: 1, mediaType: 'application/json'}))}})

it('pairs reference profiles with the global hash from that analysis', () => {
  const source = job('patient', ['export.tar_binary_hash.json', 'export.ref_binary_hash.json', 'export.glob_hash.json'])
  const [action] = runActions(source)
  expect(action.operation).toBe('qr-encode')
  expect(action.files.source[0].id).toBe('1')
  expect(action.files.template[0].id).toBe('2')
  expect(runActions(job('cohort', ['export.ref_binary_hash.json']))).toEqual([])
  expect(runActions({...source, status: 'failed'})).toEqual([])
  const [labelled] = runActions(job('patient', ['export.ref_binary_hash.json', 'export.glob_hash.json', 'export.labels.json']))
  expect(labelled.files.labels[0].filename).toBe('export.labels.json')
})

it('carries every QR image and decoded records, including Windows paths', () => {
  const [action] = runActions(job('qr-encode', ['qr\\one.png', 'qr\\two.png', 'qr\\decoded.json', 'qr\\glob_hash.json', 'unrelated.png']))
  expect(action.operation).toBe('pdf')
  expect(action.files.qr.map(item => item.id)).toEqual(['0', '1'])
  expect(action.files.source[0].id).toBe('2')
  expect(runActions(job('qr-encode', ['qr/one.png']))).toEqual([])
})

it('selects simulator records rather than the execution record', () => {
  const [action] = runActions(job('simulate', ['run.json', 'simulated.json']))
  expect(action.operation).toBe('cohort')
  expect(action.files.reference[0].filename).toBe('simulated.json')
})

it('pairs converted CSV data with its generated config, never run metadata', () => {
  const [action] = runActions(job('csv', ['run.json', 'example.json', 'example_config.yaml']))
  expect(action.files.reference[0].filename).toBe('example.json')
  expect(action.files.config[0].filename).toBe('example_config.yaml')
  expect(runActions(job('csv', ['example.json']))).toEqual([])
  expect(runActions(job('csv', ['wrong.json', 'example_config.yaml']))).toEqual([])
})
