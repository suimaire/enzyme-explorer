import {describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LearningModuleScope, LearningSessionProvider} from '../src/app/LearningSession';
import {createLearningSession, initialLearningSnapshots, KINETICS_PREPARATION} from '../src/app/learningSessionStore';
import {KineticsLab} from '../src/modules/kinetics/KineticsLab';
import {measuredInitialVelocity} from '../src/kinetics/progressCurve';
import {regulationReducer} from '../src/modules/regulation/model';

const assay = (initialSubstrate: number) => ({initialSubstrate,
  initialVelocity: measuredInitialVelocity(KINETICS_PREPARATION, initialSubstrate), parameters: {...KINETICS_PREPARATION}});
const renderKinetics = (session: ReturnType<typeof createLearningSession>) => renderToStaticMarkup(
  <LearningSessionProvider session={session}><LearningModuleScope module="kinetics"><KineticsLab /></LearningModuleScope></LearningSessionProvider>,
);

describe('App-session learning snapshots', () => {
  it('renders a collected measurement on fresh module renders using the same session', () => {
    const session = createLearningSession();
    session.set('kinetics', 'assays', [assay(50)]);
    for (let mount = 0; mount < 2; mount++) {
      const html = renderKinetics(session);
      expect(html).toContain('모은 측정값 (1개)');
      expect(html).toContain('<td>50</td>');
    }
  });
  it('retains multiple measurements, stage, parameters and comparison baseline together', () => {
    const session = createLearningSession();
    session.set('kinetics', 'assays', [10, 50, 100, 500].map(assay));
    expect(renderKinetics(session)).toContain('모은 측정값 (4개)');
    session.set('kinetics', 'section', 'b');
    session.set('kinetics', 'baseline', {...KINETICS_PREPARATION});
    session.set('kinetics', 'axisLock', 220);
    session.set('kinetics', 'parameters', {...KINETICS_PREPARATION, enzymeTotal: 10});
    const html = renderKinetics(session);
    expect(html).toContain('data-testid="panel-03b"');
    expect(html).toContain('data-testid="clear-baseline"');
    expect(html).toContain('data-state="drifted"');
    expect(session.get('kinetics', 'assays').map(point => point.initialSubstrate)).toEqual([10, 50, 100, 500]);
  });
  it('restores prediction checked/disabled state and already revealed progress in the DOM', () => {
    const session = createLearningSession();
    session.set('kinetics', 'assayRun', {substrate: 50});
    session.set('kinetics', 'measured', true);
    session.set('kinetics', 'predictions', {initial: {linear: {choice: 'slows', locked: true}}});
    session.set('kinetics', 'reveals', {'progress-explanation:': true});
    const html = renderKinetics(session);
    expect(html).toContain('data-locked="yes"');
    expect(html).toContain('checked="" value="slows"');
    expect(html).toContain('data-testid="progress-explanation"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="measure-v0"/);
  });
  it('explicit module reset clears measurements, stage, baseline, predictions and reveals without reviving them', () => {
    const session = createLearningSession();
    session.set('kinetics', 'assays', [assay(50)]);
    session.set('kinetics', 'section', 'b');
    session.set('kinetics', 'baseline', KINETICS_PREPARATION);
    session.set('kinetics', 'predictions', {initial: {linear: {choice: 'slows', locked: true}}});
    session.set('kinetics', 'reveals', {'progress-explanation:': true});
    session.set('reactionEnergy', 'enzymeSeen', true);
    session.reset('kinetics');
    expect(session.snapshot().kinetics).toEqual(initialLearningSnapshots().kinetics);
    expect(session.get('reactionEnergy', 'enzymeSeen')).toBe(true);
    for (let mount = 0; mount < 2; mount++) expect(renderKinetics(session)).toContain('모은 측정값 (0개)');
  });
  it('applies consecutive functional updates to the latest snapshot and unsubscribes listeners', () => {
    const session = createLearningSession();
    const notify = vi.fn();
    const unsubscribe = session.subscribe(notify);
    session.set('kinetics', 'assays', previous => [...previous, assay(10)]);
    session.set('kinetics', 'assays', previous => [...previous, assay(50)]);
    expect(session.get('kinetics', 'assays')).toHaveLength(2);
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
    session.reset('kinetics');
    expect(notify).toHaveBeenCalledTimes(2);
  });
  it('stores JSON data for all modules, including residue answers and regulation intervention', () => {
    const session = createLearningSession();
    session.set('kinetics', 'assays', [10, 50, 100, 500].map(assay));
    session.set('carbonicAnhydrase', 'judgements', {64: 'no', 94: 'yes'});
    session.set('carbonicAnhydrase', 'measured', [64, 94]);
    session.set('regulation', 'lab', previous => regulationReducer(previous, {type: 'signal', scenario: 'insulinDominant', reducedMotion: true}));
    const snapshot = session.snapshot();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    const visit = (value: unknown) => {
      if (value === null || typeof value !== 'object') {expect(['string', 'number', 'boolean'].includes(typeof value) || value === null).toBe(true); return;}
      expect(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype).toBe(true);
      for (const child of Object.values(value)) visit(child);
    };
    visit(snapshot);
    for (const module of Object.values(snapshot)) for (const key of ['renderer', 'scene', 'camera', 'canvas', 'raf', 'timer']) expect(module).not.toHaveProperty(key);
  });
  it('reset invalidates stale regulation ticks', () => {
    const session = createLearningSession();
    session.set('regulation', 'lab', previous => regulationReducer(previous, {type: 'signal', scenario: 'glucagonDominant', reducedMotion: false}));
    const old = session.get('regulation', 'lab').narration;
    session.reset('regulation');
    session.set('regulation', 'lab', previous => regulationReducer(previous, {type: 'signal', scenario: 'insulinDominant', reducedMotion: false}));
    const fresh = session.get('regulation', 'lab');
    expect(regulationReducer(fresh, {type: 'tick', run: old.run, step: old.step})).toBe(fresh);
  });
  it('a fresh App/browser load starts an empty session; refresh persistence is intentionally absent', () => {
    const old = createLearningSession();
    old.set('kinetics', 'assays', [assay(50)]);
    const reloaded = createLearningSession();
    expect(reloaded.snapshot()).toEqual(initialLearningSnapshots());
    expect(old.get('kinetics', 'assays')).toHaveLength(1);
  });
});
