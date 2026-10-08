import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import * as api from '../api'
import {useLimits} from '../limits'

const workerUrl = new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href

export default function PdfPreview({jobId, artifactId, filename}: {jobId: string; artifactId: string; filename: string}) {
  const {previewMiB} = useLimits()
  const host = useRef<HTMLDivElement>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const [document, setDocument] = useState<PDFDocumentProxy>()
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState('fit')
  const [width, setWidth] = useState(700)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let stale = false
    let task: PDFDocumentLoadingTask | undefined
    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
        const blob = await api.download(jobId, artifactId)
        if (blob.size > previewMiB * 1024 * 1024) throw new Error(`PDF exceeds the ${previewMiB} MiB preview limit. Adjust it in Settings.`)
        const data = new Uint8Array(await blob.arrayBuffer())
        if (stale) return
        task = pdfjs.getDocument({data, isEvalSupported: false, useSystemFonts: true})
        const pdf = await task.promise
        if (!stale) {setDocument(pdf); setLoading(false)}
      } catch (reason) {
        if (!stale) {setError(String(reason)); setLoading(false)}
      }
    }
    void load()
    return () => {stale = true; void task?.destroy().catch(() => {})}
  }, [jobId, artifactId, previewMiB])

  useEffect(() => {
    const element = host.current!
    const resize = () => setWidth(Math.max(200, element.clientWidth - 32))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!document) return
    let stale = false
    let task: RenderTask | undefined
    const container = canvasHost.current!
    // A fresh canvas avoids racing cancelled renders when navigating quickly.
    const canvas = window.document.createElement('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', `${filename}, page ${page} of ${document.numPages}`)
    container.replaceChildren(canvas)
    setRendering(true); setError('')
    async function render() {
      try {
        const pdfPage = await document!.getPage(page)
        if (stale) return
        const base = pdfPage.getViewport({scale: 1})
        const scale = zoom === 'fit' ? width / base.width : Number(zoom)
        const viewport = pdfPage.getViewport({scale})
        // Bound raster memory for unusually large pages and high-DPI screens.
        const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(16_000_000 / (viewport.width * viewport.height)))
        canvas.width = Math.max(1, Math.floor(viewport.width * ratio))
        canvas.height = Math.max(1, Math.floor(viewport.height * ratio))
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        task = pdfPage.render({canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]})
        await task.promise
        if (!stale) setRendering(false)
      } catch (reason) {
        if (!stale) {setError(String(reason)); setRendering(false)}
      }
    }
    void render()
    return () => {stale = true; task?.cancel(); canvas.remove()}
  }, [document, page, zoom, width, filename])

  return <section className="pdf-preview" aria-label="PDF preview" ref={host}>
    {document && <div className="result-actions" role="group" aria-label="PDF controls">
      <button title="Previous page" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft/></button>
      <span aria-live="polite">Page {page} of {document.numPages}</span>
      <button title="Next page" aria-label="Next page" disabled={page >= document.numPages} onClick={() => setPage(value => value + 1)}><ChevronRight/></button>
      <label>Zoom <select value={zoom} onChange={event => setZoom(event.target.value)}>
        <option value="fit">Fit width</option>{[.5, .75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value * 100}%</option>)}
      </select></label>
    </div>}
    {(loading || rendering) && <p role="status">{loading ? 'Loading PDF...' : 'Rendering page...'}</p>}
    {error && <p role="alert">PDF preview unavailable: {error} Use Save as to open it in your PDF reader.</p>}
    <div className="pdf-page-scroll"><div ref={canvasHost}/></div>
  </section>
}
