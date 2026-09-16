import {useCallback, useMemo, useState} from 'react';

/**
 * Predict → lock → manipulate → observe → explain.
 *
 * A question's explanation is never rendered before the student has locked a prediction, so the answer
 * cannot be read off the screen first. Locking is per question: a module stays usable even if the student
 * only answers some of them.
 */

export type Choice = {id: string; label: string};

export type PredictionState = {choice: string | null; locked: boolean};

const EMPTY: PredictionState = {choice: null, locked: false};

export type PredictionSet<K extends string> = {
  get: (key: K) => PredictionState;
  choose: (key: K, choice: string) => void;
  lock: (key: K) => void;
  reset: () => void;
  /** True once the student has locked a prediction for every listed question. */
  allLocked: (keys: readonly K[]) => boolean;
  /** True once the student has locked a prediction for at least one listed question. */
  anyLocked: (keys: readonly K[]) => boolean;
};

/** Prediction state for one module. Modules keep their own set; nothing is shared between modules. */
export function usePredictions<K extends string>(): PredictionSet<K> {
  const [state, setState] = useState<Partial<Record<K, PredictionState>>>({});
  const get = useCallback((key: K) => state[key] ?? EMPTY, [state]);
  const choose = useCallback((key: K, choice: string) => {
    setState((prev) => (prev[key]?.locked ? prev : {...prev, [key]: {choice, locked: false}}));
  }, []);
  const lock = useCallback((key: K) => {
    setState((prev) => (prev[key]?.choice ? {...prev, [key]: {choice: prev[key]!.choice, locked: true}} : prev));
  }, []);
  const reset = useCallback(() => setState({}), []);
  const allLocked = useCallback((keys: readonly K[]) => keys.every((k) => state[k]?.locked), [state]);
  const anyLocked = useCallback((keys: readonly K[]) => keys.some((k) => state[k]?.locked), [state]);
  return useMemo(() => ({get, choose, lock, reset, allLocked, anyLocked}), [get, choose, lock, reset, allLocked, anyLocked]);
}

/** One prediction question. Shows the locked answer back to the student but never marks it right or wrong here. */
export function PredictQuestion<K extends string>({
  predictions,
  name,
  question,
  choices,
  hint,
  testId,
}: {
  predictions: PredictionSet<K>;
  name: K;
  question: string;
  choices: readonly Choice[];
  hint?: string;
  testId?: string;
}) {
  const {choice, locked} = predictions.get(name);
  return (
    <div className="predict" data-testid={testId} data-locked={locked ? 'yes' : 'no'}>
      <fieldset disabled={locked}>
        <legend>
          <span className="predict-tag">먼저 예측</span> {question}
        </legend>
        {choices.map((c) => (
          <label key={c.id} className="choice">
            <input
              type="radio"
              name={`${name}-${testId ?? 'q'}`}
              value={c.id}
              checked={choice === c.id}
              onChange={() => predictions.choose(name, c.id)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>
      {hint ? <p className="small">{hint}</p> : null}
      {locked ? (
        <p className="locked-note" data-testid={testId ? `${testId}-locked` : undefined}>
          확정한 예측: <strong>{choices.find((c) => c.id === choice)?.label}</strong>
        </p>
      ) : (
        <button type="button" className="primary" disabled={!choice} onClick={() => predictions.lock(name)}>
          예측 확정
        </button>
      )}
    </div>
  );
}

/**
 * An explanation that only exists in the DOM after the student asks for it, and only once the gate is open.
 * `gate` is what the module requires first — normally a locked prediction plus an observation.
 */
export function Reveal({
  gate,
  gateMessage,
  label = '설명 보기',
  children,
  testId,
}: {
  gate: boolean;
  gateMessage: string;
  label?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!gate) return <p className="gate-note" data-testid={testId ? `${testId}-gate` : undefined}>{gateMessage}</p>;
  if (!open)
    return (
      <button type="button" className="primary" data-testid={testId ? `${testId}-button` : undefined} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <div className="explain" data-testid={testId}>
      <h4>
        <span className="explain-tag">설명</span> 관찰 결과 해석
      </h4>
      {children}
    </div>
  );
}
