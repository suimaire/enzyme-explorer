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
  title: string;
  /** The inquiry question the module opens with. */
  question: string;
  status: 'ready' | 'planned';
};

export const MODULES: readonly ModuleEntry[] = [
  {id: 'start', number: null, eyebrow: 'Start', title: 'Start', question: 'How can a protein make a chemical reaction faster?', status: 'ready'},
  {
    id: 'reaction-energy',
    number: '01',
    eyebrow: 'Energy',
    title: 'Reaction Energy',
    question: 'Why can a thermodynamically favourable reaction still be slow?',
    status: 'ready',
  },
  {
    id: 'carbonic-anhydrase',
    number: '02',
    eyebrow: 'Active-site chemistry',
    title: 'Carbonic Anhydrase',
    question: 'How can the chemical environment of an active site change the reactivity of water?',
    status: 'ready',
  },
  {
    id: 'kinetics',
    number: '03',
    eyebrow: 'Kinetics',
    title: 'Enzyme Kinetics Lab',
    question: 'How can we experimentally observe the effect of an enzyme?',
    status: 'ready',
  },
  {id: 'inhibition', number: '04', eyebrow: 'Enzyme II', title: 'Inhibition', question: '', status: 'planned'},
  {id: 'regulation', number: '05', eyebrow: 'Enzyme II', title: 'Regulation', question: '', status: 'planned'},
  {id: 'model-notes', number: null, eyebrow: 'Reference', title: 'Model Notes', question: '', status: 'ready'},
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
