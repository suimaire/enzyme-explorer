export type Scenario = 'insulinDominant' | 'glucagonDominant';
export type Level = 'low' | 'high';
export type F26Control = {mode: 'hormoneDriven'} | {mode: 'clamped'; level: Level};
export type View = 'pathway' | 'structure' | 'intervention';
export const HORMONE_DRIVEN: F26Control = {mode: 'hormoneDriven'};
export const SCENARIO_LABEL: Record<Scenario, string> = {insulinDominant: '인슐린 우세', glucagonDominant: '글루카곤 우세'};
export const LEVEL_LABEL: Record<Level, string> = {low: '낮음', high: '높음'};
export const F26_DIRECTION_LABEL: Record<Level, string> = {low: '감소 방향 ↓', high: '증가 방향 ↑'};
export const STEPS = ['수용체 / 신호전달', '조절 Ser', '두 촉매 활성', 'F-2,6-BP', '하위 조절 방향'] as const;
export const SCOPE_NOTE = '다른 조절 요인을 고정했을 때 이 조절축이 유도하는 방향입니다. 실제 대사속도나 혈당을 계산하지 않습니다.';

/** One source of biochemical truth. Narration controls disclosure, never the chemistry. */
export function deriveRegulation(scenario: Scenario, control: F26Control = HORMONE_DRIVEN) {
  const phosphorylated = scenario === 'glucagonDominant';
  const hormoneF26: Level = phosphorylated ? 'low' : 'high';
  const effectiveF26 = control.mode === 'clamped' ? control.level : hormoneF26;
  const high = effectiveF26 === 'high';
  return {
    scenario, phosphorylated, pfk2: phosphorylated ? '상대적 활성 감소 ↓' : '상대적 활성 증가 ↑', fbpase2: phosphorylated ? '상대적 활성 증가 ↑' : '상대적 활성 감소 ↓',
    hormoneF26, effectiveF26, pfk1: high ? '활성화 자극 증가 ↑' : '활성화 자극 감소 ↓',
    fbpase1: high ? '억제 증가 ┤' : '억제 완화', glycolysis: high ? '촉진 방향 ↑' : '억제 방향 ↓',
    gluconeogenesis: high ? '억제 방향 ↓' : '촉진 방향 ↑',
  };
}
export type RegulationResult = ReturnType<typeof deriveRegulation>;
export type Narration = {status: 'idle' | 'playing' | 'paused' | 'completed'; step: number; run: number};
export type LabState = {
  scenario: Scenario | null; control: F26Control; view: View; narration: Narration;
  observed: Scenario[]; interventionObserved: boolean;
};
export const INITIAL_STATE: LabState = {scenario: null, control: HORMONE_DRIVEN, view: 'pathway', narration: {status: 'idle', step: 0, run: 0}, observed: [], interventionObserved: false};
export type Action =
  | {type: 'signal'; scenario: Scenario; reducedMotion: boolean}
  | {type: 'tick'; run: number; step: number}
  | {type: 'pause'} | {type: 'play'} | {type: 'previous'} | {type: 'next'} | {type: 'restart'} | {type: 'reset'}
  | {type: 'view'; view: View} | {type: 'control'; control: F26Control};
const observe = (state: LabState, step: number): LabState => ({...state, observed: step === 5 && state.scenario ? [...new Set([...state.observed, state.scenario])] : state.observed});
function move(state: LabState, step: number, playing = false): LabState {
  return observe({...state, narration: {step, run: state.narration.run + 1, status: step === 5 ? 'completed' : playing ? 'playing' : 'paused'}}, step);
}
export function regulationReducer(state: LabState, action: Action): LabState {
  const n = state.narration;
  switch (action.type) {
    case 'signal': return move({...state, scenario: action.scenario, interventionObserved: false}, action.reducedMotion ? 5 : 1, !action.reducedMotion);
    case 'tick': return n.status === 'playing' && n.run === action.run && n.step === action.step ? move(state, Math.min(5, n.step + 1), true) : state;
    case 'pause': return n.status === 'playing' ? {...state, narration: {...n, status: 'paused', run: n.run + 1}} : state;
    case 'play': return state.scenario ? move(state, n.step === 5 ? 1 : n.step, true) : state;
    case 'previous': return state.scenario ? move(state, Math.max(1, n.step - 1)) : state;
    case 'next': return state.scenario ? move(state, Math.min(5, n.step + 1)) : state;
    case 'restart': return state.scenario ? move(state, 1) : state;
    case 'reset': return {...INITIAL_STATE, narration: {...INITIAL_STATE.narration, run: n.run + 1}};
    case 'view': return {...state, view: action.view, narration: {...n, run: n.run + 1, status: n.status === 'playing' ? 'paused' : n.status}};
    case 'control': return state.observed.length === 2 && n.step === 5 ? {...state, control: action.control, interventionObserved: action.control.mode === 'clamped'} : state;
  }
}

export function stepDescription(result: RegulationResult | null, step: number): string {
  if (!result) return '아직 비교하지 않음. 예측을 확정한 뒤 호르몬 신호를 보내세요.';
  return [
    '',
    result.phosphorylated ? '글루카곤 수용체 → Gs → adenylyl cyclase → cAMP 증가 → PKA 활성화.' : '인슐린 수용체 신호 이후의 세부 전달은 요약합니다. 단일 phosphatase 경로로 고정하지 않습니다.',
    result.phosphorylated ? 'PKA가 ATP의 말단 인산기를 단백질의 조절 Ser에 전달합니다.' : '순탈인산화가 우세한 조절 상태입니다. 인산기 제거는 protein phosphatase가 수행합니다.',
    `한 사슬의 두 도메인이 유지됩니다. PFK-2 ${result.pfk2}, FBPase-2 ${result.fbpase2}.`,
    `호르몬 조절이 예측하는 F-2,6-BP: ${LEVEL_LABEL[result.hormoneF26]} · ${F26_DIRECTION_LABEL[result.hormoneF26]}. 하위 효소에 적용되는 상태: ${LEVEL_LABEL[result.effectiveF26]}.`,
    `PFK-1 ${result.pfk1}; FBPase-1 ${result.fbpase1}. 이 조절축의 방향을 오른쪽에서 확인하세요.`,
  ][step];
}
