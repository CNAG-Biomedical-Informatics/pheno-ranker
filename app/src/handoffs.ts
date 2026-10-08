import type { Job, OutputFile } from './types'

export type RunAction = {label: string; operation: string; files: Record<string, OutputFile[]>}

export function runActions(job: Job): RunAction[] {
  if (job.status !== 'completed') return []
  const artifacts = job.result?.artifacts || []
  const find = (filename: string) => artifacts.find(item => item.filename.replaceAll('\\', '/') === filename)
  if (job.conversion === 'csv') {
    const configs = artifacts.filter(item => /_config\.yaml$/.test(item.filename))
    if (configs.length !== 1) return []
    const config = configs[0]
    const reference = find(config.filename.replaceAll('\\', '/').replace(/_config\.yaml$/, '.json'))
    return reference ? [{label: 'Use in analysis', operation: 'cohort', files: {reference: [reference], config: [config]}}] : []
  }
  if (job.conversion === 'simulate') {
    const reference = find('simulated.json')
    return reference ? [{label: 'Use in analysis', operation: 'cohort', files: {reference: [reference]}}] : []
  }
  if (['patient', 'cohort'].includes(job.conversion)) {
    const source = find('export.ref_binary_hash.json')
    const template = find('export.glob_hash.json')
    const labels = find('export.labels.json')
    return source && template ? [{label: 'Create QR codes', operation: 'qr-encode', files: {source: [source], template: [template], ...(labels ? {labels: [labels]} : {})}}] : []
  }
  if (job.conversion === 'qr-encode') {
    const source = find('qr/decoded.json')
    const qr = artifacts.filter(item => /^qr\/[^/]+\.png$/.test(item.filename.replaceAll('\\', '/')))
    return source && qr.length ? [{label: 'Create PDF reports', operation: 'pdf', files: {source: [source], qr}}] : []
  }
  return []
}
