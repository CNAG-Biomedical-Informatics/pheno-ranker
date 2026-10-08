import {afterEach, expect, it, vi} from 'vitest'
import {request} from './api'

vi.mock('./desktop', () => ({connection: async () => ({url: 'http://127.0.0.1:1234', token: 'test'})}))
afterEach(() => vi.unstubAllGlobals())

it('explains a missing endpoint instead of exposing an HTML JSON parsing error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Not found</html>', {status: 404})))
  await expect(request('/api/jobs/example/log')).rejects.toThrow('Restart Pheno-Ranker')
})

it('reports other malformed engine responses and retains structured errors', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('Server error', {status: 500}))
    .mockResolvedValueOnce(new Response(JSON.stringify({ok: false, error: {message: 'Unknown run'}}), {status: 404}))
    .mockResolvedValueOnce(new Response(JSON.stringify({ok: true, data: {text: 'Ready'}})))
  vi.stubGlobal('fetch', fetch)
  await expect(request('/api/jobs/example/log')).rejects.toThrow('invalid response (HTTP 500)')
  await expect(request('/api/jobs/example/log')).rejects.toThrow('Unknown run')
  await expect(request('/api/jobs/example/log')).resolves.toEqual({text: 'Ready'})
})
