import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import AnalysisSettings from './AnalysisSettings'
import type { Operation } from '../types'

vi.mock('../api', () => ({request: vi.fn().mockResolvedValue({allowed: [], present: [], note: ''})}))

it('keeps optional settings collapsed without changing defaults or selections', () => {
  const operation: Operation = {id: 'patient', label: 'Patient', description: '', available: true, input: {files: []}, options: [
    {name: 'max-out', label: 'Maximum ranked records', kind: 'integer', default: 10},
    {name: 'align', label: 'Generate alignment', kind: 'boolean', default: true},
    {name: 'age', label: 'Compare age-based terms', kind: 'boolean'},
  ]}
  const onChange = vi.fn()
  const {container, rerender} = render(<AnalysisSettings operation={operation} files={{}} values={{'max-out': 50}} onChange={onChange}
    advancedInputs={<button>Select configuration</button>} outputLocation={<button>Choose folder</button>}/> )
  expect(container.querySelectorAll('details')).toHaveLength(3)
  for (const section of container.querySelectorAll('details')) expect(section.open).toBe(false)
  expect(screen.getByLabelText('Maximum ranked records')).toHaveValue(50)
  expect(screen.getByLabelText('Maximum ranked records')).not.toBeVisible()
  expect(screen.getByLabelText('Generate alignment')).toBeChecked()
  expect(screen.getByRole('button', {name: 'Select configuration'})).not.toBeVisible()
  fireEvent.click(screen.getByText('Customize analysis'))
  expect(screen.getByLabelText('Maximum ranked records')).toBeVisible()
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Maximum ranked records'), {target: {value: '25'}})
  expect(onChange).toHaveBeenLastCalledWith({'max-out': 25})
  rerender(<AnalysisSettings operation={operation} files={{}} values={{'include-terms': ['phenotypicFeatures']}} onChange={onChange} advancedInputs={null} outputLocation={null}/>)
  expect(screen.getByLabelText('Selection mode')).toHaveValue('include')
})
