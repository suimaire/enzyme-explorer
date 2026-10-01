# Enzyme Explorer — UX-014~016 final polish verification

검증일: 2026-10-02 (Asia/Seoul). Branch는 `main`, HEAD는 `96f72cb fix: improve enzyme explorer learning UX`로 유지했다. Commit/push/branch 변경은 수행하지 않았다. 기존 미커밋 변경을 보존했다.

## Baseline

- `npm test`: 16 files / **255 tests 통과**. Typecheck, lint, build, diff-check 통과.
- 기존 build warning: 500 kB 초과 chunks. Git은 기존 text 파일들의 LF→CRLF 안내를 출력했으나 diff-check exit code는 0이다.
- 실제 초기 작업 상태: [status](ux-014-016-verification/baseline-status.txt), [diff stat](ux-014-016-verification/baseline-diff-stat.txt), [HEAD](ux-014-016-verification/baseline-head.txt).
- 변경 전 source/test/package/`.gitattributes` SHA를 [baseline-hashes.json](ux-014-016-verification/baseline-hashes.json)에 기록했다.
- 수정 전 Chrome 재현: 1440→390px, `#/regulation` 유지, rail x=0~390, active 05 x=584.33~690.47, scrollLeft=0. [수정 전 화면](ux-014-016-verification/baseline-regulation-390.png).

## A. UX-014 planned 표시 구현

`ModuleNavigation`은 registry의 `status === 'planned'`인 04에만 작은 `예정` span을 표시한다. 기존 anchor, href, 클릭 처리, aria-label을 유지했다. 시각 문구에 `aria-hidden="true"`를 적용하여 접근성 이름의 기존 `Enzyme II에서 다룰 예정`과 중복 낭독되지 않게 했다. 04 active 시 planned span, `aria-current="page"`, 3px inset underline이 함께 유지된다.

## B. rail desktop/mobile 결과

7개 route × 6개 viewport = **42개 조합**을 Chrome와 Edge에서 각각 검사했다. Viewport는 1600×900, 1440×900, 1280×800, 1024×768, 768×1024, 390×844이다. 모든 조합에서 active DOMRect가 rail 안에 있고, page horizontal overflow가 없으며, link touch target은 **51px**이다.

Badge는 12px 글자, 32×18.39px이며 rail 전체 높이는 기존 **52px**이다. 04 link 폭은 145.14px로 390px rail에 완전히 들어온다. 전체 rail의 가로 스크롤은 유지한다. [04 desktop](ux-014-016-verification/chrome-inhibition-1440.png), [04 mobile](ux-014-016-verification/chrome-inhibition-390.png).

## C. UX-015 footer 새 문구

> Enzyme Explorer · 효소의 촉매 작용, 반응속도론과 조절

`App.tsx`의 static text 한 줄만 변경했다. Footer 위치, border, spacing, CSS, layout architecture는 변경하지 않았다. 7개 route의 모든 화면 조합에서 동일 문구를 확인했다.

## D. footer 범위 판단 이유

촉매 작용과 반응속도론은 01~03, 조절은 현재 이용 가능한 05를 포괄한다. Enzyme I/II 분류, 전체 생화학 과정·효소학 완성·저해 기능 완성이라는 주장을 추가하지 않았다. Start 05 ready 소개와 04 planned 안내, 각 module category badge와 충돌하지 않는다. Registry는 변경하지 않았다.

## E. UX-016 기존 원인 재확인

기존 effect의 dependency는 `[current]`였다. 같은 route에서 desktop→mobile로 폭만 바꾸면 effect가 실행되지 않아 active item이 숨었다. 수정 전 실제 DOMRect 재현과 기존 감사의 원인이 일치했다.

## F. resize 감지 방식

Rail element에 `ResizeObserver`를 연결했다. 실제 rail width가 달라졌을 때만 RAF를 예약한다. 브라우저 창 변화뿐 아니라 **window viewport를 유지한 rail 자체의 width 변경**도 실제 브라우저에서 검사했다. Height만 변하거나 초기 observer delivery에서 폭이 그대로면 예약하지 않는다. 기존 프로젝트도 ResizeObserver를 사용하며 새 dependency/polyfill은 추가하지 않았다. 지원되지 않는 테스트 환경에서는 guard로 기존 route change 동작을 유지한다. API의 요소 크기 관찰/호환성은 [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)를 참조했다.

## G. active visibility 알고리즘

