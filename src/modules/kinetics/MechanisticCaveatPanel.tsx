/**
 * 03C — what Km is made of.
 *
 * Deliberately not a simulator. In the basic model a student sets Km and kcat; letting them also set k1 and
 * k−1 at the same time would mean two independent routes to the same quantity. A mechanistic mode with k1
 * and k−1 as the controls, and Km derived from them, is an Enzyme II extension — `michaelisMentenModel` in
 * src/kinetics is already the boundary it would plug into.
 */
export function MechanisticCaveatPanel() {
  return (
    <div className="prose-panel" data-testid="panel-03c">
      <h3>Km은 어디에서 오는가</h3>
      <p>이 모델의 바탕이 되는 반응 단계는 다음과 같습니다.</p>
      <p className="equation">E + S ⇌ ES → E + P</p>
      <p>
        여기서 결합 속도상수는 k₁, 해리 속도상수는 k₋₁, 촉매 단계의 속도상수는 k<sub>cat</sub>입니다. 정상 상태 가정(steady-state
        assumption)으로 이 식을 풀면 다음을 얻습니다.
      </p>
      <p className="equation" data-testid="km-expression">
        Km = (k₋₁ + k<sub>cat</sub>) / k₁
      </p>
      <p>반면 실제로 결합을 나타내는 값인 ES 복합체의 평형 해리 상수(dissociation constant)는 다음과 같습니다.</p>
      <p className="equation" data-testid="kd-expression">
        K<sub>d</sub> = k₋₁ / k₁
      </p>
      <details data-testid="km-kd-details">
        <summary>Km과 K<sub>d</sub>는 언제 비슷해지고, 언제 달라질까?</summary>
        <ul>
          <li>
            k<sub>cat</sub> ≪ k₋₁인 경우, 즉 ES 복합체가 생성물로 전환되기보다 다시 해리되는 경우가 훨씬 많으면
            k<sub>cat</sub> 항을 무시할 수 있으므로 <strong>Km이 K<sub>d</sub>에 가까워질 수 있습니다</strong>.
          </li>
          <li>
            k<sub>cat</sub>이 k₋₁과 비슷하거나 더 크면 Km은 K<sub>d</sub>보다 커집니다. 얼마나 커지는지는 결합이 아니라 촉매
            단계에 따라 달라집니다.
          </li>
          <li>
            <strong>하지만 일반적으로 Km과 K<sub>d</sub>는 서로 다른 물리적 의미를 가진 값입니다.</strong> Km이 같은 두
            효소라도 결합 상수는 크게 다를 수 있고, 돌연변이로 Km이 커졌더라도 결합이 아니라 k<sub>cat</sub>이 바뀐 것일 수
            있습니다.
          </li>
        </ul>
        <p>
          따라서 Km의 크기만으로 기질 결합 친화도(binding affinity)를 일반적으로 단정할 수 없습니다. 측정한 Km은
          (k₋₁ + k<sub>cat</sub>)/k₁이라는 조합의 값을 알려 줄 뿐입니다. 개별 속도상수를 구분하려면 v₀ 대 [S] 곡선이 아니라
          전정상 상태(pre-steady-state) 측정 같은 추가 실험이 필요합니다.
        </p>
      </details>
      <p className="small">
        모듈 03 전체는 기질이 하나이고, 초기 속도 조건(initial-rate condition)이며, 협동성(cooperativity)이 없다고
        가정합니다. 실제 효소 중에는 Michaelis–Menten 반응속도론을 따르지 않는 효소도 많습니다. 자세한 내용은{' '}
        <a href="#/model-notes">모델 및 주의사항</a>을 참고하세요.
      </p>
    </div>
  );
}
