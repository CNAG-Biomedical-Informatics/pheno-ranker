import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, expect, it, vi} from 'vitest'
import * as api from '../api'
import PhenopacketStore from './PhenopacketStore'

vi.mock('../api', () => ({storeCached: vi.fn(), storeLatest: vi.fn(), storeDownload: vi.fn(), storeImport: vi.fn()}))
const release = {tag: '0.1.27', bytes: 20_000_000, sha256: 'checksum', url: 'https://example.org/release'}
const cached = {...release, records: 5, collections: [{name: 'GENE_A', records: 2}, {name: 'GENE_B', records: 3}]}
beforeEach(() => {vi.clearAllMocks(); vi.mocked(api.storeCached).mockResolvedValue([])})

it('checks and downloads only on request, then combines selected collections', async () => {
  vi.mocked(api.storeLatest).mockResolvedValue(release)
  vi.mocked(api.storeDownload).mockResolvedValue(cached)
  vi.mocked(api.storeImport).mockResolvedValue({files: [], records: 5, collections: 2, tag: release.tag})
  const onLoad = vi.fn()
  render(<PhenopacketStore operation="cohort" disabled={false} onBusy={vi.fn()} onLoad={onLoad}/> )
  await waitFor(() => expect(api.storeCached).toHaveBeenCalled())
  expect(api.storeLatest).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Check latest release'}))
  fireEvent.click(await screen.findByRole('button', {name: /Download \(/}))
  fireEvent.click(await screen.findByRole('button', {name: 'Select all collections'}))
  expect(screen.getByText(/2 collections selected/)).toHaveTextContent('5 records')
  fireEvent.click(screen.getByRole('button', {name: 'Load as one cohort'}))
  await waitFor(() => expect(api.storeImport).toHaveBeenCalledWith(release.tag, ['GENE_A', 'GENE_B']))
  expect(onLoad).toHaveBeenCalledWith([], expect.stringContaining('one reference cohort'))
})

it('uses cached releases offline, searches collections and requires a separate patient target', async () => {
  vi.mocked(api.storeCached).mockResolvedValue([cached])
  render(<PhenopacketStore operation="patient" disabled={false} onBusy={vi.fn()} onLoad={vi.fn()}/> )
  fireEvent.change(await screen.findByLabelText('Find collections'), {target: {value: 'gene_b'}})
  expect(screen.queryByText('GENE_A')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Select matching'}))
  expect(screen.getByText(/1 collections selected/)).toHaveTextContent('3 records')
  expect(screen.getByText(/select your own target patient/)).toBeInTheDocument()
  expect(api.storeLatest).not.toHaveBeenCalled()
  expect(api.storeDownload).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Clear selection'}))
  expect(screen.getByRole('button', {name: 'Load as one cohort'})).toBeDisabled()
})

it('retains downloaded releases after a network error', async () => {
  vi.mocked(api.storeCached).mockResolvedValue([cached])
  vi.mocked(api.storeLatest).mockRejectedValue(new Error('Network unavailable'))
  render(<PhenopacketStore operation="cohort" disabled={false} onBusy={vi.fn()} onLoad={vi.fn()}/> )
  await screen.findByLabelText('Find collections')
  fireEvent.click(screen.getByRole('button', {name: 'Check latest release'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
  expect(screen.getByLabelText('Release')).toHaveValue('0.1.27')
})
