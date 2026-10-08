import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './api'
import { confirmAction, selectPaths } from './desktop'
import {listen} from '@tauri-apps/api/event'

vi.mock('@tauri-apps/api/event', () => ({listen: vi.fn().mockResolvedValue(() => {})}))
vi.mock('@tauri-apps/api/window', () => ({getCurrentWindow: () => ({setTitle: vi.fn().mockResolvedValue(undefined)})}))
vi.mock('./api', () => ({operations: vi.fn(), jobs: vi.fn(), example: vi.fn(), request: vi.fn(), reuse: vi.fn(), submit: vi.fn(), getJobSettings: vi.fn(), storeCached: vi.fn(), storeImport: vi.fn()}))
vi.mock('./desktop', () => ({confirmAction: vi.fn().mockResolvedValue(true), selectPaths: vi.fn()}))
vi.mock('./components/Results', () => ({default: () => <p>Result preview</p>}))

beforeEach(() => {
  vi.mocked(api.getJobSettings).mockResolvedValue({maxConcurrentJobs: 1, maxAllowedConcurrentJobs: 4, defaultOutputFolder: '/my/results'})
  vi.mocked(api.submit).mockClear()
  vi.mocked(confirmAction).mockResolvedValue(true)
  vi.mocked(api.request).mockResolvedValue({allowed: [], present: [], note: ''})
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}))
  vi.mocked(api.operations).mockResolvedValue(['patient', 'cohort', 'csv'].map(id => ({
    id, label: id, description: `${id} description`, available: true,
    options: [{name: 'note', label: 'Run note', kind: 'string'}], input: {files: []},
  })))
  vi.mocked(api.jobs).mockResolvedValue([
    {id: 'run-one', conversion: 'patient', status: 'completed', created: 1, sources: ['Alice.json'], options: {}},
    {id: 'run-two', conversion: 'csv', status: 'queued', created: 2, sources: [], options: {}},
  ])
})

it('places Cohort before Patient regardless of catalog order', async () => {
  render(<App/> )
  const modes = await screen.findByRole('group', {name: 'Analysis mode'})
  const buttons = within(modes).getAllByRole('button')
  expect(buttons[0]).toHaveTextContent('cohort')
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveTextContent('patient')
  expect(buttons[0].querySelector('.analysis-mode-icon')).toHaveAttribute('aria-hidden', 'true')
  expect(buttons[0].querySelectorAll('.analysis-mode-icon svg')).toHaveLength(1)
  expect(buttons[1].querySelector('.analysis-mode-icon')).toHaveAttribute('aria-hidden', 'true')
  expect(buttons[1].querySelectorAll('.analysis-mode-icon svg')).toHaveLength(3)
  fireEvent.click(buttons[0])
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(buttons[1])
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
})

it('shows workflow icons beside run names without replacing status text', async () => {
  render(<App/> )
  const history = await screen.findByRole('complementary', {name: 'Run history'})
  await waitFor(() => expect(history.querySelectorAll('.run-name')).toHaveLength(2))
  const names = [...history.querySelectorAll('.run-name')]
  expect(names.find(name => name.textContent === 'patient')?.querySelector('.patient-icon')).toHaveAttribute('aria-hidden', 'true')
  expect(names.find(name => name.textContent === 'csv')?.querySelector('svg.tool-icon')).toHaveAttribute('aria-hidden', 'true')
  expect(history.querySelector('.run-state.completed')).toHaveTextContent('completed')
  expect(history.querySelector('.run-state.queued')).toHaveTextContent('queued')
})

it('toggles the run sidebar from the native View menu', async () => {
  vi.mocked(listen).mockClear()
  render(<App/> )
  await screen.findByRole('group', {name: 'Analysis mode'})
  const handler = vi.mocked(listen).mock.calls.find(call => call[0] === 'desktop-menu')![1]
  await act(async () => handler({event: 'desktop-menu', id: 0, payload: 'toggle-sidebar'}))
  expect(screen.queryByRole('complementary', {name: 'Run history'})).not.toBeInTheDocument()
  await act(async () => handler({event: 'desktop-menu', id: 0, payload: 'toggle-sidebar'}))
  expect(screen.getByRole('complementary', {name: 'Run history'})).toBeInTheDocument()
})

