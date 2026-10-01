import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {deriveRegulation, HORMONE_DRIVEN, INITIAL_STATE, regulationReducer as reduce, stepDescription, type LabState, type Scenario} from '../src/modules/regulation/model';
import {HormonalRegulation} from '../src/modules/regulation/HormonalRegulation';
import {InterventionFlow, Pathway, PhosphateTrace, Results, SugarComparison} from '../src/modules/regulation/Diagrams';
import {IsoformCaution, KineticExplanation} from '../src/modules/regulation/ScientificContext';
import {Reveal} from '../src/shared/components/Prediction';
import {parseStructure} from '../src/viewer/pdb/parsePdb';
import {canonicalNumber, domainOf, labelNumber, REGULATION_STRUCTURE} from '../src/modules/regulation/structureSource';
import provenance from '../src/data/regulation/provenance.json';

const scenarios: Scenario[] = ['insulinDominant', 'glucagonDominant'];
const dataDir = join(import.meta.dirname, '../src/data/regulation');
const read = (name: string) => readFileSync(join(dataDir, name), 'utf8');
const complete = (scenario: Scenario, state = INITIAL_STATE) => reduce(state, {type: 'signal', scenario, reducedMotion: true});

describe('hormonal regulation rules', () => {
  it('derives opposite relative activities and downstream directions', () => {
    expect(deriveRegulation('insulinDominant')).toMatchObject({phosphorylated: false, pfk2: '상대적 활성 증가 ↑', fbpase2: '상대적 활성 감소 ↓', hormoneF26: 'high', pfk1: '활성화 자극 증가 ↑', fbpase1: '억제 증가 ┤', glycolysis: '촉진 방향 ↑', gluconeogenesis: '억제 방향 ↓'});
    expect(deriveRegulation('glucagonDominant')).toMatchObject({phosphorylated: true, pfk2: '상대적 활성 감소 ↓', fbpase2: '상대적 활성 증가 ↑', hormoneF26: 'low', pfk1: '활성화 자극 감소 ↓', fbpase1: '억제 완화', glycolysis: '억제 방향 ↓', gluconeogenesis: '촉진 방향 ↑'});
  });
  it.each(scenarios.flatMap(scenario => (['low','high'] as const).map(level => ({scenario, level}))))('clamp $scenario / $level preserves upstream and changes only mediator/downstream', ({scenario, level}) => {
    const before = deriveRegulation(scenario);
    const fixed = deriveRegulation(scenario, {mode: 'clamped', level});
    expect([fixed.scenario, fixed.phosphorylated, fixed.pfk2, fixed.fbpase2, fixed.hormoneF26]).toEqual([before.scenario, before.phosphorylated, before.pfk2, before.fbpase2, before.hormoneF26]);
    expect(fixed.effectiveF26).toBe(level);
    expect(fixed.glycolysis).toBe(level === 'high' ? '촉진 방향 ↑' : '억제 방향 ↓');
    expect(fixed.gluconeogenesis).toBe(level === 'high' ? '억제 방향 ↓' : '촉진 방향 ↑');
    expect(deriveRegulation(scenario, HORMONE_DRIVEN)).toEqual(before);
  });
});

