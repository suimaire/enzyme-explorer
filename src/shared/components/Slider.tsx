import {useId} from 'react';

/** A range input with its current value and units always visible, so the readout never depends on the handle position. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
  note,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  note?: string;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="slider-control">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id} data-testid={testId ? `${testId}-value` : undefined}>
          {value}
          {unit ? <small> {unit}</small> : null}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {note ? <p className="small">{note}</p> : null}
    </div>
  );
}
