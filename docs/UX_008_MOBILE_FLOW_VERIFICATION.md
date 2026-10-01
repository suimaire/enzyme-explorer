# UX-008 — 모바일 실험 동선 검증

2026-10-01 · 작업 경로 `D:\CODEX\260831 biochemistry\enzyme-explorer` · branch `main` · HEAD `6d19656f77cf812b2001ef57328bc15e66871dac` 유지.

이번 변경은 UX-008만 다룬다. 시작 시 UX-001~007의 미커밋 변경을 보존했다. commit / push / branch / dependency / scientific model / session state 변경은 없다. 기존 audit는 역사적 기록으로 유지한다.

## A. 수정 전 실제 mobile 동선

Windows의 연결된 Edge, **390×844 CSS viewport**, UX-006/007 완료 상태의 로컬 앱에서 다시 측정했다. y는 문서 좌표이며 viewport 좌표가 아니다. [원본 측정](ux-008-verification/before-mobile.json).

| 실험 | 실제 측정한 영역 | 수정 전 y(px) |
|---|---|---:|
| 01 | graph / energy controls / catalyst | 531 / 935 / 1228 |
| 01 | prediction / observation readout / explanation gate | 1524 / 1790 / 2103 |
| 03A, 50 µM 측정 후 | progress graph / controls / substrate choices | 698 / 1031 / 1261 |
| 03A, 50 µM 측정 후 | run / measurement buttons (같은 행) | 1401 / 1401 |
| 03A, 50 µM 측정 후 | prediction / collected table / explanation gate | 1535 / 2066 / 2299 |
| 03B, 03A 측정값 존재 | parameter controls / MM graph / current readout | 1322 / 879 / 1850 |
| 03B | prediction / saturation gate / baseline capture | 2188 / 2581 / 1760 |

03A 진입 전에는 graph placeholder y=698, controls y=923이었다. 반응을 시작하자 그래프가 커지며 조작 위치도 아래로 이동했다. 01에서는 그래프 → 잠긴 촉매 → 예측 → 촉매 → 그래프를 찾아야 했다. 03A/B에서도 위쪽 결과와 아래쪽 조작 사이를 반복 이동했다.

Baseline은 **13 files / 201 tests passed**, typecheck / lint / build / diff-check 통과였다. 기존 500 kB chunk 경고와 Git ignore 권한·LF/CRLF 환경 경고는 앱 오류와 구분했다.

## B. 선택한 해결 패턴

760px 이하에서 01/03A/03B만 **controls → graph → inquiry**로 표시한다. 이미 존재하던 DOM 순서와 일치시키므로 모바일 keyboard 순서도 같은 방향이다. CSS `order`, 전역 sticky bar, stateful control 복제는 사용하지 않는다.

조작 가까이에 같은 모델값의 compact feedback을 두고, 명시적 이동·복귀 버튼을 제공한다. 02의 `scrollIntoView`와 `focus({preventScroll:true})` 정책을 참고했다. 02의 utility는 camera/찾기 상태와 결합된 로컬 함수라 직접 추출하지 않고 작은 `SectionJumpButton`만 공유한다.

## C. 01 Reaction Energy 변경

- 잠긴 촉매의 기존 inline prerequisite 문구 옆에 **예측으로 이동 ↓**를 추가했다. 실제 단일 prediction 영역으로 이동한다.
- 확정 후 prerequisite action은 사라지고 **✓ 예측 확정됨**으로 바뀐다. prediction 영역에 **촉매 조작으로 돌아가기 ↑**가 생긴다.
- ΔG와 정·역방향 장벽의 기존 표현 함수를 full observation과 compact readout에서 재사용한다. 촉매 비교의 `55 → 35` 같은 표기도 유지한다.
- 조작에는 graph / 관찰과 질문 이동, graph에는 조작 복귀를 제공한다. 값 변경·예측 확정 자체는 강제 scroll을 하지 않는다.
- energy model, dynamic reduction maximum, gate, follow-up questions와 설명은 그대로다.

[촉매 복귀 화면](ux-008-verification/energy-catalyst-390.jpg), [그래프 화면](ux-008-verification/energy-graph-390.jpg).

## D. 03A 변경

