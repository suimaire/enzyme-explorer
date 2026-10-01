import {type KineticModel, type MichaelisMentenParameters, type VelocityPoint} from './types';

/** Guards the pure functions against parameter values the UI should never produce. */
function assertParameters({km, kcat, enzymeTotal}: MichaelisMentenParameters): void {
  if (!(km > 0)) throw new RangeError(`Km must be positive (got ${km})`);
  if (!(kcat >= 0)) throw new RangeError(`kcat must be non-negative (got ${kcat})`);
  if (!(enzymeTotal >= 0)) throw new RangeError(`[E]T must be non-negative (got ${enzymeTotal})`);
}

/**
 * Vmax = kcat · [E]T.
 * Units: s⁻¹ · nM = nM·s⁻¹, so no conversion factor appears here.
 */
export function calculateVmax(parameters: MichaelisMentenParameters): number {
  assertParameters(parameters);
  return parameters.kcat * parameters.enzymeTotal;
}

/**
 * v0 = Vmax·[S] / (Km + [S]).
 * [S] and Km are both µM, so their ratio is dimensionless and v0 carries the units of Vmax (nM·s⁻¹).
 */
export function calculateV0(parameters: MichaelisMentenParameters, substrate: number): number {
  assertParameters(parameters);
  if (!(substrate >= 0)) throw new RangeError(`[S] must be non-negative (got ${substrate})`);
  return (calculateVmax(parameters) * substrate) / (parameters.km + substrate);
}

/** Fraction of Vmax reached at a substrate concentration: [S]/(Km+[S]). Equals 1/2 exactly at [S] = Km. */
export function saturationFraction(parameters: MichaelisMentenParameters, substrate: number): number {
  assertParameters(parameters);
  return substrate / (parameters.km + substrate);
}

/**
 * Substrate concentration at which v0 = Vmax/2 in this model. It is Km by definition of the model,
 * and it is what Km *means* here — it is not, on its own, a substrate-binding affinity.
 */
export const halfSaturationSubstrate = (parameters: MichaelisMentenParameters): number => parameters.km;

/** Evenly spaced v0-vs-[S] samples from [S] = 0 to `maxSubstrate` (µM), inclusive of both ends. */
export function generateMichaelisMentenCurve(
  parameters: MichaelisMentenParameters,
  maxSubstrate: number,
  samples = 240,
): VelocityPoint[] {
  assertParameters(parameters);
  if (!(maxSubstrate > 0)) throw new RangeError(`maxSubstrate must be positive (got ${maxSubstrate})`);
  if (!Number.isInteger(samples) || samples < 2) throw new RangeError(`samples must be an integer ≥ 2 (got ${samples})`);
  return Array.from({length: samples}, (_, i) => {
    const substrate = (maxSubstrate * i) / (samples - 1);
    return {substrate, velocity: calculateV0(parameters, substrate)};
  });
}

/** The Michaelis–Menten model behind the plots, as a `KineticModel` so inhibition models can slot in later. */
export function michaelisMentenModel(parameters: MichaelisMentenParameters): KineticModel {
  return {
    id: 'michaelis-menten',
    label: 'Michaelis–Menten (single substrate, no inhibitor)',
    vmax: calculateVmax(parameters),
    velocity: (substrate: number) => calculateV0(parameters, substrate),
  };
}
