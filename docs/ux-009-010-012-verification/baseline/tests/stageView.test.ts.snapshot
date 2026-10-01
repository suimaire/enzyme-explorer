import {describe, expect, it} from 'vitest';
import raw from '../src/data/structures/2CBA.pdb?raw';
import {parseStructure} from '../src/viewer/pdb/parsePdb';
import {analyzeActiveSite} from '../src/modules/carbonic-anhydrase/activeSite';
import {STRUCTURE_SOURCE} from '../src/modules/carbonic-anhydrase/structureSource';
import {atomDisplayName, greekAtomName} from '../src/viewer/pdb/atomNames';
import {distance} from '../src/viewer/measurements/distance';
import {
  FAINT_RIBBON,
  LIGAND_NOTE,
  NON_LIGAND_NOTE,
  STAGE_PRESETS,
  buildStageView,
  metalContact,
  stageCameraAtoms,
  type StageState,
} from '../src/modules/carbonic-anhydrase/stageView';

const structure = parseStructure(raw, STRUCTURE_SOURCE.chain);
const site = analyzeActiveSite(structure);
const shuttle = site.histidines.find((h) => h.resSeq === 64)!;
const his = (resSeq: number) => site.histidines.find((h) => h.resSeq === resSeq)!;
const resSeqs = (indices: Iterable<number>) => [...indices].map((i) => structure.residues[i].resSeq).sort((a, b) => a - b);

const state = (patch: Partial<StageState>): StageState => ({
  stage: 1,
  representation: 'ribbon',
  selected: null,
  judgementsLocked: false,
  shuttleLocked: false,
  ...patch,
});
const view = (patch: Partial<StageState>) => buildStageView(structure, site, shuttle, state(patch));

describe('PDB atom names for students', () => {
  it('pairs the Greek position letter with the PDB name', () => {
    expect(atomDisplayName('NE2')).toBe('Nε2 (NE2)');
    expect(atomDisplayName('ND1')).toBe('Nδ1 (ND1)');
    expect(atomDisplayName('CE1')).toBe('Cε1 (CE1)');
    expect(atomDisplayName('CA')).toBe('Cα (CA)');
    expect(atomDisplayName('CG')).toBe('Cγ (CG)');
    expect(atomDisplayName('N')).toBe('N (주사슬)');
    expect(greekAtomName('NE2')).toBe('Nε2');
    // Names outside the side-chain pattern are left exactly as the file spells them.
    expect(atomDisplayName('ZN')).toBe('ZN');
    expect(atomDisplayName('OXT')).toBe('OXT (주사슬)');
  });
});