- 모바일 조작 → 진행 곡선 → 측정 결과·모은 측정값 → prediction/interpretation 순서를 만든다.
- 우측 inquiry 안에서 기록을 prediction 앞에 놓았다. Desktop grid는 유지하고 패널 안의 순서만 조정했다.
- 측정 직후 가까운 feedback에 **측정한 [S]₀ / 측정된 v₀**를 표시한다. 선택한 다음 [S]가 아니라 실제 `run.substrate`를 사용한다. 50 µM 측정 후 다음 조건을 100 µM로 선택해도 기존 feedback은 50 µM / 40.0을 유지하며, 새 run에서는 사라진다.
- 진행 곡선 이동, graph에서 조작 복귀·기록 이동, 기록에서 **다른 [S]로 측정하기 ↑**를 제공한다. 해설 prerequisite는 조작 근처에 안내하고 단일 prediction으로 이동한다.
- 모델 계산 기반 / 무작위 오차 없음 / 동일 조건 1개 측정점 / 독립 반복 실험으로 추가하지 않음 / clear/reset 의미를 유지한다.

[진행 곡선과 기록](ux-008-verification/initial-graph-390.jpg).

## E. 03B 변경

기존 Km, Vmax, 현재 [S], 현재 v₀를 조작 가까이에 표시한다. 별도 mobile state나 계산은 추가하지 않는다. 그래프 이동, graph에서 조건 복귀·예측/해설 이동을 제공한다.

`[S]/Km`, 4Km gate, max-[S] range-limit explanation, Km 150/155/300 경계, baseline curve, speed-axis expansion notice와 가상 측정 의미를 보존한다. 원래 설명을 줄이거나 숨겨서 공간을 확보하지 않는다.

[확장 축·기준 곡선·안내](ux-008-verification/mm-expanded-390.jpg).

## F. jump / focus / reduced-motion 정책

모든 action은 이름 있는 button이고 `aria-controls`로 stable target id를 가리킨다. 대상 heading 또는 이름 있는 group에는 `tabIndex=-1`을 사용한다. 버튼을 누르면 해당 대상을 `preventScroll`로 focus하고 명시적으로 scroll한다. 복귀 대상은 01의 촉매 group 또는 해당 실험 controls heading이다.

일반 상태는 smooth, `prefers-reduced-motion: reduce`이면 auto다. animation framework는 없다. 두 JS 분기를 unit test와 browser fixture에서 검증했다. **OS media 설정 자체를 emulation한 검증은 아니다.** 일반 smooth 동작은 실제 브라우저의 직접 조작에서도 확인했다.

실제 header 높이 **225.49px**, rail **51.67px**, 둘 다 `position: static`이다. 총 277.16px이 문서와 함께 스크롤되므로 그 높이를 고정 offset으로 남기지 않는다. 공통 `--section-jump-gap:16px`을 target의 `scroll-margin-top`에 적용했다. 대상이 페이지 끝에 가까우면 브라우저의 최대 scroll에 의해 더 아래에 놓일 수 있지만 가려지지 않는다.

실제 앱에서 prediction jump 후 Tab은 첫 radio로 진행했다. Desktop의 graph/prerequisite jump button은 role 조회에서도 각각 **0개**였다. helper는 `display:none`으로 숨겨져 keyboard/accessibility tree에 남지 않는다. [검증](ux-008-verification/accessibility.json).

## G. 수정 전후 이동 거리 / 과업 단계

각 영역의 문서상 top 사이 거리이며 touch swipe 횟수로 환산하지 않는다. 새로운 helper 때문에 일부 물리적 거리는 증가한다. 이번 해결의 핵심은 가까운 수치 피드백과 **찾아 스크롤하는 행동을 명시적 1회 이동으로 바꾸는 것**이다.

| 이동 | 수정 전 | 수정 후 |
|---|---|---|
| 01 locked catalyst → prediction | top 간 296px, 예측 위치 탐색 | top 간 1123px, prerequisite button 1회 |
| 01 prediction → catalyst | 촉매 위치를 다시 찾아 복귀 | 복귀 button 1회, 실제 focus=`energy-catalyst` |
| 01 controls → graph | block top 간 404px, graph를 다시 찾아 이동 | block top 간 906px, 가까운 수치 feedback + graph button 1회 |
| 03A measurement button → graph | 703px, 위로 복귀 | **426px**, 아래 방향 + graph button 1회 |
| 03B parameter block → graph | block top 간 443px, 위로 복귀 | block top 간 769px, compact values + graph button 1회 |
| 03A 기록 → 다음 [S] | 이전 조작 위치 재탐색 | **다른 [S]로 측정하기** 1회 |

