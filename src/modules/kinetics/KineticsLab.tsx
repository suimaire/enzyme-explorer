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
        tag={<TeachingModel>Single-substrate, irreversible, initial-rate model</TeachingModel>}
        onReset={reset}
      />
      <Segmented
        label="Section"
        value={section}
        options={
          [
            ['a', '03A · Measuring initial velocity'],
            ['b', '03B · Michaelis–Menten explorer'],
            ['c', '03C · Km and the mechanism'],
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
              The diamonds were measured in 03A with Km = {PREPARATION.km} µM, k<sub>cat</sub> = {PREPARATION.kcat} s⁻¹ and [E]T ={' '}
              {PREPARATION.enzymeTotal} nM. The curve now uses different parameters, so those measurements are not expected to
              lie on it — they are data, and the curve is a model.{' '}
              <button type="button" onClick={() => setParameters(PREPARATION)} data-testid="restore-preparation">
                Restore the assay conditions
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
