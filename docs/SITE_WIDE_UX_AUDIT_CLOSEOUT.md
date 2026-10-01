# Enzyme Explorer Site-wide UX Audit Closeout

## 1. Closeout date / commit candidate

- 날짜: **2026-10-02 (Asia/Seoul)**. Branch: `main`, tracking `origin/main`.
- 시작 HEAD: `96f72cb0eb7281ef87daba6c19d23c07c100823e` — `fix: improve enzyme explorer learning UX`.
- Remote: `https://github.com/suimaire/enzyme-explorer`.
- 최종 commit 전 상태: 기존 UX-011/013/014/015/016 source/test/evidence 변경에 이 closeout, handoff 갱신, 최종 browser runner/검증 자료를 더한 의도된 working tree. [시작 상태](ux-closeout-verification/start-status.txt)를 보존했다. 이번 closeout은 production source, dependency, 과학 모델을 추가 수정하지 않았다.
- Checkpoint candidate: `fix: complete enzyme explorer UX audit improvements`. QA와 원격 divergence 확인을 모두 통과한 경우에만 하나의 commit으로 보존한다. 최종 SHA/push/Pages 결과는 완료 보고에서 확인한다.

## 2. Original audit summary

원래 [audit issue register](SITE_WIDE_UX_AUDIT.md#6-issue-register)의 **P0 1 / P1 2 / P2 10 / P3 3, 총 16개**를 그대로 사용했다. 새로운 이슈를 찾는 전면 감사, 기능 추가, 디자인/typography 재조정, refactor를 수행하지 않았다. 원래 관찰·재현·화면은 역사적 증거로 보존한다.

## 3. Resolution table

| ID | Original priority | Status | Resolution | Verification |
|---|---|---|---|---|
| UX-001 | P0 | RESOLVED | App 세션에 학습 상태를 보존하고 module exit에서는 viewer를 정리한다. Explicit reset은 상태를 삭제한다. | Session/phase-a2/navigation fixture와 일반 앱에서 03 측정 → Reference → 03 보존, reset 뒤 복원 없음 확인. |
| UX-002 | P1 | RESOLVED | 촉매 감소량의 동적 최대값과 저장/표시/적용값을 일치시킨다. 최소 장벽 guard 유지. | TS55/product +30에서 max=value=20, 정55→35/역25→5, ΔG +30 유지. |
| UX-003 | P1 | RESOLVED | 높은 Km은 range-limit 관찰/해설 경로를 제공한다. | Km150/155/300에서 [S]≤600으로 기존 포화 또는 range-limit 해설 진행 가능. |
| UX-004 | P2 | RESOLVED | 기준/현재 곡선을 같은 축에 투영하고 필요한 축 자동 확장을 알린다. | Baseline Vmax100 저장 → kcat60, 축115→330, 기준곡선 유지와 확장 안내 확인. |
| UX-005 | P2 | RESOLVED | 모델 계산 기반, 무작위 오차 없음, 동일 조건 1점과 실제 fitting 부재를 안내한다. | 50µM의 40.0 가상 측정, 동일 조건 재실행 1행/중복 feedback, 기존 과학 문구 검사 통과. |
| UX-006 | P2 | RESOLVED | 장벽/ΔG 텍스트의 대비를 확보한다. | Computed RGB 재측정: 장벽6.242:1, ΔG5.978:1, 촉매6.691:1; 기존 목표4.5:1 이상. |
| UX-007 | P2 | RESOLVED | 그래프 역할별 최소 글자 크기와 좁은 화면 label/tick 기준을 유지한다. | Readability fixture의 SVG bounds/font/collision 및 기존 3D label 기준 검사 통과, mobile clipping 없음. |
| UX-008 | P2 | RESOLVED | 01/03A/03B에 가까운 feedback과 SectionJumpButton을 제공한다. | 390×844 mobile-experiment fixture에서 조작/graph/inquiry 이동, focus/scroll 검사 통과. |
| UX-009 | P2 | RESOLVED | Sugar comparison 종료 시 trigger 또는 살아 있는 fallback으로 focus를 돌린다. | Desktop/mobile의 실제 Escape → 동일 trigger focus, 기존 cancel/닫기/fallback 회귀 통과. |
| UX-010 | P2 | RESOLVED | Reference TOC, 01/02/03/05 순서, contextual direct section, 복귀와 핵심 한계를 제공한다. | Navigation fixture와 일반 앱에서 03 direct heading → TOC01→03 → explicit return/main focus 확인. |
| UX-011 | P2 | RESOLVED | Start에 ready05 소개/CTA를 추가하고 planned04 및 기본01→02→03 흐름과 구분한다. | Start fixture/일반 앱에서 05 현재 이용 가능, prerequisite 강제 없음, 04 별도 planned 확인. |
| UX-012 | P2 | RESOLVED | 첫 Tab skip link, 안정된 main, route별 title과 focus 정책을 제공한다. | 네 viewport의 첫Tab→skip→Enter/main, 7개 고유 title, 실제 rail Tab03→04→05/Shift+Tab 확인. |
| UX-013 | P2 | RESOLVED | 전달 전 ATP 공여체, 전달 후 ADP 생성물 caption을 함께 갱신한다. | A(PKA→단백질)/B(PFK-2→당) 모두 ATP/말단 인산기 공여체 → ADP/인산기 전달 후 생성물 확인. |
| UX-014 | P3 | RESOLVED | 04에만 시각적인 예정 badge를 표시하며 link/aria-current를 유지한다. | 모든 route/viewport 및 실제 Enter로 04 진입 확인; ready module badge 없음. |
| UX-015 | P3 | RESOLVED | Footer가 01–03과05의 촉매 작용·반응속도론·조절을 포괄한다. | 전체 route에서 “Enzyme Explorer · 효소의 촉매 작용, 반응속도론과 조절” 일치. |
| UX-016 | P3 | RESOLVED | Rail width 변화에 active item 노출을 재계산하고 observer/RAF를 정리한다. | 03/05/Reference 1440→390→768→390→1440, 12회 모두 노출/focus 보존. Rail만 resize한 3회는 scrollY도 정확히 유지. |

최종 재실행의 개별 assertion, computed contrast/font/geometry, session snapshot, renderer cleanup은 [local-results.json](ux-closeout-verification/local-results.json)에 있다. 이전 단계의 상세 근거는 [세션](UX_001_SESSION_VERIFICATION.md), [Phase A2](phase-a2-verification/verification.json), [가독성](UX_006_007_READABILITY_VERIFICATION.md), [모바일 흐름](UX_008_MOBILE_FLOW_VERIFICATION.md), [navigation](ux-009-010-012-verification/summary.json), [최종 polish](UX_014_015_016_POLISH_VERIFICATION.md)를 참조한다.

## 4. Major architecture improvements

- **Session state와 WebGL lifecycle 분리:** route 왕복은 학습 상태를 보존하지만 renderer/canvas/context는 module exit에서 dispose한다. 영구 저장은 제공하지 않는다.
- **Raw scientific source byte preservation:** 명시적 `.gitattributes -text`와 기존 provenance SHA test를 유지한다. 새 검증 폴더에도 byte 보존 정책을 적용하여 evidence manifest가 checkout의 줄바꿈 설정에 영향을 받지 않도록 했다.
- **Mobile experiment navigation:** 가까운 숫자 feedback과 SectionJumpButton으로 01/03 실험의 조건·graph·질문을 연결한다.
- **Reference contextual navigation:** section URL, TOC, 핵심 한계/상세 자료 층위와 명시적 module return을 제공한다.
- **Compact/readable graphs:** 역할별 typography, 좁은 화면 tick 밀도, label collision/clipping 방지와 실제 shared-axis 안내를 유지한다.
- **Regulation / 3D accessibility:** dialog focus return, 구조 크게 보기의 동일 canvas/context 재사용, 키보드 조작과 과학적 모식도/좌표 구분을 유지한다.
- **Rail resize handling:** ResizeObserver와 coalesced RAF로 rail 폭 변경에 대응하고 cleanup한다. Rail 조정은 세로 scroll API를 호출하지 않는다.

## 5. Scientific safeguards preserved

- Catalyst does not alter **ΔG/equilibrium**; 정·역방향 장벽을 함께 낮춘다.
- **Minimum activation barrier guard 5 kJ·mol⁻¹**를 유지한다.
- **Km != Kd**; 결합 친화도와 직접 동일시하지 않는다.
- **Deterministic virtual measurement semantics:** 모델 계산 기반/무작위 오차 없음/동일 조건1점/실제 fitting 아님.
- **PFKFB1 one protein / two catalytic activities**를 유지한다.
- **Relative activity != protein abundance / actual flux**; 정성적 조절 모델의 범위를 유지한다.
- **Ser33 schematic != 1K6M coordinates**; construct에 포함되지 않은 조절 잔기를 실제 좌표로 주장하지 않는다.
- **Educational animations != atomic trajectories**; 교육용 단계/입자 이동은 실제 반응 시간·분자동역학이 아니다.

과학 설명을 추가하거나 연결 논문 전체를 새로 재검토하지 않았다. 현재 source와 기존 scientific/model/unit assertions를 대조했다. [Raw integrity](ux-closeout-verification/raw-integrity.json): regulation provenance20개와 README의2CBA, **21/21 SHA 일치**, 모두 `text: unset`, `src/data` content diff 없음. Expected SHA/원자료를 변경하지 않았다.

## 6. Final automated verification

요청 순서대로 **단독/순차 실행**했다. Test timeout이나 assertion을 완화하지 않았다.

| Command | Result | Evidence |
|---|---|---|
| `npm test` | **17 files / 277 tests passed** | [test.log](ux-closeout-verification/test.log) |
| `npm run typecheck` | passed, exit0 | [typecheck.log](ux-closeout-verification/typecheck.log) |
| `npm run lint` | passed, exit0 | [lint.log](ux-closeout-verification/lint.log) |
| `npm run build` | passed, exit0 | [build.log](ux-closeout-verification/build.log) |
| `git diff --check` | passed, exit0 | [diff-check.log](ux-closeout-verification/diff-check.log) |

기존 500kB 초과 chunk warning(three510.63kB / ProteinStructure582.20kB)은 failure와 구분한다. 일반 text 파일의 LF→CRLF Git 안내도 runtime 오류가 아니다. 새 closeout runner는 browser 검사 도구이며 Vitest test 수를 늘리지 않는다.

## 7. Final browser verification

실제 사용 browser: **Windows headless Chrome154.0.8037.58**. CSS viewport는 **1440×900, 390×844, 1024×768, 768×1024**이다. 실기기 검증으로 표현하지 않는다.

- Local Vite 앱: 7route×4viewport **28개 조합**, 기존 fixture **11회 / 1,190개 check 항목(완료 marker 포함)**, route 유지 resize12회와 rail-only3회. [결과](ux-closeout-verification/local-results.json).
- Local production preview: 동일 28개 조합과 대표 기능/keyboard/resize 검사. [결과](ux-closeout-verification/production-results.json). Development fixture를 production에서 실행했다고 주장하지 않는다.
- Start05 ready/04 planned, 01 catalyst dynamic max/graph, 02 state/3D, 03 측정·Reference·Km 경계·axis rescale, 05 두 호르몬·Sugar Escape·A/B phosphate caption·3D 확대, Reference TOC/direct section/return, 전역 skip/title/footer/rail을 검사했다.
- Console warning/error/pageerror 및 HTTP failure: 최종 두 실행 모두 **0**.
- 03 responsive width 변화의 일부 방향에서 기존 browser scroll anchoring에 따른 scrollY ±134px가 기록됐다. 페이지 상단으로 reset하지 않고 학습 위치/focus를 유지한다. 05/Reference의 네 전환은 모두0px이며, viewport를 유지한 rail-only resize는 03/05/Reference 모두0px다. 기존 [UX-016 검증](UX_014_015_016_POLISH_VERIFICATION.md#i-vertical-scroll-보존-결과)과 일치한다.
- 실제 원본 크기 screenshot도 확인했다: [mobile Start](ux-closeout-verification/local-start-390.png), [desktop01](ux-closeout-verification/local-reaction-energy-1440.png). 모든 최종 screenshot은 [파일 목록](ux-closeout-verification/evidence-manifest.json)에서 참조한다.
- WebGL 최소 확인: **02 진입/이탈5회**, renderer disposal/context release/context lost 모두5; connected canvas1→0. **05 크게 보기/닫기5회**는 같은 canvas/context 유지, module exit에서 renderer/context1회 정리, canvas0. 실제 cleanup instrumentation은 기존 session fixture를 재사용했다. 장시간 GPU/memory 안정성 증명과 구분한다.

GitHub Pages workflow와 공개 URL smoke는 checkpoint push 후 이번 commit의 배포가 성공한 경우에만 수행한다. 이 precommit 문서는 배포 완료를 선행 주장하지 않는다. 최종 공개 검사는 완료 보고에 기록한다.

## 8. Remaining product state

**04 Inhibition = planned, not implemented.** Clickable 안내 페이지와 예정 표시만 제공한다. 이것은 unresolved UX bug가 아니라 현재 product scope다. 이번 마감에서 04 학습 기능을 구현하지 않았다. 03 fitting/noise와 브라우저 새로고침/새 탭/재시작 사이의 세션 영구 저장도 제공하지 않는다.

## 9. Unverified

- 실제 physical mobile/tablet의 touch/drag/pinch, virtual keyboard, rotation과 device pixel density.
- NVDA/VoiceOver 등 actual screen reader의 음성·탐색과 전체 WCAG 인증.
- 실제 projector 밝기/해상도 및 **2–4m** 판독, 실제 색각/저시력 사용자의 과업.
- **Safari / Firefox**, 다른 browser/OS/GPU 조합.
- 실제 **200% browser zoom**.
- 장시간 memory/GPU 안정성, heap snapshot, 모든 RAF/timer/listener 누계, GPU context loss/restore, 모든 stale async race.
- **Offline cold first load**, throttling, 전체 HAR/network 조건.
- 실제 OS/browser reduced-motion media condition와 모든 CSS animation 제거. 기존 fixture의 JS 분기 검사와 구분한다.
- 연결된 모든 논문 전문/모든 학술 claim의 독립 재검토.

원래 [Unverified](SITE_WIDE_UX_AUDIT.md#10-unverified)를 축소하거나 통과로 바꾸지 않았다. Source에서 Service Worker 등록을 발견하지 못한 현재 구조에 Service Worker가 있다고 가정하지 않는다.

## 10. Final conclusion

**원래 등록된 UX-001~016은 검증 범위 안에서 모두 해결됨.** Original register의 unresolved UX issue는 **0**이다. 위 Unverified 범위와 04 planned product scope는 이 결론과 별도로 유지한다.

최종 변경은 production source / tests·browser fixtures / docs·verification evidence / `.gitattributes`로 분류하여 검토한다. Raw scientific assets의 content diff, dependency 변경, dist/node_modules/cache/IDE/다른 프로젝트 파일은 없다. 이전 단계의84개 evidence 파일은 [용도·크기·SHA 목록](ux-closeout-verification/prior-evidence-manifest.json)에 명시해 보존하고 최종 검증 자료는 [최종 manifest](ux-closeout-verification/evidence-manifest.json)로 참조한다. Commit/push/Pages의 실제 결과는 완료 보고를 따른다.