03B 최종 Km slider y=1267, graph section y=1648로 마지막 parameter 조작→graph는 **381px**이다. 수정 전 Km 위치를 직접 개별 측정한 기록은 없어 이 수치를 block top의 전후 거리와 혼동하지 않는다. 앞선 중간 update의 약 831px은 동일한 slider offset에서 추정한 값이며, 원본 실측으로 취급하지 않는다.

01 기본 진입은 graph → controls → prediction → controls → graph의 5개 영역 방문에서 controls → prediction → controls → graph의 4개로 줄었다. 예측·비교·해설의 학습 단계 자체는 유지한다. 각 필수 jump의 수동 scroll은 0회이며 버튼 1회로 이동했다. 이는 인간 사용자 연구의 평균 swipe/소요시간 측정이 아니다.

최종 좌표: 01 controls 531 / catalyst 823 / graph 1437 / prediction 1946. 03A controls 698 / measure 1068 / graph 1494 / 기록 heading 2123 / prediction 2414. 03B controls 879 / Km 1267 / graph 1648 / full readout 2278 / prediction 2617.

[최종 전체 과업](ux-008-verification/checks-390.json), [최종 layout 좌표](ux-008-verification/layout-390.json). Fixture의 출력은 앱 아래에 있으므로 앱의 전체 문서 높이를 fixture 높이와 비교하지 않았다.

## H. desktop / tablet 회귀

최종 source에서 01, 03A 진입·측정 후, 03B를 6 viewport 모두 검사했다. 각 viewport **21 assertions + 완료 marker = 22개 기록**이며 모두 통과했다.

| Viewport | 결과 / 원래 배치 |
|---|---|
| 1600×900 | 3열 유지, helper 숨김, overflow 없음 |
| 1440×900 | 3열 유지, helper 숨김, overflow 없음 |
| 1280×800 | 3열 유지, helper 숨김, overflow 없음 |
| 1024×768 | 기존 graph 위 / controls·inquiry 아래 grid 유지 |
| 768×1024 | 기존 tablet grid 유지, helper 숨김 |
| 390×844 | controls → graph → inquiry, helper 표시 |

기존 desktop 3열 breakpoint는 1180px보다 넓은 화면이다. 1024px을 새 3열로 바꾸지 않았다. DOM/visual 순서가 일치하는 mobile 개선만 적용했다. Desktop controls → graph → inquiry DOM과 왼쪽 → 중앙 → 오른쪽 의미도 유지한다.

[6종 결과](ux-008-verification/viewport-summary.json), 개별 `layout-{width}.json` 및 `mm-{width}.jpg`.

## I. UX-001~007 회귀

| 이슈 | 결과 |
|---|---|
| UX-001 | module/Reference 왕복의 측정값, baseline, 축, prediction/reveal/reset 보존 통과 |
| UX-002 | product +30의 max reduction 20, 정55→35 / 역25→5, TS guard 및 zero maximum 보존 |
| UX-003 | Km150의 4Km=600, Km155/300의 range-limit 경로, ratio/readout 보존 |
| UX-004 | 기준 curve 유지, 축115→330 자동 확장, 안내와 두 곡선의 동일 좌표계 보존 |
| UX-005 | virtual/model measurement, 동일 조건 1점, duplicate feedback, clear/reset 보존 |
| UX-006 | graph text 대비·색을 변경하지 않음, 기존 readability tests 통과 |
| UX-007 | graph/3D typography 파일 byte-identical, 기존 font token 크기 보존, 6폭 graph 확인 |

기존 Phase A2 fixture를 그대로 실행했다. [390](ux-008-verification/phase-a2-390.json) / [1440](ux-008-verification/phase-a2-1440.json) 각각 **45개 기록 / ALL PHASE A2 CHECKS PASSED**다. 기존 unit/browser tests는 삭제·약화·수정하지 않았다.

작업 시작 source/test 102개를 hash 보존했다. 기존 파일 중 이번 수정 4개 외 **98개 byte-identical**이다. shared session/store, scientific calculations, EnergyDiagram / Progress / MM plot, carbonic/regulation 및 기존 모든 tests가 포함된다. 수정 4개는 시작 사본과 대조하여 UX-008 UI 변경만 확인했다. [보존 결과](ux-008-verification/preservation-result.json), [시작 manifest](ux-008-verification/baseline/preservation.json).

