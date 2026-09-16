/** A labelled group of mutually exclusive buttons. Selection is carried by aria-pressed, not by colour alone. */
export function Segmented<V extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: V;
  options: readonly (readonly [V, string])[];
  onChange: (value: V) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend>{label}</legend>
      <div role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
