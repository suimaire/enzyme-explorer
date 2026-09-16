import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {moduleFromHash, hashFor, MODULES} from '../src/app/modules';

/**
 * A guard against the specific over-simplifications this app exists to avoid.
 *
 * It reads the source of every component and looks for the claims themselves, so a future edit cannot
 * quietly reintroduce one. A fragment that negates or refutes a claim ("is not", "never", "is false") is
 * allowed, because refuting a misconception out loud is part of the teaching.
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

/** Splits text into fragments a claim cannot straddle, so a nearby "not" in another sentence does not excuse one. */
const fragments = (text: string) => text.split(/[.\n]/);
const NEGATED = /\bnot\b|\bnever\b|\bfalse\b|\bcannot\b|\bno\b|\bdoes not\b|\bwithout\b/i;

const BANNED: {claim: RegExp; why: string}[] = [
  {claim: /Km\s*(=|is|means|measures|equals)\s*(the\s+)?affinity/i, why: 'Km is not, in general, a measure of binding affinity'},
  {claim: /enzymes?\s+(give|gives|add|adds|supply|supplies|provide|provides)\s+energy/i, why: 'enzymes do not supply energy to reactions'},
  {claim: /(move|moves|shift|shifts|pull|pulls)\s+(the\s+)?equilibrium/i, why: 'a catalyst does not move the equilibrium position'},
  {claim: /all\s+enzymes\s+follow/i, why: 'not all enzymes follow Michaelis–Menten kinetics'},
  {claim: /(Zn|zinc)[^.]{0,60}(gives|provides|supplies|donates|hands)[^.]{0,20}(OH|hydroxide)/i, why: 'Zn²⁺ does not hand a hydroxide to the substrate'},
  {claim: /His\s*-?\s*64[^.]{0,40}(binds|bonds|coordinates|ligates)[^.]{0,20}Zn/i, why: 'His64 is not a direct Zn ligand'},
  {claim: /(PDB|structure|coordinates)[^.]{0,40}shows?[^.]{0,20}proton\s+transfer/i, why: 'a static structure does not show proton transfer'},
  {claim: /Zn[––-]?OH[⁻-]?\s+(observed|seen|shown)/i, why: 'the protonation state is an interpretation, not an observation'},
  {claim: /(favourable|favorable|ΔG\s*<\s*0)[^.]{0,60}(therefore|so)[^.]{0,30}fast/i, why: 'a negative ΔG does not imply a fast reaction'},
  {claim: /reaction\s+coordinate[^.]{0,30}\b(is|as|means)\b[^.]{0,10}time/i, why: 'the reaction coordinate is not a time axis'},
];

describe('language guards', () => {
  it.each(BANNED)('never states: $why', ({claim}) => {
    const offenders: string[] = [];
    for (const file of FILES)
      for (const fragment of fragments(file.text))
        if (claim.test(fragment) && !NEGATED.test(fragment)) offenders.push(`${file.path}: ${fragment.trim()}`);
    expect(offenders).toEqual([]);
  });

  it('keeps the safeguards that replace those claims', () => {
    const all = FILES.map((f) => f.text).join('\n');
    // The Km caution, verbatim, in English and in Korean.
    expect(all).toContain('Km is not, in general, a direct measure of substrate-binding affinity');
    expect(all).toContain('substrate-binding affinity가 어떻게 변했는지 일반적으로 단정할 수 없습니다');
    expect(all).toContain('the substrate concentration at which v₀ = Vmax/2');
    // The solvent position is never named as a hydroxide in the viewer.
    expect(all).toContain('Zn-bound solvent');
    // Teaching-model and experimental/interpretation labelling exist and are used.
    expect(all).toContain('Teaching model');
    expect(all).toContain('Mechanistic interpretation');
    expect(all).toContain('Experimental structure');
    // The reaction coordinate carries its disclaimer on the axis itself.
    expect(all).toContain('Conceptual progress along a reaction pathway — not time');
    // Hydrogen-bond language stays hedged if it is used at all.
    for (const file of FILES)
      for (const fragment of fragments(file.text))
        if (/hydrogen[- ]bond/i.test(fragment))
          expect(fragment, `${file.path}: ${fragment.trim()}`).toMatch(/possible|inference|geometry|may be|not\b/i);
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