describe('narration lifecycle', () => {
  it('moves, pauses, restarts and clears observation on reset', () => {
    let state = reduce(INITIAL_STATE, {type: 'signal', scenario: 'insulinDominant', reducedMotion: false});
    expect(state.narration).toMatchObject({step: 1, status: 'playing'});
    state = reduce(state, {type: 'pause'});
    expect(state.narration.status).toBe('paused');
    state = reduce(state, {type: 'next'});
    expect(state.narration.step).toBe(2);
    state = reduce(state, {type: 'previous'});
    expect(state.narration.step).toBe(1);
    state = complete('insulinDominant', state);
    expect(state.observed).toEqual(['insulinDominant']);
    expect(reduce(state, {type: 'restart'}).narration).toMatchObject({step: 1, status: 'paused'});
    expect(reduce(state, {type: 'reset'})).toMatchObject({scenario: null, control: HORMONE_DRIVEN, observed: [], narration: {step: 0, status: 'idle'}});
  });
  it('rejects stale callbacks after last-input-wins, pause, view change or reset', () => {
    vi.useFakeTimers();
    try {
      let state: LabState = reduce(INITIAL_STATE, {type: 'signal', scenario: 'insulinDominant', reducedMotion: false});
      const old = state.narration;
      setTimeout(() => {state = reduce(state, {type: 'tick', run: old.run, step: old.step});}, 950);
      state = reduce(state, {type: 'signal', scenario: 'glucagonDominant', reducedMotion: false});
      vi.advanceTimersByTime(950);
      expect(state.scenario).toBe('glucagonDominant');
      expect(state.narration.step).toBe(1);
      for (const action of [{type: 'pause'}, {type: 'view', view: 'structure'}, {type: 'reset'}] as const) {
        const pending = state.narration;
        state = reduce(state, action);
        expect(reduce(state, {type: 'tick', run: pending.run, step: pending.step})).toBe(state);
      }
    } finally {vi.useRealTimers();}
  });
  it('ticks exactly five stages and rejects duplicate callbacks', () => {
    let state = reduce(INITIAL_STATE, {type: 'signal', scenario: 'glucagonDominant', reducedMotion: false});
    for (let step = 1; step < 5; step++) {
      const action = {type: 'tick' as const, run: state.narration.run, step};
      state = reduce(state, action);
      expect(state.narration.step).toBe(step + 1);
      expect(reduce(state, action)).toBe(state);
    }
    expect(state.narration.status).toBe('completed');
    expect(state.observed).toEqual(['glucagonDominant']);
  });
  it('unlocks interventions only after both full observations and restores hormone-driven state', () => {
    const clamp = {type: 'control' as const, control: {mode: 'clamped' as const, level: 'high' as const}};
    expect(reduce(INITIAL_STATE, clamp)).toBe(INITIAL_STATE);
    const one = complete('insulinDominant');
    expect(reduce(one, clamp)).toBe(one);
    const both = complete('glucagonDominant', one);
    const fixed = reduce(both, clamp);
    expect(fixed.interventionObserved).toBe(true);
    expect(fixed.scenario).toBe('glucagonDominant');
    expect(reduce(fixed, {type: 'control', control: HORMONE_DRIVEN}).control.mode).toBe('hormoneDriven');
    const newSignal = reduce(fixed, {type: 'signal', scenario: 'insulinDominant', reducedMotion: false});
    expect(newSignal.control).toEqual(clamp.control);
    expect(newSignal.interventionObserved).toBe(false);
    expect(reduce(newSignal, clamp)).toBe(newSignal);
  });
});

