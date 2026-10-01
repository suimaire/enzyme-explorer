# UX-006 / UX-007 가독성 개선 검증

2026-10-01 · Windows / 연결된 Microsoft Edge · 로컬 Vite 앱 `http://127.0.0.1:5174/enzyme-explorer/`

작업 범위는 UX-006·007뿐이다. `main`, HEAD `6d19656`을 유지했고 commit / push / branch / dependency 변경을 하지 않았다. 최초의 UX-001 및 Phase A2 미커밋 변경은 보존했다. 근거: [최초 patch](ux-006-007-verification/baseline/preexisting.patch), [기존 변경 보존 비교](ux-006-007-verification/preexisting-preservation.json). 최초 수정 파일 중 이번 작업과 겹치지 않는 9개 파일의 diff가 모두 동일하다. 겹치는 `MichaelisMentenPlot.tsx`의 기존 shared-axis 구현도 유지했다.

관련 감사의 [UX-006·007과 원본 증거](SITE_WIDE_UX_AUDIT.md)를 먼저 확인했다. 아래 픽셀은 `getComputedStyle`의 CSS px다. SVG presentation attribute만 읽은 값이 아니다. 색은 SVG에서는 computed `fill`, HTML에서는 computed `color`를 기록했다.

## A. UX-006 대비 수정

장벽 텍스트는 기존 중성색 계열의 더 어두운 `#51636f`, ΔG는 기존 황갈색 계열의 더 어두운 `#8a5908`로 바꿨다. 촉매 텍스트는 기존 파란색 `#15618f`를 유지한다. 곡선·화살표의 원래 색 `#6b7a85 / #15618f / #a8761c`는 유지했다. 텍스트와 선의 색을 분리하여 의미별 구별을 보존했다.

## B. Contrast before / after

배경은 흰색 `rgb(255,255,255)`. sRGB를 선형 휘도로 변환하고 `(L밝음 + 0.05)/(L어두움 + 0.05)`로 계산했다. 검사한 작은 일반 텍스트의 기준은 **4.5:1 이상**이다.

| 텍스트 | Before computed RGB | Before | After computed RGB | After | 기준 |
|---|---|---:|---|---:|---|
| 비촉매 정·역방향 장벽 | 107,122,133 | 4.423228:1 | 81,99,111 | **6.242306:1** | 충족 |
| ΔG | 168,118,28 | 3.982471:1 | 138,89,8 | **5.977605:1** | 충족 |
| 촉매 정·역방향 장벽 | 21,97,143 | 6.691313:1 | 21,97,143 | **6.691313:1** | 충족·색 유지 |

[실제 computed RGB와 계산값](ux-006-007-verification/contrast-measurements.json). 모바일의 두 숫자 행도 같은 텍스트 색을 사용하며 실제 브라우저 contrast 검사에 포함했다. 다른 모듈에서는 이번 작업으로 텍스트 색을 변경하지 않았다. 이는 검사한 텍스트의 결과이며 WCAG 전체 통과를 뜻하지 않는다.

## C. Typography 기준

| 정보 | 일반 그래프 | 좁은 그래프 |
|---|---:|---:|
| 축 제목 | 14px | 13px |
| 핵심 상태·숫자 주석 | 14px | 13px |
| tick | 13px | 12px |
| HTML 그래프 범례 | 14px | 모바일 13px |

기존 graph token은 없었다. 실제 공통 SVG 역할에만 작은 CSS token `--chart-font-axis / --chart-font-key / --chart-font-tick`을 적용했다. 좁은 그래프 기준은 실제 측정된 SVG 폭으로 01 `<560`, Progress `<480`, MM `<520`px이다. SVG를 viewBox로 축소해 글자까지 작게 만들지 않고 기존 실제 픽셀 크기 렌더링을 유지한다. 3D HTML 라벨은 별도 크기 계층을 사용한다. caption·메타데이터를 일괄 확대하지 않았다.

## D. 01 Reaction Energy