it('starts fresh when changing input sources without running jobs', async () => {
  vi.mocked(api.operations).mockResolvedValue([{id: 'cohort', label: 'Cohort', description: '', available: true, options: [], input: {files: []}}, {id: 'patient', label: 'Patient', description: '', available: true, options: [], input: {files: [
    {name: 'reference', label: 'Reference', required: true, multiple: true},
    {name: 'target', label: 'Target', required: true, multiple: false},
  ]}}])
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'example', filename: 'example.json', directory: false, bytes: 10}]})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: /Patient Rank reference/}))
  expect(await screen.findByRole('button', {name: 'User files'})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', {name: 'Select Reference'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Examples'}))
  expect(screen.getByRole('button', {name: 'Load example'})).toHaveClass('primary')
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await screen.findByText('Reference: example.json')
  expect(screen.getByRole('button', {name: 'Load example'})).not.toHaveClass('primary')
  expect(screen.getByRole('button', {name: 'Examples'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', {name: 'Examples'}))
  expect(screen.getByText('Reference: example.json')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Previous runs'}))
  expect(screen.getByText(/No compatible outputs.*reference/)).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: 'Remove example.json'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Beacon'}))
  expect(screen.getByRole('button', {name: 'Import Beacon v2 reference'})).toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Import Beacon v2 reference'})).toHaveClass('primary')
  expect(screen.queryByRole('button', {name: 'Remove example.json'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'User files'}))
  expect(screen.getByRole('button', {name: 'Select Target'})).toBeInTheDocument()
  expect(api.submit).not.toHaveBeenCalled()
})

it('enables Run analysis after loading complete inputs and disables it after removal', async () => {
  vi.mocked(api.operations).mockResolvedValue([{id: 'cohort', label: 'Cohort', description: '', available: true, options: [], input: {files: []}}, {id: 'patient', label: 'Patient', description: '', available: true, options: [], input: {files: [
    {name: 'reference', label: 'Reference', required: false, multiple: true},
    {name: 'target', label: 'Target', required: true, multiple: false},
  ]}}])
  vi.mocked(api.example).mockResolvedValue(Object.fromEntries(['reference', 'target'].map(role => [role, [{id: role, filename: `${role}.json`, bytes: 1, directory: false}]])))
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: /Patient Rank reference/}))
  const run = await screen.findByRole('button', {name: 'Run analysis'})
  expect(run).toBeDisabled()
  fireEvent.click(await screen.findByRole('button', {name: 'Examples'}))
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await waitFor(() => expect(run).toBeEnabled())
  expect(screen.getByText('Ready to run')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Examples'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', {name: 'Remove target.json'}))
  expect(run).toBeDisabled()
  expect(screen.getByText('Select a target record')).toBeInTheDocument()
  expect(api.submit).not.toHaveBeenCalled()
})

it('resets a loaded patient example without deleting runs or leaving the Examples tab', async () => {
  vi.mocked(api.operations).mockResolvedValue(['cohort', 'patient'].map(id => ({
    id, label: id, description: '', available: true, options: [], input: {files: [
      {name: 'reference', label: 'Reference', required: false, multiple: true},
      ...(id === 'patient' ? [{name: 'target', label: 'Target', required: true, multiple: false}] : []),
    ]},
  })))
  vi.mocked(api.example).mockResolvedValue(Object.fromEntries(['reference', 'target'].map(role => [role, [{id: role, filename: `${role}.json`, bytes: 1, directory: false}]])))
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: /patient Rank reference/}))
  fireEvent.click(screen.getByRole('button', {name: 'Examples'}))
  expect(screen.queryByRole('button', {name: 'Select Target'})).not.toBeInTheDocument()
  expect(screen.getByText(/includes both a target patient and reference records/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await screen.findByText('Ready to run')
  fireEvent.click(screen.getByRole('button', {name: 'Reset Examples'}))
  expect(screen.queryByText('Reference: reference.json')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: 'Select Target'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Run analysis'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Examples'})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', {name: 'Load example'})).toHaveClass('primary')
  expect(screen.getByRole('complementary', {name: 'Run history'}).querySelectorAll('.run-entry')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await screen.findByText('Ready to run')
  fireEvent.click(screen.getByRole('button', {name: /cohort Compare all/}))
  fireEvent.click(screen.getByRole('button', {name: /patient Rank reference/}))
  expect(screen.getByRole('button', {name: 'Run analysis'})).toBeDisabled()
  expect(screen.queryByText('Reference: reference.json')).not.toBeInTheDocument()
})

