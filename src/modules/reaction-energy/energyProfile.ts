/**
 * Simplified one-barrier reaction-energy teaching model.
 *
 * Energies are relative free energies on a conceptual kJ·mol⁻¹ scale with the reactant state fixed at 0.
 * They are chosen by the student, not measured, so every readout derived from them is labelled as a
 * teaching model in the UI. A real enzyme-catalysed reaction usually passes through several intermediates
 * and several transition states; this model draws exactly one barrier per pathway.
 *
 * The x axis of the drawn diagram is a reaction coordinate — conceptual progress along a pathway.
 * It is not time, and nothing in this file produces a position-versus-time quantity.
 */

/** Reactant state, by definition the zero of the relative energy scale. */
export const REACTANT_ENERGY = 0;

/** Slider bounds. The plotted y range is derived from these alone, so it never rescales while a student works. */
export const PRODUCT_RANGE = {min: -30, max: 30, step: 1} as const;
export const BARRIER_TOP_RANGE = {min: 20, max: 70, step: 1} as const;
export const LOWERING_RANGE = {min: 5, max: 35, step: 1} as const;

/** A transition state has to lie above both end points; this is the smallest gap the model allows. */
export const MIN_BARRIER = 5;

/** Fixed y-axis domain of the diagram, wide enough for every reachable state at every slider setting. */
export const ENERGY_DOMAIN = {
  min: PRODUCT_RANGE.min - 8,
  max: BARRIER_TOP_RANGE.max + 8,
} as const;

export type ReactionEnergyInput = {
  /** Product free energy relative to the reactant state, kJ·mol⁻¹ (teaching scale). This is ΔG of the reaction. */
  productEnergy: number;
  /** Energy of the uncatalysed transition state, kJ·mol⁻¹, before clamping. */
  barrierTop: number;
  /** How far the enzyme lowers the transition-state energy, kJ·mol⁻¹, before clamping. */
  barrierLowering: number;
  /** Whether the catalysed pathway is shown. */
  enzyme: boolean;
};

export type Pathway = {
  reactant: number;
  transitionState: number;
  product: number;
  /** Reactant → transition state, always ≥ MIN_BARRIER. */
  forwardBarrier: number;
  /** Product → transition state, always ≥ MIN_BARRIER. */
  reverseBarrier: number;
};

export type ReactionEnergyProfile = {
  /** Product − reactant. A catalyst never changes it, which is why it is computed once, outside the pathways. */
  deltaG: number;
  uncatalyzed: Pathway;
  /** Present only while the enzyme is on. */
  catalyzed: Pathway | null;
};

/**
 * Keeps the transition state above both end points. The sliders are free, so the clamp — not the UI —
 * is what guarantees a physically meaningful barrier: a maximum can never be drawn below a state it
 * connects. Returns the clamped transition-state energy.
 */
export function clampTransitionState(barrierTop: number, productEnergy: number): number {
  const floor = Math.max(REACTANT_ENERGY, productEnergy) + MIN_BARRIER;
  return Math.max(barrierTop, floor);
}

const pathway = (transitionState: number, productEnergy: number): Pathway => ({
  reactant: REACTANT_ENERGY,
  transitionState,
  product: productEnergy,
  forwardBarrier: transitionState - REACTANT_ENERGY,
  reverseBarrier: transitionState - productEnergy,
});

/**
 * Builds both pathways from the slider state.
 *
 * The catalysed pathway reuses the *same* reactant and product energies: catalysis is applied only to the
 * transition-state energy. ΔG and therefore the equilibrium position cannot change in this model, and
 * lowering one shared maximum necessarily lowers the forward and the reverse barrier together.
 */
export function reactionEnergyProfile(input: ReactionEnergyInput): ReactionEnergyProfile {
  const {productEnergy, barrierLowering, enzyme} = input;
  const uncatalyzedTop = clampTransitionState(input.barrierTop, productEnergy);
  const catalyzedTop = clampTransitionState(uncatalyzedTop - Math.max(barrierLowering, 0), productEnergy);
  return {
    deltaG: productEnergy - REACTANT_ENERGY,
    uncatalyzed: pathway(uncatalyzedTop, productEnergy),
    catalyzed: enzyme ? pathway(catalyzedTop, productEnergy) : null,
  };
}

/** Gas constant × 298.15 K, kJ·mol⁻¹. */
export const RT_298 = 8.314462618e-3 * 298.15;

/**
 * Rate ratio implied by transition-state theory for two barriers that differ by `barrierDrop` kJ·mol⁻¹:
 * exp(ΔΔG‡/RT) at 298 K, assuming the same pre-exponential factor for both pathways. It is a consequence
 * of the chosen teaching energies, not a measured rate enhancement for any real enzyme.
 */
export const relativeRateFactor = (barrierDrop: number, rt = RT_298): number => Math.exp(barrierDrop / rt);

/** Smooth step with zero slope at both ends, so plateaus join the rise and the fall without a kink. */
const smooth = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(t, 0), 1));

/** Reaction-coordinate positions of the plateaus and the maximum, in the 0…1 diagram space. */
export const COORDINATE = {reactantEnd: 0.18, transitionState: 0.5, productStart: 0.82} as const;

/**
 * Energy of a pathway at a reaction-coordinate position in [0, 1]: a reactant plateau, a smooth rise to
 * the single maximum, a smooth fall, and a product plateau. The horizontal axis carries no time information,
 * and the samples are never animated as a particle travelling along it.
 */
export function energyAt(p: Pathway, x: number): number {
  const {reactantEnd, transitionState, productStart} = COORDINATE;
  if (x <= reactantEnd) return p.reactant;
  if (x < transitionState) return p.reactant + (p.transitionState - p.reactant) * smooth((x - reactantEnd) / (transitionState - reactantEnd));
  if (x < productStart) return p.transitionState + (p.product - p.transitionState) * smooth((x - transitionState) / (productStart - transitionState));
  return p.product;
}

/** Evenly spaced samples of `energyAt` across the whole reaction coordinate. */
export function pathwayPoints(p: Pathway, samples = 160): {x: number; energy: number}[] {
  return Array.from({length: samples}, (_, i) => {
    const x = i / (samples - 1);
    return {x, energy: energyAt(p, x)};
  });
}