기존 DOMRect 비교와 rail의 `scrollLeft` 조정식을 `ensureActiveItemVisible()`로 옮겨 route와 resize에서 공유한다. 왼쪽/오른쪽에서 잘린 경우 해당 가장자리로 기존 12px inset을 더한 만큼만 이동한다. Active item이 이미 보이면 scrollLeft에 쓰지 않는다. Centering, focus 이동, `scrollIntoView()`, document scrolling은 호출하지 않는다. 일반 scroll 이벤트를 구독하지 않으며 수동 rail scroll과 height-only resize를 존중한다.

판정 tolerance는 DOMRect의 subpixel rounding을 위한 **1px**이다. 실제 rail padding/border와 기존 inset을 포함한 결과를 판정했다.

## H. 1440↔390 resize 결과

`reaction-energy`, `kinetics`, `inhibition`, `regulation`, `model-notes`에서 route를 유지하며 1440→390→768→390→1440으로 전환했다. **20개 전환** 모두 active item 노출과 focus 보존에 통과했다. Final planned badge를 포함한 rail 기준 결과다.

| 1440→390 경로 | active left~right (px) | rail left~right (px) |
|---|---:|---:|
| 01 reaction-energy | 81.55~201.69 | 0~390 |
| 03 kinetics | 261.94~378.19 | 0~390 |
| 04 inhibition | 233.19~378.33 | 0~390 |
| 05 regulation | 272.33~378.47 | 0~390 |
| REFERENCE model-notes | 279.47~377.81 | 0~390 |

이미 visible한 항목에 대해 390→400px 실제 width 변경 시 scrollLeft가 유지되는 것도 검사했다. Route change의 기존 자동 노출도 통과했다.

## I. vertical scroll 보존 결과

05 본문으로 focus를 두고 세로 스크롤한 후, 네 방향 전환에서 **scrollY 변화 0px**을 확인했다. Rail만 1440→390px로 변경한 독립 검사도 scrollY **532→532**, focus=`main-content`를 유지했다. 05의 rail observer만 비활성화한 비교 페이지의 1440→390 결과도 scrollY 변화 0으로 동일했다.

01/03은 일부 역방향 전환에서 기존 responsive layout의 browser scroll anchoring으로 각각 ±141px/±134px 변화가 기록되었다. Rail 조정은 세로 scroll API를 사용하지 않는다. 05/04/Reference는 검사한 전환에서 모두 0px이다. 각 before/after 값을 evidence에 보존했다.

## J. observer/RAF cleanup

Effect cleanup은 observer를 disconnect하고 pending RAF가 있으면 취소한다. Route 변경 시 기존 effect cleanup 뒤 새 active item으로 감시를 연결한다. Unit tests에서 폭 변화 coalescing, pending frame 취소 후 추가 scroll write 없음, 완료된 RAF에 불필요한 cancel 없음, ResizeObserver 미제공 환경을 검사했다.

## K. accessibility 결과

04 accessible name은 기존 `04 효소 저해 · Enzyme II에서 다룰 예정`으로 planned 의미가 한 번 들어 있다. Visual badge는 aria-hidden이며 ready link에는 badge가 없다. 실제 Tab(03→04→05), Shift+Tab(05→04), Enter(04 안내 페이지), active underline/aria-current, resize focus 보존을 Chrome/Edge에서 검사했다. Native screen reader 음성 출력은 별도 검증하지 않았다.

## L. UX-001~013 회귀 결과

기존 255 tests를 모두 보존하고 기존 integration harness를 수정 없이 실행했다. Chrome에서 **11회 / 1,190개 harness check 항목(완료 marker 포함)**이 통과했다.

| 기존 harness | Viewport width | 확인 범위 |
|---|---|---|
| navigation-context | 1440, 390 | UX-001 Reference 왕복 state, UX-009 dialog/fallback, UX-010 direct section, UX-012 skip/title/focus, UX-013 ATP/ADP caption |
| start | 1440, 390 | UX-011 ready 05 CTA, 04 planned, 순서/분류, session 유지 |
| phase-a2 | 1440, 390 | UX-002 clamp, UX-003 gate, UX-004 axis, UX-005 virtual measurement 및 세션 |
| mobile-experiment | 390 | UX-008 SectionJumpButton, mobile 실험 흐름 |
| readability graph | 1440, 390 | UX-006/007 graph geometry/label/readability 회귀 |
| session learning | 1440, 390 | UX-001 세션 왕복/초기화/설정 유지 |

Navigation harness의 cancel event 검사에 더해 실제 **Escape key**로 05 comparison dialog를 닫고 trigger focus 복귀를 desktop/mobile에서 추가 확인했다. 과학 모델, 3D/WebGL lifecycle 구현은 변경하지 않았다. 전체 unit suite에 기존 구조 lifecycle 회귀가 포함된다. Physical projector 가독성은 자동 geometry 결과와 구별한다.

## M. raw integrity 결과

