import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import type { Job } from '../types'
import RunHistory, { groupRuns } from './RunHistory'

const job = (id: string, created: Date, status: Job['status'] = 'completed'): Job => ({
  id, created: +created / 1000, status, conversion: 'cohort', sources: [], options: {},
})
const renderRun = (run: Job) => <button key={run.id}>{run.id}</button>
beforeEach(() => localStorage.clear())

it('groups by local calendar days and keeps all active statuses first', () => {
  const now = new Date(2026, 9, 8, 12)
  const groups = groupRuns([
    job('older', new Date(2026, 8, 30)), job('week', new Date(2026, 9, 1)),
    job('yesterday', new Date(2026, 9, 7, 23, 59)), job('today', new Date(2026, 9, 8)),
    job('newest', now), ...(['running', 'queued', 'cancelling'] as const).map(status => job(status, new Date(2020, 0, 1), status)),
  ], now)
  expect(groups.map(group => group.map(run => run.id))).toEqual([
    ['cancelling', 'queued', 'running'], ['newest', 'today'], ['yesterday'], ['week'], ['older'],
  ])
})

it('folds older history, reveals search matches, and remembers explicit choices', () => {
  const runs = [job('old result', new Date(2020, 0, 1))]
  const view = render(<RunHistory runs={runs} selected="" searching={false} finishedCount={11}>{renderRun}</RunHistory>)
  expect(screen.queryByRole('button', {name: 'old result'})).not.toBeInTheDocument()
  view.rerender(<RunHistory runs={runs} selected="" searching finishedCount={11}>{renderRun}</RunHistory>)
  expect(screen.getByRole('button', {name: 'old result'})).toBeVisible()
  view.rerender(<RunHistory runs={runs} selected="" searching={false} finishedCount={11}>{renderRun}</RunHistory>)
  expect(screen.queryByRole('button', {name: 'old result'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: /Older/}))
  expect(screen.getByRole('button', {name: 'old result'})).toBeVisible()
  view.unmount()
  render(<RunHistory runs={runs} selected="" searching={false} finishedCount={11}>{renderRun}</RunHistory>)
  expect(screen.getByRole('button', {name: 'old result'})).toBeVisible()
})

it('keeps the selected job visible when it moves from active to older history', () => {
  const run = job('long job', new Date(2020, 0, 1), 'running')
  const view = render(<RunHistory runs={[run]} selected={run.id} searching={false} finishedCount={11}>{renderRun}</RunHistory>)
  expect(screen.getByRole('region', {name: 'Active runs'})).toBeVisible()
  view.rerender(<RunHistory runs={[{...run, status: 'completed'}]} selected={run.id} searching={false} finishedCount={12}>{renderRun}</RunHistory>)
  expect(screen.queryByRole('region', {name: 'Active runs'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'long job'})).toBeVisible()
})

it('does not automatically fold a group already being browsed when history grows', () => {
  const runs = [job('old result', new Date(2020, 0, 1))]
  const view = render(<RunHistory runs={runs} selected="" searching={false} finishedCount={10}>{renderRun}</RunHistory>)
  view.rerender(<RunHistory runs={runs} selected="" searching={false} finishedCount={11}>{renderRun}</RunHistory>)
  expect(screen.getByRole('button', {name: 'old result'})).toBeVisible()
})
