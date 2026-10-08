import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import JobSettings from './JobSettings'
import { getJobSettings, updateJobSettings, updateOutputFolder } from '../api'
import { selectPaths } from '../desktop'

vi.mock('../api', () => ({ getJobSettings: vi.fn(), updateJobSettings: vi.fn(), updateOutputFolder: vi.fn() }))
vi.mock('../desktop', () => ({selectPaths: vi.fn()}))
const settings = { maxConcurrentJobs: 1, maxAllowedConcurrentJobs: 4 }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getJobSettings).mockResolvedValue(settings)
})

it('loads the persisted limit with concise memory guidance', async () => {
  vi.mocked(getJobSettings).mockResolvedValue({ ...settings, maxConcurrentJobs: 4 })
  render(<JobSettings />)
  expect(await screen.findByLabelText('Maximum concurrent jobs')).toHaveValue('4')
  expect(screen.getByText('Up to 4 jobs at once on this device. Running more jobs uses more memory.')).toBeInTheDocument()
  expect(screen.getAllByRole('option')).toHaveLength(4)
  expect(screen.queryByRole('option', { name: '5' })).not.toBeInTheDocument()
})

it('keeps projection limits visible and secondary limits collapsed', async () => {
  render(<JobSettings />)
  await screen.findByLabelText('Maximum concurrent jobs')
  expect(screen.getByLabelText('MDS records').closest('details')).toBeNull()
  expect(screen.getByLabelText('UMAP records').closest('details')).toBeNull()
  const advanced = screen.getByText('Advanced limits').closest('details')!
  expect(advanced).not.toHaveAttribute('open')
  expect(advanced).toContainElement(screen.getByLabelText('Heatmap records'))
  expect(advanced).toContainElement(screen.getByLabelText('File preview size (MiB)'))
  expect(screen.getByRole('button', {name: 'Save limits'})).toBeInTheDocument()
})

it.each([1, 2, 3, 4])('saves a limit of %i through the shared API', async limit => {
  vi.mocked(updateJobSettings).mockResolvedValue({ ...settings, maxConcurrentJobs: limit })
  render(<JobSettings />)
  fireEvent.change(await screen.findByLabelText('Maximum concurrent jobs'), { target: { value: String(limit) } })
  await waitFor(() => expect(updateJobSettings).toHaveBeenCalledWith(limit))
  await waitFor(() => expect(screen.getByLabelText('Maximum concurrent jobs')).not.toBeDisabled())
  expect(screen.getByLabelText('Maximum concurrent jobs')).toHaveValue(String(limit))
})

it('prevents overlapping updates and retains the old value if saving fails', async () => {
  let reject!: (reason: Error) => void
  vi.mocked(updateJobSettings).mockReturnValue(new Promise((_, fail) => { reject = fail }))
  render(<JobSettings />)
  fireEvent.change(await screen.findByLabelText('Maximum concurrent jobs'), { target: { value: '4' } })
  expect(screen.getByLabelText('Maximum concurrent jobs')).toBeDisabled()
  await act(async () => reject(new Error('Could not save scheduler settings')))
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save scheduler settings')
  expect(screen.getByLabelText('Maximum concurrent jobs')).toHaveValue('1')
})

it('can retry a failed settings request', async () => {
  vi.mocked(getJobSettings).mockRejectedValueOnce(new Error('Service unavailable'))
  render(<JobSettings />)
  fireEvent.click(await screen.findByRole('button', { name: 'Retry loading settings' }))
  expect(await screen.findByLabelText('Maximum concurrent jobs')).toHaveValue('1')
})

it('stores a selected folder handle and can restore the application default', async () => {
  vi.mocked(selectPaths).mockResolvedValue([{id: 'folder-grant', filename: 'results', directory: true, bytes: 0}])
  vi.mocked(updateOutputFolder).mockResolvedValueOnce({...settings, defaultOutputFolder: '/data/results'})
    .mockResolvedValueOnce({...settings, defaultOutputFolder: null, managedOutputRoot: '/app/runs'})
  render(<JobSettings/>)
  fireEvent.click(await screen.findByRole('button', {name: 'Choose results folder'}))
  expect(await screen.findByText('/data/results')).toBeInTheDocument()
  expect(selectPaths).toHaveBeenCalledWith(true)
  expect(updateOutputFolder).toHaveBeenCalledWith('folder-grant')
  fireEvent.click(screen.getByRole('button', {name: 'Use application folder'}))
  expect(await screen.findByText('/app/runs')).toBeInTheDocument()
  expect(updateOutputFolder).toHaveBeenCalledWith(null)
})

it('does not change the default when the folder picker is cancelled', async () => {
  vi.mocked(selectPaths).mockResolvedValue([])
  render(<JobSettings/>)
  fireEvent.click(await screen.findByRole('button', {name: 'Choose results folder'}))
  await waitFor(() => expect(screen.getByRole('button', {name: 'Choose results folder'})).not.toBeDisabled())
  expect(updateOutputFolder).not.toHaveBeenCalled()
})
