# UX-001 학습 세션 보존

작업일: 2026-10-01 (Asia/Seoul). 범위는 UX-001만이다. 기존 `SITE_WIDE_UX_AUDIT.md`와 `site-wide-ux-audit/`는 수정하지 않았다.

## A. 기존 원인

수정 전 로컬 Edge, 1440×900에서 03A의 50 µM 반응을 시작하고 초기 속도를 측정했다. `모은 측정값 (1개)`가 Reference → 03 왕복 뒤 `모은 측정값 (0개)`로 바뀌었다. App의 조건부 렌더링이 모듈을 unmount하고, component-local 학습 state가 remount 시 기본값으로 생성되는 것이 원인이다.

## B. 세션 구조

`LearningSessionProvider`가 App 수명 동안 하나의 메모리 저장소를 소유한다. `LearningModuleScope`는 공통 예측/해설 컴포넌트의 모듈 경계를 지정한다. 타입이 정해진 `LearningSnapshots`를 `useSyncExternalStore`로 직접 구독하며, setter의 functional update는 저장소의 최신 값에 동기적으로 적용된다. local 학습 state를 나중에 복사하거나 unmount 시 저장하지 않는다. Reference는 저장소를 읽거나 초기화하지 않는다.

전체 모듈을 계속 mount해 숨기는 변경은 없다. 기존 route 조건부 렌더링과 viewer cleanup을 유지한다. 새 dependency, localStorage, sessionStorage, 서버 저장을 추가하지 않았다. **새로고침, 새 App mount, 브라우저를 닫았다 다시 열면 초기 상태로 시작한다.** 브라우저 탭마다 별도 세션이다.

## C. 보존 목록

| 모듈 | 보존하는 학습 상태 |
|---|---|
| 01 Reaction Energy | productEnergy, barrierTop, barrierLowering, enzyme, enzymeSeen, 질문별 선택/확정, 열린 해설 |
| 02 Carbonic Anhydrase | 1–4 학습 stage, 잔기별 학생 판단, 판단 확정, 거리 탐구 완료 잔기, His64 예측/확정, 열린 해설 |
| 03 Kinetics | 03A/B/C stage, MM parameters, collected assay points, 선택한 초기 농도, 실행한 assay 조건/측정 여부, 03A 예측, 03B 실험/기질 농도/비교 baseline/axisLock/guide/고농도 탐색 flag, 질문별 선택/확정, 열린 해설 |
| 05 Regulation | reducer의 scenario/view/narration step/관찰 완료/개입 상태, hormone comparison 진행, F-2,6-BP clamp, 예측/확정, 비교·개입 해설 |

02의 Map/Set은 snapshot 안에서는 object/number array로 저장하고, 렌더링에서 Map/Set으로 파생한다. 05 재생은 route exit에서 pause하여 단계는 보존하고 pending timer를 취소한다. `narration.run`은 stale callback을 거르는 논리적 세대 번호이며 timer handle이 아니다.

## D. 보존하지 않는 상태

Three.js renderer/scene/camera/WebGL context, canvas/DOM/ref, RAF/timer handle, pointer/hover/선택 잔기, viewer 표현·카메라 위치·zoom, 열린 modal, scroll position, 모바일 목록으로 돌아가기 target, 3D 생성 여부/cache/load error, 단순 disclosure와 인산기 이동 animation UI는 저장하지 않는다. 02 복귀 시 현재 학습 단계의 기본 viewer preset을 새로 생성한다. 05의 structure view는 보존하여 필요한 viewer를 새로 생성하지만 확대 modal은 복원하지 않는다.

## E–G. 왕복, 초기화, WebGL 검증

| Kinetics 시나리오 | 결과 |
|---|---|
| A: 50 µM 측정 → Reference → 03 | 1개 유지 |
| B: 10/50/100/500 µM → Start → 02 → 03 | 4개 모두 유지 |
| C: 03A → 03B → Reference → 03 | 03B 선택과 4개 측정점 유지 |
| D: baseline → 다른 모듈 → 03 | 기준 곡선, axisLock, 조건 유지 |
| E: 모듈 reset → 다른 모듈 → 03 | 측정값·진행·baseline·예측·해설 삭제 유지 |