it('offers reset for every analysis source and tool setup', async () => {
  render(<App/>)
  await screen.findByRole('button', {name: 'User files'})
  for (const source of ['User files', 'Use cases', 'Examples', 'Previous runs', 'Beacon']) {
    fireEvent.click(screen.getByRole('button', {name: source}))
    fireEvent.click(screen.getByRole('button', {name: `Reset ${source}`}))
    expect(screen.getByRole('button', {name: source})).toHaveAttribute('aria-pressed', 'true')
  }
  fireEvent.click(screen.getByRole('button', {name: 'Tools'}))
  fireEvent.click(within(screen.getByRole('group', {name: 'Companion tools'})).getByRole('button', {name: 'csv'}))
  vi.mocked(api.example).mockResolvedValue({source: [{id: 'csv', filename: 'example.csv', bytes: 1, directory: false}]})
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await screen.findByText(/CSV example loaded/)
  fireEvent.click(screen.getByRole('button', {name: 'Reset setup'}))
  expect(screen.getByRole('button', {name: 'Load example'})).toHaveClass('primary')
  expect(screen.queryByText(/CSV example loaded/)).not.toBeInTheDocument()
})

it('searches and filters runs without changing the draft workflow', async () => {
  render(<App/>)
  await screen.findByRole('group', {name: 'Analysis mode'})
  const history = screen.getByRole('complementary', {name: 'Run history'})
  fireEvent.change(screen.getByLabelText('Find runs'), {target: {value: 'Alice'}})
  expect(within(history).getByRole('button', {name: /^patient/})).toBeInTheDocument()
  expect(within(history).queryByRole('button', {name: /^csv/})).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Find runs'), {target: {value: ''}})
  fireEvent.change(screen.getByLabelText('Filter runs by status'), {target: {value: 'active'}})
  fireEvent.click(within(history).getByRole('button', {name: /^csv/}))
  expect(screen.queryByRole('button', {name: 'Run analysis'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'New analysis'}))
  expect(screen.queryByLabelText('Workflow')).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: /cohort Compare all/})).toHaveAttribute('aria-pressed', 'true')
})

it('closes deleted results immediately and ignores an older history response', async () => {
  const original = [{id: 'old-run', conversion: 'patient', status: 'completed' as const, created: 1, sources: [], options: {}}]
  let resolveStale!: (jobs: typeof original) => void
  vi.mocked(api.jobs).mockResolvedValue([])
    .mockResolvedValueOnce(original)
    .mockImplementationOnce(() => new Promise(resolve => {resolveStale = resolve}))
  vi.mocked(api.request).mockResolvedValue({failed: []})
  render(<App/> )
  const history = screen.getByRole('complementary', {name: 'Run history'})
  fireEvent.click(await within(history).findByRole('button', {name: /^patient/}))
  expect(screen.getByText('Result preview')).toBeInTheDocument()
  await waitFor(() => expect(resolveStale).toBeDefined(), {timeout: 2000})
  fireEvent.click(screen.getByRole('button', {name: 'Delete all finished runs'}))
  fireEvent.click(screen.getByRole('button', {name: 'Remove from history'}))
  await waitFor(() => expect(screen.queryByText('Result preview')).not.toBeInTheDocument())
  expect(screen.getByRole('button', {name: 'Selected run'})).toBeDisabled()
  await act(async () => resolveStale(original))
  expect(within(history).queryByRole('button', {name: /^patient/})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Setup'})).toHaveAttribute('aria-current', 'page')
})

it('loads and runs the CSV example without redundant confirmations', async () => {
  vi.mocked(api.operations).mockResolvedValue([{id: 'csv', label: 'CSV/TSV', description: '', available: true, options: [], input: {files: [
    {name: 'source', label: 'Source', required: true, multiple: false},
  ]}}])
  vi.mocked(api.example).mockResolvedValue({source: [{id: 'csv-example', filename: 'example.csv', bytes: 30, directory: false}]})
  vi.mocked(api.submit).mockResolvedValue({id: 'new-csv', conversion: 'csv', status: 'queued', created: 3, sources: ['example.csv'], options: {}})
  vi.mocked(confirmAction).mockClear()
  render(<App/> )
  await waitFor(() => expect(screen.getByRole('button', {name: 'Tools'})).toBeEnabled())
  fireEvent.click(await screen.findByRole('button', {name: 'Tools'}))
  fireEvent.click(await screen.findByRole('button', {name: 'CSV/TSV'}))
  const load = await screen.findByRole('button', {name: 'Load example'})
  expect(screen.getByRole('button', {name: 'Run utility'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Run utility'})).not.toHaveClass('primary')
  expect(load).toHaveClass('primary')
  fireEvent.click(load)
  await screen.findByText(/CSV example loaded with matching separators/)
  expect(screen.getByRole('button', {name: 'Run utility'})).toBeEnabled()
  expect(screen.getByRole('button', {name: 'Run utility'})).toHaveClass('primary')
  expect(api.submit).not.toHaveBeenCalled()
  expect(load).not.toHaveClass('primary')
  fireEvent.click(screen.getByRole('button', {name: 'Run utility'}))
  await waitFor(() => expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({conversion: 'csv', input: {files: {source: ['csv-example']}}, options: {separator: ';', 'array-separator': ','}})))
  expect(confirmAction).not.toHaveBeenCalled()
})

it.each([
  ['summary', 'Phenotype summary plot'],
  ['qr-encode', 'Encode QR codes'],
  ['qr-decode', 'Decode QR codes'],
  ['pdf', 'PDF reports'],
])('runs %s with the selected input without a redundant confirmation', async (operation, label) => {
  vi.mocked(api.operations).mockResolvedValue([{id: operation, label, description: '', available: true, options: [], input: {files: [
    {name: 'source', label: 'BFF or PXF records', required: true, multiple: false},
  ]}}])
  vi.mocked(selectPaths).mockResolvedValue([{id: 'selected-cohort', filename: 'cohort.json', bytes: 30, directory: false}])
  vi.mocked(api.submit).mockResolvedValue({id: 'new-tool-run', conversion: operation, status: 'queued', created: 3, sources: ['cohort.json'], options: {}})
  vi.mocked(confirmAction).mockClear()
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: 'Tools'}))
  fireEvent.click(await screen.findByRole('button', {name: label}))
  fireEvent.click(screen.getByRole('button', {name: 'Select BFF or PXF records'}))
  await screen.findByRole('button', {name: 'Remove cohort.json'})
  expect(api.submit).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Run utility'}))
  await waitFor(() => expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({conversion: operation, input: {files: {source: ['selected-cohort']}}})))
  expect(confirmAction).not.toHaveBeenCalled()
})

