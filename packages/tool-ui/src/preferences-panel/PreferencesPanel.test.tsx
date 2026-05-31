import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PreferencesPanel } from './PreferencesPanel.js'
import { PreferencesPanelArgsSchema, PreferencesPanelReceiptSchema } from './schema.js'

afterEach(cleanup)

const FIELDS = [
  { id: 'font-size', label: 'Font Size', type: 'slider' as const, min: 8, max: 72, value: 16 },
  {
    id: 'font-family',
    label: 'Font Family',
    type: 'select' as const,
    options: ['sans-serif', 'serif', 'monospace'],
    value: 'sans-serif',
  },
  { id: 'bold', label: 'Bold', type: 'toggle' as const, value: false },
]

describe('PreferencesPanel', () => {
  it('renders title and all field types', () => {
    render(<PreferencesPanel title="Typography" fields={FIELDS} onChange={vi.fn()} />)
    expect(screen.getByText('Typography')).toBeDefined()
    expect(screen.getByText('Font Size')).toBeDefined()
    expect(screen.getByText('Font Family')).toBeDefined()
    expect(screen.getByText('Bold')).toBeDefined()
    expect(screen.getByRole('slider')).toBeDefined()
    expect(screen.getByRole('combobox')).toBeDefined()
    expect(screen.getByRole('checkbox')).toBeDefined()
  })

  it('changing a slider field calls onChange with updated values', () => {
    const onChange = vi.fn()
    render(<PreferencesPanel title="Typography" fields={FIELDS} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '24' } })
    expect(onChange).toHaveBeenCalledWith({
      values: { 'font-size': 24, 'font-family': 'sans-serif', bold: false },
    })
  })

  it('changing a select field calls onChange with updated values', () => {
    const onChange = vi.fn()
    render(<PreferencesPanel title="Typography" fields={FIELDS} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'serif' } })
    expect(onChange).toHaveBeenCalledWith({
      values: { 'font-size': 16, 'font-family': 'serif', bold: false },
    })
  })

  it('changing a toggle field calls onChange with updated values', () => {
    const onChange = vi.fn()
    render(<PreferencesPanel title="Typography" fields={FIELDS} onChange={onChange} />)
    // React maps onChange for checkboxes to the click event, not change
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith({
      values: { 'font-size': 16, 'font-family': 'sans-serif', bold: true },
    })
  })

  it('args schema validates correctly', () => {
    const result = PreferencesPanelArgsSchema.safeParse({
      title: 'Typography',
      fields: [{ id: 'size', label: 'Size', type: 'slider', min: 0, max: 100, value: 16 }],
    })
    expect(result.success).toBe(true)
  })

  it('receipt schema validates correctly', () => {
    const receipt = PreferencesPanelReceiptSchema.parse({
      values: { 'font-size': 16, bold: true, family: 'serif' },
    })
    expect(receipt.values['font-size']).toBe(16)
    expect(receipt.values['bold']).toBe(true)
  })
})
