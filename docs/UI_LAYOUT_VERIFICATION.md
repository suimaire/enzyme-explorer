# Enzyme Explorer UI layout verification

2026년 9월 30일. 상단 모듈 메뉴와 Hormonal Regulation의 실제 3D 구조 화면만 개선했습니다. 작업 시작 시 미커밋 변경은 없었으며, `main` 브랜치를 유지했습니다. UI 검증을 마칠 때까지는 commit과 push를 수행하지 않았습니다.

## 상단 내비게이션

큰 카드 테두리와 배경을 제거하고 번호와 제목이 나란히 놓이는 가로 레일로 변경했습니다. 현재 모듈은 굵은 글자와 3px 밑줄로 표시합니다. hover 배경은 옅게, 키보드 focus 테두리는 명확하게 유지합니다. Enzyme Explorer 헤더와 본문의 모듈 표시는 그대로입니다.

1440×900의 regulation 화면에서 메뉴 높이는 **80.39px → 51.67px**, 약 **36% 감소**했습니다. 메뉴 항목의 터치 높이는 **51px**입니다. START와 REFERENCE의 전체 한글 이름, 04의 예정 안내는 접근성 이름에 남아 있습니다. 7개 모듈의 hash route와 `aria-current="page"`는 유지합니다.

모바일에서도 가로 레일을 유지하고 메뉴 안에서만 스크롤합니다. 선택된 링크가 가려져 있으면 레일의 스크롤 위치만 조정합니다. 모든 모듈을 Enter로 이동하며 활성 상태, focus, 화면 안 노출을 확인했습니다.

비교 캡처: [이전 메뉴](verification/ui-before-navigation.jpg), [A 새 메뉴](verification/ui-A-navigation.jpg).

## 일반 화면과 3D 전용 배치

조절 경로와 중간 신호 직접 조작은 기존 배치를 유지합니다. 1024px 이상에서는 3열, 768px에서는 기존 2열과 하단 결과, 모바일에서는 세로 배치입니다.

실제 3D 구조 탭만 왼쪽 **260px** 신호 패널과 넓은 메인 영역으로 구성합니다. 1100px 이하에서는 신호 패널을 위로 옮겨 뷰어에 전체 폭을 제공합니다. 모바일 순서는 신호 조작, 구조 조작 버튼, 뷰어, Ser33 모식도와 범위 설명, 결과 요약입니다.

결과 열은 뷰어 아래의 현재 비교 상태 요약으로 옮겼습니다. 조절 Ser, 두 촉매 활성, 호르몬이 예측한 F-2,6-BP를 표시하며, 가상 고정 중에는 하위 효소에 적용한 값도 따로 표시합니다. 기존 `Results` 내용 전체는 요약의 접이식 상세 영역에 유지했습니다. 관찰 단계에 따른 결과 공개 시점도 유지합니다. 조절 경로로 돌아가는 버튼을 제공합니다.

[B 일반 3열](verification/ui-B-pathway.jpg), [C 3D 전체 이량체](verification/ui-C-dimer.jpg), [가상 고정과 상세 결과](verification/ui-summary-clamped.jpg).

## 뷰어 크기와 반응형 결과

기존 높이 230px와 오른쪽 150px Ser33 열을 제거했습니다. 데스크톱 기본 높이는 `clamp(520px, 65vh, 650px)`, 태블릿은 `clamp(460px, 60vh, 580px)`, 모바일은 `clamp(380px, 52vh, 480px)`입니다. 기존 445px 내부 스크롤 제한은 3D 탭에서만 해제합니다.

실제 브라우저에서 측정한 CSS 픽셀입니다. 테두리를 포함하며 반올림했습니다. 1440 화면의 이전 뷰어는 약 487×230px였습니다.

| 브라우저 화면 | 3D 뷰어 폭×높이 | 3D 배치 | 세 탭의 페이지 가로 넘침 |
|---|---:|---|---:|
| 1440×900 | 1069×585 | 왼쪽 260px + 메인 | 0px |
| 1600×900 | 1085×585 | 왼쪽 260px + 메인 | 0px |
| 1280×800 | 909×520 | 왼쪽 260px + 메인 | 0px |
| 1024×768 | 935×461 | 신호 패널 위 + 메인 | 0px |
| 768×1024 | 679×580 | 신호 패널 위 + 메인 | 0px |
| 390×844 | 321×439 | 세로 배치 | 0px |

