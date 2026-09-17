import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {moduleFromHash, hashFor, MODULES} from '../src/app/modules';

/**
 * A guard against the specific over-simplifications this app exists to avoid.
 *
 * It reads the source of every component and looks for the claims themselves, so a future edit cannot
 * quietly reintroduce one. The student-facing copy is Korean with English technical terms, so every claim is
 * checked in both languages. A fragment that negates or refutes a claim ("is not", "never", "않습니다",
 * "아닙니다", "없습니다") is allowed, because refuting a misconception out loud is part of the teaching.
 */

const SOURCE_DIR = join(import.meta.dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const FILES = sourceFiles(SOURCE_DIR).map((path) => ({path, text: readFileSync(path, 'utf8')}));

/**
 * Splits text into fragments a claim cannot straddle, so a nearby "not" in another sentence does not excuse one.
 * A question mark ends a fragment too: an open question ("…배위할까?") is not a claim.
 */
const fragments = (text: string) => text.split(/[.?\n]/);
const NEGATED_EN = /\bnot\b|\bnever\b|\bfalse\b|\bcannot\b|\bno\b|\bdoes not\b|\bwithout\b/i;
/** Korean negation and refutation: 않다, 아니다/아닌, 없다, 못하다, 틀리다, 잘못, 안 된다. */
const NEGATED_KO = /않|아니|아닌|아닙|없|못|틀렸|틀린|잘못|안\s*됩니다|안\s*된다/;
const negated = (fragment: string) => NEGATED_EN.test(fragment) || NEGATED_KO.test(fragment);

const BANNED: {claim: RegExp; why: string}[] = [
  // Km and affinity
  {claim: /Km\s*(=|is|means|measures|equals)\s*(the\s+)?affinity/i, why: 'Km is not, in general, a measure of binding affinity'},
  {
    claim: /Km[은는이가]?\s*(곧\s*)?(기질\s*)?(결합\s*)?친화도(이다|다|입니다|와 같다|와 같습니다|를 (나타낸다|나타냅니다|의미한다|의미합니다|뜻한다|뜻합니다))/,
    why: 'Km은 일반적으로 결합 친화도 자체가 아니다',
  },
  {
    claim: /Km[이가은는]?\s*(작을수록|낮을수록|클수록|높을수록)[^.]{0,40}친화도[^.]{0,10}(높|낮|크|작|강|약)/,
    why: 'Km의 크기만으로 친화도의 높고 낮음을 단정할 수 없다',
  },
  // Energy and equilibrium
  {claim: /enzymes?\s+(give|gives|add|adds|supply|supplies|provide|provides)\s+energy/i, why: 'enzymes do not supply energy to reactions'},
  {claim: /(효소|촉매)[^.]{0,20}에너지를\s*(공급|제공|준다|줍니다|더해)/, why: '효소는 반응에 에너지를 공급하지 않는다'},
  {
    claim: /(enzymes?|catalysts?)[^.]{0,30}(lower|lowers|reduce|reduces|change|changes)\s+(the\s+)?ΔG(?![‡°])/i,
    why: 'a catalyst does not change ΔG',
  },
  {
    claim: /(효소|촉매)[^.]{0,40}ΔG(?![‡°])\s*(을|를|가|이|값을|값이)?\s*(낮춘|낮추|낮아진|낮아집|감소시|줄인|줄입|바꾼|바꿉|변화시)/,
    why: '효소는 ΔG를 바꾸지 않는다',
  },
  {claim: /(move|moves|shift|shifts|pull|pulls)\s+(the\s+)?equilibrium/i, why: 'a catalyst does not move the equilibrium position'},
  {claim: /평형[^.]{0,15}(생성물|반응물)\s*쪽으로\s*(이동|옮)/, why: '촉매는 평형을 한쪽으로 이동시키지 않는다'},
  {claim: /(효소|촉매)[^.]{0,30}평형[^.]{0,10}(을|를)\s*(이동시|옮기|옮깁|바꾼|바꿉)/, why: '촉매는 평형의 위치를 바꾸지 않는다'},
  {claim: /(favourable|favorable|ΔG\s*<\s*0)[^.]{0,60}(therefore|so)[^.]{0,30}fast/i, why: 'a negative ΔG does not imply a fast reaction'},
  {
    claim: /(ΔG\s*<\s*0|ΔG가 음수|열역학적으로 유리)[^.]{0,30}(이면|하면|라면|이므로|하므로)[^.]{0,30}빠르(다|게 일어난다|게 일어납니다|고)/,
    why: 'ΔG < 0이라고 해서 반응이 빠른 것은 아니다',
  },
  {claim: /reaction\s+coordinate[^.]{0,30}\b(is|as|means)\b[^.]{0,10}time/i, why: 'the reaction coordinate is not a time axis'},
  {claim: /반응\s*좌표[^.]{0,30}시간(이다|입니다|축이다|축입니다|을 나타|을 의미)/, why: '반응 좌표는 시간축이 아니다'},
  // Kinetics scope
  {claim: /all\s+enzymes\s+follow/i, why: 'not all enzymes follow Michaelis–Menten kinetics'},
  {claim: /모든\s*효소[가는]?\s*Michaelis/, why: '모든 효소가 Michaelis–Menten 반응속도론을 따르지는 않는다'},
  // Carbonic anhydrase
  {claim: /(Zn|zinc)[^.]{0,60}(gives|provides|supplies|donates|hands)[^.]{0,20}(OH|hydroxide)/i, why: 'Zn²⁺ does not hand a hydroxide to the substrate'},
  {claim: /Zn[^.]{0,40}(OH⁻|OH-|수산화\s*이온|수산화물)[^.]{0,20}(제공|공급|건네|내어|준다|줍니다)/, why: 'Zn²⁺가 OH⁻를 제공하는 것이 아니다'},
  {claim: /His\s*-?\s*64[^.]{0,40}(binds|bonds|coordinates|ligates)[^.]{0,20}Zn/i, why: 'His64 is not a direct Zn ligand'},
  {
    claim: /His\s*-?\s*64[^.]{0,40}(Zn|금속)[^.]{0,20}(직접\s*)?(배위한다|배위합니다|배위하는 리간드이다|리간드이다|리간드입니다|결합한다|결합합니다)/,
    why: 'His64는 Zn²⁺에 직접 배위하지 않는다',
  },
  {claim: /(PDB|structure|coordinates)[^.]{0,40}shows?[^.]{0,20}proton\s+transfer/i, why: 'a static structure does not show proton transfer'},
  {
    claim: /(PDB|구조|좌표)[^.]{0,30}양성자\s*이동[^.]{0,20}(보여 준다|보여 줍니다|보인다|보입니다|관찰된다|관찰됩니다)/,
    why: '정적인 구조는 양성자 이동을 보여 주지 않는다',
  },
  {claim: /Zn[––-]?OH[⁻-]?\s+(observed|seen|shown)/i, why: 'the protonation state is an interpretation, not an observation'},
  {
    claim: /(Zn|금속)[^.]{0,20}(수산화\s*이온|OH⁻)[^.]{0,20}(관찰|확인)(된다|됩니다|했다|했습니다)/,
    why: '양성자화 상태는 관찰이 아니라 해석이다',
  },
  {
    claim: /His\s*-?\s*64[^.]{0,30}(네 번째\s*)?(단백질\s*)?(Zn²?⁺?|금속)[^.]{0,6}(리간드|배위\s*잔기)(이다|입니다|다)/,
    why: 'His64는 Zn²⁺의 리간드가 아니다',
  },
  // Structure-reading guide (Module 02, Stage 2)
  {
    claim: /배위\s*(결합)?[은는이가]?[^.]{0,30}(완전히|전혀)\s*(별개|다른|특별한)[^.]{0,15}결합(이다|입니다)/,
    why: '배위는 다른 화학 결합과 완전히 별개인 특별한 결합으로 가르치지 않는다',
  },
  {
    claim: /잔기\s*번호[은는이가]?[^.]{0,30}(항상|언제나|반드시)[^.]{0,30}번째\s*아미노산(이다|입니다|과 같다|과 같습니다)/,
    why: '잔기 번호는 PDB numbering이며 사슬의 순서와 항상 같지는 않다',
  },
  {
    claim: /(가까이|근처에)\s*있(으면|기만 하면)[^.]{0,20}(직접\s*)?배위(한다|합니다|하는 것이다)/,
    why: '근처에 있다는 것만으로 직접 배위라고 판단하지 않는다',
  },
];

/** Every fragment of `text` that makes a banned claim without negating it. */
const offendingFragments = (text: string, claim: RegExp) =>
  fragments(text).filter((fragment) => claim.test(fragment) && !negated(fragment));

describe('language guards', () => {
  it.each(BANNED)('never states: $why', ({claim}) => {
    const offenders: string[] = [];
    for (const file of FILES)
      for (const fragment of offendingFragments(file.text, claim)) offenders.push(`${file.path}: ${fragment.trim()}`);
    expect(offenders).toEqual([]);
  });

  /** The detector itself: affirmative misconceptions are caught, and sentences that refute them are not. */
  const flagged = (sentence: string) => BANNED.some(({claim}) => offendingFragments(sentence, claim).length > 0);

  it.each([
    'Km은 친화도이다.',
    'Km은 기질 결합 친화도입니다.',
    'Km이 작을수록 친화도가 높다.',
    '효소는 ΔG를 낮춘다.',
    '효소는 평형을 생성물 쪽으로 이동시킨다.',
    '촉매는 평형을 이동시킨다.',
    'Zn²⁺가 OH⁻를 제공한다.',
    'Zn²⁺는 기질에 수산화 이온을 건네준다.',
    'His64가 Zn²⁺에 직접 배위한다.',
    '반응 좌표는 시간이다.',
    'ΔG < 0이면 반응이 빠르다.',
    '효소는 반응에 에너지를 공급한다.',
    '모든 효소는 Michaelis–Menten 반응속도론을 따른다.',
    'PDB 구조는 양성자 이동을 보여 준다.',
    'His64는 Zn²⁺의 리간드이다.',
    '배위 결합은 공유 결합과 완전히 별개인 특별한 결합이다.',
    '잔기 번호는 항상 앞에서부터 센 번째 아미노산과 같습니다.',
    'Zn²⁺ 근처에 있으면 직접 배위한다.',
    'Km = affinity',
    'The enzyme shifts the equilibrium towards products',
  ])('flags the misconception: %s', (sentence) => {
    expect(flagged(sentence)).toBe(true);
  });

  it.each([
    'Km은 친화도가 아닙니다.',
    'Km이 작을수록 친화도가 높다고 일반적으로 단정할 수 없습니다.',
    '효소는 ΔG를 바꾸지 않습니다.',
    '효소가 있어도 평형의 위치는 변하지 않습니다.',
    '촉매는 평형을 생성물 쪽으로 이동시키지 않습니다.',
    'Zn²⁺는 수산화 이온을 건네주는 것이 아닙니다.',
    'His64는 Zn²⁺에 직접 배위하지 않습니다.',
    'His64는 Zn²⁺에 직접 배위할까?',
    '반응 좌표는 시간축이 아닙니다.',
    'ΔG < 0인 반응은 반드시 빠르게 일어날까?',
    '“모든 효소가 Michaelis–Menten 반응속도론을 따른다”는 말은 틀렸습니다.',
    '결정 구조는 양성자 이동도 양성자화 상태도 직접 보여 주지 않습니다.',
    'His64는 Zn²⁺의 리간드가 아닙니다.',
    '번호는 사슬 앞에서부터 센 순서와 항상 같지는 않습니다.',
    '근처에 있다는 것만으로는 직접 배위가 아닙니다.',
    'Km is not, in general, a direct measure of affinity',
  ])('does not flag a refutation or an open question: %s', (sentence) => {
    expect(flagged(sentence)).toBe(false);
  });

  it('keeps the safeguards that replace those claims', () => {
    const all = FILES.map((f) => f.text).join('\n');
    // The Km caution, verbatim.
    expect(all).toContain('Km을 기질 결합 친화도(binding affinity)와 단순히 같은 값으로 해석하면 안 됩니다');
    expect(all).toContain('기질 결합 친화도가 어떻게 변했는지 일반적으로 단정할 수 없습니다');
    expect(all).toContain('v₀ = Vmax/2가 되는 기질 농도');
    expect(all).toContain('Km의 크기만으로 기질 결합 친화도(binding affinity)를 일반적으로 단정할 수 없습니다');
    // The equilibrium position is stated as unchanged.
    expect(all).toContain('효소가 있어도 평형의 위치는 변하지 않습니다');
    // The solvent position is never named as a hydroxide, in the panels or in the viewer label.
    expect(all).toContain('Zn²⁺에 결합한 solvent');
    expect(all).toContain("'Zn²⁺ 결합 solvent'");
    // The Stage 2 reading guide explains the label, the two histidine nitrogens and coordination, and keeps
    // the verdict tied to a measured distance rather than to proximity alone.
    expect(all).toContain('histidine의 세 글자 약어');
    expect(all).toContain('사슬 앞에서부터 센 순서와 항상 같지는');
    expect(all).toContain('<strong>ND1</strong>, <strong>NE2</strong>로 적습니다');
    expect(all).toContain('금속–리간드 상호작용');
    expect(all).toContain('비공유 전자쌍');
    expect(all).toContain('근처에 있다는 것만으로는 직접 배위가 아닙니다');
    // Stage 4 keeps His64 a non-ligand in every rendered form, and its role an interpretation.
    expect(all).toContain('Zn²⁺에 직접 배위하지 않습니다');
    expect(all).toContain("NON_LIGAND_NOTE = '직접 배위 안 함'");
    expect(all).toContain('양성자 셔틀(proton shuttle)과 관련된 잔기');
    // Teaching-model and experimental/interpretation labelling exist and are used.
    expect(all).toContain('교육용 모델');
    expect(all).toContain('반응 메커니즘 해석');
    expect(all).toContain('실험 구조 데이터');
    // The reaction coordinate carries its disclaimer on the axis itself, at every width.
    expect(all).toContain('반응 경로를 따라 진행되는 정도를 나타낸 개념적 좌표이며, 시간축이 아닙니다.');
    expect(all).toContain('시간축 아님');
    // Hydrogen-bond language stays hedged if it is used at all.
    for (const file of FILES)
      for (const fragment of fragments(file.text))
        if (/hydrogen[- ]bond|수소\s*결합/i.test(fragment))
          expect(fragment, `${file.path}: ${fragment.trim()}`).toMatch(/possible|inference|geometry|may be|not\b|가능|추론|기하|않|아닌/i);
  });
});

describe('module registry and hash navigation', () => {
  it('routes every registered module and falls back to the start page', () => {
    for (const m of MODULES) {
      expect(moduleFromHash(hashFor(m.id))).toBe(m.id);
      expect(moduleFromHash(`#${m.id}`)).toBe(m.id);
    }
    for (const junk of ['', '#', '#/', '#/nope', '#/kinetics/extra', 'kinetics']) expect(moduleFromHash(junk)).toBe('start');
    expect(moduleFromHash('#/kinetics?from=start')).toBe('kinetics');
  });

  it('marks exactly the two Enzyme II modules as planned', () => {
    expect(MODULES.filter((m) => m.status === 'planned').map((m) => m.id)).toEqual(['inhibition', 'regulation']);
    expect(MODULES.filter((m) => m.number !== null).map((m) => m.number)).toEqual(['01', '02', '03', '04', '05']);
  });
});
