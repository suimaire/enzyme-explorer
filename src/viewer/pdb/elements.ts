/** Element properties used for drawing and for covalent-bond inference. */

/** CPK-like element colours, matched to the palette used elsewhere in the app. */
export const ELEMENT_COLORS: Record<string, number> = {
  C: 0x596775,
  N: 0x2866c8,
  O: 0xd74238,
  S: 0xd8b21d,
  ZN: 0x9a6a1f,
};
export const DEFAULT_ELEMENT_COLOR = 0x888888;

/** Colour of the catalytic metal, chosen to stand out from both C and O. */
export const METAL_COLOR = 0x8a5a12;
export const RIBBON_COLOR = 0x8fa3b2;
export const DIMMED = 0xd3dade;
export const HIGHLIGHT_COLOR = 0x15618f;
export const SELECT_COLOR = 0xb0327c;
export const SOLVENT_COLOR = 0x2a8f8a;
export const MEASURE_COLOR = 0x5c6b75;

/** Covalent radii, Å (Cordero et al. 2008). Used only for bond inference between light atoms. */
export const COVALENT_RADII: Record<string, number> = {C: 0.76, N: 0.71, O: 0.66, S: 1.05};

/** Van der Waals radii, Å (Bondi 1964; Zn from Alvarez 2013), used for the space-filling representation. */
export const VDW_RADII: Record<string, number> = {C: 1.7, N: 1.55, O: 1.52, S: 1.8, ZN: 1.39};

export const vdwRadius = (element: string): number => VDW_RADII[element] ?? 1.6;
export const elementColor = (element: string): number => ELEMENT_COLORS[element] ?? DEFAULT_ELEMENT_COLOR;

/**
 * Metals are deliberately absent from `COVALENT_RADII`. Metal–ligand coordination is not drawn as a covalent
 * bond anywhere in this app: it is measured and drawn as a distance, so the picture never asserts a bond
 * order that the structure does not establish.
 */
export const isMetal = (element: string): boolean => element === 'ZN' || element === 'FE' || element === 'MG' || element === 'CA' || element === 'MN';

export const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