it('requires both QR images and the matching template before decoding', async () => {
  vi.mocked(api.operations).mockResolvedValue([{id: 'qr-decode', label: 'Decode QR codes', description: '', available: true, options: [], input: {files: [
    {name: 'source', label: 'QR images', required: true, multiple: true},
    {name: 'template', label: 'Global hash / template', required: true, multiple: false},
  ]}}])
  vi.mocked(selectPaths).mockResolvedValueOnce([{id: 'image', filename: 'Beacon_1.png', bytes: 30, directory: false}])
    .mockResolvedValueOnce([{id: 'template', filename: 'glob_hash.json', bytes: 30, directory: false}])
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: 'Tools'}))
  fireEvent.click(screen.getByRole('button', {name: 'Decode QR codes'}))
  expect(screen.getByRole('button', {name: 'Run utility'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: 'Select QR images'}))
  await screen.findByRole('button', {name: 'Remove Beacon_1.png'})
  expect(screen.getByRole('button', {name: 'Run utility'})).toBeDisabled()
  expect(screen.getByText('Select global hash / template before running.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Select Global hash / template'}))
  await waitFor(() => expect(screen.getByRole('button', {name: 'Run utility'})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: 'Remove glob_hash.json'}))
  expect(screen.getByRole('button', {name: 'Run utility'})).toBeDisabled()
  expect(api.submit).not.toHaveBeenCalled()
})

it('keeps simulation count and BFF format visible while other settings are collapsed', async () => {
  vi.mocked(api.operations).mockResolvedValue([{id: 'simulate', label: 'Simulate records', description: '', available: true, options: [
    {name: 'number', label: 'Number of records', kind: 'integer', default: 100},
    {name: 'format', label: 'Format', kind: 'select', values: ['bff', 'pxf'], default: 'bff'},
    {name: 'random-seed', label: 'Random seed', kind: 'integer', default: 42},
  ], input: {files: [{name: 'ontologies', label: 'Custom ontologies', required: false, multiple: false}]}}])
  vi.mocked(api.submit).mockResolvedValue({id: 'simulation', conversion: 'simulate', status: 'queued', created: 3, sources: [], options: {}})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: 'Tools'}))
  fireEvent.click(await screen.findByRole('button', {name: 'Simulate records'}))
  expect(screen.getByLabelText('Number of records')).toHaveValue(100)
  expect(screen.getByLabelText('Format')).toHaveValue('bff')
  expect(screen.getByLabelText('Number of records').closest('details')).toBeNull()
  expect(screen.getByLabelText('Format').closest('details')).toBeNull()
  const advanced = screen.getByText('Advanced settings').closest('details')!
  expect(advanced).not.toHaveAttribute('open')
  expect(advanced).toContainElement(screen.getByLabelText('Random seed'))
  expect(advanced.textContent).toContain('Custom ontologies')
  fireEvent.change(screen.getByLabelText('Number of records'), {target: {value: '5'}})
  fireEvent.change(screen.getByLabelText('Format'), {target: {value: 'pxf'}})
  fireEvent.click(screen.getByRole('button', {name: 'Run utility'}))
  await waitFor(() => expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({conversion: 'simulate', options: {number: 5, format: 'pxf', 'random-seed': 42}})))
})