축 제목·tick·상태·장벽·ΔG를 개선했다. 작은 plotting area에서는 장벽·ΔG를 그래프 안의 별도 두 행으로 읽게 하고 y tick은 8개에서 5개로 줄였다. 기존 모바일에는 SVG 안의 장벽·ΔG 텍스트가 숨겨져 있었고 별도 readout에서만 읽을 수 있었다. 이제 촉매 비교도 `정반응 55 → 35 · 역반응 73 → 53`처럼 표시한다. 단위는 함께 명시한다.

그래프 높이 공식을 유지하고 숫자 행의 공간은 하단 여백으로 확보했다. 상단 여백을 조금 늘려 최대 전이 상태 라벨을 수용했다. 생성물 에너지 0에서 촉매 정·역방향 라벨이 겹치는 상태를 발견해 정렬을 조정했다. 기본, catalyst on, 생성물 +30 / 실제 최대 감소량 20, 동일 endpoint 상태를 검사했다. 에너지 계산·domain·dynamic catalyst max는 변경하지 않았다.

## E. 02 3D label

| 역할 | Before D/M | After desktop / mobile |
|---|---:|---:|
| 선택 잔기 | 12 / 12px | **15 / 14px** |
| Zn 라벨 | 12 / 12px | **15 / 14px** |
| 거리값 | 12 / 12px | **14 / 13px** |
| 주변 reference 잔기 | 12 / 12px | **12.5 / 12.5px** |
| 가장 가까운 원자 이름 | 11.5 / 11.5px | **12.5 / 12.5px** |

기존 Zn 라벨 문자열 `ZN`, residue/atom mapping, anchor/offset, 라벨 충돌 처리, 카메라와 WebGL 코드는 바꾸지 않았다. 이름과 거리 readout이 선택된 His94와 일치한다. 1440×900과 390×844 각각 **8개 다른 카메라 위치**에서 방향 키 회전, +/− 확대·축소를 검사했다.

| 화면 | 서로 다른 각도 | 선택·거리 라벨 숨김 | 라벨 겹침 | 라벨 사각형 합 / viewer 면적의 최대값 |
|---|---:|---:|---:|---:|
| 1440×900 | 8 | 0 | 0 | 2.912% |
| 390×844 | 8 | 0 | 0 | 5.807% |

면적은 텍스트의 bounding rectangle 합이며 실제 단백질 원자가 가려진 비율을 뜻하지 않는다. [Desktop 각도·좌표·측정](ux-006-007-verification/camera-angles-1440.json), [Mobile 각도·좌표·측정](ux-006-007-verification/camera-angles-390.json). 각도별 원본 JPEG도 같은 폴더의 `carbonic-angle-1…8-{1440,390}.jpg`로 저장했다.

## F. 03 graph

Progress와 MM 모두 축 제목, tick, 중요한 주석을 공통 최소 기준으로 맞췄다. Progress 모바일은 각 축 5→3 tick, MM 모바일은 x축 7→4 tick으로 줄였고 축의 양 끝값을 유지했다. 숫자는 기존 정수 표시를 유지했다. 오른쪽 여백을 조금 늘려 마지막 tick의 세 자리 숫자를 수용했다.

Progress의 접선 설명을 상단의 작은 예약 영역에 두어 모바일에서도 보이게 했다. MM의 Km 설명은 가로 위치를 제한해 Km 300에서도 끝이 잘리지 않게 했다. Vmax와 Vmax/2 주석은 현재 점과 떨어지도록 위로 옮겼다. 현재 점과 주석의 bounding rectangle이 겹치지 않는 검사도 추가했다. 범례는 기존 wrapping을 사용한다. chart height·수평 스크롤·모바일 영역 순서는 변경하지 않았다.

`[S]/Km`, saturation range explanation, axis auto-rescale note, virtual measurement notice, duplicate feedback의 원문과 로직은 보존했다. 특히 [390 확장 축 화면](ux-006-007-verification/after-mm-expanded-390.jpg)의 기준 곡선·범례·두 축 안내와 [390 Progress](ux-006-007-verification/after-progress-390.jpg)의 가상 측정 설명을 확인했다.

## G. 05 pathway / structure

