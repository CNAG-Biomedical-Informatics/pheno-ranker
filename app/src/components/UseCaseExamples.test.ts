import { expect, it } from 'vitest'
import { useCaseOptions } from './UseCaseExamples'

it('shows the top 50 patient results without limiting cohort comparisons', () => {
  expect(useCaseOptions('patient')['max-out']).toBe(50)
  expect(useCaseOptions('cohort')).not.toHaveProperty('max-out')
})
