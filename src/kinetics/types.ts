/**
 * Units are fixed across the whole kinetics module and never converted implicitly:
 *
 *   [S], Km        µM
 *   [E]T           nM
 *   kcat           s⁻¹
 *   Vmax, v0       nM·s⁻¹      (Vmax = kcat · [E]T)
 *   time           s
 *
 * Substrate/product concentrations inside a progress curve stay in µM, so the one place where the two
 * concentration units meet (dS/dt) converts explicitly through `NM_PER_UM`.
 */

/** Concentration conversion, used only where a nM·s⁻¹ velocity drives a µM concentration. */
export const NM_PER_UM = 1000;

/** Parameters of the single-substrate Michaelis–Menten teaching model. */
export type MichaelisMentenParameters = {
  /** Michaelis constant, µM. The substrate concentration at which v0 = Vmax/2 — not, in general, a binding constant. */
  km: number;
  /** Turnover number, s⁻¹. */
  kcat: number;
  /** Total enzyme concentration, nM. */
  enzymeTotal: number;
};

/** One point of a v0-vs-[S] curve: substrate in µM, velocity in nM·s⁻¹. */
export type VelocityPoint = {substrate: number; velocity: number};

/** One sample of a simulated assay: time in s, substrate and product in µM. */
export type ProgressSample = {time: number; substrate: number; product: number};

/** A completed virtual assay, kept so that 03A measurements can be replotted in 03B. */
export type AssayResult = {
  /** Initial substrate concentration, µM. */
  initialSubstrate: number;
  /** Measured initial velocity, nM·s⁻¹. */
  initialVelocity: number;
  /** The enzyme preparation the assay was run with — a measurement is only comparable to a curve drawn with these. */
  parameters: MichaelisMentenParameters;
};

/**
 * Velocity model boundary. Enzyme II adds `CompetitiveInhibitionModel`, `UncompetitiveInhibitionModel`
 * and `MixedInhibitionModel` as further implementations; nothing in the plotting code needs to change,
 * because a plot only ever asks a model for v0 at a substrate concentration.
 */
export type KineticModel = {
  id: string;
  label: string;
  /** Maximum velocity the model approaches at saturating substrate, nM·s⁻¹. */
  readonly vmax: number;
  /** Initial velocity, nM·s⁻¹, for a substrate concentration in µM. */
  velocity(substrate: number): number;
};
