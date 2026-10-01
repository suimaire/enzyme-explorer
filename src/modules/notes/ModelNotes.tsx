import {useEffect, type MouseEvent} from 'react';
import {hashFor, type ModuleId} from '../../app/modules';
import {MODEL_NOTES_SECTIONS, focusModelNotesSection, modelNotesHash, modelNotesLabel, modelNotesTarget, type ModelNotesSection} from '../../app/modelNotesNavigation';
import {ModuleHeader} from '../../shared/components/ModuleHeader';
import {RateConstant} from '../../shared/components/Formula';
import {STRUCTURE_SOURCE} from '../carbonic-anhydrase/structureSource';

/** Core limitations stay visible; detailed evidence remains available within each module section. */
export function ModelNotes({section = null, onReturn}: {section?: ModelNotesSection | null; onReturn?: (module: ModuleId) => void} = {}) {
  useEffect(() => {
    if (!section) return;
    focusModelNotesSection(section);
    const heading = document.getElementById(modelNotesTarget(section));
    return () => {
      // Back can remove the focused heading. Leave a surviving rail control alone.
      queueMicrotask(() => {
        if (heading && !heading.isConnected && document.activeElement === document.body) {
          document.getElementById('main-content')?.focus({preventScroll: true});
        }
      });
    };
  }, [section]);
  function selectSection(next: ModelNotesSection) {
    if (next === section) {focusModelNotesSection(next); return;}
    // In-document navigation replaces the Reference entry so Back returns to the originating module.
    window.history.replaceState(window.history.state, '', modelNotesHash(next));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  function returnToModule(event: MouseEvent<HTMLAnchorElement>, module: ModuleId) {
    if (!onReturn) return;
    event.preventDefault();
    onReturn(module);
  }
  return (
    <div className="module" data-testid="module-model-notes">
      <ModuleHeader id="model-notes" />
      <div className="prose-panel notes">
        <nav className="notes-toc" aria-label="이 페이지에서 바로 찾기">
          <p><strong>이 페이지에서 바로 찾기</strong></p>
          <ul>{MODEL_NOTES_SECTIONS.map(item => <li key={item.id}>
            <a href={modelNotesHash(item.id)} aria-current={section === item.id ? 'location' : undefined}
              onClick={event => {event.preventDefault(); selectSection(item.id);}}>{modelNotesLabel(item)}</a>
          </li>)}</ul>
        </nav>
        <section aria-labelledby="model-notes-common">
          <h3 id="model-notes-common" tabIndex={-1}>전체 공통</h3>
          <p className="lead">
            각 모듈은 일부러 단순화한 모델을 사용합니다. 각 모델은 그 목적에는 맞지만, 모두 어딘가에서 한계가 있습니다. 이
            페이지는 그 한계가 어디인지 정리합니다.
          </p>
          <p>먼저 알아둘 점에서 학습에 필요한 한계를 확인하고, 상세 근거에서 모델 가정과 구조 자료를 더 살펴보세요.</p>
        </section>

        <section aria-labelledby="model-notes-energy">
          <h3 id="model-notes-energy" tabIndex={-1}>{modelNotesLabel(MODEL_NOTES_SECTIONS[1])}</h3>
          <p className="notes-return"><a href={hashFor('reaction-energy')} onClick={event => returnToModule(event, 'reaction-energy')}>01 반응 에너지로 돌아가기 →</a></p>
          <h4>먼저 알아둘 점</h4>
          <ul>
            <li>
              <strong>활성화 장벽이 하나뿐입니다.</strong> 다이어그램은 경로마다 전이 상태(transition state)를 하나만
              그립니다. 실제 효소 반응은 보통 여러 중간체와 여러 전이 상태를 거칩니다. 이때 &ldquo;활성화 장벽&rdquo;은 경로
              전체에서 가장 높은 유효 장벽을 뜻하며, 효소가 있을 때의 경로는 효소가 없을 때와 중간체 자체가 다를 수도
              있습니다.
            </li>
            <li>
              <strong>반응 좌표(reaction coordinate)는 시간축이 아닙니다.</strong> 가로축은 반응 경로를 따라 진행되는
              정도를 나타낸 개념적 좌표입니다. 축 위의 한 위치가 반응 중 특정 순간을 뜻하지 않으며, 분자가 이 축을 따라
              일정한 속도로 움직이는 것도 아닙니다.
            </li>
            <li>
              <strong>에너지 값은 측정값이 아니라 설정값입니다.</strong> 슬라이더로 정한 교육용 kJ·mol⁻¹ 눈금이며, 이
              모듈의 어떤 값도 실제 특정 반응을 나타내지 않습니다.
            </li>
          </ul>
          <details className="notes-details">
            <summary>상세 근거와 모델 가정</summary>
          <ul>
            <li>
              <strong>ΔG와 ΔG°.</strong> 두 끝 상태 사이의 높이 차이는 표준 자유에너지의 차이입니다. 평형 상수를 결정하는
              것은 ΔG°이며, 실제 반응 혼합물의 순간적인 ΔG는 그 순간의 농도에도 영향을 받습니다.
            </li>
            <li>
              <strong>속도 증가 배율.</strong> 표시되는 속도 증가 배율은 298 K에서 exp(ΔΔG‡/RT)로 계산한 값입니다. 전이
              상태 이론을 적용하고 두 경로의 앞지수 인자가 같다고 가정했습니다. 여러분이 설정한 에너지에서 나온 결과이며,
              실제로 측정한 속도 증가가 아닙니다.
            </li>
          </ul>
          </details>
        </section>

        <section aria-labelledby="model-notes-carbonic">
          <h3 id="model-notes-carbonic" tabIndex={-1}>{modelNotesLabel(MODEL_NOTES_SECTIONS[2])}</h3>
          <p className="notes-return"><a href={hashFor('carbonic-anhydrase')} onClick={event => returnToModule(event, 'carbonic-anhydrase')}>02 탄산무수화효소로 돌아가기 →</a></p>
          <h4>먼저 알아둘 점</h4>
          <ul>
            <li>
              <strong>구조는 모델이지 영상이 아닙니다.</strong> PDB {STRUCTURE_SOURCE.pdbId}는 결정의 X선 회절 데이터에
              맞추어 만든 {STRUCTURE_SOURCE.resolution} Å 분해능의 실험 모델입니다. 정밀화된 원자 위치 한 세트를 보여 줄 뿐,
              효소의 움직임이나 반응이 일어나는 과정을 보여 주지 않습니다.
            </li>
            <li>
              <strong>양성자화 상태(protonation state)는 해석입니다.</strong> 이 분해능의 일반적인 X선 구조에서는 수소
              원자의 위치가 결정되지 않습니다. 특정 pH에서 Zn²⁺에 결합한 solvent 분자가 물인지 수산화 이온인지는 여러
              증거를 종합한 메커니즘 해석이며, 이 좌표에서 직접 읽을 수 있는 것이 아닙니다. 그래서 이 앱은 그 자리를
              &ldquo;Zn²⁺에 결합한 solvent&rdquo;라고 부릅니다.
            </li>
            <li>
              <strong>수소 결합(hydrogen bond)은 기하 구조로부터의 추론입니다.</strong> 수소 위치가 없으므로, 주개와
              받개 사이의 거리가 짧다는 것은 수소 결합이 있을 가능성을 뒷받침할 뿐 확정하지 않습니다. 이 앱은 그런 접촉을
              가능한 상호작용으로만 설명하고 측정한 거리를 함께 보여 줍니다.
            </li>
            <li>
              <strong>촉매 순환은 수업용 요약입니다.</strong> 화학 설명 영역의 순환 단계는 여러 연구를 종합한 반응
              메커니즘 해석이며, 이 파일에서 관찰된 것이 아닙니다.
            </li>
          </ul>
          <details className="notes-details">
            <summary>상세 근거와 구조 metadata</summary>
          <ul>
            <li>
              <strong>결정 구조의 물 분자가 용매 전체는 아닙니다.</strong> 모델에는 위치가 고정된 물 분자만 나타납니다.
              자유롭게 움직이는 용매와, 반응이 반복되는 동안 활성 부위를 드나드는 물의 교환은 표현되지 않습니다.
            </li>
            <li>
              <strong>잔기 번호와 원자 이름은 PDB 파일의 표기입니다.</strong> His94의 94는 이 구조의 residue numbering을
              따릅니다. 탄산무수화효소 II는 관례적인 번호 체계를 쓰기 때문에 이 구조에는 126번이 없지만 사슬은 125번에서
              127번으로 끊김 없이 이어집니다. ND1·NE2는 histidine 고리의 두 질소 Nδ1·Nε2를 PDB 파일에서 적는 방식입니다.
              표에 나오는 원자는 좌표에서 Zn²⁺에 가장 가까운 원자일 뿐이며, 수소 위치가 결정되지 않으므로 어느 질소에 수소가
              붙어 있는지(tautomer)는 이 좌표로 확정하지 않습니다.
            </li>
            <li>
              <strong>직접 배위 판정은 거리 기준입니다.</strong> 질소·산소·황 원자가 Zn²⁺에서 2.6 Å 이내에 있을 때 직접
              배위로 판단합니다. 이렇게 좌표에서 얻은 리간드 목록은 구조 파일에 기록된 LINK 정보와 일치하며, 나머지
              histidine과의 사이에는 뚜렷한 거리 간격이 있습니다. 수업에서는 배위를 &ldquo;질소의 비공유 전자쌍이 Zn²⁺와
              상호작용한다&rdquo; 수준으로 단순화했습니다.
            </li>
            <li>
              <strong>두 가지 형태(alternate conformation).</strong> 이 구조에서 His64는 두 가지 형태로 모델링되어
              있습니다. 3D 화면은 점유율이 더 높은 형태를 보여 주며, 두 형태가 존재한다는 사실 자체도 실험 결과의
              일부입니다.
            </li>
          </ul>
          <div>
          <h4>구조 출처</h4>
          <p>
            PDB {STRUCTURE_SOURCE.pdbId} — {STRUCTURE_SOURCE.title}. {STRUCTURE_SOURCE.method}, {STRUCTURE_SOURCE.resolution} Å.{' '}
            {STRUCTURE_SOURCE.citation} 이 파일은 RCSB PDB에서 내려받은 그대로 앱에 포함되어 있으므로, 앱을 실행할 때 외부
            네트워크 서비스에 의존하지 않습니다.
          </p>
          <p className="small">
            <a href={STRUCTURE_SOURCE.url} target="_blank" rel="noreferrer noopener">
              RCSB PDB 항목 {STRUCTURE_SOURCE.pdbId}
            </a>
          </p>
          </div>
          </details>
        </section>

        <section aria-labelledby="model-notes-kinetics">
          <h3 id="model-notes-kinetics" tabIndex={-1}>{modelNotesLabel(MODEL_NOTES_SECTIONS[3])}</h3>
          <p className="notes-return"><a href={hashFor('kinetics')} onClick={event => returnToModule(event, 'kinetics')}>03 반응속도론으로 돌아가기 →</a></p>
          <h4>먼저 알아둘 점</h4>
          <ul>
            <li>
              <strong>기질 하나, 생성물 하나, 저해제 없음.</strong> 모델은 정상 상태 가정(steady-state assumption)을 적용한
              E + S ⇌ ES → E + P입니다.
            </li>
            <li>
              <strong>초기 속도 조건(initial-rate condition).</strong> v₀ = Vmax[S]/(Km + [S])는 반응이 시작되는 순간의
              속도입니다. 이때 [S]는 아직 설정한 농도 그대로이고, 생성물은 거의 쌓이지 않았습니다.
            </li>
            <li>
              <strong>협동성(cooperativity)이나 알로스테릭 조절은 다루지 않습니다.</strong> v₀ 대 [S] 그래프가 S자 모양인
              효소, 즉 알로스테릭 반응속도론(allosteric kinetics)을 보이는 효소는 이 식으로 전혀 설명되지 않습니다.
              &ldquo;모든 효소가 Michaelis–Menten 반응속도론을 따른다&rdquo;는 말은 틀렸습니다.
            </li>
            <li>
              <strong>Km은 K<sub>d</sub>가 아닙니다.</strong> <span className="nowrap">
                Km = (<RateConstant step="-1" /> + <RateConstant step="cat" />)/<RateConstant step="1" />
              </span>
              이고{' '}
              <span className="nowrap">
                K<sub>d</sub> = <RateConstant step="-1" />/<RateConstant step="1" />
              </span>
              입니다. 두 값은 <RateConstant step="cat" /> ≪{' '}
              <RateConstant step="-1" />인 극한에서만 거의 같아집니다. Km의 변화만으로는 기질 결합 친화도가 어떻게
              변했는지 알 수 없습니다.
            </li>
          </ul>
          <details className="notes-details">
            <summary>상세 근거와 모델 가정</summary>
          <ul>
            <li>
              <strong>반응 진행 곡선 시뮬레이션은 비가역 반응입니다.</strong> P = S₀ − S 조건에서 dS/dt = −Vmax·S/(Km + S)를
              적분합니다. 역반응, 생성물 저해(product inhibition), 효소 불활성화가 없으며, 정상 상태 근사가 반응 초기뿐
              아니라 측정 시간 전체에서 성립한다고 가정합니다.
            </li>
            <li>
              <strong>Vmax는 점근값입니다.</strong> [S] → ∞일 때 v₀가 다가가는 한계값이며, 유한한 기질 농도에서 실제로
              도달하는 속도가 아닙니다.
            </li>
          </ul>
          </details>
        </section>

        <section aria-labelledby="model-notes-regulation">
          <h3 id="model-notes-regulation" tabIndex={-1}>{modelNotesLabel(MODEL_NOTES_SECTIONS[4])}</h3>
          <p className="notes-return"><a href={hashFor('regulation')} onClick={event => returnToModule(event, 'regulation')}>05 효소 조절로 돌아가기 →</a></p>
          <h4>먼저 알아둘 점</h4>
          <p>간 PFKFB1 L형의 급성 조절을 탐구하는 정성적 모델입니다. 실제 농도, 혈당, 대사속도나 반응 시간을 계산하지 않으며 다른 PFKFB isoform에 일반화할 수 없습니다.</p>
          <p>F-2,6-BP 고정은 인과 관계를 탐구하는 가상 개입입니다. 상위 호르몬 신호를 유지하고 하위 효소에 적용되는 조절물질 상태만 바꿉니다.</p>
          <p>PFK-2 / FBPase-2의 증감 표시는 상대적 활성을 뜻합니다. 인슐린의 phosphatase 관여는 간접 근거로 설명합니다. 간 L형의 apparent Km / Vmax 심화 설명과 다른 조직의 isoform 비교는 모듈 안에서 접어두고 확인할 수 있습니다.</p>
          <p>3D 실험 좌표와 독립적인 조절 Ser 모식도를 분리합니다. Ser33은 construct에 포함되지 않습니다.</p>
          <details className="notes-details">
            <summary>상세 근거와 구조 metadata</summary>
          <p>사람 UniProt P16118-1 Ser33의 조절 주석은 by similarity (ECO:0000250)입니다. 랫드 문헌의 Ser32와 번호 체계를 구분합니다.</p>
          <p>1K6M은 사람 간 효소의 절단·변이 구조입니다. canonical 40–471에 좌표가 있고 Ser33은 construct에 포함되지 않습니다. 등록 변이 4개 외에 H305R 서열 불일치의 원인은 미확인입니다. assembly 1은 A 및 대칭 변환된 A로 구성됩니다. 3D 실험 좌표와 독립적인 조절 Ser 모식도를 분리합니다.</p>
          <a href={hashFor('regulation')} onClick={event => returnToModule(event, 'regulation')}>효소 조절 모듈과 출처 확인 →</a>
          </details>
        </section>
      </div>
    </div>
  );
}
