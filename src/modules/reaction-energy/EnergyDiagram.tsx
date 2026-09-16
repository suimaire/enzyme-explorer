import {useLayoutEffect, useRef, useState} from 'react';
import {COORDINATE, ENERGY_DOMAIN, pathwayPoints, type Pathway, type ReactionEnergyProfile} from './energyProfile';
import {signed} from '../../shared/math/format';

export const PATHWAY_COLORS = {uncatalyzed: '#6b7a85', catalyzed: '#15618f', level: '#a8761c'} as const;

/** A vertical measurement arrow between two energies, drawn with a head at each end. */
function EnergyArrow({
  x,
  top,
  bottom,
  color,
  dashed,
  label,
  anchor = 'start',
  hideLabel,
  testId,
}: {
  x: number;
  top: number;
  bottom: number;
  color: string;
  dashed?: boolean;
  label: string;
  anchor?: 'start' | 'end';
  hideLabel?: boolean;
  testId?: string;
}) {
  const head = (y: number, dir: 1 | -1) => `M${x - 4},${y + dir * 6} L${x},${y} L${x + 4},${y + dir * 6} Z`;
  return (
    <g className="energy-arrow" data-testid={testId}>
      <line x1={x} x2={x} y1={top} y2={bottom} stroke={color} strokeWidth={1.6} strokeDasharray={dashed ? '4 3' : undefined} />
      <path d={head(top, 1)} fill={color} />
      <path d={head(bottom, -1)} fill={color} />
      {hideLabel ? null : (
        <text x={anchor === 'start' ? x + 6 : x - 6} y={(top + bottom) / 2 + 4} textAnchor={anchor} fill={color} fontSize={12}>
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Reaction-coordinate diagram for the one-barrier teaching model.
 *
 * The y range is fixed by the slider bounds, so switching the enzyme on or off never rescales the axis and
 * the two pathways are always read against the same two end-point levels. The x axis is a reaction
 * coordinate: it carries no time information, and nothing is animated along it.
 */
export function EnergyDiagram({profile, testId = 'energy-diagram'}: {profile: ReactionEnergyProfile; testId?: string}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  useLayoutEffect(() => {
    const el = host.current!;
    const measure = () => {
      if (el.clientWidth) setWidth(Math.max(280, el.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const height = Math.round(Math.min(460, Math.max(300, width * 0.62)));
  const m = {l: narrow ? 50 : 64, r: narrow ? 14 : 22, t: 18, b: narrow ? 58 : 64};
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const X = (x: number) => m.l + x * pw;
  const Y = (e: number) => m.t + ((ENERGY_DOMAIN.max - e) / (ENERGY_DOMAIN.max - ENERGY_DOMAIN.min)) * ph;

  const line = (p: Pathway) =>
    pathwayPoints(p)
      .map((s, i) => `${i ? 'L' : 'M'}${X(s.x).toFixed(2)},${Y(s.energy).toFixed(2)}`)
      .join('');
  const {uncatalyzed, catalyzed} = profile;
  const ticks = [-30, -15, 0, 15, 30, 45, 60, 70];

  const description =
    `반응 좌표 다이어그램, 교육용 모델. 반응물 에너지 0, 생성물 에너지 ${signed(uncatalyzed.product, 0)} kJ/mol. ` +
    `효소가 없을 때 전이 상태 ${uncatalyzed.transitionState.toFixed(0)}, 정반응 장벽 ${uncatalyzed.forwardBarrier.toFixed(0)}, 역반응 장벽 ${uncatalyzed.reverseBarrier.toFixed(0)}. ` +
    (catalyzed
      ? `효소가 있을 때 전이 상태 ${catalyzed.transitionState.toFixed(0)}, 정반응 장벽 ${catalyzed.forwardBarrier.toFixed(0)}, 역반응 장벽 ${catalyzed.reverseBarrier.toFixed(0)}. 두 경로에서 반응물과 생성물의 에너지는 같습니다.`
      : '효소가 없으므로 효소가 없을 때의 경로만 표시됩니다.');

  return (
    <div ref={host} className="energy-diagram">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        data-testid={testId}
        data-enzyme={catalyzed ? 'on' : 'off'}
        data-delta-g={profile.deltaG.toFixed(2)}
        data-forward-uncatalyzed={uncatalyzed.forwardBarrier.toFixed(2)}
        data-reverse-uncatalyzed={uncatalyzed.reverseBarrier.toFixed(2)}
        data-forward-catalyzed={catalyzed ? catalyzed.forwardBarrier.toFixed(2) : ''}
        data-reverse-catalyzed={catalyzed ? catalyzed.reverseBarrier.toFixed(2) : ''}
        aria-label={description}
      >
        <g className="plot-grid">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + pw} y1={Y(t)} y2={Y(t)} />
              <text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={narrow ? 10.5 : 12}>
                {t}
              </text>
            </g>
          ))}
        </g>
        <rect className="plot-frame" x={m.l} y={m.t} width={pw} height={ph} />

        {/* End-point levels extended across the diagram: exactly what stays put when the enzyme is switched on. */}
        <line className="level-guide" x1={m.l} x2={m.l + pw} y1={Y(uncatalyzed.reactant)} y2={Y(uncatalyzed.reactant)} />
        <line
          className="level-guide"
          data-testid="product-level"
          x1={m.l}
          x2={m.l + pw}
          y1={Y(uncatalyzed.product)}
          y2={Y(uncatalyzed.product)}
        />

        {/* The uncatalysed pathway stays on screen, faint and dashed, while the catalysed pathway is overlaid. */}
        <path
          data-testid="uncatalyzed-path"
          d={line(uncatalyzed)}
          fill="none"
          stroke={PATHWAY_COLORS.uncatalyzed}
          strokeWidth={catalyzed ? 2 : 3}
          strokeDasharray={catalyzed ? '7 5' : undefined}
          opacity={catalyzed ? 0.55 : 1}
          strokeLinecap="round"
        />
        {catalyzed ? (
          <path
            data-testid="catalyzed-path"
            d={line(catalyzed)}
            fill="none"
            stroke={PATHWAY_COLORS.catalyzed}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        ) : null}

        <EnergyArrow
          testId="arrow-forward-uncatalyzed"
          x={X(0.28)}
          top={Y(uncatalyzed.transitionState)}
          bottom={Y(uncatalyzed.reactant)}
          color={PATHWAY_COLORS.uncatalyzed}
          dashed
          anchor="end"
          hideLabel={narrow}
          label={`정반응 ${uncatalyzed.forwardBarrier.toFixed(0)}`}
        />
        {catalyzed ? (
          <EnergyArrow
            testId="arrow-forward-catalyzed"
            x={X(0.4)}
            top={Y(catalyzed.transitionState)}
            bottom={Y(catalyzed.reactant)}
            color={PATHWAY_COLORS.catalyzed}
            hideLabel={narrow}
            label={`정반응 ${catalyzed.forwardBarrier.toFixed(0)}`}
          />
        ) : null}
        {catalyzed ? (
          <EnergyArrow
            testId="arrow-reverse-catalyzed"
            x={X(0.6)}
            top={Y(catalyzed.transitionState)}
            bottom={Y(catalyzed.product)}
            color={PATHWAY_COLORS.catalyzed}
            anchor="end"
            hideLabel={narrow}
            label={`역반응 ${catalyzed.reverseBarrier.toFixed(0)}`}
          />
        ) : null}
        <EnergyArrow
          testId="arrow-reverse-uncatalyzed"
          x={X(0.72)}
          top={Y(uncatalyzed.transitionState)}
          bottom={Y(uncatalyzed.product)}
          color={PATHWAY_COLORS.uncatalyzed}
          dashed
          hideLabel={narrow}
          label={`역반응 ${uncatalyzed.reverseBarrier.toFixed(0)}`}
        />
        <EnergyArrow
          testId="arrow-delta-g"
          x={X(0.94)}
          top={Y(Math.max(uncatalyzed.reactant, uncatalyzed.product))}
          bottom={Y(Math.min(uncatalyzed.reactant, uncatalyzed.product))}
          color={PATHWAY_COLORS.level}
          anchor="end"
          hideLabel={narrow}
          label={`ΔG ${signed(profile.deltaG, 0)}`}
        />

        <text className="state-label" x={X(COORDINATE.reactantEnd / 2)} y={Y(uncatalyzed.reactant) - 10} textAnchor="middle">
          반응물
        </text>
        {/* The product label sits on the side of its level away from the reactant level, so it does not land
            inside the span of the ΔG arrow and its label — unless there is no room below the level, in which case
            ΔG is large and the arrow label is far away anyway. */}
        <text
          className="state-label"
          x={X((1 + COORDINATE.productStart) / 2)}
          y={
            uncatalyzed.product > uncatalyzed.reactant || Y(uncatalyzed.product) + 20 > m.t + ph - 4
              ? Y(uncatalyzed.product) - 10
              : Y(uncatalyzed.product) + 20
          }
          textAnchor="middle"
        >
          생성물
        </text>
        <text className="state-label" x={X(COORDINATE.transitionState)} y={Y(uncatalyzed.transitionState) - 12} textAnchor="middle">
          전이 상태
        </text>

        {/* On a phone the plot area is narrower than the caption, so the axis captions centre on the whole
            figure rather than on the plot box; otherwise the long sub-label runs off the right edge. */}
        <text className="axis-label" x={narrow ? width / 2 : m.l + pw / 2} y={height - (narrow ? 26 : 30)} textAnchor="middle">
          반응 좌표(reaction coordinate)
        </text>
        <text className="axis-sublabel" x={narrow ? width / 2 : m.l + pw / 2} y={height - (narrow ? 9 : 12)} textAnchor="middle" fontSize={narrow ? 10 : undefined}>
          {narrow ? '반응 경로상의 개념적 진행 정도 · 시간축 아님' : '반응 경로를 따라 진행되는 정도를 나타낸 개념적 좌표이며, 시간축이 아닙니다.'}
        </text>
        {/* The rotated label has to fit inside the plot height, which is short on a phone. */}
        <text className="axis-label" transform={`translate(${narrow ? 13 : 15} ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize={narrow ? 11.5 : undefined}>
          {narrow ? '상대 자유에너지 (kJ·mol⁻¹)' : '상대 Gibbs 자유에너지 (kJ·mol⁻¹)'}
        </text>
      </svg>
    </div>
  );
}
