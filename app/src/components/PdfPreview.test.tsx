import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import PdfPreview from './PdfPreview'
import * as api from '../api'

const pdf = vi.hoisted(() => ({
  getDocument: vi.fn(), getPage: vi.fn(), render: vi.fn(), destroy: vi.fn(), cancel: vi.fn(),
}))
vi.mock('../api', () => ({download: vi.fn()}))
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({GlobalWorkerOptions: {}, getDocument: pdf.getDocument}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', class {observe() {} disconnect() {}})
  vi.mocked(api.download).mockResolvedValue({size: 100, arrayBuffer: async () => new ArrayBuffer(100)} as Blob)
  pdf.destroy.mockResolvedValue(undefined)
  pdf.getDocument.mockReturnValue({promise: Promise.resolve({numPages: 2, getPage: pdf.getPage}), destroy: pdf.destroy})
  pdf.render.mockImplementation(() => ({promise: Promise.resolve(), cancel: pdf.cancel}))
  pdf.getPage.mockResolvedValue({getViewport: ({scale}: {scale: number}) => ({width: 600 * scale, height: 800 * scale}), render: pdf.render})
})

it('renders locally, navigates pages, zooms, and releases the document', async () => {
  const {unmount} = render(<PdfPreview jobId="run" artifactId="pdf" filename="report.pdf"/>)
  await waitFor(() => expect(pdf.render).toHaveBeenCalled())
  expect(api.download).toHaveBeenCalledWith('run', 'pdf')
  expect(pdf.getDocument).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Uint8Array), isEvalSupported: false}))
  expect(screen.getByRole('button', {name: 'Previous page'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: 'Next page'}))
  await waitFor(() => expect(pdf.getPage).toHaveBeenLastCalledWith(2))
  expect(screen.getByRole('img', {name: 'report.pdf, page 2 of 2'})).toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Next page'})).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Zoom'), {target: {value: '1.5'}})
  await waitFor(() => expect(pdf.render).toHaveBeenLastCalledWith(expect.objectContaining({viewport: {width: 900, height: 1200}})))
  fireEvent.click(screen.getByRole('button', {name: 'Previous page'}))
  await waitFor(() => expect(pdf.getPage).toHaveBeenLastCalledWith(1))
  unmount()
  expect(pdf.destroy).toHaveBeenCalledOnce()
  expect(pdf.cancel).toHaveBeenCalled()
})

it('explains invalid PDFs without removing the save fallback', async () => {
  pdf.getDocument.mockReturnValue({promise: Promise.reject(new Error('Invalid PDF')), destroy: pdf.destroy})
  render(<PdfPreview jobId="run" artifactId="bad" filename="bad.pdf"/>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid PDF')
  expect(screen.getByRole('alert')).toHaveTextContent('Use Save as')
})

it('enforces the byte limit before parsing a PDF', async () => {
  vi.mocked(api.download).mockResolvedValue({size: 33 * 1024 * 1024} as Blob)
  render(<PdfPreview jobId="run" artifactId="large" filename="large.pdf"/>)
  expect(await screen.findByRole('alert')).toHaveTextContent('32 MiB')
  expect(pdf.getDocument).not.toHaveBeenCalled()
})

it('does not start rendering after the preview has been closed', async () => {
  let complete!: (value: unknown) => void
  pdf.getDocument.mockReturnValue({promise: new Promise(resolve => {complete = resolve}), destroy: pdf.destroy})
  const {unmount} = render(<PdfPreview jobId="run" artifactId="pdf" filename="report.pdf"/>)
  await waitFor(() => expect(pdf.getDocument).toHaveBeenCalled())
  unmount()
  complete({numPages: 2, getPage: pdf.getPage})
  await Promise.resolve()
  expect(pdf.getPage).not.toHaveBeenCalled()
  expect(pdf.destroy).toHaveBeenCalledOnce()
})
