import {calculateV0, calculateVmax} from './michaelisMenten';
import {NM_PER_UM, type MichaelisMentenParameters, type ProgressSample} from './types';

/**
 * Simplified irreversible Michaelis–Menten teaching model for a virtual assay:
 *
 *   dS/dt = −Vmax·S / (Km + S)      P(t) = S0 − S(t)
 *
 * It contains no reverse reaction, no product inhibition and no enzyme inactivation, and it assumes the
 * steady-state/initial-rate conditions of the Michaelis–Menten equation hold for the whole run. See
 * docs/SCIENTIFIC_NOTES.md.
 */

/** dS/dt in µM·s⁻¹. Vmax is nM·s⁻¹, so the rate is divided by `NM_PER_UM` to reach the substrate's own units. */
function substrateRate(parameters: MichaelisMentenParameters, substrate: number): number {
  const s = Math.max(substrate, 0);
  return -(calculateVmax(parameters) / NM_PER_UM) * (s / (parameters.km + s));
}

/**
 * Closed-form implicit solution of the same differential equation:
 *
 *   Km·ln(S0/S) + (S0 − S) = (Vmax/1000)·t
 *
 * Returns the time (s) at which the substrate has fallen from `initialSubstrate` to `substrate` (both µM).
 * The integrator is checked against this expression in the tests, so the simulated curve is not a free-hand shape.
 */
export function elapsedTimeForSubstrate(
  parameters: MichaelisMentenParameters,
  initialSubstrate: number,
  substrate: number,
): number {
  if (!(initialSubstrate > 0)) throw new RangeError(`S0 must be positive (got ${initialSubstrate})`);
  if (!(substrate > 0) || substrate > initialSubstrate) throw new RangeError(`S must satisfy 0 < S ≤ S0 (got ${substrate})`);
  const vmax = calculateVmax(parameters) / NM_PER_UM;
  return (parameters.km * Math.log(initialSubstrate / substrate) + (initialSubstrate - substrate)) / vmax;
}

/** Assay window: the time needed to consume `fractionConsumed` of the substrate, so every run shows real curvature. */
export function assayDuration(
  parameters: MichaelisMentenParameters,
  initialSubstrate: number,
  fractionConsumed = 0.5,
): number {
  if (!(fractionConsumed > 0 && fractionConsumed < 1)) throw new RangeError(`fractionConsumed must be in (0,1) (got ${fractionConsumed})`);
  return elapsedTimeForSubstrate(parameters, initialSubstrate, initialSubstrate * (1 - fractionConsumed));
}

/**
 * Numerical integration of the model above with classical fourth-order Runge–Kutta at a fixed step.
 * RK4 is used rather than Euler because the same step size then reproduces the closed-form solution to
 * well under a plotted pixel, so the drawn curvature is the model's, not the integrator's.
 *
 * Substrate is clamped to [0, S0] and forced to be non-increasing, so P(t) is non-decreasing and never
 * exceeds S0 even if a step lands slightly past the floor.
 */
export function generateProgressCurve(
  parameters: MichaelisMentenParameters,
  initialSubstrate: number,
  duration: number,
  steps = 400,
): ProgressSample[] {
  if (!(initialSubstrate >= 0)) throw new RangeError(`S0 must be non-negative (got ${initialSubstrate})`);
  if (!(duration > 0)) throw new RangeError(`duration must be positive (got ${duration})`);
  if (!Number.isInteger(steps) || steps < 1) throw new RangeError(`steps must be a positive integer (got ${steps})`);
  const dt = duration / steps;
  const samples: ProgressSample[] = [{time: 0, substrate: initialSubstrate, product: 0}];
  let s = initialSubstrate;
  for (let i = 1; i <= steps; i++) {
    const k1 = substrateRate(parameters, s);
    const k2 = substrateRate(parameters, s + (dt / 2) * k1);
    const k3 = substrateRate(parameters, s + (dt / 2) * k2);
    const k4 = substrateRate(parameters, s + dt * k3);
    const next = s + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    s = Math.min(s, Math.max(next, 0));
    samples.push({time: i * dt, substrate: s, product: initialSubstrate - s});
  }
  return samples;
}

/**
 * Initial velocity of the assay, in nM·s⁻¹ — the quantity the tangent at t = 0 measures.
 * It is the model's own t→0 slope of P(t): dP/dt|₀ = −dS/dt|₀ = Vmax·S0/(Km+S0).
 */
export const measuredInitialVelocity = (parameters: MichaelisMentenParameters, initialSubstrate: number): number =>
  calculateV0(parameters, initialSubstrate);

/**
 * The tangent to P(t) at t = 0, as two points in the units of the progress plot (s, µM).
 * Slope is v0 converted from nM·s⁻¹ to µM·s⁻¹; drawing it over the whole window is what makes the
 * departure of the real curve from its initial rate visible.
 */
export function initialRateTangent(
  parameters: MichaelisMentenParameters,
  initialSubstrate: number,
  duration: number,
): [{time: number; product: number}, {time: number; product: number}] {
  const slope = measuredInitialVelocity(parameters, initialSubstrate) / NM_PER_UM;
  return [
    {time: 0, product: 0},
    {time: duration, product: slope * duration},
  ];
}
