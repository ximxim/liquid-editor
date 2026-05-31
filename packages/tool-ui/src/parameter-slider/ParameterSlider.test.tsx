import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ParameterSlider } from './ParameterSlider.js'
import { ParameterSliderArgsSchema, ParameterSliderReceiptSchema } from './schema.js'

afterEach(cleanup)

describe('ParameterSlider', () => {
  it('renders with correct range and label', () => {
    render(
      <ParameterSlider
        label="Font Size"
        min={8}
        max={72}
        step={1}
        value={16}
        unit="px"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('slider')).toBeDefined()
    expect(screen.getByText('Font Size')).toBeDefined()
    expect(screen.getByText('16 px')).toBeDefined()
  })

  it('renders without unit', () => {
    render(
      <ParameterSlider
        label="Opacity"
        min={0}
        max={100}
        step={1}
        value={50}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('50')).toBeDefined()
  })

  it('changing slider calls onChange with receipt { value: newValue }', () => {
    const onChange = vi.fn()
    render(
      <ParameterSlider
        label="Margin"
        min={0}
        max={100}
        step={1}
        value={20}
        unit="px"
        onChange={onChange}
      />,
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    expect(onChange).toHaveBeenCalledWith({ value: 75 })
  })

  it('Zod schema validates args correctly', () => {
    const result = ParameterSliderArgsSchema.safeParse({
      label: 'Padding',
      min: 0,
      max: 50,
      step: 1,
      value: 10,
    })
    expect(result.success).toBe(true)
  })

  it('Zod schema accepts optional unit', () => {
    const result = ParameterSliderArgsSchema.safeParse({
      label: 'Opacity',
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.5,
      unit: 'ratio',
    })
    expect(result.success).toBe(true)
  })

  it('Zod schema rejects invalid args', () => {
    const result = ParameterSliderArgsSchema.safeParse({ label: 42 })
    expect(result.success).toBe(false)
  })

  it('receipt schema validates correctly', () => {
    const receipt = ParameterSliderReceiptSchema.parse({ value: 42 })
    expect(receipt).toEqual({ value: 42 })
  })
})
