import {closestApproach, type Contact} from '../../viewer/measurements/distance';
import {greekAtomName} from '../../viewer/pdb/atomNames';
import type {Structure} from '../../viewer/pdb/parsePdb';
import type {Measurement, Representation, StructureView} from '../../viewer/rendering/StructureScene';
import type {ActiveSite, SiteResidue} from './activeSite';

/**
 * What the 3D view shows at each stage of Module 02, as a pure function of the lesson state.
 *
 * Every stage opens with the representation that suits its question. Stage 1 is about where the site sits in
 * the whole fold, so it shows an opaque ribbon. Stages 2–4 are about atoms around the metal, so the ribbon
 * fades to context and the residues under study are drawn as sticks. A representation the student picks is
 * kept while they stay in that stage; entering a stage applies its preset again, so each question starts from
 * a view in which its answer can actually be read.
 */

export type Stage = 1 | 2 | 3 | 4;

/** Opacity of the ribbon once the lesson moves in to the active site. */
export const FAINT_RIBBON = 0.28;

/**
 * `candidates` frames every Stage 2 histidine with the metal, `first-shell` the metal with its ligands and the
 * nearest waters, `shuttle` His64 with the metal and the ligand atoms it is compared with.
 */
export type StagePreset = {representation: Representation; ribbonOpacity: number; camera: 'overview' | 'candidates' | 'first-shell' | 'shuttle'};

export const STAGE_PRESETS: Record<Stage, StagePreset> = {
  1: {representation: 'ribbon', ribbonOpacity: 1, camera: 'overview'},
  2: {representation: 'ribbon', ribbonOpacity: FAINT_RIBBON, camera: 'candidates'},
  3: {representation: 'ribbon', ribbonOpacity: FAINT_RIBBON, camera: 'first-shell'},
  4: {representation: 'ribbon', ribbonOpacity: FAINT_RIBBON, camera: 'shuttle'},
};

/** Label notes the viewer appends once a stage's answer is open. Plain labels, not claims about any one residue. */
export const LIGAND_NOTE = '직접 배위';
export const NON_LIGAND_NOTE = '직접 배위 안 함';

/**
 * The measured contact between the metal and the nearest atom of one residue, or null when there is nothing
 * to measure (no residue, or the metal itself). Always recomputed from coordinates.
 */
export function metalContact(structure: Structure, site: ActiveSite, residueIndex: number | null): Contact | null {
  if (residueIndex === null || residueIndex === site.metal.residueIndex) return null;
  const residue = structure.residues[residueIndex];
  return residue ? closestApproach(structure, site.metal.atomIndex, residue) : null;
}

/** Atoms the camera frames when a stage opens, or null for the whole-protein overview. */
export function stageCameraAtoms(structure: Structure, site: ActiveSite, shuttle: SiteResidue | null, stage: Stage): number[] | null {
  const residueAtoms = (index: number) => structure.residues[index].atoms;
  const metal = site.metal.atomIndex;
  switch (STAGE_PRESETS[stage].camera) {
    case 'candidates':
      return [metal, ...site.histidines.flatMap((h) => residueAtoms(h.residueIndex))];
    case 'first-shell':
      return [
        metal,
        ...site.ligands.flatMap((l) => residueAtoms(l.residueIndex)),
        ...[site.boundSolvent, site.nextWater].flatMap((w) => (w ? [w.atomIndex] : [])),
      ];
    case 'shuttle':
      return shuttle ? [metal, ...residueAtoms(shuttle.residueIndex), ...site.ligands.map((l) => l.atomIndex)] : [metal];
    default:
      return null;
  }
}

export type StageState = {
  stage: Stage;
  representation: Representation;
  selected: number | null;
  /** Stage 2: the student has committed a judgement for every candidate. */
  judgementsLocked: boolean;
  /** Stage 4: the student has locked the His64 prediction. */
  shuttleLocked: boolean;
};

export function buildStageView(structure: Structure, site: ActiveSite, shuttle: SiteResidue | null, state: StageState): StructureView {
  const {stage, representation, selected} = state;
  const highlighted = new Set<number>();
  const spheres = new Set<number>([site.metal.residueIndex]);
  const measurements: Measurement[] = [];
  const markedAtoms: {atom: number; label?: string}[] = [];
  const labelNotes = new Map<number, string>();
  const solvent = site.boundSolvent;

  const measure = (contact: Contact, label: boolean) => {
    if (measurements.some((m) => m.b === contact.atomIndex)) return;
    measurements.push({a: site.metal.atomIndex, b: contact.atomIndex});
    const water = structure.atoms[contact.atomIndex].kind === 'water';
    markedAtoms.push({atom: contact.atomIndex, label: label && !water ? greekAtomName(contact.atomName) : undefined});
  };

  if (stage === 2) {
    // Every candidate is drawn the same way: the view must not answer the question before it is measured.
    for (const h of site.histidines) highlighted.add(h.residueIndex);
    if (state.judgementsLocked) for (const h of site.histidines) labelNotes.set(h.residueIndex, h.coordinating ? LIGAND_NOTE : NON_LIGAND_NOTE);
  }

  if (stage === 3) {
    for (const l of site.ligands) highlighted.add(l.residueIndex);
    if (solvent) {
      spheres.add(solvent.residueIndex);
      measure(solvent, false);
      // The next water is measured for comparison only; it is not drawn as a sphere, because every sphere the
      // viewer draws beside the metal is labelled as the Zn-bound solvent.
      if (site.nextWater) measurements.push({a: site.metal.atomIndex, b: site.nextWater.atomIndex});
    }
  }

  if (stage === 4) {
    for (const l of site.ligands) highlighted.add(l.residueIndex);
    if (solvent) spheres.add(solvent.residueIndex);
    if (shuttle) {
      highlighted.add(shuttle.residueIndex);
      measure(shuttle.closest, true);
      if (state.shuttleLocked) {
        for (const l of site.ligands) labelNotes.set(l.residueIndex, LIGAND_NOTE);
        labelNotes.set(shuttle.residueIndex, NON_LIGAND_NOTE);
      }
    }
  }

  // Whatever the student has found or tapped is measured to the metal, from its nearest atom.
  const found = metalContact(structure, site, selected);
  if (found) {
    if (structure.residues[found.residueIndex].kind === 'polymer') highlighted.add(found.residueIndex);
    measure(found, true);
  }

  return {
    representation,
    highlighted,
    spheres,
    selected,
    measurements,
    showLabels: stage >= 2,
    ribbonOpacity: STAGE_PRESETS[stage].ribbonOpacity,
    markedAtoms,
    labelNotes,
  };
}