it('opens simulated outputs in Cohort and Previous runs rather than Use cases', async () => {
  vi.mocked(api.operations).mockResolvedValue(['patient', 'cohort', 'simulate'].map(id => ({id, label: id, description: '', available: true, options: [], input: {files: [{name: 'reference', label: 'Reference', required: false, multiple: true}]}})))
  vi.mocked(api.jobs).mockResolvedValue([{id: 'sim-run', conversion: 'simulate', name: 'My simulation', status: 'completed', created: 1, sources: [], options: {}, result: {warnings: [], artifacts: [{id: 'sim-json', filename: 'simulated.json', kind: 'json', mediaType: 'application/json', bytes: 10}]}}])
  vi.mocked(api.reuse).mockResolvedValue({id: 'sim-input', filename: 'simulated.json', directory: false, bytes: 10})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: 'Use cases'}))
  fireEvent.click(await screen.findByRole('button', {name: /^My simulation completed/}))
  fireEvent.click(screen.getByRole('button', {name: 'Use in analysis'}))
  await screen.findByText('Reference: simulated.json')
  expect(screen.getByRole('button', {name: /cohort Compare all records/})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', {name: 'Previous runs'})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText(/Inputs selected from My simulation/)).toBeInTheDocument()
  expect(api.submit).not.toHaveBeenCalled()
})

it('restores options when returning from a utility and allows navigation to collapse', async () => {
  render(<App/>)
  fireEvent.change(await screen.findByLabelText('Run note'), {target: {value: 'my draft'}})
  fireEvent.click(screen.getByRole('button', {name: 'Tools'}))
  fireEvent.click(within(screen.getByRole('group', {name: 'Companion tools'})).getByRole('button', {name: 'csv'}))
  expect(screen.getByRole('button', {name: 'Tools'})).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByLabelText('Run note')).toHaveValue('')
  fireEvent.click(screen.getByRole('button', {name: 'New analysis'}))
  expect(screen.getByLabelText('Run note')).toHaveValue('my draft')
  fireEvent.click(screen.getByRole('button', {name: 'Hide navigation'}))
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Show navigation'}))
  expect(screen.getByRole('complementary', {name: 'Run history'})).toBeInTheDocument()
})

