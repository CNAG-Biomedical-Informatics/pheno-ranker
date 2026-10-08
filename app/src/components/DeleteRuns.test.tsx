import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import DeleteRuns from './DeleteRuns'

it('defaults to keeping files and Cancel deletes nothing', () => {
  const onDelete = vi.fn(), onClose = vi.fn()
  render(<DeleteRuns onDelete={onDelete} onClose={onClose}/>)
  expect(screen.getByRole('radio', {name: 'History only'})).toBeChecked()
  fireEvent.click(screen.getByRole('button', {name: 'Cancel'}))
  expect(onDelete).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledOnce()
})

it('explains permanent deletion and displays backend protection errors', async () => {
  const onDelete = vi.fn().mockRejectedValue(new Error('Another active run uses these files')), onClose = vi.fn()
  render(<DeleteRuns name="Example run" onDelete={onDelete} onClose={onClose}/>)
  fireEvent.click(screen.getByRole('radio', {name: 'History and output files'}))
  expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Delete runs and files'}))
  await waitFor(() => expect(onDelete).toHaveBeenCalledWith(true))
  expect(await screen.findByRole('alert')).toHaveTextContent('Another active run uses these files')
  expect(onClose).not.toHaveBeenCalled()
})
