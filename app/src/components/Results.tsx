import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Job, OutputFile } from '../types'
import * as api from '../api'
import { collectionCohorts, compareCells, filterEdges, filterResultRows, parseMatrix, parseMatrixTable, parseTable, recordCohort, styleGraphEdges, type Cohort, type GraphElement } from '../results'
import PairComparison from './PairComparison'
import PdfPreview from './PdfPreview'
import PlotFrame from './PlotFrame'
import OutputFiles from './OutputFiles'
import { isAdvancedOutput } from '../outputFiles'
import { Download, ArrowRight, Maximize, FolderOpen, Info } from 'lucide-react'

import {useLimits} from '../limits'

function ResultNotice({title, label, children}: {title: string; label?: string; children: ReactNode}) {
  return <section className="result-notice" aria-label={label || title}>
    <Info aria-hidden="true"/><div><h2>{title}</h2>{children}</div>
  </section>
}

function Chart({text, filename, metric, dark, job}: {text: string; filename: string; metric: string; dark: boolean; job: Job}) {
  const limits = useLimits()
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [threshold, setThreshold] = useState('')
  const [layout, setLayout] = useState('cose')
  const [labels, setLabels] = useState(false)
  const [details, setDetails] = useState('')
  const [counts, setCounts] = useState('')
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [legendOverride, setLegendOverride] = useState<boolean>()
  const showLegend = legendOverride ?? cohorts.length <= 12
  const cohortKey = JSON.stringify([job.id, job.fingerprints, job.options['append-prefixes'], job.result?.artifacts])
  const graphView = useRef<ReturnType<(typeof import('cytoscape'))['default']> | null>(null)
  const projection = /^(mds|umap)\.json$/.test(filename)
  const method = filename === 'umap.json' ? 'UMAP' : 'MDS'
  const graph = filename.endsWith('.json') && !projection
  useEffect(() => {
    let stale = false
    let dispose = () => {}
    setError('')
    setNote('')
    const element = host.current!
    async function render() {
      let membership = new Map<string, Cohort>()
      const sidecar = job.result?.artifacts.find(item => item.filename === 'collection-labels.json')
      if ((graph || projection) && sidecar && sidecar.bytes <= 8 * 1024 * 1024) {
        const metadata = JSON.parse(await (await api.download(job.id, sidecar.id)).text())
        if (metadata.format === 'pheno-ranker-phenopacket-store' && metadata.membership && Object.values(metadata.membership).every(value => typeof value === 'string')) {
          membership = collectionCohorts(metadata.membership)
        }
        if (stale) return
      }
      const cohortFor = (id: string) => membership.get(id) || recordCohort(id, job)
      if (graph) {
        const value = JSON.parse(text)
        if (!value.elements?.nodes || !value.elements?.edges) throw new Error('Not a Cytoscape graph')
        const nodes = (value.elements.nodes as GraphElement[]).map(node => ({...node, data: {...node.data, cohortColor: cohortFor(String(node.data.id)).color}}))
        setCohorts([...new Map(nodes.map(node => {const cohort = cohortFor(String(node.data.id)); return [cohort.key, cohort]})).values()])
        const edges = filterEdges(styleGraphEdges(value.elements.edges, metric, dark), metric, threshold === '' ? undefined : Number(threshold))
        if (nodes.length > limits.graphNodes || edges.length > limits.graphEdges) {setNote(`This graph exceeds the configured preview limit of ${limits.graphNodes.toLocaleString()} nodes or ${limits.graphEdges.toLocaleString()} edges. Adjust these limits in Settings or save the full graph.`); return}
        const {default: cytoscape} = await import('cytoscape')
        if (stale) return
        setCounts(`${nodes.length} records · ${edges.length} of ${value.elements.edges.length} exported edges`)
        setDetails('Select a record or edge to inspect it.')
        const view = cytoscape({container: element, elements: [...nodes, ...edges], layout: {name: layout, animate: false, fit: true, padding: 28, nodeRepulsion: 5000, idealEdgeLength: 70, edgeElasticity: 80},
          boxSelectionEnabled: true, selectionType: 'additive',
          style: [{selector: 'node', style: {'background-color': 'data(cohortColor)', label: labels ? 'data(id)' : '', color: dark ? '#e1e5ec' : '#203650', 'font-size': 10,
              width: 18, height: 18, 'border-width': 1.5, 'border-color': dark ? '#272b32' : '#fff', 'text-wrap': 'wrap', 'text-max-width': 96, 'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 8}},
            {selector: 'edge', style: {'line-color': 'data(edgeColor)', width: 'data(edgeWidth)', opacity: 'data(edgeOpacity)', 'curve-style': 'bezier', 'font-size': 9, color: dark ? '#e1e5ec' : '#203650', 'text-background-color': dark ? '#272b32' : '#fff', 'text-background-opacity': .9, 'text-background-padding': 2, 'text-rotation': 'autorotate', 'text-margin-y': -4}},
            {selector: 'node:selected', style: {label: 'data(id)', 'border-color': '#c98538', 'border-width': 3, 'overlay-color': '#fca5a5', 'overlay-opacity': .12}},
            {selector: 'edge:selected', style: {label: 'data(weight)', 'line-color': dark ? '#5eead4' : '#0f766e', opacity: .95, 'overlay-color': '#99f6e4', 'overlay-opacity': .18}}]})
        graphView.current = view
        view.on('tap', 'node, edge', event => {
          const data = event.target.data()
          setDetails(data.source !== undefined ? `${data.source} ↔ ${data.target}: ${metric === 'jaccard' ? 'similarity' : 'distance'} ${data.weight}` : String(data.id))
        })
        const resize = new ResizeObserver(() => view.resize())
        resize.observe(element)
        dispose = () => {resize.disconnect(); view.destroy(); graphView.current = null}
      } else {
        let data: unknown[]
        let title: string
        if (projection) {
          const value = JSON.parse(text)
          if (value.skipped) {setNote(value.message || `${method} was omitted for this cohort size. Matrix results remain available.`); return}
          const groups = new Map<string, {cohort: Cohort; points: {id: string; x: number; y: number}[]}>()
          for (const point of value.points) {
            const cohort = cohortFor(point.id)
            if (!groups.has(cohort.key)) groups.set(cohort.key, {cohort, points: []})
            groups.get(cohort.key)!.points.push(point)
          }
          setCohorts([...groups.values()].map(group => group.cohort))
          data = [...groups.values()].map(({cohort, points}) => ({type: 'scatter', name: cohort.label, mode: labels ? 'markers+text' : 'markers', textposition: 'top center', x: points.map(p => p.x), y: points.map(p => p.y),
            text: points.map(p => p.id), hovertemplate: '%{text}<extra>%{fullData.name}</extra>', marker: {color: cohort.color, size: 9}}))
          title = `${method} (2D projection)`
        } else {
          if ((text.split('\n', 1)[0].split('\t').length - 1) > limits.heatmapRecords) {setNote(`This matrix exceeds the configured heatmap limit of ${limits.heatmapRecords.toLocaleString()} records. Adjust it in Settings or save the full matrix.`); return}
          const matrix = parseMatrix(text, limits.heatmapRecords)
          data = [{type: 'heatmap', x: matrix.labels, y: matrix.labels, z: matrix.values, colorscale: 'Viridis',
            hovertemplate: '%{x}<br>%{y}<br>%{z}<extra></extra>'}]
          title = metric === 'jaccard' ? 'Jaccard similarity (higher is closer)' : 'Hamming distance (lower is closer)'
        }
        const {default: Plotly} = await import('plotly.js-dist-min')
        if (stale) return
        const resize = new ResizeObserver(() => {void Plotly.Plots.resize(element)})
        dispose = () => {resize.disconnect(); Plotly.purge(element)}
        await Plotly.newPlot(element, data, {title, showlegend: false, autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          ...(projection ? {xaxis: {title: `${method} 1`, zeroline: false}, yaxis: {title: `${method} 2`, scaleanchor: 'x', scaleratio: 1, zeroline: false}} : {}),
          font: {color: dark ? '#e1e5ec' : '#203650'}, margin: {t: 55, l: 80, r: 30, b: 90}},
        {responsive: true, displaylogo: false})
        if (stale) dispose()
        else resize.observe(element)
      }
    }
    void render().catch(reason => {if (!stale) setError(String(reason))})
    return () => {stale = true; dispose()}
  }, [text, filename, metric, threshold, dark, graph, layout, labels, cohortKey, limits])
  return <>{note && <ResultNotice title="Interactive preview omitted"><p>{note}</p></ResultNotice>}{graph && <div className="result-actions"><label>{metric === 'jaccard' ? 'Minimum similarity' : 'Maximum distance'}
    <input type="number" min="0" max={metric === 'jaccard' ? 1 : undefined} step="any" value={threshold} onChange={event => setThreshold(event.target.value)} /></label>
    <label>Layout <select value={layout} onChange={event => setLayout(event.target.value)}><option value="cose">Force-directed</option><option value="circle">Circle</option><option value="grid">Grid</option></select></label>
    <button title="Fit network" aria-label="Fit network" onClick={() => graphView.current?.fit()}><Maximize/></button><span>{counts}</span></div>}
    {!note && (graph || projection) && <div className="result-actions"><label><input type="checkbox" checked={labels} onChange={event => setLabels(event.target.checked)}/>Show record labels</label></div>}
    {!note && cohorts.length > 0 && <div className="result-actions"><label><input type="checkbox" checked={showLegend} onChange={event => setLegendOverride(event.target.checked)}/>Show legend</label><span>{cohorts.length} groups; names remain available on hover.</span></div>}
    {!note && showLegend && cohorts.length > 0 && <div className="entity-legend plot-legend" aria-label="Source cohorts">{cohorts.map(cohort => <span key={cohort.key}><i style={{backgroundColor: cohort.color}}/>{cohort.label}</span>)}</div>}
    {!note && (graph ? <p className="alignment-note" role="status">{details} Filters apply only to exported edges.</p> : projection && <p className="alignment-note">{method === 'UMAP' ? 'UMAP emphasizes local neighborhoods. Distances between clusters and their sizes do not directly represent the original distances.' : 'MDS projects pairwise distances into two dimensions. Nearby points represent more similar records, but the projection may distort distances.'} {metric === 'jaccard' ? 'Jaccard similarity is converted to distance as 1 − similarity.' : 'Distances use the exported Hamming values.'} Hover for record IDs; use the plot toolbar to zoom or save an image.</p>)}
    {error && <p role="alert">{error}</p>}<div className="result-chart" hidden={!!note} ref={host} aria-label={graph ? 'Comparison graph' : projection ? `${method} plot` : 'Distance or similarity heatmap'} /></>
}

export default function Results({job, sourceJob, onReuse, onSave, onOpenFolder}: {job: Job; sourceJob?: Job; onReuse: (artifact: OutputFile) => Promise<void>; onSave: (artifact: OutputFile) => Promise<void>; onOpenFolder?: () => Promise<void>}) {
  const limits = useLimits()
  const previewLimit = limits.previewMiB * 1024 * 1024
  const artifacts = job.result?.artifacts || []
  const largeMatrix = job.conversion === 'cohort' ? artifacts.find(item => /^matrix\.(txt|mtx)$/.test(item.filename) && item.bytes > previewLimit) : undefined
  const [selection, setSelection] = useState('')
  const [pair, setPair] = useState<{reference: string; target: string}>()
  const [cohortView, setCohortView] = useState(() => largeMatrix ? 'summary' : job.conversion === 'cohort' && artifacts.some(item => item.filename === 'matrix.txt') ? 'heatmap' : 'files')
  const visualFiles: Record<string, string> = {mds: 'mds.json', umap: 'umap.json', network: 'graph.json', heatmap: 'matrix.txt'}
  const visual = job.conversion === 'cohort' && cohortView !== 'files'
  const artifact = visual ? artifacts.find(item => item.filename === visualFiles[cohortView]) : artifacts.find(item => item.id === selection) || artifacts.find(item => /^(rank|matrix)\./.test(item.filename)) || artifacts.find(item => item.filename === 'simulated.json') || artifacts.find(item => !isAdvancedOutput(item))
  const [text, setText] = useState('')
  const [image, setImage] = useState('')
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState(job.conversion === 'projection' ? 'plot' : 'table')
  const [query, setQuery] = useState('')
  const [differencesOnly, setDifferencesOnly] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const [sort, setSort] = useState<{column: number; reverse: boolean}>()
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.dataset.theme === 'dark'))
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']})
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!artifact) return
    let current = true; let url = ''
    setText(''); setImage(''); setReport(''); setError(''); setLoading(true); setSort(undefined); setQuery(''); setDifferencesOnly(false)
    if (artifact.bytes > previewLimit) {
      setLoading(false); return
    }
    if (artifact.kind === 'pdf') {setLoading(false); return}
    api.download(job.id, artifact.id).then(async blob => {
      if (!current) return
      if (artifact.kind === 'png') {url = URL.createObjectURL(blob); setImage(url)}
      else if (artifact.kind === 'html') {url = URL.createObjectURL(blob); setReport(url)}
      else if (artifact.kind !== 'pdf') {const value = await blob.text(); if (current) setText(value)}
      if (current) setLoading(false)
    }).catch(reason => {if (current) {setError(String(reason)); setLoading(false)}})
    return () => {current = false; if (url) URL.revokeObjectURL(url)}
  }, [job.id, artifact?.id, previewLimit])
  const tabular = artifact && (/\.(csv|tsv)$/.test(artifact.filename) || /^(rank|matrix)\.txt$/.test(artifact.filename))
  let table: ReturnType<typeof parseTable> | undefined
  let parseError = ''
  if (text && tabular && !visual && view !== 'plot') {try {table = artifact.filename === 'matrix.txt' ? parseMatrixTable(text, limits.matrixRows, limits.matrixColumns) : parseTable(text, artifact.filename)} catch (reason) {parseError = String(reason)}}
  const distanceColumn = table?.headers.findIndex(header => header.toLowerCase() === 'hamming-distance') ?? -1
  const filtered = table ? filterResultRows(table.rows, deferredQuery, distanceColumn, differencesOnly) : []
  if (sort) filtered.sort((a, b) => compareCells(a[sort.column] || '', b[sort.column] || '') * (sort.reverse ? -1 : 1))
  const plotted = artifact && (artifact.filename === 'matrix.txt' || /^(mds|umap)\.json$/.test(artifact.filename) || (artifact.kind === 'json' && text.includes('"elements"')))
  const referenceColumn = table?.headers.indexOf('REFERENCE(ID)') ?? -1
  const targetColumn = table?.headers.indexOf('TARGET(ID)') ?? -1
  if (pair) return <PairComparison key={`${pair.reference}:${pair.target}`} job={job} {...pair} onClose={() => setPair(undefined)}/>
  return <>{job.conversion === 'cohort' && <nav className="cohort-views" aria-label="Cohort result views">{[...(largeMatrix ? [['summary', 'Summary']] : []), ['files', 'Output files'], ['mds', 'MDS'], ...(artifacts.some(item => item.filename === 'umap.json') ? [['umap', 'UMAP']] : []), ['network', 'Network'], ['heatmap', 'Heatmap']].map(([id, title]) => <button key={id} aria-pressed={cohortView === id} onClick={() => setCohortView(id)}>{title}</button>)}</nav>}
    {cohortView === 'summary' && largeMatrix ? <ResultNotice title="Analysis complete" label="Completed analysis summary">
      <p>Your full matrix is saved. It exceeds the preview limit, but you can save a copy or browse the other outputs.</p>
      <p className="result-notice-meta">{largeMatrix.filename} · {(largeMatrix.bytes / 1024 / 1024).toFixed(1)} MiB · {artifacts.length} output files</p>
      <div className="result-actions"><button onClick={() => void onSave(largeMatrix)}><Download/>Save matrix as...</button>
        {onOpenFolder && <button onClick={() => void onOpenFolder()}><FolderOpen/>Open output folder</button>}
        <button onClick={() => setCohortView('files')}>Browse output files</button></div>
    </ResultNotice> : visual && !artifact ? <ResultNotice title={cohortView === 'network' ? 'No graph exported' : cohortView === 'mds' ? 'No MDS coordinates generated' : 'No dense matrix available'}><p>{cohortView === 'network' ? job.safety?.skipGraph ? 'Optional graph export was omitted using the calculation limits recorded for this run. Adjust the graph export limit in Settings for new runs. Matrix results remain complete.' : 'Enable Export graph in cohort run settings, then run the analysis again. Use minimum or maximum edge weights to limit large graphs.' : cohortView === 'mds' ? `MDS uses a limit of ${limits.mdsRecords.toLocaleString()} records, configurable in Settings. Use Add projection with a saved dense matrix.` : 'The heatmap requires dense matrix format. Matrix Market output remains available under Output files.'}</p></ResultNotice> : <div className="output-workspace">
    {!visual && <OutputFiles artifacts={artifacts} selected={artifact?.id} onSelect={id => {setSelection(id); setView('table')}}/>}
    {!visual && !artifact && <p className="muted">{artifacts.length ? 'Open Advanced files to inspect supporting outputs.' : 'No output files are available.'}</p>}
    <div className="output-preview">{artifact && <>
      <div className="result-actions"><strong>{artifact.filename}</strong><button onClick={() => void onSave(artifact)}><Download/>Save as...</button>
        <button onClick={() => void onReuse(artifact)}><ArrowRight/>Use as input</button>
        {plotted && !visual && artifact.bytes <= previewLimit && <button aria-pressed={view === 'plot'} onClick={() => setView(view === 'plot' ? 'table' : 'plot')}>{view === 'plot' ? 'Show data' : 'Show plot'}</button>}
      </div>
      {artifact.bytes > previewLimit && <ResultNotice title="Output saved; preview unavailable"><p>This file exceeds the {limits.previewMiB} MiB preview limit. Adjust it in Settings or use Save as to open the full output externally.</p><p className="result-notice-meta">{artifact.filename} · {(artifact.bytes / 1024 / 1024).toFixed(1)} MiB</p>{onOpenFolder && <button onClick={() => void onOpenFolder()}><FolderOpen/>Open output folder</button>}</ResultNotice>}
      {loading && <p role="status">Loading output...</p>}
      {(error || parseError) && <p role="alert">{error || parseError}</p>}
      {image && <img className="result-image" src={image} alt="Phenotype summary or QR output" />}
      {report && <PlotFrame key={`${job.id}:${artifact.id}`} title="Phenotype summary report"><iframe className="result-report" src={report} sandbox={job.conversion === 'summary' ? 'allow-scripts' : ''} title="Phenotype summary report" /></PlotFrame>}
      {artifact.kind === 'pdf' && artifact.bytes <= previewLimit && <PdfPreview key={`${job.id}:${artifact.id}`} jobId={job.id} artifactId={artifact.id} filename={artifact.filename}/>}
      {text && (visual || view === 'plot') && plotted ? <PlotFrame key={`${job.id}:${artifact.id}`} title={artifact.filename === 'umap.json' ? 'UMAP' : artifact.filename === 'mds.json' ? 'MDS' : artifact.filename === 'matrix.txt' ? 'Heatmap' : 'Network'}><Chart text={text} filename={artifact.filename} metric={String(job.options.metric || job.options['similarity-metric-cohort'] || 'hamming')} dark={dark} job={sourceJob || job} /></PlotFrame>
        : table ? <>{distanceColumn >= 0 && <p className="alignment-note">Each row records a term's reference and target values, configured weight, and exact contribution to Hamming distance.</p>}
          <div className="result-actions"><span>{artifact.filename === 'matrix.txt' ? `Preview of the first ${limits.matrixRows} rows and ${limits.matrixColumns} data columns. Filtering and sorting apply only to this preview; full output is retained.` : `${filtered.length} rows; showing up to ${limits.tableRows}. Full output is retained.`}</span>
          {distanceColumn >= 0 && <label><input type="checkbox" checked={differencesOnly} onChange={event => setDifferencesOnly(event.target.checked)} /> Differences only</label>}
          <input aria-label="Filter output rows" placeholder="Filter records or terms" value={query} onChange={event => setQuery(event.target.value)} /></div>
          <div className="data-scroll"><table className="result-table"><thead><tr>{table.headers.map((header, index) => <th key={index}><button onClick={() => setSort({column: index, reverse: sort?.column === index && !sort.reverse})}>{header}{sort?.column === index ? sort.reverse ? ' (descending)' : ' (ascending)' : ''}</button></th>)}</tr></thead>
          <tbody>{filtered.slice(0, artifact.filename === 'matrix.txt' ? limits.matrixRows : limits.tableRows).map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{job.conversion === 'patient' && cell === referenceColumn && targetColumn >= 0 ? <button className="pair-link" title="Inspect this pair by entity" onClick={() => setPair({reference: value, target: row[targetColumn]})}>{value}</button> : value}</td>)}</tr>)}</tbody></table></div></>
        : text && <pre>{text.slice(0, 262144)}{text.length > 262144 ? '\n[Text preview limited to 256 KiB]' : ''}</pre>}
    </>}</div>
  </div>}</>
}
