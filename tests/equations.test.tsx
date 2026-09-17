import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {MechanisticCaveatPanel} from '../src/modules/kinetics/MechanisticCaveatPanel';
import {MeasurementConditionNote} from '../src/modules/kinetics/KineticsLab';

/**
 * 03C's equations are read structurally from the rendered markup: which rate constants sit in which part of
 * each fraction. A swapped numerator and denominator, or a k₋₁ whose "−1" has fallen out of its subscript,
 * fails here even if the surrounding copy still looks right.
 */

const html = renderToStaticMarkup(<MechanisticCaveatPanel />);

/** The markup of one displayed equation, found by its test id. */
function equation(testId: string) {
  const match = html.match(new RegExp(`<div class="equation"[^>]*data-testid="${testId}"[^>]*>(.*?)</div>`));
  expect(match, testId).not.toBeNull();
  return match![1];
}
const part = (markup: string, name: 'numerator' | 'denominator') =>
  markup.match(new RegExp(`<span class="fraction-${name}">(.*?)</span></span>(?=<span class="fraction-|</span>)`))?.[1] ?? '';
/** Visible text of a fragment, without markup. */
const text = (markup: string) => markup.replace(/<[^>]+>/g, '');
/** Rate constants in a fragment, in order, as their subscripts: "1", "−1", "cat". */
const rateConstants = (markup: string) => [...markup.matchAll(/<i>k<\/i><sub>(.*?)<\/sub>/g)].map((m) => m[1]);

describe('03C equations', () => {
  it('shows the scheme E + S ⇌ ES → E + P with k₁, k₋₁ and kcat on its arrows', () => {
    const scheme = equation('reaction-scheme');
    expect(scheme).toContain('⇌');
    expect(scheme).toContain('→');
    expect(rateConstants(scheme)).toEqual(['1', '\u22121', 'cat']);
  });

  it('typesets Km = (k₋₁ + kcat) / k₁ as a built-up fraction', () => {
    const km = equation('km-expression');
    expect(km).toMatch(/^<span class="formula-symbol"><i>K<\/i><sub>m<\/sub><\/span> =/);
    expect(rateConstants(part(km, 'numerator'))).toEqual(['\u22121', 'cat']);
    expect(part(km, 'numerator')).toContain(' + ');
    expect(rateConstants(part(km, 'denominator'))).toEqual(['1']);
    expect(text(km)).not.toContain('/');
  });

  it('typesets Kd = k₋₁ / k₁ with the dissociation constant on top', () => {
    const kd = equation('kd-expression');
    expect(kd).toMatch(/^<span class="formula-symbol"><i>K<\/i><sub>d<\/sub><\/span> =/);
    expect(rateConstants(part(kd, 'numerator'))).toEqual(['\u22121']);
    expect(rateConstants(part(kd, 'denominator'))).toEqual(['1']);
    expect(text(kd)).not.toContain('/');
  });

  it('gives each equation a linear reading for assistive technology', () => {
    expect(html).toContain('aria-label="K m = (k −1 + k cat) / k 1"');
    expect(html).toContain('aria-label="K d = k −1 / k 1"');
  });

  it('keeps the Km ≈ Kd limit tied to kcat ≪ k₋₁', () => {
    expect(html).toMatch(/<i>k<\/i><sub>cat<\/sub><\/span> ≪ <span class="formula-symbol"><i>k<\/i><sub>\u22121<\/sub><\/span>인 경우/);
  });

  it('never relies on Unicode subscript digits or minus for rate constants', () => {
    const dir = join(import.meta.dirname, '..', 'src', 'modules');
    const files = readdirSync(dir, {recursive: true, withFileTypes: true}).filter((f) => f.isFile() && f.name.endsWith('.tsx'));
    for (const f of files) expect(readFileSync(join(f.parentPath, f.name), 'utf8'), f.name).not.toMatch(/k[₋₀-₉]/);
  });
});

describe('03B measurement-condition note', () => {
  /** Both states are always in the markup, so the slot's height cannot depend on which one is showing. */
  it.each([true, false])('renders both messages whatever the state (drifted = %s)', (drifted) => {
    const note = renderToStaticMarkup(<MeasurementConditionNote drifted={drifted} onRestore={() => {}} />);
    expect(note).toContain(`data-state="${drifted ? 'drifted' : 'matched'}"`);
    expect(note).toContain('data-testid="drift-note-matched"');
    expect(note).toContain('data-testid="drift-note-drifted"');
    expect(note).toContain('측정점이 곡선 위에 놓이지 않는 것이 정상입니다');
    expect(note).toContain('측정 조건으로 되돌리기');
  });
});