일반 pathway 범례는 10.5→14px, 모바일 13px이다. step text는 desktop 11 / mobile 10→13px, current step은 14px이다. 상대 활성 13→14px, 상대 활성의 의미 설명 11→13px, 촉매 반응 표기는 desktop 11.5 / mobile 10.5→13px이다. 길어진 반응 문구는 기존 행 안에서 줄바꿈한다.

실제 구조 범례는 11→14px / mobile 13px, 선택 residue readout 11→13px, 구조 scope 11→13px, 구조 범위 버튼 12→14px / mobile 13px이다. 크게 보기의 help/scope caption은 desktop 12 / mobile 11→13px이다. 정상 동작하던 3D focus layout, dialog와 카메라 동작은 유지했다. F-2,6-BP 이름·상태의 기존 23/17px 계층과 색을 유지한다. 일반 pathway와 실제 구조 양쪽에서 개선했다.

## H. Desktop / mobile before / after inventory

D = 1440×900, M = 390×844. `D/M` 표기는 CSS px이며 색은 변경하지 않은 경우 양쪽에 동일하다. 아래 외의 caption/readout도 raw inventory에 포함했다.

| 항목 | 정보 분류 | Before D/M | After D/M | 실제 색 |
|---|---|---:|---:|---|
| 01 x/y axis title | 핵심 학습 | 13/13 | 14/13 | RGB 58,74,84 |
| 01 tick | 핵심 학습 | 12/10.5 | 13/12 | RGB 81,99,111 |
| 01 ΔG | 핵심 학습 | 12 / SVG 숨김 | 14/13 | B 표 참고 |
| 01 forward/reverse barrier | 핵심 학습 | 12 / SVG 숨김 | 14/13 | B 표 참고 |
| 01 reactant/product/transition | 핵심 학습 | 12.5/12.5 | 14/13 | RGB 58,74,84 |
| 01 catalyst annotation | 핵심 학습 | 12 / SVG 숨김 | 14 / 13 숫자 행 | 파랑 21,97,143; 모바일 비교 행은 81,99,111 |
| 01 curve legend | 핵심 학습 | 13/13 | 14/13 | RGB 81,99,111 |
| 01 conceptual-coordinate caption | 보조 정보 | 11.5/11.5 | 11.5/11.5 | RGB 81,99,111 |
| 02 selected residue | 핵심 학습 | 12/12 | 15/14 | RGB 140,31,92 |
| 02 Zn | 핵심 학습 | 12/12 | 15/14 | RGB 109,59,3 |
| 02 distance | 핵심 학습 | 12/12 | 14/13 | RGB 60,77,87 |
| 02 reference residue | 보조 정보 | 12/12 | 12.5/12.5 | RGB 60,77,87 |
| 02 nearest atom | 핵심 학습 | 11.5/11.5 | 12.5/12.5 | RGB 45,61,71 |
| 02 current step button | 핵심 학습 | 14/14 | 14/14 | RGB 15,74,110 |
| 02 step number eyebrow | 보조 정보 | 11.5/11.5 | 11.5/11.5 | RGB 81,99,111 |
| 02 viewer footer / metadata | 보조 정보 | 12.5/12.5 | 12.5/12.5 | RGB 81,99,111 |
| 02 viewer help | 보조 정보 | 13.5/13.5 | 13.5/13.5 | RGB 81,99,111 |
| 03 Progress x/y axis | 핵심 학습 | 13/13 | 14/13 | RGB 58,74,84 |
| 03 Progress tick | 핵심 학습 | 12/10.5 | 13/12 | RGB 81,99,111 |
| 03 Progress tangent / measurement annotation | 핵심 학습 | 12 / 숨김 | 14/13 | RGB 181,69,31 |
| 03 Progress condition caption | 보조 정보 | 13/13 | 13/13 | RGB 81,99,111 |
| 03 MM x/y axis | 핵심 학습 | 13/13 | 14/13 | RGB 58,74,84 |
| 03 MM tick | 핵심 학습 | 12/10.5 | 13/12 | RGB 81,99,111 |
| 03 MM current/baseline/measurement legend | 핵심 학습 | 13/13 | 14/13 | RGB 81,99,111 |
| 03 Vmax / Km guide | 핵심 학습 | 12/12 | 14/13 | RGB 21,97,143 / 168,38,111 |
| 03 numerical readout values | 핵심 학습 | 15/15 | 15/15 | RGB 31,42,49 |
| 03 readout meaning labels | 핵심 학습 | 13.5/13.5 | 13.5/13.5 | RGB 81,99,111 |
| 03 saturation ratio readout | 핵심 학습 | 13.5/13.5 | 13.5/13.5 | RGB 81,99,111 |
| 05 pathway arrow / inhibition legend | 핵심 학습 | 10.5/10.5 | 14/13 | RGB 94,115,127 |
| 05 step text / current step | 핵심 학습 | 11/10 | 13 / current 14 | 현재 step RGB 18,78,113 |
| 05 PFK-2 / FBPase-2 activity | 핵심 학습 | 13/13 | 14/14 | RGB 22,94,97 / 121,85,37 |
| 05 relative-activity caption | 핵심 학습 | 11/11 | 13/13 | RGB 82,101,112 |
| 05 reaction labels | 핵심 학습 | 11.5/10.5 | 13/13 | RGB 31,42,49 |
| 05 F-2,6-BP name / state | 핵심 학습 | 이름 23 / 상태 17 | 이름 23 / 상태 17 유지 | 기존 상태색 유지 |
| 05 structure legend | 핵심 학습 | 11/11 | 14/13 | RGB 23,108,114 / 128,91,42 |
| 05 structure range buttons | 핵심 학습 | 12/12 | 14/13 | 기본 RGB 31,42,49; 선택은 15,74,110 |
| 05 selected residue / numbering | 핵심 학습 | 11/11 | 13/13 | RGB 31,42,49 |
| 05 structure scope | 핵심 학습 | 11/11 | 13/13 | RGB 31,42,49 |
| 05 expanded help/scope | 보조 정보 | 12/11 | 13/13 | RGB 81,99,111 |
| 05 general model scope | 보조 정보 | 12/12 | 12/12 | RGB 82,105,119 |
| 05 interaction help | 보조 정보 | 13.5/13.5 | 13.5/13.5 | RGB 81,99,111 |