## J. 수정 파일

Production:

- `src/modules/reaction-energy/ReactionEnergyLab.tsx`
- `src/modules/kinetics/InitialVelocityPanel.tsx`
- `src/modules/kinetics/MichaelisMentenPanel.tsx`
- `src/shared/components/SectionJumpButton.tsx` (신규)
- `src/styles.css`

검증 파일은 K의 3개, 이 보고서와 `docs/ux-008-verification/`의 JSON / log / 원본 JPEG / 작업 시작 사본이다. Git diff에 보이는 나머지 production 파일은 작업 전 UX-001~007 변경이다.

## K. 추가 tests

- `tests/mobileExperiment.test.tsx`: **9 tests**. prerequisite target/lock 완료/복귀, single prediction/slider, compact/full model값 일치, 실제 run의 측정값, MM current condition 및 Phase A2 표현, accessible button/target, focus와 reduced-motion 두 분기를 검증한다.
- `tests/browser/mobile-experiment-harness.html / .tsx`: 실제 App에서 전체 학습 과업, 반복/중복 측정, state 왕복, mobile DOM 순서, 조건값, jump focus/visibility, helper breakpoint, hidden focusable 상태, 기존 desktop/tablet grid와 overflow를 검증한다.
- 최종 mobile flow는 **69 assertions + 완료 marker = 70개 기록**이다. Fixture는 배포 build에 포함되지 않는다.

## L. 최종 명령 결과

| 명령 | 결과 |
|---|---|
| npm test | **14 files / 210 tests passed** (기존201 + 신규9) |
| npm run typecheck | 통과 |
| npm run lint | 통과, lint warning 없음 |
| npm run build | 통과 |
| git diff --check | 통과 |

최종 `npm test` 단독 실행은 7.63s였다. 중간 병렬 실행에서 기존 에너지 domain 경계값 테스트 1개가 5초 제한을 초과했다. timeout이나 기존 테스트를 바꾸지 않았으며 단독 재실행과 마지막 단독 실행 모두 210개 통과했다. 기존 Three.js / ProteinStructure 500 kB 초과 build 경고는 남아 있다.

## M. 실제 browser 검증

01은 잠금 이유 → prediction jump → 확정 → catalyst return → product/TS/reduction 조작 → graph → 관찰/해설을 확인했다. 03A는 50 µM 실행·측정·곡선·기록·복귀, 100 µM 반복 측정과 duplicate 처리를 확인했다. 03B는 Km300 / [S]600 → graph → range-limit explanation → baseline → kcat60 → rescaled graph를 확인했다.

이동 버튼의 이름과 방향이 다음 영역을 알려주고 포커스가 같이 이동한다. 현재 숫자는 조작 가까이 있어 값을 바꿀 때마다 먼 full observation을 찾을 필요가 없다. 그래프와 기록에서도 조작으로 바로 돌아갈 수 있다. 이 관찰은 브라우저에서 과업을 수행한 결과이며 학생 대상 usability study는 아니다.

최종 source 수정 이후 수집한 앱 console error / warning은 **0건**이다. [Console 기록](ux-008-verification/console-verification.json). 과거 새 fixture의 background smooth scroll 대기(2.5s)가 먼저 종료된 assertion 오류 1건도 보존했다. 기다리는 시간을 8s로 조정한 뒤 같은 focus/visible assertions를 유지하여 최종 70개 기록이 통과했다. 이 변경은 production scroll 동작을 바꾸지 않는다. [과거 실패](ux-008-verification/checks-390-smooth-timeout.json).

OS reduced-motion media 설정, physical phone touch/swipe/pinch, 다른 OS/browser, screen-reader 실제 낭독, 200% browser zoom은 이번 검증에 포함하지 않았다. Browser viewport override는 작업 끝에 복원했다.

## N. 남아 있는 UX-009~016

이번 작업에서 다음 이슈를 수정하지 않았다.

| ID | 남은 항목 |
|---|---|
| UX-009 | 당 비교 dialog focus return |
| UX-010 | Reference TOC / anchors |
| UX-011 | Start 05 소개 |
| UX-012 | global skip/main focus |
| UX-013 | ADP caption |
| UX-014 | 04 planned badge |
| UX-015 | footer |
| UX-016 | rail resize |
