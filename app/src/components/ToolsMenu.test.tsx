import {fireEvent, render, screen, within} from '@testing-library/react'
import {expect, it, vi} from 'vitest'
import ToolsMenu from './ToolsMenu'

it('lists simulation first without changing the other tools or source array', () => {
  const operations = ['csv', 'summary', 'simulate', 'pdf'].map(id => ({id, label: id, description: '', available: true, options: [], input: {files: []}}))
  const onSelect = vi.fn()
  render(<ToolsMenu operations={operations} disabled={false} onSelect={onSelect}/>)
  fireEvent.click(screen.getByRole('button', {name: 'Tools'}))
  const buttons = within(screen.getByRole('group', {name: 'Companion tools'})).getAllByRole('button')
  expect(buttons.map(button => button.textContent)).toEqual(['simulate', 'csv', 'summary', 'pdf'])
  expect(operations.map(item => item.id)).toEqual(['csv', 'summary', 'simulate', 'pdf'])
  fireEvent.click(buttons[0])
  expect(onSelect).toHaveBeenCalledWith('simulate')
})
