import { describe, expect, it } from 'vitest'
import { collectionCohorts, compareCells, filterEdges, filterResultRows, parseMatrix, parseMatrixTable, parseTable, recordCohort, styleGraphEdges } from './results'
import type { Job } from './types'
describe('result views', () => {
  it('colours records by collection without changing their IDs', () => {
    const groups = collectionCohorts({'patient:1': 'GENE_B', 'patient:2': 'GENE_A', 'patient:3': 'GENE_B'})
    expect(groups.get('patient:1')).toEqual(groups.get('patient:3'))
    expect(groups.get('patient:1')?.color).not.toBe(groups.get('patient:2')?.color)
    expect(groups.get('patient:2')?.label).toBe('GENE_A')
  })
  it('bounds dense matrix tables in both dimensions before rendering', () => {
    const labels = Array.from({length: 2402}, (_, i) => `ORPHA:${i}`)
    const text = ['\t' + labels.join('\t'), ...labels.slice(0, 120).map(label => label + '\t' + labels.map(() => '0').join('\t'))].join('\r\n')
    const table = parseMatrixTable(text)
    expect(table.headers).toHaveLength(51)
    expect(table.rows).toHaveLength(100)
    expect(table.rows.every(row => row.length === 51)).toBe(true)
    expect(table.rows[0][0]).toBe('ORPHA:0')
    expect(table.headers.at(-1)).toBe('ORPHA:49')
  })
  it('makes closer edges thicker for both metrics and retains finite styling for equal weights', () => {
    const edges = [0, .5, 1].map(weight => ({data: {weight}}))
    const hamming = styleGraphEdges(edges, 'hamming', false)
    const jaccard = styleGraphEdges(edges, 'jaccard', false)
    expect(hamming[0].data.edgeWidth).toBeGreaterThan(hamming[2].data.edgeWidth)
    expect(jaccard[2].data.edgeWidth).toBeGreaterThan(jaccard[0].data.edgeWidth)
    expect(styleGraphEdges([{data: {weight: 0}}], 'hamming', true)[0].data.edgeWidth).toBeGreaterThan(0)
    expect(styleGraphEdges(edges, 'hamming', true)[0].data.edgeColor).toBe('#e2e8f0')
  })
  const job: Job = {id: 'test', conversion: 'cohort', status: 'completed', created: 0, sources: [], options: {}, fingerprints: ['one.json', 'two.json'].map(filename => ({filename, role: 'reference', sha256: 'test'}))}
  it('resolves actual source cohorts with default and custom prefixes without stripping IDs', () => {
    expect(recordCohort('C2_person:visit', job).label).toBe('C2 (two.json)')
    expect(recordCohort('study_b_person', {...job, options: {'append-prefixes': ['study_a', 'study_b']}}).color).toBe(recordCohort('C2_person', job).color)
    expect(recordCohort('C2_natural_id', {...job, fingerprints: job.fingerprints!.slice(0, 1)}).label).toBe('one.json')
    expect(recordCohort('C1_person', {...job, fingerprints: []}).key).toBe('unknown')
    expect(recordCohort('a_b_person', {...job, options: {'append-prefixes': ['a', 'a_b']}}).key).toBe('unknown')
  })
  it('preserves full IDs and handles numeric sorting', () => {
    expect(parseTable('id\tscore\nC1_id:visit\t12\n', 'rank.txt').rows[0][0]).toBe('C1_id:visit')
    expect(compareCells('2', '10')).toBeLessThan(0)
  })
  it('parses quoted semicolon alignment values', () => {
    expect(parseTable('id;label\n"one";"first; second"\n', 'align.csv').rows[0][1]).toBe('first; second')
  })
  it('requires matching matrix identities, not just a square shape', () => {
    expect(parseMatrix('id\ta\tb\na\t0\t3\nb\t3\t0\n').values).toEqual([[0, 3], [3, 0]])
    expect(() => parseMatrix('id\ta\tb\nb\t0\t3\na\t3\t0\n')).toThrow()
  })
  it('filters graph weights in the correct direction for each metric', () => {
    const edges = [0, .5, 1].map(weight => ({data: {source: 'a', target: 'b', weight}}))
    expect(filterEdges(edges, 'hamming', .5).map(e => e.data.weight)).toEqual([0, .5])
    expect(filterEdges(edges, 'jaccard', .5).map(e => e.data.weight)).toEqual([.5, 1])
  })
  it('filters deterministic alignment contributions without losing text search', () => {
    const rows = [['ref-1', '0', 'term one'], ['ref-1', '2', 'term two'], ['ref-2', '1', 'term three']]
    expect(filterResultRows(rows, '', 1, true)).toEqual([rows[1], rows[2]])
    expect(filterResultRows(rows, 'two', 1, true)).toEqual([rows[1]])
  })
})
