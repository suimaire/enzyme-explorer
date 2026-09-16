import {describe, expect, it} from 'vitest';
import raw from '../src/data/structures/2CBA.pdb?raw';
import {parseStructure, residueLabel} from '../src/viewer/pdb/parsePdb';
import {inferBonds} from '../src/viewer/pdb/bonds';
import {COORDINATION_MAX, SITE_RADIUS, analyzeActiveSite, metalLinks} from '../src/modules/carbonic-anhydrase/activeSite';
import {Vector3} from 'three';
import {ribbonRuns} from '../src/viewer/rendering/ribbon';
import {distance} from '../src/viewer/measurements/distance';
import {COVALENT_RADII, isMetal} from '../src/viewer/pdb/elements';
import {STRUCTURE_SOURCE} from '../src/modules/carbonic-anhydrase/structureSource';

const structure = parseStructure(raw, STRUCTURE_SOURCE.chain);
const site = analyzeActiveSite(structure);
const bonds = inferBonds(structure);
const residue = (index: number) => structure.residues[index];

describe('PDB reader', () => {
  it('1 · reads the entry the app claims to be showing', () => {
    expect(structure.id).toBe(STRUCTURE_SOURCE.pdbId);
    expect(structure.resolution).toBe(STRUCTURE_SOURCE.resolution);
    expect(structure.method).toContain('X-RAY');
    expect(structure.chains).toEqual([STRUCTURE_SOURCE.chain]);
  });

  it('2 · keeps polymer, hetero and water atoms in separate, contiguous ranges', () => {
    const [ps, pe] = structure.ranges.polymer;
    const [hs, he] = structure.ranges.hetero;
    const [ws, we] = structure.ranges.water;
    expect(ps).toBe(0);
    expect(hs).toBe(pe);
    expect(ws).toBe(he);
    expect(we).toBe(structure.residues.length);
    expect(pe - ps).toBeGreaterThan(200);
    // Exactly one hetero group in this entry: the catalytic zinc.
    expect(he - hs).toBe(1);
    expect(residue(hs).resName).toBe('ZN');
    expect(we - ws).toBeGreaterThan(100);
    for (let i = ps; i < pe; i++) expect(residue(i).kind).toBe('polymer');
    for (let i = hs; i < he; i++) expect(residue(i).kind).toBe('hetero');
    for (let i = ws; i < we; i++) expect(residue(i).kind).toBe('water');
    // Every residue index equals its position, and every atom belongs to exactly one residue.
    structure.residues.forEach((r, i) => expect(r.index).toBe(i));
    const seen = new Set<number>();
    for (const r of structure.residues)
      for (const a of r.atoms) {
        expect(seen.has(a)).toBe(false);
        seen.add(a);
      }
    expect(seen.size).toBe(structure.atoms.length);
  });

  it('3 · resolves alternate locations to one conformer per atom slot and records which residues had them', () => {
    expect(structure.omitted.alternateLocations).toBeGreaterThan(0);
    const slots = new Set(structure.atoms.map((a) => `${a.chain}:${a.resSeq}${a.insertionCode}:${a.name}`));
    expect(slots.size).toBe(structure.atoms.length);
    const his64 = structure.residues.find((r) => r.resSeq === 64 && r.resName === 'HIS')!;
    expect(his64.hasAlternates).toBe(true);
    // The higher-occupancy conformer (A, occupancy 0.70) is the one kept.
    const ne2 = his64.atoms.map((i) => structure.atoms[i]).find((a) => a.name === 'NE2')!;
    expect(ne2.altLoc).toBe('A');
    expect(ne2.occupancy).toBeCloseTo(0.7, 6);
  });

  it('4 · never bonds a metal, and never bonds across a residue that is not a peptide neighbour', () => {
    expect(COVALENT_RADII.ZN).toBeUndefined();
    const owner = new Int32Array(structure.atoms.length).fill(-1);
    for (const r of structure.residues) for (const a of r.atoms) owner[a] = r.index;
    for (const [a, b] of bonds) {
      expect(isMetal(structure.atoms[a].element)).toBe(false);
      expect(isMetal(structure.atoms[b].element)).toBe(false);
      if (owner[a] === owner[b]) continue;
      // The only inter-residue bond allowed is a peptide bond, and it has to be one by geometry. Residue
      // numbers are not used as the criterion: this entry follows the carbonic-anhydrase numbering
      // convention, in which 126 is absent although the chain runs straight through from 125 to 127.
      const names = [structure.atoms[a].name, structure.atoms[b].name].sort();
      expect(names).toEqual(['C', 'N']);
      expect(Math.abs(owner[a] - owner[b])).toBe(1);
      expect(distance(structure.atoms[a].position, structure.atoms[b].position)).toBeLessThan(1.5);
    }
    // The numbering gap is real, and the chain across it is real too.
    const numbers = structure.residues.slice(...structure.ranges.polymer).map((r) => r.resSeq);
    expect(numbers.includes(126)).toBe(false);
    expect(numbers.includes(125) && numbers.includes(127)).toBe(true);
    // Waters are single oxygens and cannot bond to anything.
    const waterAtoms = new Set(structure.residues.slice(...structure.ranges.water).flatMap((r) => r.atoms));
    for (const [a, b] of bonds) expect(waterAtoms.has(a) || waterAtoms.has(b)).toBe(false);
  });
});

