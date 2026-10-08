import type { OutputFile } from './types'

export function isAdvancedOutput(file: OutputFile): boolean {
  const name = file.filename.replaceAll('\\', '/').split('/').at(-1) || ''
  return name === 'run.json' || name === 'collection-labels.json' || /\.log$/i.test(name) || name.endsWith('.payload.txt') || name.endsWith('.qr.json')
    || /^alignment\./.test(name) || /^export\./.test(name)
    || /\.(glob_hash|ref_hash|ref_binary_hash|coverage_stats|labels|alignment_hash)\.json(?:\.gz)?$/.test(name)
}

export function outputDescription(file: OutputFile): string | undefined {
  const names: Record<string, string> = {
    'rank.txt': 'Patient ranking',
    'matrix.txt': 'Comparison matrix',
    'matrix.mtx': 'Comparison matrix (Matrix Market)',
    'mds.json': 'MDS coordinates',
    'umap.json': 'UMAP coordinates',
    'graph.json': 'Comparison network',
    'graph_stats.txt': 'Network statistics',
    'simulated.json': 'Simulated records',
  }
  return names[file.filename] || (file.kind === 'html' ? 'Interactive report' : file.kind === 'pdf' ? 'PDF report' : undefined)
}