메뉴 높이는 모든 크기에서 51.67px입니다. 390px 화면에서는 메뉴의 내부 스크롤 폭 807px, 표시 폭 375px로, 스크롤이 메뉴 안에 한정됩니다. 초기 모바일 검사에서 발견한 flex 항목의 너비 문제를 수정한 뒤 세 탭과 여섯 크기를 모두 다시 검사했습니다.

캡처: [1440](verification/ui-responsive-1440.jpg), [1600](verification/ui-responsive-1600.jpg), [1280](verification/ui-responsive-1280.jpg), [1024](verification/ui-responsive-1024.jpg), [768](verification/ui-responsive-768.jpg), [390](verification/ui-responsive-390.jpg).

측정 원본: [화면 크기별 결과](verification/ui-responsive-results.json), [내비게이션 결과](verification/ui-navigation-results.json).

## 카메라 맞춤

전체 이량체, 사슬 A, 사슬 A의 PFK-2 또는 FBPase-2에 속하는 실제 원자 좌표를 선택하여 카메라 방향으로 투영한 범위에 맞춥니다. 깊이와 화면 종횡비를 반영하고 투영된 범위의 중심을 맞춰, 비대칭 구조의 빈 여백을 줄였습니다. 고정 카메라 좌표를 새로 지정하지 않습니다.

선택한 원자 범위는 제한되는 화면 축의 약 84%를 목표로 합니다. 데스크톱 이량체 ribbon은 캡처에서 높이의 약 77%를 차지합니다. 좁은 화면에서는 구조가 잘리지 않도록 폭을 우선합니다. 선택하지 않은 도메인은 기존처럼 회색으로 남아 연결 맥락을 보여 줍니다.

사용자가 회전하거나 확대하면 이후 화면 크기 변경 시 자동 맞춤을 멈춥니다. 호르몬 변경, 관찰 탭 왕복, 확대 화면 왕복은 사용자의 방향·중심·확대 상태를 유지합니다. 범위 선택이나 선택 범위 맞춤을 누를 때만 의도적으로 다시 맞춥니다.

[D 한 사슬](verification/ui-D-chain.jpg), [E PFK-2](verification/ui-E-pfk2.jpg), [F FBPase-2](verification/ui-F-fbpase2.jpg).

## Ser33 설명 위치

독립적인 2D 조절 Ser 모식도를 뷰어 아래의 가로 설명 영역으로 옮겼습니다. 모바일에서는 설명과 모식도가 세로로 놓입니다. 기존의 “Ser schematic은 실제 3D 위치가 아닙니다”와 construct에 N-terminal regulatory Ser33이 직접 포함되지 않는다는 설명을 유지합니다. 3D 좌표나 가짜 잔기를 추가하지 않았습니다.

## 크게 보기와 WebGL 수명

동일한 `<dialog>`와 canvas를 일반 화면과 native modal top layer에서 재사용합니다. 최대 폭 1500px, 화면 폭의 96%, 높이 90dvh입니다. 상단 제목과 네 범위 선택, 닫기 버튼, 하단 조작법과 구조의 한계를 제공합니다.

ESC와 닫기 버튼, Tab과 Shift+Tab 순환, 닫은 뒤 크게 보기 버튼으로 focus 복귀를 확인했습니다. 모달 뒤의 페이지는 native dialog가 비활성화하며, 열려 있는 동안 본문 스크롤을 잠그고 닫거나 컴포넌트가 해제될 때 복원합니다.

실제 WebGL 검사에서 12회 연속 확대·닫기 동안 **새 렌더러 context 생성 0회**, canvas 교체 0회였습니다. 선택 범위와 사용자가 조정한 카메라가 유지됐고, 일반 탭 왕복도 같은 canvas를 재사용했습니다. 모듈 이탈 시 기존 `dispose()`와 `forceContextLoss()`가 실행되어 렌더러 context가 해제됐습니다. 기존의 캐시된 WebGL 지원 확인용 probe 1회와 실제 렌더러 1회를 구분하여, 계측 총 생성 2개 중 렌더러 1개가 해제되고 연결된 canvas 0개인 것을 확인했습니다.

[G 확대 화면](verification/ui-G-large-view.jpg), [모바일 확대 화면](verification/ui-mobile-large-view.jpg), [WebGL 검사 원본](verification/ui-lifecycle-results.json).

## 보존한 기능과 과학 내용

