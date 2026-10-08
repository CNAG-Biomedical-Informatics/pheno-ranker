import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import PlotFrame from './PlotFrame'

it('expands and restores without remounting the plot, including Escape', () => {
  const mounted = vi.fn()
  function Plot() {useEffect(() => {mounted()}, []); return <div>Plot content</div>}
  render(<PlotFrame title="MDS"><Plot/></PlotFrame>)
  fireEvent.click(screen.getByRole('button', {name: 'Expand plot'}))
  expect(screen.getByRole('dialog', {name: 'MDS'})).toHaveClass('plot-frame-expanded')
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(screen.getByRole('button', {name: 'Restore plot size'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Expand plot'}))
  fireEvent.keyDown(document, {key: 'Escape'})
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: 'Expand plot'})).toHaveFocus()
  expect(document.body.style.overflow).toBe('')
  expect(mounted).toHaveBeenCalledOnce()
})

it('restores scrolling when an expanded plot is unmounted', () => {
  const view = render(<PlotFrame title="Network"><div>Network content</div></PlotFrame>)
  fireEvent.click(screen.getByRole('button', {name: 'Expand plot'}))
  view.unmount()
  expect(document.body.style.overflow).toBe('')
})
