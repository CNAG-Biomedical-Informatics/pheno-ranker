import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {beforeEach, expect, it, vi} from 'vitest'
import QrResults from './QrResults'
import * as api from '../api'
import type {Job} from '../types'

vi.mock('../api', () => ({download: vi.fn()}))
const images = Array.from({length: 101}, (_, i) => ({id: `qr-${i}`, filename: `qr/record-${i}.png`, kind: 'png', bytes: 100, mediaType: 'image/png'}))
const decoded = {id: 'decoded', filename: 'qr/decoded.json', kind: 'json', bytes: 100, mediaType: 'application/json'}
const job: Job = {id: 'qr-run', conversion: 'qr-encode', status: 'completed', created: 1, sources: [], options: {}, result: {warnings: [], artifacts: [...images, decoded]}}
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qr')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.mocked(api.download).mockImplementation(async (_, id) => id === 'decoded'
    ? {text: async () => JSON.stringify([{id_from_qr: 'record-0', sex: {label: 'Female'}}])} as Blob : new Blob(['qr']))
})
it('paginates records, lazily loads one QR, and keeps the original files accessible', async () => {
  const {unmount} = render(<QrResults job={job} disabled={false} onPrepare={vi.fn()} onSave={vi.fn()}><p>Original files</p></QrResults>)
  await screen.findByAltText('QR code for record-0')
  expect(api.download).toHaveBeenCalledTimes(1)
  expect(within(screen.getByRole('list', {name: 'QR records'})).getAllByRole('listitem')).toHaveLength(50)
  fireEvent.click(screen.getByRole('button', {name: 'Next'}))
  expect(screen.getByRole('button', {name: 'record-50'})).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Find record'), {target: {value: 'record-100'}})
  expect(screen.getByRole('button', {name: 'record-100'})).toHaveAttribute('aria-pressed', 'true')
  await waitFor(() => expect(api.download).toHaveBeenCalledWith('qr-run', 'qr-100'))
  fireEvent.change(screen.getByLabelText('Find record'), {target: {value: 'no match'}})
  expect(screen.getByText('No matching records.')).toBeInTheDocument()
  expect(screen.queryByRole('region', {name: 'Selected QR record'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Output files'}))
  expect(screen.getByText('Original files')).toBeInTheDocument()
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr')
})
it('moves across QR pages with arrow keys without changing PDF selection', async () => {
  render(<QrResults job={job} disabled={false} onPrepare={vi.fn()} onSave={vi.fn()}>{null}</QrResults>)
  await screen.findByAltText('QR code for record-0')
  fireEvent.click(screen.getByLabelText('Select record-2'))
  fireEvent.keyDown(screen.getByRole('button', {name: 'record-49'}), {key: 'ArrowDown'})
  expect(screen.getByRole('button', {name: 'record-50'})).toHaveFocus()
  expect(screen.getByText('1 selected')).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('button', {name: 'record-50'}), {key: 'ArrowUp'})
  expect(screen.getByRole('button', {name: 'record-49'})).toHaveFocus()
  expect(screen.getByLabelText('Select record-2')).toBeChecked()
})

it('prepares PDFs for selected images only, with the matching decoded source', async () => {
  const prepare = vi.fn().mockResolvedValue(undefined)
  render(<QrResults job={job} disabled={false} onPrepare={prepare} onSave={vi.fn()}>{null}</QrResults>)
  await screen.findByAltText('QR code for record-0')
  expect(screen.getByRole('button', {name: 'Create PDFs for selected records'})).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Select record-2'))
  fireEvent.click(screen.getByLabelText('Select record-4'))
  fireEvent.click(screen.getByRole('button', {name: 'Create PDFs for selected records'}))
  await waitFor(() => expect(prepare).toHaveBeenCalledWith(expect.objectContaining({operation: 'pdf', files: {source: [decoded], qr: [images[2], images[4]]}})))
  await waitFor(() => expect(screen.getByRole('button', {name: 'Create PDF for this record'})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: 'Create PDF for this record'}))
  await waitFor(() => expect(prepare).toHaveBeenLastCalledWith(expect.objectContaining({files: {source: [decoded], qr: [images[0]]}})))
})
it('loads decoded profiles only on request and does not offer PDFs without a template', async () => {
  const {rerender} = render(<QrResults job={job} disabled={false} onPrepare={vi.fn()} onSave={vi.fn()}>{null}</QrResults>)
  await screen.findByAltText('QR code for record-0')
  expect(api.download).not.toHaveBeenCalledWith('qr-run', 'decoded')
  fireEvent.click(screen.getByLabelText('Show decoded profile'))
  expect(await screen.findByText(/"Female"/)).toBeInTheDocument()
  rerender(<QrResults job={{...job, result: {warnings: [], artifacts: images}}} disabled={false} onPrepare={vi.fn()} onSave={vi.fn()}>{null}</QrResults>)
  expect(screen.queryByRole('button', {name: 'Create PDF for this record'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Save QR'})).toBeEnabled()
})

it('carries label files to PDF setup without offering enrichment in the PNG viewer', async () => {
  const labels = {...decoded, id: 'labels', filename: 'qr/labels.json'}
  const template = {...decoded, id: 'template', filename: 'qr/glob_hash.json'}
  const prepare = vi.fn().mockResolvedValue(undefined)
  render(<QrResults job={{...job, result: {warnings: [], artifacts: [...images, decoded, labels, template]}}} disabled={false} onPrepare={prepare} onSave={vi.fn()}>{null}</QrResults>)
  await screen.findByAltText('QR code for record-0')
  fireEvent.click(screen.getByRole('button', {name: 'Create PDF for this record'}))
  await waitFor(() => expect(prepare).toHaveBeenCalledWith(expect.objectContaining({files: {source: [decoded], qr: [images[0]], labels: [labels], template: [template]}})))
  expect(screen.queryByLabelText(/Include label hints/)).not.toBeInTheDocument()
})