it('renames runs inline and protects queued jobs from deletion', async () => {
  vi.mocked(api.request).mockResolvedValue({name: 'My cohort'})
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: 'Actions for patient'}))
  fireEvent.click(screen.getByRole('button', {name: 'Rename'}))
  fireEvent.change(screen.getByLabelText('Run name'), {target: {value: 'My cohort'}})
  fireEvent.click(screen.getByRole('button', {name: 'Save name'}))
  await waitFor(() => expect(api.request).toHaveBeenCalledWith('/api/jobs/run-one/rename', {name: 'My cohort'}))
  expect(await screen.findByRole('button', {name: 'Actions for My cohort'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Actions for csv'}))
  expect(screen.getByRole('button', {name: 'Delete run'})).toBeDisabled()
})

it('deletes finished history through the bulk action', async () => {
  vi.mocked(api.request).mockResolvedValue({failed: []})
  render(<App/>)
  const button = await screen.findByRole('button', {name: 'Delete all finished runs'})
  await waitFor(() => expect(button).not.toBeDisabled())
  fireEvent.click(button)
  fireEvent.click(screen.getByRole('button', {name: 'Remove from history'}))
  await waitFor(() => expect(api.request).toHaveBeenCalledWith('/api/jobs', undefined, 'DELETE'))
})

it('offers file deletion separately from history removal', async () => {
  vi.mocked(api.request).mockResolvedValue({failed: []})
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: 'Actions for patient'}))
  fireEvent.click(screen.getByRole('button', {name: 'Delete run'}))
  expect(screen.getByRole('radio', {name: 'History only'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio', {name: 'History and output files'}))
  fireEvent.click(screen.getByRole('button', {name: 'Delete runs and files'}))
  await waitFor(() => expect(api.request).toHaveBeenCalledWith('/api/jobs/run-one/files', undefined, 'DELETE'))
})

it('dismisses Tools with Escape or an outside click', async () => {
  render(<App/>)
  await screen.findByRole('group', {name: 'Analysis mode'})
  const tools = screen.getByRole('button', {name: 'Tools'})
  fireEvent.click(tools)
  expect(screen.getByRole('group', {name: 'Companion tools'})).toBeInTheDocument()
  fireEvent.keyDown(tools, {key: 'Escape'})
  expect(tools).toHaveFocus()
  expect(tools).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(tools)
  fireEvent.pointerDown(document.body)
  expect(tools).toHaveAttribute('aria-expanded', 'false')
})

it('prepares both QR inputs from the selected run without launching it', async () => {
  vi.mocked(api.operations).mockResolvedValue([
    {id: 'patient', label: 'Patient', description: '', available: true, options: [], input: {files: []}},
    {id: 'qr-encode', label: 'Encode QR codes', description: '', available: true, options: [], input: {files: [
      {name: 'source', label: 'Profiles', required: true, multiple: false},
      {name: 'template', label: 'Global hash', required: false, multiple: false},
    ]}},
  ])
  vi.mocked(api.jobs).mockResolvedValue([{id: 'analysis', conversion: 'patient', status: 'completed', created: 1, sources: [], options: {}, result: {warnings: [], artifacts: [
    {id: 'profiles', filename: 'export.ref_binary_hash.json', kind: 'json', mediaType: 'application/json', bytes: 1},
    {id: 'dictionary', filename: 'export.glob_hash.json', kind: 'json', mediaType: 'application/json', bytes: 1},
  ]}}])
  vi.mocked(api.reuse).mockImplementation(async (_, id) => ({id, filename: `${id}.json`, directory: false, bytes: 1}))
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: /^Patient completed/}))
  fireEvent.click(screen.getByRole('button', {name: 'Create QR codes'}))
  expect(await screen.findByText('profiles.json')).toBeInTheDocument()
  expect(screen.getByText('dictionary.json')).toBeInTheDocument()
  expect(api.reuse).toHaveBeenCalledWith('analysis', 'profiles')
  expect(api.reuse).toHaveBeenCalledWith('analysis', 'dictionary')
  expect(screen.getByRole('button', {name: 'Run utility'})).toBeInTheDocument()
})

it('requires confirmation for large graph opt-in and allows cancelling before submission', async () => {
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'ref', filename: 'cohort.json', bytes: 1, directory: false}]})
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: /cohort Compare all/}))
  fireEvent.click(screen.getByRole('button', {name: 'Examples'}))
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await waitFor(() => expect(screen.getByRole('button', {name: 'Run analysis'})).toBeEnabled())
  vi.mocked(api.request).mockResolvedValue({recordCount: 10000, possibleEdges: 49995000, warnings: ['Large graph export explicitly enabled.']})
  vi.mocked(confirmAction).mockResolvedValue(false)
  fireEvent.click(screen.getByRole('button', {name: 'Run analysis'}))
  await waitFor(() => expect(confirmAction).toHaveBeenCalledWith('Confirm large graph export', expect.stringContaining('49,995,000')))
  expect(api.submit).not.toHaveBeenCalled()
})

it('submits an ordinary 10K cohort without a warning dialog', async () => {
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'ref', filename: 'cohort.json', bytes: 1, directory: false}]})
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: /cohort Compare all/}))
  fireEvent.click(screen.getByRole('button', {name: 'Examples'}))
  fireEvent.click(screen.getByRole('button', {name: 'Load example'}))
  await waitFor(() => expect(screen.getByRole('button', {name: 'Run analysis'})).toBeEnabled())
  vi.mocked(confirmAction).mockClear()
  vi.mocked(api.request).mockResolvedValue({recordCount: 10000, skipGraph: true, warnings: [], notes: ['Matrix results remain complete. Optional graph omitted.']})
  vi.mocked(api.submit).mockResolvedValue({id: 'new-run', conversion: 'cohort', created: 1, status: 'queued', sources: [], options: {}})
  fireEvent.click(screen.getByRole('button', {name: 'Run analysis'}))
  await waitFor(() => expect(api.submit).toHaveBeenCalledOnce())
  expect(confirmAction).not.toHaveBeenCalled()
})

