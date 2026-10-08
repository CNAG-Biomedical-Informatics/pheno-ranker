import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import Results from './Results'
import * as api from '../api'
import type { Job } from '../types'
import Plotly from 'plotly.js-dist-min'
import cytoscape from 'cytoscape'

vi.mock('../api', () => ({download: vi.fn(), pairAlignment: vi.fn()}))
vi.mock('plotly.js-dist-min', () => ({default: {newPlot: vi.fn().mockResolvedValue(undefined), purge: vi.fn(), Plots: {resize: vi.fn()}}}))
vi.mock('cytoscape', () => ({default: vi.fn(() => ({destroy: vi.fn(), resize: vi.fn(), fit: vi.fn(), on: vi.fn()}))}))
const job: Job = {id: 'one', conversion: 'cohort', created: 0, status: 'completed', sources: [], options: {'similarity-metric-cohort': 'jaccard'}, result: {warnings: [], artifacts: [
  {id: 'mds', filename: 'mds.json', kind: 'json', mediaType: 'application/json', bytes: 100},
  {id: 'graph', filename: 'graph.json', kind: 'json', mediaType: 'application/json', bytes: 100},
]}}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', class {observe() {} disconnect() {}})
  vi.mocked(api.download).mockImplementation(async (_, id) => ({text: async () => JSON.stringify(id === 'mds' ? {points: [{id: 'full:record', x: 0, y: 1}]} : {elements: {nodes: [{data: {id: 'a'}}, {data: {id: 'b'}}], edges: [{data: {source: 'a', target: 'b', weight: .5}}]}})} as Blob))
})
it('defaults to the main result rather than an intermediate export', async () => {
  vi.mocked(api.download).mockResolvedValue({text: async () => '{"id":"record"}'} as Blob)
  render(<Results job={{...job, conversion: 'simulate', result: {warnings: [], artifacts: [
    {id: 'export', filename: 'export.glob_hash.json', kind: 'json', mediaType: 'application/json', bytes: 100},
    {id: 'records', filename: 'simulated.json', kind: 'json', mediaType: 'application/json', bytes: 100},
  ]}}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  await waitFor(() => expect(api.download).toHaveBeenCalledWith('one', 'records'))
  expect(api.download).not.toHaveBeenCalledWith('one', 'export')
  expect(screen.getByText('Advanced files (1)').closest('details')).not.toHaveAttribute('open')
})

it('does not open an advanced file automatically when no main result exists', () => {
  render(<Results job={{...job, conversion: 'patient', result: {warnings: [], artifacts: [
    {id: 'log', filename: 'stdout.log', kind: 'txt', mediaType: 'text/plain', bytes: 100},
  ]}}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  expect(screen.getByText('Open Advanced files to inspect supporting outputs.')).toBeInTheDocument()
  expect(api.download).not.toHaveBeenCalled()
})
it('isolates summary filtering without allowing access to the app origin', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:summary-report')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.mocked(api.download).mockResolvedValue(new Blob(['<html></html>'], {type: 'text/html'}))
  const {unmount} = render(<Results job={{...job, conversion: 'summary', result: {warnings: [], artifacts: [
    {id: 'summary', filename: 'summary.html', kind: 'html', mediaType: 'text/html', bytes: 100},
  ]}}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  const frame = await screen.findByTitle('Phenotype summary report')
  expect(frame).toHaveAttribute('sandbox', 'allow-scripts')
  fireEvent.click(screen.getByRole('button', {name: 'Expand plot'}))
  expect(screen.getByRole('dialog', {name: 'Phenotype summary report'})).toContainElement(frame)
  expect(frame).toHaveAttribute('src', 'blob:summary-report')
  fireEvent.click(screen.getByRole('button', {name: 'Restore plot size'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByTitle('Phenotype summary report')).toBe(frame)
  unmount()
  expect(revoke).toHaveBeenCalledWith('blob:summary-report')
})
it('opens linked UMAP as a plot and preserves source cohort labels', async () => {
  vi.mocked(api.download).mockResolvedValue({text: async () => JSON.stringify({points: [{id: 'C1_a', x: 1, y: 2}]})} as Blob)
  render(<Results job={{...job, conversion: 'projection', options: {metric: 'jaccard'}, result: {warnings: [], artifacts: [{id: 'umap', filename: 'umap.json', kind: 'json', mediaType: 'application/json', bytes: 100}]}}}
    sourceJob={{...job, fingerprints: [{filename: 'source.json', role: 'reference', sha256: 'abc'}]}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  await waitFor(() => expect(Plotly.newPlot).toHaveBeenCalled())
  expect(vi.mocked(Plotly.newPlot).mock.calls.at(-1)?.[2]).toMatchObject({title: 'UMAP (2D projection)'})
  expect(screen.getByText(/UMAP emphasizes local neighborhoods/)).toBeInTheDocument()
  expect(screen.getByText('source.json')).toBeInTheDocument()
  expect(cytoscape).not.toHaveBeenCalled()
})
it('opens MDS directly and keeps equal axis scales', async () => {
  render(<Results job={job} onReuse={vi.fn()} onSave={vi.fn()}/> )
  fireEvent.click(screen.getByRole('button', {name: 'MDS'}))
  await waitFor(() => expect(Plotly.newPlot).toHaveBeenCalled())
  expect(vi.mocked(Plotly.newPlot).mock.calls.at(-1)?.[2]).toMatchObject({title: 'MDS (2D projection)'})
  expect(screen.getByText(/Jaccard similarity is converted/)).toBeInTheDocument()
  expect(vi.mocked(Plotly.newPlot).mock.calls.at(-1)?.[2]).toMatchObject({yaxis: {scaleanchor: 'x', scaleratio: 1}})
})

it('opens a dense cohort matrix as a heatmap and retains the file for saving', async () => {
  vi.mocked(api.download).mockResolvedValue({text: async () => 'id\ta\tb\na\t0\t1\nb\t1\t0\n'} as Blob)
  render(<Results job={{...job, result: {warnings: [], artifacts: [{id: 'matrix', filename: 'matrix.txt', kind: 'txt', bytes: 100, mediaType: 'text/plain'}]}}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  expect(screen.getByRole('button', {name: 'Heatmap'})).toHaveAttribute('aria-pressed', 'true')
  await waitFor(() => expect(Plotly.newPlot).toHaveBeenCalled())
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Save as...'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Output files'}))
  fireEvent.click(screen.getByRole('button', {name: /^matrix.txt/}))
  expect(screen.getByRole('table')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Show plot'}))
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Show data'}))
  expect(screen.getByRole('table')).toBeInTheDocument()
})
it('opens a Cytoscape network with metric-aware controls', async () => {
  render(<Results job={job} onReuse={vi.fn()} onSave={vi.fn()}/> )
  fireEvent.click(screen.getByRole('button', {name: 'Network'}))
  await waitFor(() => expect(cytoscape).toHaveBeenCalled())
  expect(screen.getByLabelText('Minimum similarity')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Minimum similarity'), {target: {value: '.8'}})
  await waitFor(() => expect(vi.mocked(cytoscape).mock.calls.at(-1)?.[0].elements).toHaveLength(2))
})
it('explains missing exports and does not offer cohort views for patient runs', () => {
  const {rerender} = render(<Results job={{...job, result: {artifacts: [], warnings: []}}} onReuse={vi.fn()} onSave={vi.fn()}/> )
  fireEvent.click(screen.getByRole('button', {name: 'Network'}))
  expect(screen.getByText(/Enable Export graph/)).toBeInTheDocument()
  rerender(<Results job={{...job, conversion: 'patient'}} onReuse={vi.fn()} onSave={vi.fn()}/> )
  expect(screen.queryByRole('navigation', {name: 'Cohort result views'})).not.toBeInTheDocument()
})

it('opens a ranked pair, groups its terms by entity, and filters differences', async () => {
  const artifacts = [{id: 'rank', filename: 'rank.txt', kind: 'txt', mediaType: 'text/plain', bytes: 100}, {id: 'wide', filename: 'alignment.csv', kind: 'csv', mediaType: 'text/csv', bytes: 200}, {id: 'align', filename: 'alignment.target.csv', kind: 'csv', mediaType: 'text/csv', bytes: 300}]
  vi.mocked(api.download).mockImplementation(async (_, id) => ({text: async () => id === 'rank' ? 'REFERENCE(ID)\tTARGET(ID)\nref:1\ttarget:1\n' : 'id;ref;indicator;tar;weight;hamming-distance;json-path;label\nref:1;1;xxx--;0;2;2;diseases.MONDO:1;Disease A\nref:1;1;-----;1;1;0;phenotypicFeatures.HP:1;Feature A\nother;1;xxx--;0;1;1;diseases.MONDO:2;Other disease\n'} as Blob))
  artifacts[2].bytes = 44 * 1024 * 1024
  vi.mocked(api.pairAlignment).mockResolvedValue({rows: [
    {ref: '1', tar: '0', weight: '2', distance: 2, path: 'diseases.MONDO:1', label: 'Disease A', entity: 'diseases'},
    {ref: '1', tar: '1', weight: '1', distance: 0, path: 'phenotypicFeatures.HP:1', label: 'Feature A', entity: 'phenotypicFeatures'},
  ]})
  render(<Results job={{...job, conversion: 'patient', result: {artifacts, warnings: []}}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  fireEvent.click(await screen.findByRole('button', {name: 'ref:1'}))
  expect(await screen.findByText('Disease A')).toBeInTheDocument()
  expect(api.pairAlignment).toHaveBeenCalledWith(job.id, 'ref:1')
  expect(api.download).not.toHaveBeenCalledWith(job.id, 'align')
  expect(api.download).not.toHaveBeenCalledWith(job.id, 'wide')
  expect(screen.queryByText('Other disease')).not.toBeInTheDocument()
  expect(screen.getByText(/weighted Hamming distance 2/)).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Differences only'))
  expect(screen.queryByText('Feature A')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Back to ranking'}))
  expect(screen.getByRole('button', {name: 'ref:1'})).toBeInTheDocument()
})

it('uses the same cohort palette for MDS traces and network nodes', async () => {
  const fingerprints = [{filename: 'first.json', role: 'reference', sha256: 'a'}, {filename: 'second.json', role: 'reference', sha256: 'b'}]
  vi.mocked(api.download).mockImplementation(async (_, id) => ({text: async () => JSON.stringify(id === 'mds' ? {points: [{id: 'C1_a', x: 0, y: 1}, {id: 'C2_b', x: 1, y: 0}]} : {elements: {nodes: [{data: {id: 'C1_a'}}, {data: {id: 'C2_b'}}], edges: []}})} as Blob))
  render(<Results job={{...job, fingerprints}} onReuse={vi.fn()} onSave={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button', {name: 'MDS'}))
  await waitFor(() => expect(Plotly.newPlot).toHaveBeenCalled())
  const traces = vi.mocked(Plotly.newPlot).mock.calls.at(-1)![1] as {name: string; marker: {color: string}}[]
  expect(traces.map(trace => trace.name)).toEqual(['C1 (first.json)', 'C2 (second.json)'])
  fireEvent.click(screen.getByRole('button', {name: 'Network'}))
  await waitFor(() => expect(cytoscape).toHaveBeenCalled())
  const nodes = vi.mocked(cytoscape).mock.calls.at(-1)![0].elements as {data: {cohortColor: string}}[]
  expect(nodes.map(node => node.data.cohortColor)).toEqual(traces.map(trace => trace.marker.color))
})

it('opens oversized matrices on a completion summary without downloading them', async () => {
  const matrix = {id: 'matrix', filename: 'matrix.txt', kind: 'txt', bytes: 300 * 1024 * 1024, mediaType: 'text/plain'}
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onOpenFolder = vi.fn().mockResolvedValue(undefined)
  vi.mocked(api.download).mockResolvedValue({text: async () => '{"coverage": 1}'} as Blob)
  render(<Results job={{...job, safety: {skipGraph: true, warnings: []}, result: {warnings: [], artifacts: [matrix, {id: 'stats', filename: 'coverage.json', kind: 'json', bytes: 100, mediaType: 'application/json'}]}}}
    onReuse={vi.fn()} onSave={onSave} onOpenFolder={onOpenFolder}/>)
  expect(screen.getByRole('button', {name: 'Summary'})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('heading', {name: 'Analysis complete'})).toBeInTheDocument()
  expect(api.download).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Save matrix as...'}))
  expect(onSave).toHaveBeenCalledWith(matrix)
  fireEvent.click(screen.getByRole('button', {name: 'Open output folder'}))
  expect(onOpenFolder).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: 'Browse output files'}))
  expect(screen.getByText('Output saved; preview unavailable')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(api.download).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('complementary')).getByRole('button', {name: /coverage.json/}))
  expect(await screen.findByText('{"coverage": 1}')).toBeInTheDocument()
  expect(api.download).toHaveBeenCalledWith('one', 'stats')
  fireEvent.click(screen.getByRole('button', {name: 'Network'}))
  expect(screen.getByText(/Optional graph export was omitted/)).toBeInTheDocument()
})

it('presents intentionally skipped MDS as a note rather than a failed analysis', async () => {
  vi.mocked(api.download).mockResolvedValue({text: async () => JSON.stringify({skipped: true, message: 'MDS is limited to 1,500 records; matrix export is complete.'})} as Blob)
  render(<Results job={job} onReuse={vi.fn()} onSave={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button', {name: 'MDS'}))
  expect(await screen.findByRole('heading', {name: 'Interactive preview omitted'})).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(Plotly.newPlot).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: 'Save as...'})).toBeInTheDocument()
})
