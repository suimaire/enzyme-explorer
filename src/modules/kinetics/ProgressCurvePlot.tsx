import {useMeasuredWidth} from '../../shared/components/useMeasuredWidth';
import type {ProgressSample} from '../../kinetics/types';

export const KINETICS_COLORS = {
  curve: '#15618f',
  tangent: '#b5451f',
  baseline: '#8d979e',
  marker: '#a8266f',
  measured: '#1f7a63',
} as const;

/**
 * Product against time for one simulated assay.
 *
 * The y axis spans this assay's own [S]₀, so the ceiling on the plot is "all of the substrate converted".
 * The tangent, when shown, is the model's initial rate drawn over the whole window — the gap that opens
 * between it and the curve is the reason initial velocity has to be read at the very start of a run.
 */
export function ProgressCurvePlot({
  samples,
  initialSubstrate,
  tangent,
}: {
  samples: ProgressSample[];
  initialSubstrate: number;
  tangent: readonly [{time: number; product: number}, {time: number; product: number}] | null;
}) {
  const [host, width] = useMeasuredWidth(620);
  const narrow = width < 480;
  const height = Math.round(Math.min(380, Math.max(240, width * 0.58)));
  const m = {l: narrow ? 52 : 62, r: narrow ? 14 : 20, t: 16, b: narrow ? 50 : 54};
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const duration = samples.at(-1)?.time ?? 1;
  const X = (t: number) => m.l + (t / duration) * pw;
  const Y = (p: number) => m.t + (1 - p / initialSubstrate) * ph;

  const path = samples.map((s, i) => `${i ? 'L' : 'M'}${X(s.time).toFixed(2)},${Y(s.product).toFixed(2)}`).join('');
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * initialSubstrate);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * duration);
  const final = samples.at(-1);

  return (
    <div ref={host} className="plot">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        data-testid="progress-curve"
        data-duration={duration.toFixed(2)}
        data-final-product={final ? final.product.toFixed(3) : ''}
        data-tangent={tangent ? 'on' : 'off'}
        aria-label={`Product concentration against time for an assay starting at ${initialSubstrate} micromolar substrate. Over ${duration.toFixed(
          0,
        )} seconds the product rises to ${final ? final.product.toFixed(1) : '0'} micromolar, and the curve flattens as substrate is used up.${
          tangent ? ' A straight tangent drawn at time zero shows the initial rate; the curve falls below it as the run proceeds.' : ''
        }`}
      >
        <defs>
          <clipPath id="progress-clip">
            <rect x={m.l} y={m.t} width={pw} height={ph} />
          </clipPath>
        </defs>
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
                {t.toFixed(0)}
              </text>
            </g>
          ))}
        </g>
        <rect className="plot-frame" x={m.l} y={m.t} width={pw} height={ph} />
        {tangent ? (
          <g clipPath="url(#progress-clip)">
            <line
              data-testid="initial-rate-tangent"
              x1={X(tangent[0].time)}
              y1={Y(tangent[0].product)}
              x2={X(tangent[1].time)}
              y2={Y(tangent[1].product)}
              stroke={KINETICS_COLORS.tangent}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          </g>
        ) : null}
        <path d={path} fill="none" stroke={KINETICS_COLORS.curve} strokeWidth={2.8} strokeLinecap="round" clipPath="url(#progress-clip)" />
        {tangent && !narrow ? (
          // Placed above the tangent, far enough along the window that the real curve has already dropped
          // clear of it — the label must not sit on top of either line.
          <text x={X(duration * 0.52)} y={Y(tangent[1].product * 0.52) - 12} fill={KINETICS_COLORS.tangent} fontSize={12} textAnchor="middle">
            initial rate (tangent at t = 0)
          </text>
        ) : null}
        <text className="axis-label" x={m.l + pw / 2} y={height - (narrow ? 12 : 14)} textAnchor="middle">
          Time (s)
        </text>
        <text className="axis-label" transform={`translate(${narrow ? 13 : 15} ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle">
          [P] (µM)
        </text>
      </svg>
    </div>
  );
}
