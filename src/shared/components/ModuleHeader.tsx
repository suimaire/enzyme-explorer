import {moduleEntry, type ModuleId} from '../../app/modules';
import {MODEL_NOTES_SECTIONS, modelNotesHash} from '../../app/modelNotesNavigation';

/** Common module heading: number, title, the module's inquiry question, a model tag and a Reset control. */
export function ModuleHeader({
  id,
  tag,
  onReset,
  resetLabel = '이 모듈 초기화',
}: {
  id: ModuleId;
  tag?: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
}) {
  const entry = moduleEntry(id);
  const reference = MODEL_NOTES_SECTIONS.find(section => section.module === id);
  return (
    <header className="module-heading">
      <div>
        <p className="eyebrow">
          {entry.number ? `모듈 ${entry.number} · ` : ''}
          {entry.eyebrow}
        </p>
        <h2>{entry.heading ?? entry.title}</h2>
        {entry.question ? <p className="module-question">{entry.question}</p> : null}
      </div>
      <div className="module-heading-side">
        {tag}
        {reference ? <a href={modelNotesHash(reference.id)}>모델 및 주의사항</a> : null}
        {onReset ? (
          <button type="button" onClick={onReset} data-testid="reset-module">
            {resetLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}
