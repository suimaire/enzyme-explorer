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
          {assays.length && drifted ? (
            <p className="drift-note" data-testid="drift-note">
              마름모 측정점은 03A에서 Km = {PREPARATION.km} µM, k<sub>cat</sub> = {PREPARATION.kcat} s⁻¹, [E]T ={' '}
              {PREPARATION.enzymeTotal} nM 조건으로 측정한 값입니다. 지금 곡선은 다른 조건을 사용하므로 측정점이 곡선 위에
              놓이지 않는 것이 정상입니다. 측정점은 데이터이고, 곡선은 모델입니다.{' '}
              <button type="button" onClick={() => setParameters(PREPARATION)} data-testid="restore-preparation">
                측정 조건으로 되돌리기
              </button>
            </p>
          ) : null}
          <MichaelisMentenPanel parameters={parameters} onParameters={setParameters} assays={assays} />
        </>
      ) : null}

      {section === 'c' ? <MechanisticCaveatPanel /> : null}
    </main>
  );
}