`F-2,6-BP name / state`의 23/17은 desktop/mobile 구분이 아닌 두 역할의 크기다. 02 footer의 거리 단위는 그대로이며 중요한 실제 거리값은 별도 라벨을 확대했다. 03 Progress는 별도 WT 범례가 없는 구현으로 접선 annotation을 기록했다. 앱에 없는 WT 기능이나 데이터는 추가하지 않았다.

Before 01/02/03와 05 desktop 기본값은 수정 전 실제 앱에서 수집했다. 05 mobile 및 구조 Before는 작업 시작 시 보관한 원본 CSS를 같은 앱 DOM에 적용한 개발용 fixture에서 재측정했다. 새 스타일을 비활성화하여 우선순위가 섞이지 않게 했다. 05의 DOM·focus layout 구현은 유지하고 typography와 wrapping CSS만 조정했다. `before-*.json`, `after-*.json`에 모든 문자열·computed size/color·bounds가 있다. 이 재측정과 최초 캡처를 구분한다.

## I. Clipping / collision

실제 브라우저에서 SVG 텍스트 rectangle이 SVG 경계 안에 있는지, 텍스트끼리 겹치는지, 핵심 font minimum을 만족하는지 검사했다. 03B는 마지막 수정 후 핵심 주석과 현재 점의 겹침도 검사했다. 본문의 가로 overflow는 없었으며, 05 핵심 범례·step·scope의 가로 bounds/wrapping도 검사했다. 기존 05 desktop 내부 세로 스크롤은 유지한다.

색 외에도 기존 효소 없음/있음 문구와 점선/실선 범례, 기준/현재 곡선 이름, residue 이름을 유지한다. 그래프의 `role="img"`와 accessible description은 검사에 포함했다. 기존 focus 스타일 선언을 변경하지 않았으며 3D 방향 키·+/− 조작도 검증했다. dialog focus 흐름 자체는 UX-009 범위이므로 변경하지 않았다.

