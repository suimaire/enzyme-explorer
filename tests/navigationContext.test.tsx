import {describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {App} from '../src/app/App';
import {MODULES, moduleFromHash} from '../src/app/modules';
import {MODEL_NOTES_SECTIONS, focusModelNotesSection, modelNotesHash, modelNotesSectionFromHash, modelNotesTarget, pageTitle} from '../src/app/modelNotesNavigation';
import {ModelNotes} from '../src/modules/notes/ModelNotes';
import {ReactionEnergyLab} from '../src/modules/reaction-energy/ReactionEnergyLab';
import {KineticsLab} from '../src/modules/kinetics/KineticsLab';
import {MechanisticCaveatPanel} from '../src/modules/kinetics/MechanisticCaveatPanel';
import {ChemistryPanel} from '../src/modules/carbonic-anhydrase/ChemistryPanel';
import {HormonalRegulation} from '../src/modules/regulation/HormonalRegulation';

const notes = () => renderToStaticMarkup(<ModelNotes />);

describe('Reference routes and content', () => {
  it.each(MODEL_NOTES_SECTIONS)('targets $id without changing the module route', ({id}) => {
    const hash = modelNotesHash(id);
    expect(moduleFromHash(hash)).toBe('model-notes');
    expect(modelNotesSectionFromHash(hash)).toBe(id);
    expect(notes()).toContain(`id="${modelNotesTarget(id)}" tabindex="-1"`);
  });
  it.each(['#/model-notes', '#/model-notes?section=missing', '#/kinetics?section=kinetics', '#/unknown?section=energy', '#/model-notes#kinetics', 'model-notes?section=energy'])('ignores invalid or unrelated section requests: %s', hash => {
    expect(modelNotesSectionFromHash(hash)).toBeNull();
  });
  it('has five semantic TOC links and follows the actual rail learning order', () => {
    const html = notes();
    const toc = html.match(/<nav[\s\S]*?<\/nav>/)![0];
    expect(toc.match(/<a /g)).toHaveLength(5);
    const ids = [...html.matchAll(/<h3 id="model-notes-([^"]+)"/g)].map(match => match[1]);
    expect(ids).toEqual(['common', 'energy', 'carbonic', 'kinetics', 'regulation']);
    expect(html).not.toContain('model-notes-inhibition');
  });
  it('keeps essential limitations outside all collapsed disclosures', () => {
    const visible = notes().replace(/<details[\s\S]*?<\/details>/g, '');
    for (const text of ['시간축이 아닙니다', '설정값입니다', '영상이 아닙니다', '양성자화 상태', '수소 결합', '수업용 요약', '초기 속도 조건', '알로스테릭', 'Km은', '정성적 모델', 'Ser33은 construct에 포함되지 않습니다']) expect(visible).toContain(text);
    expect(notes().match(/<details/g)).toHaveLength(4);
    expect(notes()).not.toContain('<details open');
  });
  it('retains detailed scientific caveats and the original source destination', () => {
    for (const text of ['ΔG와 ΔG°', '298 K', '2.6 Å', '126번', 'alternate conformation', '비가역 반응', '점근값', 'H305R', 'ECO:0000250', '40–471', '대칭 변환된 A', 'https://www.rcsb.org/structure/2CBA']) expect(notes()).toContain(text);
  });
  it.each(MODEL_NOTES_SECTIONS.filter(section => section.module))('offers a concrete return route from $id', ({module}) => {
    expect(notes()).toContain(`href="#/${module}"`);
  });
  it('links 01, 02, both 03 explanations and 05 to their matching Reference section', () => {
    const cases = [
      [<ReactionEnergyLab />, 'energy'], [<ChemistryPanel unlocked />, 'carbonic'],
      [<KineticsLab />, 'kinetics'], [<MechanisticCaveatPanel />, 'kinetics'],
      [<HormonalRegulation />, 'regulation'],
    ] as const;
    for (const [element, section] of cases) expect(renderToStaticMarkup(element)).toContain(`href="${modelNotesHash(section)}"`);
  });
  it('focuses the section before scrolling to a visible heading', () => {
    const focus = vi.fn(), scrollIntoView = vi.fn();
    vi.stubGlobal('document', {getElementById: vi.fn(() => ({focus, scrollIntoView}))});
    try {
      focusModelNotesSection('kinetics');
      expect(document.getElementById).toHaveBeenCalledWith('model-notes-kinetics');
      expect(focus).toHaveBeenCalledWith({preventScroll: true});
      expect(scrollIntoView).toHaveBeenCalledWith({block: 'start', behavior: 'auto'});
      expect(focus.mock.invocationCallOrder[0]).toBeLessThan(scrollIntoView.mock.invocationCallOrder[0]);
    } finally {vi.unstubAllGlobals();}
  });
});

describe('global context', () => {
  it.each(MODULES)('derives the $id title from the registry', entry => {
    expect(pageTitle(entry.id)).toBe(`${entry.title} · Enzyme Explorer`);
  });
  it('uses the Start title for an unknown route', () => {
    expect(pageTitle(moduleFromHash('#/missing'))).toBe(pageTitle('start'));
  });
  it.each(MODULES)('provides exactly one stable main and a first skip link on $id', entry => {
    vi.stubGlobal('window', {location: {hash: `#/${entry.id}`}});
    try {
      const html = renderToStaticMarkup(<App />);
      expect(html.match(/<main\b/g)).toHaveLength(1);
      expect(html).toContain('<main id="main-content" tabindex="-1"');
      expect(html.startsWith('<a class="skip-link"')).toBe(true);
      expect(html).toContain('본문으로 건너뛰기');
      expect(html).toContain('aria-live="polite"');
    } finally {vi.unstubAllGlobals();}
  });
  it('suppresses the generic live announcement when explicit section focus supplies context', () => {
    vi.stubGlobal('window', {location: {hash: modelNotesHash('kinetics')}});
    try {expect(renderToStaticMarkup(<App />)).toContain('aria-atomic="true"></p>');}
    finally {vi.unstubAllGlobals();}
  });
});
