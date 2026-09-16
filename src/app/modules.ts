/**
 * Module registry and hash navigation.
 *
 * Navigation is hash-based on purpose: GitHub Pages serves one static index.html, and a hash never reaches
 * the server, so reloading or deep-linking a module cannot produce a 404. Adding Enzyme II later means
 * adding entries here and one lazy import in App.tsx — module state itself stays inside each module.
 */

export type ModuleId =
  | 'start'
  | 'reaction-energy'
  | 'carbonic-anhydrase'
  | 'kinetics'
  | 'inhibition'
  | 'regulation'
  | 'model-notes';

export type ModuleEntry = {
  id: ModuleId;
  /** Two-digit number shown in the navigation, or null for pages that are not numbered modules. */
  number: string | null;
  eyebrow: string;
  /** Short title used in the navigation and the site header. */
  title: string;
  /** Longer title for the module page itself, when it differs from the navigation title. */
  heading?: string;
  /** The inquiry question the module opens with. */
  question: string;
  status: 'ready' | 'planned';
};

export const MODULES: readonly ModuleEntry[] = [
  {id: 'start', number: null, eyebrow: 'Start', title: '시작', question: '단백질은 어떻게 화학 반응을 더 빠르게 만들 수 있을까?', status: 'ready'},
  {
    id: 'reaction-energy',
    number: '01',
    eyebrow: '에너지',
    title: '반응 에너지',
    question: '열역학적으로 유리한 반응도 왜 느릴 수 있을까?',
    status: 'ready',
  },
  {
    id: 'carbonic-anhydrase',
    number: '02',
    eyebrow: '활성 부위 화학',
    title: '탄산무수화효소',
    heading: '탄산무수화효소의 활성 부위',
    question: '활성 부위의 화학적 환경은 물의 반응성을 어떻게 바꿀까?',
    status: 'ready',
  },
  {
    id: 'kinetics',
    number: '03',
    eyebrow: '반응속도론',
    title: '효소 반응속도론 실험실',
    question: '효소가 반응 속도를 바꾸는 효과를 어떻게 실험적으로 확인할 수 있을까?',
    status: 'ready',
  },
  {id: 'inhibition', number: '04', eyebrow: 'Enzyme II', title: '효소 저해', question: '', status: 'planned'},
  {id: 'regulation', number: '05', eyebrow: 'Enzyme II', title: '효소 조절', question: '', status: 'planned'},
  {id: 'model-notes', number: null, eyebrow: 'Reference', title: '모델 및 주의사항', question: '', status: 'ready'},
];

export const moduleEntry = (id: ModuleId): ModuleEntry => MODULES.find((m) => m.id === id)!;

const IDS = new Set<string>(MODULES.map((m) => m.id));

/**
 * Reads a module id out of a location hash such as "#/kinetics". Anything that is not a hash naming a known
 * module — including an empty hash, a stale link or a string without the leading "#" — falls back to the
 * start page rather than rendering nothing.
 */
export function moduleFromHash(hash: string): ModuleId {
  if (!hash.startsWith('#')) return 'start';
  const id = hash.slice(1).replace(/^\//, '').split('?')[0];
  return IDS.has(id) ? (id as ModuleId) : 'start';
}

export const hashFor = (id: ModuleId): string => `#/${id}`;
