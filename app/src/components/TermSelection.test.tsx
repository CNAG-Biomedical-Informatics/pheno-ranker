import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import TermSelection from './TermSelection'
import * as api from '../api'
vi.mock('../api', () => ({request: vi.fn()}))
beforeEach(() => vi.mocked(api.request).mockResolvedValue({allowed: ['diseases', 'phenotypicFeatures', 'custom'], present: ['diseases'], note: ''}))
function Form() {
  const [values, onChange] = useState<Record<string, unknown>>({})
  return <><TermSelection files={{}} values={values} onChange={onChange}/><output data-testid="terms">{JSON.stringify(values)}</output></>
}
it('adds and removes chips and never submits include and exclude together', async () => {
  render(<Form/>)
  fireEvent.change(screen.getByLabelText('Selection mode'), {target: {value: 'include'}})
  fireEvent.click(await screen.findByRole('button', {name: 'diseases +'}))
  expect(JSON.parse(screen.getByTestId('terms').textContent!)).toEqual({'include-terms': ['diseases'], 'exclude-terms': []})
  fireEvent.change(screen.getByLabelText('Selection mode'), {target: {value: 'exclude'}})
  expect(JSON.parse(screen.getByTestId('terms').textContent!)).toEqual({'include-terms': [], 'exclude-terms': ['diseases']})
  fireEvent.click(screen.getByRole('button', {name: 'diseases ×'}))
  expect(screen.getByText(/All terms are included/)).toBeInTheDocument()
})
it('offers other configured terms and supports custom entries', async () => {
  render(<Form/>)
  fireEvent.change(screen.getByLabelText('Selection mode'), {target: {value: 'exclude'}})
  fireEvent.click(await screen.findByRole('button', {name: 'Show all configured terms'}))
  expect(screen.getByRole('button', {name: 'phenotypicFeatures +'})).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Custom term'), {target: {value: 'custom'}})
  fireEvent.click(screen.getByRole('button', {name: 'Add term'}))
  expect(JSON.parse(screen.getByTestId('terms').textContent!)['exclude-terms']).toEqual(['custom'])
  fireEvent.change(screen.getByLabelText('Selection mode'), {target: {value: 'all'}})
  expect(JSON.parse(screen.getByTestId('terms').textContent!)).toEqual({'include-terms': [], 'exclude-terms': []})
})