모바일 SVG의 최소 높이는 기존과 동일하게 01 300px / Progress 240px / MM 270px이다. 숫자 행이나 header를 넣기 위해 chart 자체를 화면 밖으로 확대하지 않았다. 원래 모바일 control/graph 순서를 바꾸지 않았다. caption과 legend wrapping으로 늘어나는 텍스트 높이는 허용하되 layout 재설계나 새 presentation mode는 도입하지 않았다. 모든 slider 조합의 시각 상태를 전수 검사했다고 주장하지 않는다.

## J. Phase A 회귀

[1440 회귀](ux-006-007-verification/phase-a2-1440.json), [390 회귀](ux-006-007-verification/phase-a2-390.json): 각각 **45개 기록, ALL PHASE A2 CHECKS PASSED**.

| 이슈 | 결과 |
|---|---|
| UX-001 | 모듈·Reference 왕복 시 측정값·기준 곡선·축 범위·해설·초기화 상태 유지 |
| UX-002 | product +30에서 최대 감소량 20과 실제 정55→35 / 역25→5 일치; 경계조건 유지 |
| UX-003 | Km 150은 4Km=600 포화 경로, 155/300은 range-limit 경로로 해설 진입 |
| UX-004 | reference reserve 115→current axis 330, 두 곡선 동일 축 재투영; 축 안내 유지 |
| UX-005 | 모델 기반/오차 없음/동일 조건 1점 설명, 중복 feedback, clear/reset 동작 유지 |

이 회귀 뒤에는 MM 가이드와 점의 간격만 추가 조정했다. 해당 최종 그래프 상태는 6종 viewport의 `graph-checks-*`로 재검사했고, 최신 코드 전체 Vitest도 201개 통과했다. 원문 축소나 의미 변경으로 공간을 확보하지 않았다.

## K. 수정 파일

이번 production 수정은 다음 5개 파일이다. 기존 diff에 보이는 다른 파일은 이번 작업 전의 변경이다.

- `src/modules/reaction-energy/EnergyDiagram.tsx`
- `src/modules/kinetics/ProgressCurvePlot.tsx`
- `src/modules/kinetics/MichaelisMentenPlot.tsx`
- `src/modules/regulation/regulation.css`
- `src/styles.css`

과학 모델, learning session state, saturation gate, axis rescale policy, virtual measurement semantics, StructureScene / StructureViewer / StructureFrame, PDB 데이터는 변경하지 않았다.

## L. 추가 / 수정 tests

- `tests/readability.test.tsx`: 6개 추가. 세 의미별 텍스트 대비 최소값, 원래 선 색 유지, guide 단위·대체 설명·접선 주석을 검사한다.
- `tests/browser/readability-harness.html / .tsx`: 실제 CSS 최소 크기, SVG bounds / 충돌 / 현재 점, tick density, 범례 wrapping, 3D 라벨 크기·상태·각도·viewer bounds를 검사한다. 테스트 UI는 개발 fixture에만 존재하며 배포 build에 포함되지 않는다.
- 기존 `tests/phaseA2.test.tsx`의 한 검사는 과거 여백의 고정 숫자 대신 실제 rendered plot frame을 읽도록 갱신했다. 두 곡선의 독립적인 알려진 속도값과 같은 0–330 축 투영 계산, 0.005 허용 오차는 유지했다. 테스트 삭제·skip·허용 오차 완화는 없다.

## M. 최종 검사

| 명령 | 결과 |
|---|---|
| npm test | **13 files / 201 tests passed** |
| npm run typecheck | 통과 |
| npm run lint | 통과, lint warning 없음 |
| npm run build | 통과 |
| git diff --check | 통과 |

로그는 [final 폴더](ux-006-007-verification/final/)에 보관했다. 최초 baseline 병렬 실행에서는 기존 에너지 경계값 테스트가 5초 제한에 한 번 걸렸다. 단독 재실행에서 **195/195** 통과했다. 작업 중 기존 SSR 여백 가정에 의한 1개 실패는 L의 변경으로 해결했다. 실패 기록도 삭제하지 않았다. 최종 일반 `npm test` 명령 자체가 201개 통과했다.

