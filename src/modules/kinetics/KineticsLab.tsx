import {useState} from 'react';
import {InitialVelocityPanel} from './InitialVelocityPanel';
import {MichaelisMentenPanel} from './MichaelisMentenPanel';
import {MechanisticCaveatPanel} from './MechanisticCaveatPanel';
import {ModuleHeader} from '../../shared/components/ModuleHeader';
import {Segmented} from '../../shared/components/Segmented';
import {TeachingModel} from '../../shared/components/Callout';
import type {AssayResult, MichaelisMentenParameters} from '../../kinetics/types';

/**
 * The enzyme preparation used in 03A, and the starting point of the 03B sliders. The 03A assays are
 * measurements *of* this preparation, which is why 03B starts from exactly these values.
 */
export const PREPARATION: MichaelisMentenParameters = {km: 75, kcat: 20, enzymeTotal: 5};

type Section = 'a' | 'b' | 'c';

/** Module 03. Three sections, one shared set of measurements, no router — the section is local state. */
export function KineticsLab() {
  const [section, setSection] = useState<Section>('a');
  const [parameters, setParameters] = useState<MichaelisMentenParameters>(PREPARATION);
  const [assays, setAssays] = useState<AssayResult[]>([]);

  const record = (result: AssayResult) =>
    setAssays((prev) => (prev.some((a) => a.initialSubstrate === result.initialSubstrate) ? prev : [...prev, result]));

  const reset = () => {
    setSection('a');
    setParameters(PREPARATION);
    setAssays([]);
  };

  const drifted =
    parameters.km !== PREPARATION.km || parameters.kcat !== PREPARATION.kcat || parameters.enzymeTotal !== PREPARATION.enzymeTotal;

  return (
    <main className="module" data-testid="module-kinetics">
      <ModuleHeader
        id="kinetics"
        tag={<TeachingModel>단일 기질, 비가역 반응, 초기 속도 모델</TeachingModel>}
        onReset={reset}
      />
      <Segmented
        label="탐구 단계"
        value={section}
        options={
          [
            ['a', '03A · 초기 속도 측정'],
            ['b', '03B · Michaelis–Menten 탐색'],
            ['c', '03C · Km과 반응 메커니즘'],
          ] as const
        }
        onChange={setSection}
      />

      {section === 'a' ? (
        <InitialVelocityPanel parameters={PREPARATION} assays={assays} onRecord={record} onClear={() => setAssays([])} />
      ) : null}

      {section === 'b' ? (
        <>
          {assays.length ? <MeasurementConditionNote drifted={drifted} onRestore={() => setParameters(PREPARATION)} /> : null}
          <MichaelisMentenPanel parameters={parameters} onParameters={setParameters} assays={assays} />
        </>
      ) : null}

      {section === 'c' ? <MechanisticCaveatPanel /> : null}
    </main>
  );
}

/**
 * How the 03A diamonds relate to the curve now on screen.
 *
 * Both states are always rendered, stacked in one grid cell, and only the inactive one is hidden with
 * `visibility`. The slot is therefore as tall as the taller message at every width from the moment 03B opens,
 * so a slider drag that switches between the two never moves the sliders under a student's finger. The slot
 * exists only when there are measurements: without them it can never change while 03B is open.
 */
export function MeasurementConditionNote({drifted, onRestore}: {drifted: boolean; onRestore: () => void}) {
  const conditions = (
    <>
      <span className="nowrap">Km = {PREPARATION.km} µM</span>, <span className="nowrap">k<sub>cat</sub> = {PREPARATION.kcat} s⁻¹</span>,{' '}
      <span className="nowrap">[E]T = {PREPARATION.enzymeTotal} nM</span>
    </>
  );
  return (
    <div className="drift-note" data-state={drifted ? 'drifted' : 'matched'} data-testid="drift-note" aria-live="polite">
      <div className="drift-note-state" data-testid="drift-note-matched">
        <p>
          <strong>측정점과 곡선의 조건이 같습니다.</strong> 마름모 측정점은 03A에서 {conditions} 조건으로 측정한
          데이터이고, 지금 곡선도 같은 조건의 모델입니다.
        </p>
      </div>
      <div className="drift-note-state" data-testid="drift-note-drifted">
        <p>
          <strong>측정점은 데이터, 곡선은 모델입니다.</strong> 마름모 측정점은 03A 조건({conditions})에서 측정한
          값입니다. 지금 곡선은 조건이 다르므로 측정점이 곡선 위에 놓이지 않는 것이 정상입니다.
        </p>
        <button type="button" onClick={onRestore} data-testid="restore-preparation">
          측정 조건으로 되돌리기
        </button>
      </div>
    </div>
  );
}
