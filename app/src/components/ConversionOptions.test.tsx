import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import ConversionOptions from './ConversionOptions'
import type { OptionDefinition } from '../types'
const definitions: OptionDefinition[] = [
  {name: 'align', label: 'Alignment', kind: 'boolean'},
  {name: 'patients-of-interest', label: 'IDs', kind: 'multiselect'},
  {name: 'graph-min-weight', label: 'Minimum edge weight', kind: 'number'},
]
function Form() {
  const [values, setValues] = useState<Record<string, unknown>>({})
  return <><ConversionOptions definitions={definitions} values={values} onChange={setValues} /><output data-testid="values">{JSON.stringify(values)}</output></>
}
describe('registry-driven options adapted from C-P', () => {
  it('keeps booleans, numeric zero and complete IDs typed', () => {
    render(<Form />)
    fireEvent.click(screen.getByLabelText('Alignment'))
    fireEvent.change(screen.getByLabelText('IDs (one per line)'), {target: {value: 'C1_one:visit\nother'}})
    fireEvent.change(screen.getByLabelText('Minimum edge weight'), {target: {value: '0'}})
    expect(JSON.parse(screen.getByTestId('values').textContent!)).toEqual({align: true, 'patients-of-interest': ['C1_one:visit', 'other'], 'graph-min-weight': 0})
  })
})
