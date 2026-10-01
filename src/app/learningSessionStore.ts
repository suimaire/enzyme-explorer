import type {AssayResult, MichaelisMentenParameters} from '../kinetics/types';
import type {Stage} from '../modules/carbonic-anhydrase/stageView';
import type {Judgement} from '../modules/carbonic-anhydrase/ResidueFinder';
import {INITIAL_STATE, type LabState} from '../modules/regulation/model';
import type {PredictionState} from '../shared/components/Prediction';
import type {SetStateAction} from 'react';

export const KINETICS_PREPARATION: MichaelisMentenParameters = {km: 75, kcat: 20, enzymeTotal: 5};
export const ENERGY_DEFAULTS = {productEnergy: -18, barrierTop: 55, barrierLowering: 20};

type Progress = {
  predictions: Record<string, Partial<Record<string, PredictionState>>>;
  reveals: Record<string, boolean>;
};

/** Only learning data belongs here. Viewer objects and runtime handles stay in their components. */
export type LearningSnapshots = {
  kinetics: Progress & {
    section: 'a' | 'b' | 'c'; parameters: MichaelisMentenParameters; assays: AssayResult[];
    initialSubstrate: number; assayRun: {substrate: number} | null; measured: boolean;
    experiment: 'saturation' | 'enzyme' | 'km'; substrate: number;
    baseline: MichaelisMentenParameters | null; axisLock: number | null;
    showVmaxGuide: boolean; showKmGuide: boolean; exploredHigh: boolean;
  };
  reactionEnergy: Progress & typeof ENERGY_DEFAULTS & {enzyme: boolean; enzymeSeen: boolean};
  carbonicAnhydrase: Progress & {
    stage: Stage; judgements: Record<number, Judgement>; judgementsLocked: boolean; measured: number[];
  };
  regulation: Progress & {lab: LabState};
};
export type LearningModule = keyof LearningSnapshots;
const progress = (): Progress => ({predictions: {}, reveals: {}});
export function initialLearningSnapshots(): LearningSnapshots {
  return {
    kinetics: {...progress(), section: 'a', parameters: {...KINETICS_PREPARATION}, assays: [],
      initialSubstrate: 50, assayRun: null, measured: false, experiment: 'saturation', substrate: 80,
      baseline: null, axisLock: null, showVmaxGuide: false, showKmGuide: false, exploredHigh: false},
    reactionEnergy: {...progress(), ...ENERGY_DEFAULTS, enzyme: false, enzymeSeen: false},
    carbonicAnhydrase: {...progress(), stage: 1, judgements: {}, judgementsLocked: false, measured: []},
    regulation: {...progress(), lab: {...INITIAL_STATE, narration: {...INITIAL_STATE.narration}, observed: []}},
  };
}

/** App-owned, synchronous source of truth. Nothing is saved to browser storage or on unmount. */
export function createLearningSession() {
  let snapshots = initialLearningSnapshots();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    get<M extends LearningModule, K extends keyof LearningSnapshots[M]>(module: M, key: K): LearningSnapshots[M][K] {
      return snapshots[module][key];
    },
    set<M extends LearningModule, K extends keyof LearningSnapshots[M]>(module: M, key: K, update: SetStateAction<LearningSnapshots[M][K]>) {
      const previous = snapshots[module][key];
      const next = typeof update === 'function' ? (update as (value: typeof previous) => typeof previous)(previous) : update;
      if (Object.is(previous, next)) return;
      snapshots = {...snapshots, [module]: {...snapshots[module], [key]: next}};
      notify();
    },
    reset(module: LearningModule) {
      const initial = initialLearningSnapshots()[module];
      if (module === 'regulation') {
        (initial as LearningSnapshots['regulation']).lab.narration.run = snapshots.regulation.lab.narration.run + 1;
      }
      snapshots = {...snapshots, [module]: initial};
      notify();
    },
    snapshot: () => snapshots,
  };
}
export type LearningSession = ReturnType<typeof createLearningSession>;