03A와 03B의 예측 선택/확정, disabled/checked/aria-pressed, 고농도 탐색 gate와 열린 해설도 DOM에서 일치했다. “측정값 모두 지우기”도 왕복 후 빈 목록을 유지한다. 01·02·05의 보존 및 명시적 reset은 각 학습 통합 검사에서 통과했다. 05 재생 중 route exit 뒤에는 같은 단계에서 paused 상태로 돌아왔다.

1440×900에서 **02 → Reference → 02 20회, 05 structure → Reference → 05 20회**를 완주했다. 각 exit에서 canvas 0개, 각 복귀에서 새 canvas 1개였고 학습 stage/view가 유지됐다. 각 모듈의 20회 구간에서 아래 정리 항목이 각각 20회 발생했다. 추가 진입·이동·모달 종료를 포함한 전체 fixture 누계는 다음과 같다.

| 정리 항목 | 누계 |
|---|---:|
| StructureScene.dispose / renderer.dispose | 43 / 43 |
| forceContextLoss / 실제 webglcontextlost | 43 / 43 |
| 네 canvas listener 제거 완료 | 43 |
| OrbitControls.dispose / ResizeObserver.disconnect | 43 / 43 |
| exit 당시 진행 중인 camera RAF / cancelAnimationFrame | 1 / 1 |
| 최종 connected canvas | 0 |

05 확대 모달에서 나가면 dialog와 scroll lock이 정리되고, 복귀하면 inline viewer가 새로 생성된다. 이전 카메라나 열린 모달을 복원하지 않는다. 기존 05 fixture의 **12회 확대/닫기**, canvas/context 재사용, 카메라·선택·focus/scroll 복귀 및 module exit context release도 `ALL UI CHECKS PASSED`였다 (지원 probe 포함 contextsCreated=2, contextsLost=1, connectedCanvases=0).

증거: [desktop 학습](ux-001-verification/learning-1440.json), [mobile 학습](ux-001-verification/learning-390.json), [20회씩 lifecycle](ux-001-verification/lifecycle-1440.json), [기존 05 회귀](ux-001-verification/existing-regulation-ui.json). `tests/browser/session-harness.html`은 실제 App/hash navigation을 구동하며 위 cleanup 호출을 관찰한다. instrumentation은 개발용 fixture 안에만 있다. 이 검사는 장시간 heap 누수 부재나 모든 브라우저/GPU 동작을 증명하지 않는다.

## H. 변경 파일

Application:

- `src/app/App.tsx`
- `src/app/LearningSession.tsx` (신규)
- `src/app/learningSessionStore.ts` (신규)
- `src/shared/components/Prediction.tsx`
- `src/modules/reaction-energy/ReactionEnergyLab.tsx`
- `src/modules/carbonic-anhydrase/CarbonicAnhydraseLab.tsx`
- `src/modules/kinetics/KineticsLab.tsx`
- `src/modules/kinetics/InitialVelocityPanel.tsx`
- `src/modules/kinetics/MichaelisMentenPanel.tsx`
- `src/modules/regulation/HormonalRegulation.tsx`

Tests/documentation:

- `tests/learningSession.test.tsx` (신규)
- `tests/browser/session-harness.html` (신규)
- `tests/browser/session-harness.tsx` (신규)
- 이 검증 문서 및 `docs/ux-001-verification/`의 증거 (신규)

viewer renderer, graph/model calculations, CSS, package/dependency files, 기존 tests는 변경하지 않았다.

## I. 추가 검사와 실행 방법

Vitest에 8개 테스트를 추가했다: fresh render에서 측정값 사용, 복수 측정/단계/baseline, prediction checked/disabled/reveal DOM, 전체 kinetics reset과 모듈 격리, 최신 functional update와 unsubscribe, JSON snapshot 경계, reset의 stale regulation tick 거부, 새 App의 빈 세션 정책.

브라우저 통합 fixture는 실제 unmount/remount, Kinetics A–E, 예측/해설/accessible state, 01/02/05 진행과 reset, 05 route exit pause, 각 20회 02/05 Reference 왕복, 새 canvas/정리/no accumulation, 확대 modal 종료/inline 복원을 검사한다.