it('separates examples from use cases and loads a use case without submitting', async () => {
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'orpha', filename: 'orpha.pxf.json.gz', bytes: 1, directory: false}]})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: 'Examples'}))
  expect(screen.getByRole('button', {name: 'Load example'})).toBeInTheDocument()
  expect(screen.queryByLabelText('Use case')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Use cases'}))
  expect(screen.queryByRole('button', {name: 'Load example'})).not.toBeInTheDocument()
  fireEvent.change(await screen.findByLabelText('Use case'), {target: {value: 'orpha'}})
  expect(screen.queryByRole('option', {name: /Phenopacket corpus/})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Load use case'}))
  await waitFor(() => expect(api.example).toHaveBeenCalledWith('orpha', 'cohort'))
  expect(await screen.findByText(/ORPHA disease profiles loaded/)).toBeInTheDocument()
  expect(screen.getByRole('button', {name: /cohort Compare all/})).toHaveAttribute('aria-pressed', 'true')
  expect(api.submit).not.toHaveBeenCalled()
})

it('loads Store collections as one reference and waits for a patient target', async () => {
  vi.mocked(api.operations).mockResolvedValue([{id: 'cohort', label: 'Cohort', description: '', available: true, options: [], input: {files: []}}, {id: 'patient', label: 'Patient', description: '', available: true, options: [], input: {files: [
    {name: 'reference', label: 'Reference', required: true, multiple: true},
    {name: 'target', label: 'Target', required: true, multiple: false},
  ]}}])
  vi.mocked(api.storeCached).mockResolvedValue([{tag: '0.1.27', bytes: 1, sha256: 'sha', url: 'https://example.org', collections: [{name: 'GENE', records: 2}]}])
  vi.mocked(api.storeImport).mockResolvedValue({tag: '0.1.27', records: 2, collections: 1, files: [{id: 'store', filename: 'phenopacket-store-0.1.27.json', directory: false, bytes: 100}]})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: /Patient Rank reference/}))
  fireEvent.click(await screen.findByRole('button', {name: 'Use cases'}))
  fireEvent.change(screen.getByLabelText('Use case'), {target: {value: 'store'}})
  fireEvent.click(await screen.findByRole('button', {name: 'Select all collections'}))
  fireEvent.click(screen.getByRole('button', {name: 'Load as one cohort'}))
  expect(await screen.findByText('Reference: phenopacket-store-0.1.27.json')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Run analysis'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Select Target'})).toBeInTheDocument()
  expect(api.submit).not.toHaveBeenCalled()
})

it('loads a use case over existing settings without a confirmation or starting a job', async () => {
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'omim', filename: 'omim.pxf.json.gz', bytes: 1, directory: false}]})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: 'Use cases'}))
  fireEvent.change(screen.getByLabelText('Run note'), {target: {value: 'keep this'}})
  vi.mocked(api.example).mockClear()
  vi.mocked(confirmAction).mockClear()
  fireEvent.click(screen.getByRole('button', {name: 'Load use case'}))
  expect(await screen.findByText(/OMIM disease profiles loaded/)).toBeInTheDocument()
  expect(api.example).toHaveBeenCalledWith('omim', 'cohort')
  expect(confirmAction).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Run note')).toHaveValue('')
  expect(api.submit).not.toHaveBeenCalled()
})

