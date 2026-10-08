import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import * as api from '../api'
import BeaconImport from './BeaconImport'

vi.mock('../api', () => ({importBeacon: vi.fn(), beaconFilters: vi.fn()}))

describe('Beacon import', () => {
  it('shows a spinner while importing and clears it on failure', async () => {
    let rejectImport!: (reason: Error) => void
    vi.mocked(api.importBeacon).mockReturnValue(new Promise((_resolve, reject) => {rejectImport = reject}))
    render(<BeaconImport onImport={vi.fn()} onClose={vi.fn()}/>)
    fireEvent.change(screen.getByLabelText('Beacon API URL'), {target: {value: 'https://beacon.example/api'}})
    fireEvent.click(screen.getByRole('button', {name: 'Import records'}))
    const button = screen.getByRole('button', {name: 'Importing...'})
    expect(button).toBeDisabled()
    expect(button.querySelector('.run-spinner')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Retrieving records')
    await act(async () => {rejectImport(new Error('Connection failed'))})
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Import records'})).toBeEnabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Connection failed')
  })
  it('prepares the BioData.pt individuals example without importing or reusing credentials', () => {
    vi.mocked(api.importBeacon).mockClear()
    render(<BeaconImport onImport={vi.fn()} onClose={vi.fn()}/>)
    fireEvent.change(screen.getByLabelText('Bearer token (optional)'), {target: {value: 'old-secret'}})
    fireEvent.change(screen.getByLabelText('Ontology filters (one per line)'), {target: {value: 'HP:1'}})
    fireEvent.click(screen.getByRole('button', {name: 'Use BioData.pt example'}))
    expect(screen.getByLabelText('Beacon API URL')).toHaveValue('https://beacon.biodata.pt/api/individuals')
    expect(screen.getByLabelText('Bearer token (optional)')).toHaveValue('')
    expect(screen.getByLabelText('Ontology filters (one per line)')).toHaveValue('')
    expect(screen.getByLabelText('Records per page')).toHaveValue(100)
    expect(screen.getByLabelText('Maximum pages')).toHaveValue(100)
    expect(api.importBeacon).not.toHaveBeenCalled()
  })
  it('sends transient credentials and returns managed input handles', async () => {
    vi.mocked(api.importBeacon).mockResolvedValue({
      files: [{id: 'imported', filename: 'study.json', directory: false, bytes: 42}],
      pages: 2, records: 12, endpoint: 'https://beacon.example/api/individuals',
    })
    const onImport = vi.fn()
    render(<BeaconImport onImport={onImport} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Beacon API URL'), {target: {value: 'https://beacon.example/api'}})
    fireEvent.change(screen.getByLabelText('Bearer token (optional)'), {target: {value: 'secret'}})
    fireEvent.change(screen.getByLabelText('Ontology filters (one per line)'), {target: {value: 'HP:0001250\nMONDO:1'}})
    fireEvent.click(screen.getByRole('button', {name: 'Import records'}))
    await waitFor(() => expect(api.importBeacon).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://beacon.example/api', token: 'secret', filters: ['HP:0001250', 'MONDO:1'],
    })))
    expect(onImport).toHaveBeenCalledWith([expect.objectContaining({id: 'imported'})], 'Imported 12 Beacon records from 2 pages.')
  })

  it('keeps validation failures in the dialog', async () => {
    vi.mocked(api.importBeacon).mockRejectedValue(new Error('Beacon query returned no individual records'))
    render(<BeaconImport onImport={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Beacon API URL'), {target: {value: 'https://beacon.example/api'}})
    fireEvent.click(screen.getByRole('button', {name: 'Import records'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('no individual records')
  })

  it('searches advertised labels locally and allows removing selected filters', async () => {
    vi.mocked(api.beaconFilters).mockResolvedValue({terms: [{id: 'HP:0001250', label: 'Seizure'}]})
    render(<BeaconImport onImport={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Beacon API URL'), {target: {value: 'https://beacon.example/api'}})
    fireEvent.click(screen.getByRole('button', {name: 'Discover filters'}))
    fireEvent.change(await screen.findByLabelText('Find a filter'), {target: {value: 'seiz'}})
    fireEvent.click(screen.getByRole('button', {name: 'Seizure (HP:0001250)'}))
    fireEvent.click(screen.getByRole('button', {name: 'Remove Seizure'}))
    expect(screen.queryByRole('button', {name: 'Remove Seizure'})).not.toBeInTheDocument()
    expect(api.beaconFilters).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Beacon API URL'), {target: {value: 'https://different.example/api'}})
    expect(screen.queryByLabelText('Find a filter')).not.toBeInTheDocument()
  })

  it('retains manual entry when discovery fails', async () => {
    vi.mocked(api.beaconFilters).mockRejectedValue(new Error('404'))
    render(<BeaconImport onImport={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Beacon API URL'), {target: {value: 'https://beacon.example/api'}})
    fireEvent.click(screen.getByRole('button', {name: 'Discover filters'}))
    expect(await screen.findByRole('status')).toHaveTextContent('enter identifiers manually')
    expect(screen.getByLabelText('Ontology filters (one per line)')).toBeEnabled()
  })

  it('imports a limited subset and explains it in the result notice', async () => {
    vi.mocked(api.importBeacon).mockResolvedValue({files: [], pages: 1, records: 5, endpoint: 'https://beacon.example/api/individuals', pageLimitReached: true})
    const onImport = vi.fn()
    render(<BeaconImport onImport={onImport} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', {name: 'Use BioData.pt example'}))
    expect(screen.getByText(/Examples observed/)).toHaveTextContent('NCIT:C16576')
    fireEvent.change(screen.getByLabelText('Records per page'), {target: {value: '5'}})
    fireEvent.change(screen.getByLabelText('Maximum pages'), {target: {value: '1'}})
    fireEvent.click(screen.getByRole('button', {name: 'Import records'}))
    await waitFor(() => expect(onImport).toHaveBeenCalledWith([], expect.stringContaining('subset')))
    expect(api.importBeacon).toHaveBeenLastCalledWith(expect.objectContaining({pageSize: 5, maxPages: 1, allowPartial: true}))
  })
})