`src/data/regulation/provenance.json`의 **20/20 SHA-256 일치**(source 19 + processed 1). [raw-integrity.json](ux-014-016-verification/raw-integrity.json). `.gitattributes`와 package files, 모든 scientific source/data, 기존 test/harness 및 누적 수정 파일은 baseline SHA와 동일하다(이번 세 application 파일 제외). [preservation.json](ux-014-016-verification/preservation.json).

`src/styles.css`에서도 이번 planned badge rule만 제거하면 **baseline byte SHA와 일치**한다. 기존 UX-011 스타일을 포함한 나머지 내용을 그대로 보존했다. [styles-preservation.json](ux-014-016-verification/styles-preservation.json).

## N. 수정 파일

- Application: `src/app/ModuleNavigation.tsx`, `src/app/App.tsx`, `src/styles.css`.
- New tests: `tests/moduleNavigation.test.tsx`, `tests/browser/chrome-polish-checks.mjs`.
- Documentation: 본 보고서, `docs/SITE_WIDE_UX_AUDIT.md`의 현재 상태 column/closeout 안내, `docs/ux-014-016-verification/` evidence.
- 기존 미커밋 `.gitattributes`, `Diagrams.tsx`, `StartPage.tsx`, regulation/navigation/Start tests 및 UX-011 evidence는 유지했다.

## O. 추가/수정 tests

신규 unit **22개**: planned badge 4개, 7 route footer 7개, visibility/observer/RAF lifecycle 11개. 기존 test는 수정하지 않았다. Browser runner는 별도 설치된 Playwright와 설치된 Chrome/Edge를 사용하여 project dependencies를 변경하지 않는다.

재실행은 설치된 Playwright package 경로를 `NODE_PATH`에 지정하고 `node tests/browser/chrome-polish-checks.mjs`를 사용한다. `UX_BASE_URL`로 실행 중인 Vite/preview URL, `UX_BROWSER_CHANNEL=msedge`로 Edge를 선택한다. Production에서는 `UX_SKIP_REGRESSIONS=1`로 development harness를 제외하고 `UX_RUN_NAME=chrome-production`으로 evidence 이름을 구분한다.

## P. 최종 명령 결과

| 명령 | 결과 |
|---|---|
| `npm test` | **17 files / 277 tests 통과** (255 + 22) |
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과 |
| `npm run build` | 통과, 기존 500 kB chunk warning 유지 |
| `git diff --check` | 통과, exit 0 |

[Command exit codes](ux-014-016-verification/command-results.json), [test log](ux-014-016-verification/test.log), [build log](ux-014-016-verification/build.log). Dependency, branch, scientific assets에 변경을 추가하지 않았다.

## Q. browser/console 결과

- **Chrome 154.0.8037.58** development: 280 runner assertions, 42 route/viewport 조합, 20 route-preserving resize 전환 + 3 controls, 11 prior harness runs. [결과](ux-014-016-verification/chrome-results.json).
- **Edge 154.0.4258.37** development: 267 runner assertions, 동일 42개 조합/20개 전환/3 controls. [결과](ux-014-016-verification/msedge-results.json).
- **Chrome production preview**: 267 runner assertions, 동일 42개 조합/20개 전환/3 controls 통과. [결과](ux-014-016-verification/chrome-production-results.json).
- 최종 실행의 browser console warning/error/pageerror: **0**. ResizeObserver loop warning 없음.
- 첫 개발 harness 실행에서 기존 harness HTML의 favicon 생략 때문에 `/favicon.ico` 404가 한 번 발생했다. [초기 기록](ux-014-016-verification/chrome-initial-results.json)을 보존했다. Runner는 기존 harness에 한해 production과 동일한 empty favicon을 test 초기화에서 제공한다. Application HTML/source는 변경하지 않았다.

## R. 원래 UX-001~016 전체 closeout 가능 여부

**소프트웨어 이슈 register는 UX-001~016 모두 해결로 closeout 가능하다.** Original audit의 과거 observations/screenshots는 유지하고 issue register에 현재 상태를 덧붙였다. 이번 기능 수정 범위는 UX-014~016뿐이다. **04 Inhibition의 학습 기능은 planned 유지**이며 안내 페이지의 clickable link가 정상이라는 뜻이다.

## S. 미검증 항목

실제 iOS/Android 기기의 touch/회전, Safari/Firefox, native screen reader(NVDA/VoiceOver 등)의 음성·탐색, 물리적 projector/교실 거리에서의 판독은 미검증이다. 위 browser 수치는 Windows headless Chrome/Edge 및 local production preview에서의 CSS viewport/DOM/keyboard 검사다. Public deployment는 수행하지 않았다.