describe('carbonic anhydrase active site', () => {
  it('5 · finds exactly one zinc ion', () => {
    expect(site.metal.element).toBe('ZN');
    expect(site.metal.resName).toBe('ZN');
    expect(structure.atoms[site.metal.atomIndex].kind).toBe('hetero');
  });

  it('6 · the coordinate-derived ligands reproduce the deposited LINK records exactly', () => {
    const links = metalLinks(structure, 'ZN');
    expect(links.length).toBe(4); // three histidines plus the solvent
    const fromLinks = links
      .map((l) => (l.a.resName === 'ZN' ? l.b : l.a))
      .filter((s) => s.resName !== 'HOH')
      .map((s) => `${s.resName}${s.resSeq}:${s.name}`)
      .sort();
    const fromCoordinates = site.ligands.map((l) => `${residue(l.residueIndex).resName}${residue(l.residueIndex).resSeq}:${l.atomName}`).sort();
    expect(fromCoordinates).toEqual(fromLinks);
    expect(fromCoordinates).toEqual(['HIS119:ND1', 'HIS94:NE2', 'HIS96:NE2']);

    // The measured distances agree with the distances the depositors recorded, to the precision of the record.
    for (const link of links) {
      const other = link.a.resName === 'ZN' ? link.b : link.a;
      const partner = structure.atoms.findIndex(
        (a) => a.resSeq === other.resSeq && a.name === other.name && a.resName === other.resName && a.chain === other.chain,
      );
      expect(partner).toBeGreaterThanOrEqual(0);
      expect(distance(structure.atoms[site.metal.atomIndex].position, structure.atoms[partner].position)).toBeCloseTo(link.distance, 2);
    }
  });

  it('7 · exactly one ordered water is inside coordination range, and the next one is clearly outside it', () => {
    expect(site.boundSolvent).not.toBeNull();
    expect(site.waters.filter((w) => w.distance <= COORDINATION_MAX)).toHaveLength(1);
    expect(site.boundSolvent!.distance).toBeLessThan(COORDINATION_MAX);
    expect(site.boundSolvent!.distance).toBeGreaterThan(1.8);
    expect(site.nextWater).not.toBeNull();
    // A real gap, not a cutoff artefact: the second water is more than 1 Å further out.
    expect(site.nextWater!.distance - site.boundSolvent!.distance).toBeGreaterThan(1);
    expect(structure.atoms[site.boundSolvent!.atomIndex].element).toBe('O');
    expect(residue(site.boundSolvent!.residueIndex).resName).toBe('HOH');
  });

  it('8 · His64 is near the site but is not a zinc ligand', () => {
    const his64 = site.histidines.find((h) => h.resSeq === 64);
    expect(his64).toBeDefined();
    expect(his64!.coordinating) .toBe(false);
    expect(his64!.closest.distance).toBeGreaterThan(2 * COORDINATION_MAX);
    expect(his64!.closest.distance).toBeLessThan(SITE_RADIUS);
    // Far outside the range of the three real ligands.
    for (const ligand of site.ligands) expect(his64!.closest.distance).toBeGreaterThan(ligand.distance + 4);
  });

  it('9 · only the three ligand histidines are flagged as coordinating', () => {
    const coordinating = site.histidines.filter((h) => h.coordinating).map((h) => h.resSeq).sort((a, b) => a - b);
    expect(coordinating).toEqual([94, 96, 119]);
    expect(site.histidines.length).toBeGreaterThan(coordinating.length);
    for (const h of site.histidines) {
      expect(h.coordinating).toBe(h.closest.distance <= COORDINATION_MAX);
      expect(h.closest.distance).toBeLessThanOrEqual(SITE_RADIUS);
    }
    // The histidine list is sorted by distance, nearest first.
    for (let i = 1; i < site.histidines.length; i++)
      expect(site.histidines[i].closest.distance).toBeGreaterThanOrEqual(site.histidines[i - 1].closest.distance);
  });

  it('10 · the ribbon is drawn as one unbroken run despite the numbering gap', () => {
    const positions = structure.atoms.map((a) => new Vector3(...a.position));
    const polymer = structure.residues.slice(...structure.ranges.polymer);
    const runs = ribbonRuns(polymer, structure.atoms, positions);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(polymer.length);
    // Every consecutive pair really is a peptide-bond distance apart, so the single run is justified.
    const ca = (r: (typeof polymer)[number]) => positions[r.atoms.find((i) => structure.atoms[i].name === 'CA')!];
    for (let i = 1; i < runs[0].length; i++) expect(ca(runs[0][i]).distanceTo(ca(runs[0][i - 1]))).toBeLessThan(4.5);
  });

  it('11 · residue labels read as a student would write them', () => {
    expect(residueLabel(residue(site.ligands[0].residueIndex))).toMatch(/^His \d+$/);
    expect(residueLabel(residue(site.metal.residueIndex))).toBe('Zn 262');
  });
});