describe('Module 02 stage presets', () => {
  it('opens stage 1 on the whole fold and stages 2–4 on a faint ribbon near the metal', () => {
    expect(STAGE_PRESETS[1]).toEqual({representation: 'ribbon', ribbonOpacity: 1, camera: 'overview'});
    for (const stage of [2, 3, 4] as const) {
      expect(STAGE_PRESETS[stage].representation).toBe('ribbon');
      expect(STAGE_PRESETS[stage].ribbonOpacity).toBe(FAINT_RIBBON);
      expect(STAGE_PRESETS[stage].camera).not.toBe('overview');
    }
    expect(FAINT_RIBBON).toBeLessThan(0.5);
    expect(view({stage: 1}).ribbonOpacity).toBe(1);
    expect(view({stage: 1}).highlighted.size).toBe(0);
    expect(view({stage: 1}).spheres).toEqual(new Set([site.metal.residueIndex]));
  });

  it('stage 2 draws every candidate the same way, with no distance and no verdict before anything is measured', () => {
    const v = view({stage: 2});
    expect(resSeqs(v.highlighted)).toEqual([64, 94, 96, 107, 119, 122]);
    expect(v.measurements).toEqual([]);
    expect(v.markedAtoms).toEqual([]);
    expect(v.labelNotes!.size).toBe(0);
    expect(v.spheres).toEqual(new Set([site.metal.residueIndex]));
    expect(v.showLabels).toBe(true);
  });

  it('finding a residue measures the metal to that residue’s nearest atom, from coordinates', () => {
    for (const h of site.histidines) {
      const v = view({stage: 2, selected: h.residueIndex});
      expect(v.measurements).toEqual([{a: site.metal.atomIndex, b: h.closest.atomIndex}]);
      expect(v.markedAtoms).toEqual([{atom: h.closest.atomIndex, label: greekAtomName(h.closest.atomName)}]);
      const contact = metalContact(structure, site, h.residueIndex)!;
      expect(contact.atomIndex).toBe(h.closest.atomIndex);
      // Independently: no atom of the residue is nearer the metal than the one marked.
      const zn = structure.atoms[site.metal.atomIndex].position;
      for (const a of structure.residues[h.residueIndex].atoms)
        expect(distance(zn, structure.atoms[a].position)).toBeGreaterThanOrEqual(contact.distance);
    }
    expect(view({stage: 2, selected: his(94).residueIndex}).markedAtoms![0].label).toBe('Nε2');
    expect(view({stage: 2, selected: his(119).residueIndex}).markedAtoms![0].label).toBe('Nδ1');
    expect(view({stage: 2, selected: shuttle.residueIndex}).markedAtoms![0].label).toBe('Nδ1');
    expect(metalContact(structure, site, site.metal.residueIndex)).toBeNull();
    expect(metalContact(structure, site, null)).toBeNull();
  });

  it('labels verdicts only after the judgements are locked, and the verdicts follow the measured ligands', () => {
    const notes = view({stage: 2, judgementsLocked: true}).labelNotes!;
    expect(notes.size).toBe(site.histidines.length);
    for (const h of site.histidines) expect(notes.get(h.residueIndex)).toBe(h.coordinating ? LIGAND_NOTE : NON_LIGAND_NOTE);
    expect(notes.get(shuttle.residueIndex)).toBe(NON_LIGAND_NOTE);
    expect([94, 96, 119].map((n) => notes.get(his(n).residueIndex))).toEqual([LIGAND_NOTE, LIGAND_NOTE, LIGAND_NOTE]);
  });

  it('stage 3 adds the Zn-bound solvent as a sphere and measures it against the next water', () => {
    const v = view({stage: 3});
    expect(resSeqs(v.highlighted)).toEqual([94, 96, 119]);
    expect(v.spheres.has(site.boundSolvent!.residueIndex)).toBe(true);
    // Only the bound solvent is a sphere: the viewer labels every non-metal sphere as the Zn-bound solvent.
    expect(v.spheres).toEqual(new Set([site.metal.residueIndex, site.boundSolvent!.residueIndex]));
    expect(v.measurements.map((m) => m.b)).toEqual([site.boundSolvent!.atomIndex, site.nextWater!.atomIndex]);
    expect(v.markedAtoms).toEqual([{atom: site.boundSolvent!.atomIndex, label: undefined}]);
    // Finding the solvent again does not draw the same distance twice.
    expect(view({stage: 3, selected: site.boundSolvent!.residueIndex}).measurements).toHaveLength(2);
  });

  it('stage 4 sets His64 beside the three ligands and names its role only after the prediction is locked', () => {
    const open = view({stage: 4});
    expect(resSeqs(open.highlighted)).toEqual([64, 94, 96, 119]);
    expect(open.measurements).toEqual([{a: site.metal.atomIndex, b: shuttle.closest.atomIndex}]);
    expect(open.labelNotes!.size).toBe(0);
    const locked = view({stage: 4, shuttleLocked: true}).labelNotes!;
    expect(locked.get(shuttle.residueIndex)).toBe(NON_LIGAND_NOTE);
    for (const l of site.ligands) expect(locked.get(l.residueIndex)).toBe(LIGAND_NOTE);
    // Selecting His64 in stage 4 does not duplicate its measurement.
    expect(view({stage: 4, selected: shuttle.residueIndex}).measurements).toHaveLength(1);
  });

  it('opens each stage framed on the atoms its question is about', () => {
    const owners = (atoms: number[]) => new Set(resSeqs(new Set(atoms.map((a) => structure.residues.findIndex((r) => r.atoms.includes(a))))));
    expect(stageCameraAtoms(structure, site, shuttle, 1)).toBeNull();
    const candidates = stageCameraAtoms(structure, site, shuttle, 2)!;
    expect(candidates).toContain(site.metal.atomIndex);
    for (const n of [64, 94, 96, 107, 119, 122]) expect(owners(candidates).has(n)).toBe(true);
    const shell = stageCameraAtoms(structure, site, shuttle, 3)!;
    expect(shell).toContain(site.boundSolvent!.atomIndex);
    expect(owners(shell).has(64)).toBe(false);
    const compare = stageCameraAtoms(structure, site, shuttle, 4)!;
    expect(compare).toContain(shuttle.closest.atomIndex);
    for (const l of site.ligands) expect(compare).toContain(l.atomIndex);
  });

  it('keeps a representation the student picked within the stage', () => {
    expect(view({stage: 2, representation: 'sticks'}).representation).toBe('sticks');
    expect(view({stage: 3, representation: 'spacefill'}).representation).toBe('spacefill');
  });
});
