import {moduleEntry, type ModuleId} from '../../app/modules';

/** Common module heading: number, title, the module's inquiry question, a model tag and a Reset control. */
export function ModuleHeader({
  id,
  tag,
  onReset,
  resetLabel = 'Reset module',
}: {
  id: ModuleId;
  tag?: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
}) {
  const entry = moduleEntry(id);
  return (
    <header className="module-heading">
      <div>
        <p className="eyebrow">
          {entry.number ? `Module ${entry.number} · ` : ''}
          {entry.eyebrow}
        </p>
        <h2>{entry.title}</h2>
        {entry.question ? <p className="module-question">{entry.question}</p> : null}
      </div>
      <div className="module-heading-side">
        {tag}
        {onReset ? (
          <button type="button" onClick={onReset} data-testid="reset-module">
            {resetLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}
