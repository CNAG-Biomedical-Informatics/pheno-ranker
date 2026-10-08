import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, expect, it, vi} from 'vitest'
import {runLog} from '../api'
import RunLog from './RunLog'
import type {Job} from '../types'

vi.mock('../api', () => ({runLog: vi.fn()}))
const job: Job = {id: 'one', conversion: 'cohort', status: 'running', created: 1, sources: [], options: {}}
beforeEach(() => {localStorage.clear(); vi.mocked(runLog).mockReset()})

it('loads only when expanded and remembers the choice across updates and mounts', async () => {
  vi.mocked(runLog).mockResolvedValue({text: 'Reading inputs', truncated: false})
  const view = render(<RunLog job={job}/>)
  expect(runLog).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Detailed log'))
  await screen.findByText('Reading inputs')
  view.rerender(<RunLog job={{...job, status: 'completed'}}/>)
  expect(screen.getByLabelText('Run log')).toBeInTheDocument()
  expect(localStorage.getItem('ranker-log-open')).toBe('true')
  view.unmount()
  render(<RunLog job={{...job, status: 'completed'}}/>)
  expect(await screen.findByText('Reading inputs')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Detailed log'))
  await waitFor(() => expect(localStorage.getItem('ranker-log-open')).toBe('false'))
})

it('does not scroll away from earlier lines when more output arrives', async () => {
  localStorage.setItem('ranker-log-open', 'true')
  vi.mocked(runLog).mockResolvedValue({text: 'First lines', truncated: false})
  const view = render(<RunLog job={job}/>)
  await screen.findByText('First lines')
  const viewport = screen.getByLabelText('Run log')
  Object.defineProperties(viewport, {scrollHeight: {value: 1000}, clientHeight: {value: 200}})
  viewport.scrollTop = 100
  fireEvent.scroll(viewport)
  vi.mocked(runLog).mockResolvedValue({text: 'More lines', truncated: true})
  view.rerender(<RunLog job={{...job, status: 'completed'}}/>)
  await screen.findByText('More lines')
  expect(viewport.scrollTop).toBe(100)
  expect(screen.getByText(/latest 64 KiB/)).toBeInTheDocument()
})

it('ignores responses after closing the log', async () => {
  localStorage.setItem('ranker-log-open', 'true')
  let resolve!: (value: {text: string; truncated: boolean}) => void
  vi.mocked(runLog).mockReturnValue(new Promise(done => {resolve = done}))
  render(<RunLog job={job}/>)
  fireEvent.click(screen.getByText('Detailed log'))
  await waitFor(() => expect(screen.queryByLabelText('Run log')).not.toBeInTheDocument())
  await act(async () => resolve({text: 'Late output', truncated: false}))
  expect(screen.queryByText('Late output')).not.toBeInTheDocument()
})
