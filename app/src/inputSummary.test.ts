import { expect, it } from 'vitest'
import { toolInputSummary } from './inputSummary'
import type { Operation } from './types'

it('summarizes thousands of QR files without dropping job inputs', () => {
  const operation: Operation = {id: 'pdf', label: 'PDF', description: '', available: true, options: [], input: {files: [
    {name: 'qr', label: 'QR images', required: true, multiple: true},
  ]}}
  const files = {qr: Array.from({length: 2402}, (_, i) => ({id: `${i}`, filename: `ORPHA_${i}.png`, directory: false, bytes: 10}))}
  const text = toolInputSummary(operation, files)
  expect(text).toContain('QR images: 2,402 files')
  expect(text).toContain('... and 2,399 more')
  expect(text.split('\n')).toHaveLength(5)
  expect(text.length).toBeLessThan(300)
  expect(files.qr).toHaveLength(2402)
})