`model.ts`, `Diagrams.tsx`, `ScientificContext.tsx`, `src/data/regulation`, `src/kinetics`의 diff가 비어 있음을 확인했습니다. hormone state machine, Prediction/Reveal, 5단계 narration, F-2,6-BP clamp, PFK-2/FBPase-2 규칙, apparent Km/Vmax, isoform caution, 인슐린 근거, H305R, 반응 도식 및 1K6M 파일을 변경하지 않았습니다.

실제 브라우저에서 두 호르몬의 5단계 결과와 글루카곤 + F-2,6-BP 높게 고정 시의 예측값·적용값·하위 결과를 확인했습니다. 호르몬 변경 전후의 카메라 위치가 같았습니다. 요청 장면 A–G는 최종 production build에서 캡처했습니다. 여섯 크기와 반복 lifecycle 검사는 development fixture에서 수행했으며, 해당 fixture의 즉시 결과 전환은 기존 `motion=reduce` 옵션을 사용합니다.

## 수정 파일

| 파일 | 변경 |
|---|---|
| `src/app/App.tsx` | 메뉴 컴포넌트 연결 |
| `src/app/ModuleNavigation.tsx` | compact rail, 활성 링크 스크롤 |
| `src/styles.css` | 메뉴 높이와 시각 스타일 |
| `src/modules/regulation/HormonalRegulation.tsx` | 3D 전용 배치와 뷰어 유지 |
| `src/modules/regulation/ProteinStructure.tsx` | 범위별 맞춤, 확대 연결, Ser33 위치 |
| `src/modules/regulation/StructureFrame.tsx` | 같은 canvas를 재사용하는 확대 모달 |
| `src/modules/regulation/StructureResults.tsx` | 단계별 요약과 기존 상세 결과 |
| `src/modules/regulation/regulation.css` | 뷰어와 반응형 배치 |
| `src/viewer/rendering/StructureScene.ts` | 선택 범위 카메라, 사용자 조작 유지 |
| `src/viewer/rendering/fitSelection.ts` | 좌표 투영 범위 계산 |
| `tests/uiLayout.test.tsx` | route, 결과 공개, 실제 좌표 맞춤 회귀 검사 |
| `tests/structureLifecycle.test.ts` | 기존 해제 검사를 보존하고 새 이벤트 정리 확인 |
| `tests/browser/regulation-harness.tsx` | 선택 가능한 UI 검사 연결 |
| `tests/browser/ui-layout-checks.ts` | 실제 canvas, context, 모달, focus, 탭 왕복 검사 |
| `docs/UI_LAYOUT_VERIFICATION.md` | 이 보고서 |
| `docs/verification/ui-*` | 요청 캡처와 측정 기록 |

## 최종 검사

| 검사 | 결과 |
|---|---|
| `npm test` | 10개 파일, **174개 통과** |
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과 |
| `npm run build` | 통과 |
| `git diff --check` | 통과 |
| 브라우저 console | 최종 production 탭 경고와 오류 없음 |

기존 Three.js 및 로컬 구조 번들의 500kB 초과 경고는 build에서 계속 표시됩니다. 기존 테스트를 삭제하거나 assertion과 timeout을 약화하지 않았습니다.

## 직접 확인할 장면

최종 로컬 미리보기: [Enzyme Explorer](http://127.0.0.1:4176/enzyme-explorer/#/regulation).

1. 상단 메뉴를 키보드로 이동하고, 모바일에서는 메뉴 내부를 가로로 스크롤합니다.
2. 조절 경로에서 기존 3열을 확인합니다.
3. 실제 3D 구조에서 이량체, 한 사슬, 두 도메인을 차례로 선택합니다.
4. 구조를 회전·확대한 뒤 크게 보기와 ESC를 반복하고 같은 시점이 유지되는지 확인합니다.
5. 뷰어 아래 Ser33 모식도와 현재 비교 상태, 결과 펼치기를 확인합니다.

반복 browser regression은 개발 서버의 [UI 검사 화면](http://127.0.0.1:5174/enzyme-explorer/tests/browser/regulation-harness.html?motion=reduce&uiAudit=1#/regulation)에서 페이지 하단의 UI 회귀 검사 실행 버튼으로 재실행할 수 있습니다. 검사가 끝나면 모듈 이탈 시 context 정리를 확인하기 위해 시작 화면으로 이동합니다.
