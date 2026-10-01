import {hashFor, moduleEntry, moduleFromHash, type ModuleId} from './modules';

/** Only sections with existing Reference content, in the module rail's learning order. */
export const MODEL_NOTES_SECTIONS = [
  {id: 'common', module: null},
  {id: 'energy', module: 'reaction-energy'},
  {id: 'carbonic', module: 'carbonic-anhydrase'},
  {id: 'kinetics', module: 'kinetics'},
  {id: 'regulation', module: 'regulation'},
] as const;
export type ModelNotesSection = typeof MODEL_NOTES_SECTIONS[number]['id'];

export const modelNotesTarget = (section: ModelNotesSection) => `model-notes-${section}`;
export const modelNotesHash = (section: ModelNotesSection) => `${hashFor('model-notes')}?section=${section}`;
export const modelNotesLabel = (section: typeof MODEL_NOTES_SECTIONS[number]) => {
  if (!section.module) return '전체 공통';
  const entry = moduleEntry(section.module);
  return `${entry.number} · ${entry.title}`;
};

export function modelNotesSectionFromHash(hash: string): ModelNotesSection | null {
  if (moduleFromHash(hash) !== 'model-notes') return null;
  const value = new URLSearchParams(hash.split('?')[1] ?? '').get('section');
  return MODEL_NOTES_SECTIONS.find(section => section.id === value)?.id ?? null;
}

export const pageTitle = (module: ModuleId) => `${moduleEntry(module).title} · Enzyme Explorer`;

export function focusModelNotesSection(section: ModelNotesSection) {
  const heading = document.getElementById(modelNotesTarget(section));
  heading?.focus({preventScroll: true});
  heading?.scrollIntoView({block: 'start', behavior: 'auto'});
}