기존 Three.js / ProteinStructure 500kB 초과 build warning은 남아 있다. Git 전역 ignore 파일 권한 경고는 앱 console과 구분한다. 개발 중 동일 endpoint 라벨 충돌을 검출한 fixture assertion 1건은 수정 후 재검사했다. 최종 source 수정 시점 이후 앱 console error/warning은 0건이며 과거 fixture 오류 기록도 [console 검증 기록](ux-006-007-verification/console-verification.json)에 보존했다.

## N. 실제 브라우저 viewport 검증

| CSS viewport | 네 route·구조/범례 검사 | 최종 그래프 재검사 | 대표 화면 |
|---|---|---|---|
| 1600×900 | 통과 | 통과 | 네 route |
| 1440×900 | 통과 | 통과 | 아래 상세 상태 |
| 1280×800 | 통과 | 통과 | 네 route |
| 1024×768 | 통과 | 통과 | 네 route |
| 768×1024 | 통과 | 통과 | 네 route |
| 390×844 | 통과 | 통과 | 아래 상세 상태 |

Route: `#/reaction-energy`, `#/carbonic-anhydrase`, `#/kinetics`, `#/regulation`. 상세 상태는 1440/390 각각 01 기본·촉매·+30/max, 02 전체·활성 부위·선택/거리, 03 Progress 측정·MM 기본·Km300·기준 곡선+확대 축, 05 pathway·실제 구조·크게 보기이다. 01 endpoint 0과 MM guide 표시도 추가 검사했다. 일반 검사 결과는 `checks-{width}.json`, 마지막 MM 주석 수정 뒤의 결과는 `graph-checks-{width}.json`이다. [6종 화면 결과 요약](ux-006-007-verification/verification-summary.json)에서 검사 기록 수와 최종 결과를 확인할 수 있다.

캡처는 브라우저가 반환한 원본 JPEG를 저장했다. overview로 축소하거나 다시 샘플링하지 않았다. scrollbar 때문에 파일의 content pixel 폭은 CSS viewport보다 작을 수 있다. fixture의 검사 출력은 앱 아래에 있으므로 fixture 전체 문서 높이를 앱의 모바일 스크롤 길이로 비교하지 않았다.

대표 원본: [01 desktop](ux-006-007-verification/after-energy-catalyst-1440.jpg), [01 mobile +30/max](ux-006-007-verification/after-energy-maximum-390.jpg), [02 mobile](ux-006-007-verification/after-carbonic-selected-390.jpg), [03 mobile 확장 축](ux-006-007-verification/after-mm-expanded-390.jpg), [05 mobile pathway](ux-006-007-verification/after-pathway-390.jpg), [05 mobile 크게 보기](ux-006-007-verification/after-structure-expanded-390.jpg).

## O. 미검증인 실제 환경

실제 프로젝터·교실 거리·밝기, physical phone/tablet의 touch/pinch·기기별 색 재현, 다른 OS/브라우저, 실제 200% browser zoom은 이번 검증에 포함되지 않았다. **프로젝터 통과**, physical device 통과 또는 WCAG 전체 통과라고 표현하지 않는다. desktop CSS px와 원본 캡처로 비교했다.

## P. 남은 UX-008~UX-016

이번 작업에서 다음 항목은 수정하지 않았다.

| ID | 남은 항목 |
|---|---|
| UX-008 | 모바일 prerequisite / control / graph 순서·거리 |
| UX-009 | 당인산 비교 dialog 종료 focus |
| UX-010 | Reference section 이동·학생/심화 층위 |
| UX-011 | Start의 05 소개 |
| UX-012 | skip/main focus·route 문맥 진입 |
| UX-013 | ADP 아래 caption |
| UX-014 | 예정 모듈의 rail 시각 표시 |
| UX-015 | footer Enzyme I / II 범위 |
| UX-016 | viewport 축소 후 active rail 항목 노출 |
