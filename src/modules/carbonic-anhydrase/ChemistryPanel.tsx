import {Caution, SourceTag} from '../../shared/components/Callout';

/**
 * The chemistry of the site, kept strictly separate from the structure panel above it.
 *
 * Everything here is a mechanistic reading built from the wider literature; nothing in it is observed in the
 * deposited coordinates, and it is labelled accordingly.
 */
export function ChemistryPanel({unlocked}: {unlocked: boolean}) {
  return (
    <section className="observation prose-panel" aria-label="활성 부위 화학" data-testid="chemistry-panel">
      <h3>
        <SourceTag kind="interpretation" />
        활성 부위는 물의 반응성을 어떻게 바꿀까?
      </h3>
      {!unlocked ? (
        <p className="gate-note">먼저 3단계를 진행하세요. 이 부분은 3단계에서 찾은 solvent 자리에 대한 설명입니다.</p>
      ) : (
        <>
          <p>
            이 모듈의 질문은 활성 부위의 화학적 환경이 물의 반응성을 어떻게 바꾸는가였습니다. 물은 약한 친핵체(nucleophile)입니다.
            수산화 이온은 훨씬 강한 친핵체이지만, 중성 pH에서는 그 양이 매우 적습니다.
          </p>
          <p>
            세 histidine에 붙잡힌 Zn²⁺와 특정 잔기들로 둘러싸인 주변 활성 부위 환경은{' '}
            <strong>결합된 solvent의 산-염기 성질과 반응성</strong>을 변화시킵니다. 금속에 결합한 solvent 분자는 자유로운
            물보다 양성자를 훨씬 쉽게 내놓습니다. 그래서 일반 용액에서는 매우 드문 반응성 높은 Zn²⁺ 결합 수산화 상태가
            생리적 pH에서도 도달 가능한 상태가 됩니다.
          </p>
          <ol className="cycle" data-testid="catalytic-cycle">
            <li>solvent 분자 하나가 Zn²⁺의 네 번째 배위 자리를 차지합니다.</li>
            <li>Zn²⁺와 주변 활성 부위 환경이 결합된 solvent의 산-염기 성질을 변화시킵니다.</li>
            <li>자유 수산화 이온이 드문 조건에서도 반응성 높은 Zn²⁺ 결합 수산화 상태가 유리해집니다.</li>
            <li>Zn²⁺에 결합한 수산화 이온이 활성 부위 주머니 근처에 자리 잡은 CO₂를 공격합니다.</li>
            <li>탄산수소 이온(bicarbonate)이 만들어지고 금속에서 떨어져 나갑니다.</li>
            <li>물 분자가 그 자리를 채우고, 양성자 하나가 활성 부위에서 바깥 용매 쪽으로 옮겨 갑니다.</li>
            <li>촉매 상태가 다시 만들어지고 순환이 반복됩니다.</li>
          </ol>
          <Caution title="이렇게 이해하면 안 됩니다">
            <p>
              <strong>Zn²⁺는 수산화 이온을 건네주는 것이 아닙니다.</strong> 기질에 OH⁻를 공급하는 것이 아니라, 이미 결합해
              있는 solvent 분자의 산-염기 성질과 반응성을 바꾸는 것입니다.
            </p>
            <p>
              <strong>이 과정은 구조에서 보이지 않습니다.</strong> 2~7단계는 반응 메커니즘 해석입니다. 결정 구조는 정밀화된
              원자 위치 한 세트일 뿐 반응을 기록한 것이 아니므로, 양성자 이동도 양성자화 상태도 직접 보여 주지 않습니다.
            </p>
          </Caution>
          <p>
            모듈 01과 연결해 보세요. 효소는 반응을 열역학적으로 더 유리하게 만들지 않았고, 평형의 위치도 바꾸지 않았습니다.
            효소가 없을 때 용액에서 일어나는 반응보다 가장 높은 활성화 장벽이 더 낮은 경로를 제공한 것입니다.
          </p>
          <p className="small">
            단순화한 내용 전체는 <a href="#/model-notes">모델 및 주의사항</a>에서 볼 수 있습니다.
          </p>
        </>
      )}
    </section>
  );
}
