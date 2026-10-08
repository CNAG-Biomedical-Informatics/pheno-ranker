import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import RunStatus from './RunStatus'

it('animates only running jobs and removes the spinner when finished', () => {
  const {container, rerender} = render(<RunStatus status="running"/>)
  expect(screen.getByText('running')).toBeInTheDocument()
  expect(container.querySelector('.run-spinner')).toHaveAttribute('aria-hidden', 'true')
  for (const status of ['queued', 'cancelling', 'completed', 'failed', 'cancelled', 'interrupted'] as const) {
    rerender(<RunStatus status={status}/>)
    expect(screen.getByText(status)).toBeInTheDocument()
    expect(container.querySelector('.run-spinner')).not.toBeInTheDocument()
    expect(container.querySelectorAll('svg')).toHaveLength(['queued', 'cancelling'].includes(status) ? 1 : 0)
  }
})
