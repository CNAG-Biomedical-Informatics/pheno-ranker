import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, expect, it, vi} from 'vitest'
import QrString from './QrString'
import * as api from '../api'
vi.mock('../api', () => ({download: vi.fn()}))
beforeEach(() => vi.clearAllMocks())
it('preserves expansion across records while replacing the payload', async () => {
  const artifact = {id: 'one', filename: 'qr/one.payload.txt', bytes: 20, kind: 'txt', mediaType: 'text/plain'}
  vi.mocked(api.download).mockImplementation(async (_, id) => ({text: async () => `payload-${id}`} as Blob))
  const {rerender} = render(<QrString jobId="run" artifact={artifact}/>)
  fireEvent.click(screen.getByText('Show QR string'))
  expect(await screen.findByRole('textbox', {name: 'QR string'})).toHaveValue('payload-one')
  rerender(<QrString jobId="run" artifact={{...artifact, id: 'two'}}/>)
  expect(screen.getByText('Show QR string').closest('details')).toHaveAttribute('open')
  expect(screen.queryByDisplayValue('payload-one')).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('textbox', {name: 'QR string'})).toHaveValue('payload-two'))
  fireEvent.click(screen.getByText('Show QR string'))
  await waitFor(() => expect(screen.getByText('Show QR string').closest('details')).not.toHaveAttribute('open'))
  rerender(<QrString jobId="run" artifact={{...artifact, id: 'three'}}/>)
  expect(screen.getByText('Show QR string').closest('details')).not.toHaveAttribute('open')
  expect(api.download).not.toHaveBeenCalledWith('run', 'three')
})
it('loads the exact payload only when expanded', async () => {
  vi.mocked(api.download).mockResolvedValue({text: async () => 'encoded-payload=='} as Blob)
  render(<QrString jobId="run" artifact={{id: 'payload', filename: 'qr/a.payload.txt', bytes: 20, kind: 'txt', mediaType: 'text/plain'}}/>)
  expect(api.download).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Show QR string'))
  expect(await screen.findByRole('textbox', {name: 'QR string'})).toHaveValue('encoded-payload==')
  expect(api.download).toHaveBeenCalledWith('run', 'payload')
})
it('explains missing payloads without reconstructing a string', () => {
  render(<QrString jobId="old-run"/>)
  fireEvent.click(screen.getByText('Show QR string'))
  expect(screen.getByText(/older run did not retain/)).toBeVisible()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

it('shows uncompressed encoding separately without the marker in the string', async () => {
  vi.mocked(api.download).mockResolvedValue({text: async () => 'UNCOMP:00101'} as Blob)
  render(<QrString jobId="run" artifact={{id: 'payload', filename: 'qr/a.payload.txt', bytes: 12, kind: 'txt', mediaType: 'text/plain'}}/>)
  fireEvent.click(screen.getByText('Show QR string'))
  expect(await screen.findByRole('textbox', {name: 'QR string'})).toHaveValue('00101')
  expect(screen.getByText('Uncompressed')).toBeInTheDocument()
  expect(screen.getByText(/5 characters/)).toBeInTheDocument()
})

it('shows the actual version from metadata rather than the requested minimum', async () => {
  vi.mocked(api.download).mockImplementation(async (_, id) => ({text: async () => id === 'meta' ? '{"version":7}' : 'UNCOMP:01'} as Blob))
  const artifact = {id: 'payload', filename: 'qr/a.payload.txt', bytes: 20, kind: 'txt', mediaType: 'text/plain'}
  render(<QrString jobId="run" artifact={artifact} metadata={{...artifact, id: 'meta'}}/>)
  fireEvent.click(screen.getByText('Show QR string'))
  expect(await screen.findByText(/QR version 7 \(45 × 45 modules\)/)).toBeInTheDocument()
})