it('clears use-case data and settings when choosing User files, without restoring them on return', async () => {
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'omim', filename: 'omim.pxf.json.gz', bytes: 1, directory: false}]})
  render(<App/>)
  fireEvent.click(await screen.findByRole('button', {name: 'Use cases'}))
  fireEvent.click(screen.getByRole('button', {name: 'Load use case'}))
  await screen.findByText(/OMIM disease profiles loaded/)
  expect(screen.getByRole('button', {name: 'Use cases'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.change(screen.getByLabelText('Run note'), {target: {value: 'use-case settings'}})
  fireEvent.click(screen.getByRole('button', {name: 'User files'}))
  expect(screen.queryByRole('region', {name: 'Inputs for next run'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Run analysis'})).toBeDisabled()
  expect(screen.getByLabelText('Run note')).toHaveValue('')
  expect(screen.queryByText(/OMIM disease profiles loaded/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Use cases'}))
  expect(screen.queryByRole('region', {name: 'Inputs for next run'})).not.toBeInTheDocument()
  expect(api.submit).not.toHaveBeenCalled()
})

it('loads the disease reference in cohort mode without switching to patient mode', async () => {
  vi.mocked(api.example).mockResolvedValue({reference: [{id: 'omim', filename: 'omim.pxf.json.gz', bytes: 1, directory: false}]})
  render(<App/> )
  fireEvent.click(await screen.findByRole('button', {name: /cohort Compare all/}))
  fireEvent.click(screen.getByRole('button', {name: 'Use cases'}))
  fireEvent.click(screen.getByRole('button', {name: 'Load use case'}))
  await waitFor(() => expect(api.example).toHaveBeenCalledWith('omim', 'cohort'))
  expect(await screen.findByText(/OMIM disease profiles loaded/)).toBeInTheDocument()
  expect(screen.getByRole('button', {name: /cohort Compare all/})).toHaveAttribute('aria-pressed', 'true')
  expect(api.submit).not.toHaveBeenCalled()
})

for (const route of ['picker', 'action']) {
  for (const accept of [true, false]) {
    it(`${accept ? 'replaces' : 'preserves'} all existing inputs when CSV ${route} replacement is ${accept ? 'confirmed' : 'cancelled'}`, async () => {
      const roles = ['reference', 'target', 'config', 'weights', 'precomputed']
      vi.mocked(api.operations).mockResolvedValue(['patient', 'cohort'].map(id => ({
        id, label: id, description: '', available: true, options: [], input: {files: roles.map(name => ({
          name, label: name, required: false, multiple: name === 'reference' || name === 'precomputed',
        }))},
      })))
      vi.mocked(api.example).mockResolvedValue(Object.fromEntries(roles.map(role => [role, [{
        id: `old-${role}`, filename: `old-${role}.json`, directory: false, bytes: 1,
      }]])))
      vi.mocked(api.jobs).mockResolvedValue([{id: 'csv-run', conversion: 'csv', status: 'completed', created: 1, sources: [], options: {}, result: {
        warnings: [], artifacts: ['example.json', 'example_config.yaml'].map(filename => ({id: filename, filename, kind: 'json', mediaType: 'application/json', bytes: 1})),
      }}])
      vi.mocked(api.reuse).mockClear()
      vi.mocked(api.reuse).mockImplementation(async (_, id) => ({id, filename: id, directory: false, bytes: 1}))
      vi.mocked(confirmAction).mockClear()
      vi.mocked(confirmAction).mockResolvedValue(accept)
      render(<App/> )
      fireEvent.click(await screen.findByRole('button', {name: 'Examples'}))
      fireEvent.click(await screen.findByRole('button', {name: 'Load example'}))
      await screen.findByText('reference: old-reference.json')
      if (route === 'picker') {
        fireEvent.click(screen.getByRole('button', {name: 'Previous runs'}))
        for (const role of ['config', 'weights', 'precomputed']) {
          vi.mocked(selectPaths).mockResolvedValue([{id: `old-${role}`, filename: `old-${role}.json`, directory: false, bytes: 1}])
          fireEvent.click(screen.getByRole('button', {name: `Select ${role}`}))
          await screen.findByRole('button', {name: `Remove old-${role}.json`})
        }
        fireEvent.change(screen.getByLabelText('Select reference from previous run'), {target: {value: JSON.stringify(['csv-run', 'example.json'])}})
      } else {
        fireEvent.click(screen.getByRole('button', {name: /^csv completed/}))
        expect(screen.getByRole('button', {name: 'Use in analysis'})).toHaveClass('primary')
        fireEvent.click(screen.getByRole('button', {name: 'Use in analysis'}))
      }
      await waitFor(() => expect(confirmAction).toHaveBeenCalledWith('Replace current inputs?', expect.stringContaining('matching configuration')))
      if (accept) {
        expect(await screen.findByText('reference: example.json')).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Previous runs'})).toHaveAttribute('aria-pressed', 'true')
        if (route === 'action') expect(screen.getByRole('button', {name: /cohort Compare all records/})).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', {name: 'Remove example_config.yaml'})).toBeInTheDocument()
        for (const role of roles) expect(screen.queryByRole('button', {name: `Remove old-${role}.json`})).not.toBeInTheDocument()
      } else {
        expect(api.reuse).not.toHaveBeenCalled()
        if (route === 'action') fireEvent.click(screen.getByRole('button', {name: 'New analysis'}))
        for (const role of route === 'picker' ? ['config', 'weights', 'precomputed'] : roles) expect(screen.getByText(`${role}: old-${role}.json`)).toBeInTheDocument()
      }
      expect(api.submit).not.toHaveBeenCalled()
    })
  }
}
