import {describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LearningModuleScope, LearningSessionProvider} from '../src/app/LearningSession';
import {createLearningSession, KINETICS_PREPARATION} from '../src/app/learningSessionStore';
import {ReactionEnergyLab} from '../src/modules/reaction-energy/ReactionEnergyLab';
import {KineticsLab} from '../src/modules/kinetics/KineticsLab';
import {jumpToSection, SectionJumpButton} from '../src/shared/components/SectionJumpButton';

const energyHtml = (session = createLearningSession()) => renderToStaticMarkup(
  <LearningSessionProvider session={session}><LearningModuleScope module="reactionEnergy"><ReactionEnergyLab /></LearningModuleScope></LearningSessionProvider>,
);
const kineticsHtml = (session: ReturnType<typeof createLearningSession>) => renderToStaticMarkup(
  <LearningSessionProvider session={session}><LearningModuleScope module="kinetics"><KineticsLab /></LearningModuleScope></LearningSessionProvider>,
);
const readout = (html: string, id: string) => html.match(new RegExp(`data-testid="${id}"[^>]*>([\\s\\S]*?)</(?:dd|div)>`))?.[1];
const compactReadout = (html: string, id: string) => html.match(new RegExp(`data-testid="${id}"[^>]*>([\\s\\S]*?)</dl>`))?.[1];

describe('UX-008 local experiment navigation', () => {
  it('identifies prediction, graph and controls, with a prerequisite action before prediction', () => {
    const html = energyHtml();
    for (const id of ['energy-prediction', 'energy-graph', 'energy-controls', 'energy-catalyst']) {
      expect(html).toContain(`id="${id}"`);
      if (id !== 'energy-catalyst') expect(html).toContain(`aria-controls="${id}"`);
    }
    expect(html).toContain('예측으로 이동 ↓');
    expect(html).not.toContain('catalyst-prerequisite-complete');
    expect((html.match(/data-testid="opening-question"/g) ?? []).length).toBe(1);
    expect((html.match(/data-testid="product-energy"/g) ?? []).length).toBe(1);
  });
  it('replaces the prerequisite action with completion and a catalyst return after locking', () => {
    const session = createLearningSession();
    session.set('reactionEnergy', 'predictions', {main: {opening: {choice: 'no', locked: true}}});
    const html = energyHtml(session);
    expect(html).not.toContain('예측으로 이동 ↓');
    expect(html).toContain('✓ 예측 확정됨');
    expect(html).toContain('촉매 조작으로 돌아가기 ↑');
  });
  it('uses the same ΔG and guarded forward/reverse values in compact and full observations', () => {
    const session = createLearningSession();
    session.set('reactionEnergy', 'productEnergy', 30);
    session.set('reactionEnergy', 'barrierLowering', 20);
    session.set('reactionEnergy', 'enzyme', true);
    const html = energyHtml(session);
    for (const [compact, full] of [['compact-delta-g', 'readout-delta-g'], ['compact-forward', 'readout-forward'], ['compact-reverse', 'readout-reverse']]) {
      expect(readout(html, compact)).toBe(readout(html, full));
    }
    expect(readout(html, 'compact-delta-g')).toContain('+30');
    expect(readout(html, 'compact-forward')).toContain('55 → <strong>35</strong>');
    expect(readout(html, 'compact-reverse')).toContain('25 → <strong>5</strong>');
  });
  it('shows the recorded run condition, even when the next substrate selection differs', () => {
    const session = createLearningSession();
    session.set('kinetics', 'initialSubstrate', 100);
    session.set('kinetics', 'assayRun', {substrate: 50});
    session.set('kinetics', 'measured', true);
    session.set('kinetics', 'assays', [{initialSubstrate: 50, initialVelocity: 40, parameters: KINETICS_PREPARATION}]);
    const html = kineticsHtml(session);
    expect(compactReadout(html, 'initial-compact-readout')).toContain('50 µM');
    expect(compactReadout(html, 'initial-compact-readout')).toContain('40.0 nM·s⁻¹');
    expect(html).toContain('모델 계산 기반');
    expect(html).toContain('동일 조건은 1개 측정점');
    expect(html).toContain('aria-controls="initial-graph"');
    expect(html).toContain('aria-controls="initial-measurements"');
    expect((html.match(/data-testid="measure-v0"/g) ?? []).length).toBe(1);
  });
  it('does not present a current measurement before measuring', () => {
    expect(kineticsHtml(createLearningSession())).not.toContain('initial-compact-readout');
  });
  it('derives the MM compact values from the active condition, while retaining Phase A2 feedback', () => {
    const session = createLearningSession();
    session.set('kinetics', 'section', 'b');
    session.set('kinetics', 'parameters', {...KINETICS_PREPARATION, km: 300, kcat: 60});
    session.set('kinetics', 'substrate', 600);
    session.set('kinetics', 'baseline', KINETICS_PREPARATION);
    session.set('kinetics', 'axisLock', 115);
    const html = kineticsHtml(session);
    const compact = compactReadout(html, 'mm-compact-readout');
    for (const value of ['300 µM', '300.0 nM·s⁻¹', '600 µM', '200.0 nM·s⁻¹']) expect(compact).toContain(value);
    expect(html).toContain('aria-controls="mm-graph"');
    expect(html).toContain('현재 [S] / Km = 2.0');
    expect(html).toContain('속도 축 자동 확장: 115 → 330');
    expect(html).toContain('범위');
    expect(html).toContain('data-testid="baseline-curve"');
  });
  it.each([true, false])('focuses without implicit scroll and respects reduced motion=%s', reduced => {
    const focus = vi.fn();
    const scrollIntoView = vi.fn();
    vi.stubGlobal('window', {matchMedia: vi.fn(() => ({matches: reduced}))});
    try {
      jumpToSection({focus, scrollIntoView} as unknown as HTMLElement);
      expect(focus).toHaveBeenCalledWith({preventScroll: true});
      expect(scrollIntoView).toHaveBeenCalledWith({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
      expect(focus.mock.invocationCallOrder[0]).toBeLessThan(scrollIntoView.mock.invocationCallOrder[0]);
    } finally {vi.unstubAllGlobals();}
  });
  it('provides a named button and explicit target relationship without tabbing into headings', () => {
    const html = renderToStaticMarkup(<SectionJumpButton targetId="initial-graph">진행 곡선에서 확인 ↓</SectionJumpButton>);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-controls="initial-graph"');
    expect(html).toContain('진행 곡선에서 확인 ↓');
    expect(energyHtml()).toContain('tabindex="-1"');
  });
});