개발 서버를 시작하고 `/enzyme-explorer/tests/browser/session-harness.html#/start`에서 두 검사 버튼을 차례로 실행한다. `session-audit` 결과에 `ALL LEARNING CHECKS PASSED`와 `ALL LIFECYCLE CHECKS PASSED`가 나와야 한다. 기존 `/tests/browser/regulation-harness.html?motion=reduce&uiAudit=1#/regulation`의 UI 검사도 재사용한다. `motion=reduce`는 기존 fixture의 JS 분기 대체이며 실제 OS reduced-motion 검증을 뜻하지 않는다.

## J–K. 프로젝트 및 브라우저 검증

| 검사 | 최종 결과 |
|---|---|
| npm test | 11 files / 182 tests passed (기존 174 + 신규 8) |
| npm run typecheck | 통과 |
| npm run lint | error/warning 없이 통과 |
| npm run build | 통과 |
| git diff --check | 통과 |
| 1440×900 학습 통합 | ALL LEARNING CHECKS PASSED |
| 390×844 학습 통합 | ALL LEARNING CHECKS PASSED |
| 1440×900 02/05 각 20회 | ALL LIFECYCLE CHECKS PASSED |
| 기존 05 확대/context 회귀 | ALL UI CHECKS PASSED |

일반 앱에서도 두 크기에서 측정 → Reference → 복귀, 측정 → Start → 복귀, reset → 왕복, 02 → Reference 왕복, 05 3D → Reference 왕복을 직접 조작했다. mobile의 02 답변/선택 단계와 05 structure 선택이 복원됐고 Reference가 렌더링된 뒤 connected canvas=0, 복귀 후=1이었다. mobile에서 측정 1개를 만든 뒤 새로고침하면 0개로 초기화되는 것도 확인했다. [desktop 결과](ux-001-verification/production-desktop.json), [mobile 결과](ux-001-verification/production-mobile.json).

최종 검사용 새 탭의 앱 desktop/mobile, mobile 통합 및 기존 05 fixture에서 **console warning/error 0건**이었다 ([최종 console](ux-001-verification/console.json)). 개발 중 파일 이름을 정리하기 전의 임시 HMR import 오류와 자동 재생을 고정 횟수로 진행하던 초기 fixture 오류는 수정 후 재실행했다. 이전 로그는 삭제하지 않고 [개발 이력](ux-001-verification/development-console-history.json)에 별도 보존했으며 최종 runtime 결과와 구분한다.

build의 기존 500 kB 이상 Three.js/ProteinStructure chunk 경고는 이번 작업에서 변경하지 않았다. Git의 전역 ignore 접근 권한/CRLF 경고와 앱 console 오류는 구분한다. 모바일 검증은 Edge의 CSS viewport override이며 실제 휴대폰 touch 또는 다른 OS/브라우저 검증을 뜻하지 않는다.

화면 증거: [네 측정값 복원](ux-001-verification/kinetics-reference-1440.png), [03B baseline 복원](ux-001-verification/kinetics-baseline-1440.png), [mobile 측정값 복원](ux-001-verification/kinetics-reference-390.png), [mobile 05 structure 복원](ux-001-verification/regulation-restored-390.png).

## L. 적용하지 않은 모듈

현재 학습 가능한 01·02·03·05는 모두 적용했다. Start, Reference, 04 예정 화면은 저장할 실험 학습 상태가 없다. 보존 대상의 미적용 모듈은 없다. 영구 저장과 scroll/viewer/modal 복원은 의도적 제외다.

## M. 남은 audit issue

UX-002 촉매 감소량 clamp, UX-003 높은 Km saturation gate, UX-004 axis lock wording, UX-005 virtual measurement wording, UX-006 graph 대비, UX-007 graph/구조 font sizes, UX-008 mobile layout, UX-009 dialog focus return, UX-010 Reference TOC/anchor, UX-011 Start의 05 소개, UX-012 본문 바로가기/route 문맥, UX-013 ADP caption, UX-014 예정 모듈 시각 표시, UX-015 footer 과정 범위, UX-016 resize 뒤 active rail 노출은 이번에 수정하지 않았다.

commit / push / branch 변경 없음. 기준 branch `main`, HEAD `6d19656f77cf812b2001ef57328bc15e66871dac`.
