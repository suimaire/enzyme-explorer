import {ModuleHeader} from '../../shared/components/ModuleHeader';
import type {ModuleId} from '../../app/modules';

/**
 * Placeholder for the two Enzyme II modules. They are listed in the registry so the navigation shows the
 * whole shape of the course, and adding the real module later means replacing this one line in App.tsx.
 */
export function ComingSoon({id}: {id: ModuleId}) {
  return (
    <main className="module" data-testid={`module-${id}`}>
      <ModuleHeader id={id} tag={<span className="badge">Enzyme II에서 다룰 예정</span>} />
      <div className="prose-panel">
        <p>이 모듈은 다음 차시인 Enzyme II — 효소 저해와 조절에서 다룰 내용이며, 아직 준비 중입니다.</p>
        <p>
          지금 모듈 03에서 사용하는 반응 속도 모델을 바탕으로, 저해제(inhibitor)가 있을 때 v₀ 대 [S] 곡선이 어떻게
          달라지는지 이어서 탐구하게 됩니다.
        </p>
      </div>
    </main>
  );
}
