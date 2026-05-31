import { useState } from 'react'
import type { ParameterSliderArgs, ParameterSliderReceipt } from './schema.js'

export interface ParameterSliderProps extends ParameterSliderArgs {
  onChange: (receipt: ParameterSliderReceipt) => void
}

export function ParameterSlider({
  label,
  min,
  max,
  step,
  value: initialValue,
  unit,
  onChange,
}: ParameterSliderProps) {
  const [currentValue, setCurrentValue] = useState(initialValue)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    setCurrentValue(newValue)
    onChange({ value: newValue })
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#374151',
        }}
      >
        <span>{label}</span>
        <span>
          {currentValue}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        style={{ width: '100%', cursor: 'pointer' }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#9ca3af',
        }}
      >
        <span>
          {min}
          {unit ? ` ${unit}` : ''}
        </span>
        <span>
          {max}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  )
}