describe('disclosure and biochemical semantics', () => {
  const plain = (html: string) => html.replace(/<[^>]*>/g, '');
  it.each(scenarios)('qualifies both catalytic activities in every pathway stage and narration: %s', s => {
    const result = deriveRegulation(s);
    const html = plain(renderToStaticMarkup(<Pathway result={result} step={5} clamped={false} onCompare={() => {}} />));
    expect(html).toContain(result.pfk2);
    expect(html).toContain(result.fbpase2);
    expect(stepDescription(result, 3)).toContain(`PFK-2 ${result.pfk2}`);
    expect(stepDescription(result, 3)).toContain(`FBPase-2 ${result.fbpase2}`);
    expect(html + stepDescription(result, 3)).not.toMatch(/(?:PFK-2|FBPase-2)\s*(?:감소|증가)/);
  });
  it('displays opposing predicted/applied states while preserving the glucagon upstream in both views', () => {
    const before = deriveRegulation('glucagonDominant');
    const fixed = deriveRegulation('glucagonDominant', {mode: 'clamped', level: 'high'});
    const flow = renderToStaticMarkup(<InterventionFlow result={fixed} step={5} clamped />);
    const sectionText = (id: string, html: string) => plain(html.match(new RegExp(`data-testid="${id}"[^>]*>([\\s\\S]*?)</(?:div|p)>`))![1]);
    const upstream = sectionText('reg-preserved-upstream', flow);
    expect(upstream).toContain('글루카곤 우세 · 상위 상태 유지');
    expect(upstream).toContain('조절 Ser 인산화 방향 · PKA');
    expect(upstream).toContain(`PFK-2 ${before.pfk2}`);
    expect(upstream).toContain(`FBPase-2 ${before.fbpase2}`);
    expect(upstream).not.toContain('인슐린 우세');
    expect(sectionText('reg-predicted-f26', flow)).toContain('F-2,6-BP 낮음');
    expect(sectionText('reg-applied-f26', flow)).toContain('F-2,6-BP 높음');
    expect(plain(flow)).toContain('가상 개입으로 덮어쓰기 · 하위 효과만 변경');
    const results = renderToStaticMarkup(<Results result={fixed} step={5} clamped />);
    expect(sectionText('reg-result-predicted', results)).toContain('F-2,6-BP 낮음');
    expect(sectionText('reg-result-applied', results)).toContain('F-2,6-BP 높음');
    const restored = plain(renderToStaticMarkup(<InterventionFlow result={deriveRegulation('glucagonDominant', HORMONE_DRIVEN)} step={5} clamped={false} />));
    expect(restored.match(/F-2,6-BP 낮음/g)).toHaveLength(2);
    expect(restored).toContain('호르몬 예측을 그대로 적용');
    expect(restored).not.toContain('가상 개입으로 덮어쓰기');
  });
  it('explains liver kinetic parameters without equating Km to binding affinity or mixing fold changes', () => {
    const text = plain(renderToStaticMarkup(<KineticExplanation />));
    expect(text).toContain('간 PFKFB1 · L형');
    expect(text).toContain('F6P에 대한 apparent Km 증가 ↑');
    expect(text).toContain('같은 substrate 조건');
    expect(text).toContain('Vmax 증가 ↑');
    expect(text).toContain('결합 친화도(binding affinity)와 동일한 값으로 해석하지 않습니다');
    expect(text).not.toMatch(/Km\s*=\s*(?:binding affinity|affinity|친화도)|\d+(?:[-–]\d+)?\s*(?:배|fold)/i);
    expect(text).toContain('1339450');
    expect(text).toContain('8390983');
    expect(text).toContain('10749675');
    expect(renderToStaticMarkup(<HormonalRegulation />)).not.toContain('data-testid="reg-kinetic-explanation"');
  });
  it('keeps a collapsed isoform caution with liver and site/context-specific heart examples', () => {
    const html = renderToStaticMarkup(<IsoformCaution />);
    const text = plain(html);
    expect(html).toMatch(/^<details[^>]*>/);
    expect(html).not.toContain('open=');
    expect(text).toContain('다른 조직에서도 같을까?');
    expect(text).toContain('N-terminal 조절 Ser');
    expect(text).toContain('심장 계열 PFKFB2');
    expect(text).toContain('특정 C-terminal 부위');
    expect(text).toContain('isoform, phosphorylation site, signaling context');
    expect(text).toContain('일반화할 수 없습니다');
    expect(text).toContain('기본 규칙은 간 PFKFB1 · L형에만 적용');
    expect(text).toContain('15170386');
  });
  it('states the indirect insulin evidence without imposing a single phosphatase cascade', () => {
    const text = plain(renderToStaticMarkup(<HormonalRegulation />));
    expect(text).toContain('순탈인산화 쪽으로');
    expect(text).toContain('하나 이상의 phosphatase');
    expect(text).toContain('간접 근거');
    expect(text).toContain('2158992');
    expect(text).not.toMatch(/insulin\s*→\s*Akt\s*→|인슐린\s*→\s*Akt\s*→|Akt\s*→\s*(?:PP2A|PP1)/i);
    expect(stepDescription(deriveRegulation('insulinDominant'), 1)).toContain('단일 phosphatase 경로로 고정하지 않습니다');
  });
  it('initial DOM has no answer, result, intervention explanation or active signal buttons', () => {
    const html = renderToStaticMarkup(<HormonalRegulation />);
    expect(html).not.toContain('촉진 방향');
    expect(html).not.toContain('활성화 자극 증가');
    expect(html).not.toContain('data-testid="reg-results"');
    expect(html).not.toContain('data-testid="reg-explanation"');
    expect(html).toMatch(/disabled=""[^>]*data-testid="signal-insulinDominant"/);
    expect(html).toContain('아직 비교하지 않음');
  });
  it.each([false, true])('Reveal never mounts an explanation until explicitly opened (gate %s)', gate => {
    expect(renderToStaticMarkup(<Reveal gate={gate} gateMessage="관찰하세요">SECRET_EXPLANATION</Reveal>)).not.toContain('SECRET_EXPLANATION');
  });
  it.each(scenarios.flatMap(s => [0,1,2,3,4,5].map(step => ({s, step}))))('one polypeptide and both domains persist: $s stage $step', ({s, step}) => {
    const result = deriveRegulation(s);
    const html = renderToStaticMarkup(<Pathway result={step ? result : null} step={step} clamped={false} onCompare={() => {}} />);
    expect(html.match(/data-testid="one-polypeptide"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="pfk2-domain"');
    expect(html).toContain('data-testid="fbpase2-domain"');
    const right = renderToStaticMarkup(<Results result={result} step={step} clamped={false} />);
    expect(right.includes('data-testid="reg-results"')).toBe(step === 5);
    if (step < 5) expect(right).not.toContain(result.glycolysis);
  });
  it('labels the initial ATP nucleotide as the phosphate donor', () => {
    const trace = renderToStaticMarkup(<PhosphateTrace />);
    expect(trace).toContain('<b>ATP</b><small>말단 인산기 공여체</small>');
    expect(trace).not.toContain('<b>ADP</b>');
    expect(trace).not.toContain('인산기 전달 후 생성물');
  });
  it('separates protein, sugar and hydrolysis reactions', () => {
    const trace = renderToStaticMarkup(<PhosphateTrace />);
    expect(trace).toContain('PKA → 단백질');
    expect(trace).toContain('PFK-2 → 당');
    expect(trace).toContain('protein phosphatase');
    expect(trace).toContain('cAMP는 인산기 공여체가 아닙니다');
    const pathway = renderToStaticMarkup(<Pathway result={deriveRegulation('glucagonDominant')} step={5} clamped={false} onCompare={() => {}} />).replace(/<[^>]*>/g, '');
    expect(pathway).toContain('F6P + ATP → F-2,6-BP + ADP');
    expect(pathway).toContain('F6P + Pi ← F-2,6-BP + H₂O');
    expect(pathway).not.toContain('⇌');
    const sugar = renderToStaticMarkup(<SugarComparison onClose={() => {}} />);
    expect(sugar).toContain('인산기 위치 2, 6');
    expect(sugar).toContain('인산기 위치 1, 6');
    expect(sugar).not.toMatch(/F-2,6-BP\s*→\s*F-1,6-BP/);
  });
  it('does not make quantitative or universal claims', () => {
    const dir = join(import.meta.dirname, '../src/modules/regulation');
    const text = readdirSync(dir).filter(f => /\.tsx?$/.test(f)).map(f => readFileSync(join(dir, f), 'utf8')).join('\n');
    expect(text).not.toMatch(/100%|0%|\bON\b|\bOFF\b|μM|인산화는 항상 활성화/);
    expect(text).toContain('실제 대사속도나 혈당을 계산하지 않습니다');
  });
});

describe('audited experimental structure', () => {
  const deposited = parseStructure(read('1K6M.pdb'));
  const assembly = parseStructure(read('1K6M-assembly1-protein.pdb'), '*');
  it('validates raw and processed hashes without relying on the same generation script', () => {
    for (const f of provenance.files) expect(createHash('sha256').update(readFileSync(join(dataDir, f.name))).digest('hex'), f.name).toBe(f.sha256);
  });
  it('preserves species, numbering, domain mapping and absent Ser33', () => {
    expect(provenance.species).toBe('Homo sapiens');
    expect(provenance.reference).toBe('P16118-1');
    expect(assembly.chains).toEqual(['A','C']);
    expect(assembly.residues).toHaveLength(864);
    for (const chain of assembly.chains) {
      const residues = assembly.residues.filter(r => r.chain === chain);
      expect([residues[0].resSeq, residues.at(-1)!.resSeq]).toEqual([39,470]);
      expect(residues.filter(r => domainOf(r) === 'pfk2')).toHaveLength(211);
      expect(residues.filter(r => domainOf(r) === 'fbpase2')).toHaveLength(221);
      expect(residues.some(r => canonicalNumber(r.resSeq) === 33)).toBe(false);
    }
    expect(labelNumber(39)).toBe(1);
    expect(canonicalNumber(470)).toBe(471);
    expect(REGULATION_STRUCTURE.regulatorySerHasCoordinates).toBe(false);
    expect(assembly.atoms.every(a => a.kind === 'polymer')).toBe(true);
  });
  it('uses registered assembly 1 A + operator 2(A), not deposited B', () => {
    const cif = read('1K6M.cif');
    expect(cif).toContain('1 1,2 A,C,D,E,I');
    const a = assembly.atoms.filter(x => x.chain === 'A');
    const c = assembly.atoms.filter(x => x.chain === 'C');
    expect(a.map(x => x.position)).toEqual(deposited.atoms.filter(x => x.kind === 'polymer').map(x => x.position));
    expect(c).toHaveLength(a.length);
    // Check every coordinate using the maximum error; avoid thousands of matcher calls
    // competing with the existing exhaustive energy-domain test's timeout budget.
    const maxErrors = [0,0,0];
    for (let i = 0; i < a.length; i++) {
      const expected = [-a[i].position[0] - 1.0954984649, a[i].position[1], -a[i].position[2] + 89.6633078975];
      for (let axis = 0; axis < 3; axis++) maxErrors[axis] = Math.max(maxErrors[axis], Math.abs(c[i].position[axis] - expected[axis]));
    }
    expect(maxErrors[0]).toBeLessThan(0.0005);
    expect(maxErrors[1]).toBe(0);
    expect(maxErrors[2]).toBeLessThan(0.0005);
  });
  it('records four declared mutations and a separate unclassified discrepancy', () => {
    expect(provenance.declaredMutationsCanonical).toEqual(['W68F','W302F','W323F','D410E']);
    expect(provenance.sequenceDifferences).toHaveLength(5);
    expect(provenance.sequenceDifferences.find(x => x.canonical === 305)).toMatchObject({reference: 'H', deposited: 'R'});
    expect(provenance.regulatorySer.evidence).toContain('by similarity');
    expect(provenance.unresolvedWithinDepositedEntity).toEqual([]);
  });
  it('keeps experimental coordinates independent of hormone inputs', () => {
    const before = assembly.atoms.map(a => [...a.position]);
    for (const s of scenarios) for (const level of ['low','high'] as const) deriveRegulation(s, {mode: 'clamped', level});
    expect(assembly.atoms.map(a => a.position)).toEqual(before);
    const source = readFileSync(join(import.meta.dirname, '../src/modules/regulation/ProteinStructure.tsx'), 'utf8');
    expect(source).not.toMatch(/\.position\s*=|\.position\[.*\]\s*=/);
    expect(source).toContain('const structure = parseStructure');
    expect(source).toContain('spheres: new Set()');
    expect(source).toContain('Ser schematic은 실제 3D 위치가 아닙니다');
    expect(source).toContain('독립적인 2D 개념도');
    expect(source).toContain('한 사슬의 PFK-2 / FBPase-2 catalytic domains');
    expect(source).toContain('dimer architecture');
    expect(source).toContain('phosphorylation 전후의 실제 atomic motion');
    expect(source).not.toMatch(/regulatorySerHasCoordinates:\s*true|resSeq\s*===\s*(?:32|33)/);
  });
});
