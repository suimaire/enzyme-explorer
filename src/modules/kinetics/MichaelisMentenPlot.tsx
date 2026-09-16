import {KINETICS_COLORS} from './ProgressCurvePlot';
import {useMeasuredWidth} from '../../shared/components/useMeasuredWidth';
import {calculateV0, calculateVmax, generateMichaelisMentenCurve} from '../../kinetics/michaelisMenten';
import type {AssayResult, MichaelisMentenParameters} from '../../kinetics/types';

/** Fixed substrate axis, so changing a parameter never moves the x scale under the student. */
export const SUBSTRATE_AXIS_MAX = 600;

const sameParameters = (a: MichaelisMentenParameters, b: MichaelisMentenParameters) =>
  a.km === b.km && a.kcat === b.kcat && a.enzymeTotal === b.enzymeTotal;

/**
 * v0 against [S].
 *
 * Both axes are held fixed while a comparison is running: the x axis always spans 0–600 µM, and the y axis
 * is driven by `velocityAxisMax`, which the panel locks before an experiment changes a parameter. Without
 * that lock, doubling [E]T would double Vmax *and* the axis, and the two curves would look identical.
 */
export function MichaelisMentenPlot({
  parameters,
  baseline,
  currentSubstrate,
  velocityAxisMax,
  showVmaxGuide,
  showKmGuide,
  assays,
}: {
  parameters: MichaelisMentenParameters;
  /** Reference curve kept on screen while an experiment changes a parameter, or null. */
  baseline: MichaelisMentenParameters | null;
  currentSubstrate: number;
  velocityAxisMax: number;
  showVmaxGuide: boolean;
  showKmGuide: boolean;
  /** Initial-velocity measurements carried over from 03A. */
  assays: readonly AssayResult[];
}) {
  const [host, width] = useMeasuredWidth(680);
  const narrow = width < 520;
  const height = Math.round(Math.min(420, Math.max(270, width * 0.6)));
  const m = {l: narrow ? 56 : 68, r: narrow ? 14 : 22, t: 16, b: narrow ? 52 : 58};
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const X = (s: number) => m.l + (s / SUBSTRATE_AXIS_MAX) * pw;
  const Y = (v: number) => m.t + (1 - v / velocityAxisMax) * ph;

  const curve = (p: MichaelisMentenParameters) =>
    generateMichaelisMentenCurve(p, SUBSTRATE_AXIS_MAX, 200)
      .map((s, i) => `${i ? 'L' : 'M'}${X(s.substrate).toFixed(2)},${Y(s.velocity).toFixed(2)}`)
      .join('');

  const vmax = calculateVmax(parameters);
  const current = calculateV0(parameters, currentSubstrate);
  const xTicks = [0, 100, 200, 300, 400, 500, 600];
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * velocityAxisMax);

  return (
    <div ref={host} className="plot">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        data-testid="mm-plot"
        data-vmax={vmax.toFixed(3)}
        data-km={parameters.km}
        data-current-substrate={currentSubstrate}
        data-current-velocity={current.toFixed(3)}
        data-axis-max={velocityAxisMax.toFixed(3)}
        data-baseline-vmax={baseline ? calculateVmax(baseline).toFixed(3) : ''}
        aria-label={`Initial velocity against substrate concentration. Substrate axis 0 to ${SUBSTRATE_AXIS_MAX} micromolar, velocity axis 0 to ${velocityAxisMax.toFixed(
          0,
        )} nanomolar per second. Vmax ${vmax.toFixed(1)} nanomolar per second, Km ${parameters.km} micromolar. At the current substrate ${currentSubstrate} micromolar, v0 is ${current.toFixed(
          1,
        )} nanomolar per second.${baseline ? ` A reference curve with Vmax ${calculateVmax(baseline).toFixed(1)} is kept for comparison.` : ''}`}
      >
        <g className="plot-grid">
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + pw} y1={Y(t)} y2={Y(t)} />
              <text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={narrow ? 10.5 : 12}>
                {t.toFixed(0)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={t}>
              <line x1={X(t)} x2={X(t)} y1={m.t} y2={m.t + ph} />
              <text x={X(t)} y={m.t + ph + 16} textAnchor="middle" fontSize={narrow ? 10.5 : 12}>
                {t}
              </text>
            </g>
          ))}
        </g>
        <rect className="plot-frame" x={m.l} y={m.t} width={pw} height={ph} />

        {showVmaxGuide ? (
          <g data-testid="vmax-guide">
            <line x1={m.l} x2={m.l + pw} y1={Y(vmax)} y2={Y(vmax)} stroke={KINETICS_COLORS.curve} strokeWidth={1.4} strokeDasharray="7 5" />
            <text x={m.l + pw - 4} y={Y(vmax) - 6} textAnchor="end" fill={KINETICS_COLORS.curve} fontSize={12}>
              Vmax = {vmax.toFixed(0)} nM·s⁻¹
            </text>
          </g>
        ) : null}
        {showKmGuide ? (
          <g data-testid="km-guide">
            <line x1={m.l} x2={X(parameters.km)} y1={Y(vmax / 2)} y2={Y(vmax / 2)} stroke={KINETICS_COLORS.marker} strokeWidth={1.4} strokeDasharray="4 4" />
            <line x1={X(parameters.km)} x2={X(parameters.km)} y1={Y(vmax / 2)} y2={m.t + ph} stroke={KINETICS_COLORS.marker} strokeWidth={1.4} strokeDasharray="4 4" />
            <text x={X(parameters.km) + 6} y={m.t + ph - 8} fill={KINETICS_COLORS.marker} fontSize={12}>
              [S] = Km = {parameters.km} µM
            </text>
            <text x={m.l + 6} y={Y(vmax / 2) - 6} fill={KINETICS_COLORS.marker} fontSize={12}>
              Vmax / 2
            </text>
          </g>
        ) : null}

        {baseline ? (
          <path
            data-testid="baseline-curve"
            d={curve(baseline)}
            fill="none"
            stroke={KINETICS_COLORS.baseline}
            strokeWidth={2.2}
            strokeDasharray="8 5"
            strokeLinecap="round"
          />
        ) : null}
        <path data-testid="mm-curve" d={curve(parameters)} fill="none" stroke={KINETICS_COLORS.curve} strokeWidth={3} strokeLinecap="round" />

        {assays.map((a) => {
          const matches = sameParameters(a.parameters, parameters);
          return (
            <g key={`${a.initialSubstrate}-${a.initialVelocity}`} data-testid="assay-point" data-matches={matches ? 'yes' : 'no'}>
              <rect
                x={X(a.initialSubstrate) - 5}
                y={Y(a.initialVelocity) - 5}
                width={10}
                height={10}
                fill={matches ? KINETICS_COLORS.measured : 'white'}
                stroke={KINETICS_COLORS.measured}
                strokeWidth={2}
                transform={`rotate(45 ${X(a.initialSubstrate)} ${Y(a.initialVelocity)})`}
              />
            </g>
          );
        })}

        <line x1={X(currentSubstrate)} x2={X(currentSubstrate)} y1={m.t} y2={m.t + ph} stroke={KINETICS_COLORS.marker} strokeWidth={1} opacity={0.5} />
        <circle
          data-testid="current-marker"
          cx={X(currentSubstrate)}
          cy={Y(current)}
          r={7}
          fill={KINETICS_COLORS.marker}
          stroke="white"
          strokeWidth={2.4}
        />

        <text className="axis-label" x={m.l + pw / 2} y={height - (narrow ? 12 : 14)} textAnchor="middle">
          [S] (µM)
        </text>
        <text className="axis-label" transform={`translate(${narrow ? 13 : 15} ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle">
          v₀ (nM·s⁻¹)
        </text>
      </svg>
    </div>
  );
}
