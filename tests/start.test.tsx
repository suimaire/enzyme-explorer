import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import * as registry from '../src/app/modules';
import {StartPage} from '../src/modules/start/StartPage';

const render = () => renderToStaticMarkup(<StartPage onNavigate={() => {}} />);
const exploration = (html = render()) => html.match(/<section class="start-explore"[\s\S]*?<\/section>/)![0];

describe('Start module discovery (UX-011)', () => {
  it('retains the three basic inquiry cards in their original learning order', () => {
    const core = render().match(/<ul class="card-grid"[\s\S]*?<\/ul>/)![0];
    expect([...core.matchAll(/data-testid="card-([^"]+)"/g)].map(match => match[1]))
      .toEqual(['reaction-energy', 'carbonic-anhydrase', 'kinetics']);
    for (const question of ['왜 열역학적으로 유리한 반응도 느릴 수 있을까?', '분자의 3차원 환경은 어떻게 반응성을 바꿀까?', '효소의 효과를 실험적으로 어떻게 측정할 수 있을까?']) expect(core).toContain(question);
  });

  it('places 05 in a separate optional exploration before the planned modules', () => {
    const html = render();
    expect(html).toContain('기본 학습 흐름');
    expect(html.indexOf('class="start-flow"')).toBeLessThan(html.indexOf('class="start-explore"'));
    expect(html.indexOf('class="start-explore"')).toBeLessThan(html.indexOf('class="start-planned"'));
    expect(exploration(html)).toContain('더 탐구해 보기');
    expect(exploration(html)).toContain('다른 모듈을 완료하지 않아도 지금 시작할 수 있습니다.');
    expect(exploration(html)).not.toMatch(/04|효소 저해|순서대로 진행|완료해야|잠금/);
    expect(html).toContain('01 → 02 → 03 순서로 진행하는 것을 권장합니다.');
  });

  it('introduces the current liver PFKFB1 L-form scope without promising quantitative outputs', () => {
    const card = exploration();
    for (const text of ['05', '효소 조절', 'Hormonal Regulation', 'Enzyme II', '간 PFKFB1 L형', '인슐린·글루카곤 신호', '효소 활성과 대사 조절 방향']) expect(card).toContain(text);
  });

  it('shows the ready module as usable with a start CTA and no planned badge', () => {
    expect(registry.moduleEntry('regulation').status).toBe('ready');
    expect(exploration()).toContain('현재 이용 가능');
    expect(exploration()).toContain('학습 시작');
    expect(exploration()).not.toMatch(/예정|준비 중|곧 공개|disabled/);
  });

  it('targets the registered regulation hash from the semantic card link', () => {
    expect(exploration()).toContain(`href="${registry.hashFor(registry.moduleEntry('regulation').id)}"`);
    expect(registry.moduleFromHash('#/regulation')).toBe('regulation');
  });

  it('keeps 04 planned in a separate non-interactive announcement', () => {
    expect(registry.moduleEntry('inhibition').status).toBe('planned');
    const planned = render().match(/<section class="start-planned"[\s\S]*?<\/section>/)![0];
    for (const text of ['준비 중', '04', '효소 저해', 'Enzyme II에서 다룰 예정']) expect(planned).toContain(text);
    expect(planned).not.toMatch(/<a\b|<button\b|05|효소 조절|현재 이용 가능/);
  });

  it('provides one focusable link with module identity, CTA and a description', () => {
    const card = exploration();
    expect(card.match(/<a\b/g)).toHaveLength(1);
    expect(card).not.toMatch(/<button\b|tabindex=|<input\b/);
    const labels = card.match(/<a\b[^>]*aria-labelledby="([^"]+)"/)![1].split(' ');
    expect(labels).toHaveLength(3);
    for (const id of labels) expect(card).toContain(`id="${id}"`);
    expect(card).toContain('aria-describedby="start-regulation-description"');
    expect(card).toContain('id="start-regulation-description"');
    expect(card).toContain('lang="en"');
  });

  it('reads the route, number, titles, category and availability from the registry on render', () => {
    const original = registry.moduleEntry;
    const spy = vi.spyOn(registry, 'moduleEntry').mockImplementation(id => id === 'regulation'
      ? {...original(id), id: 'kinetics', number: '09', title: '등록된 제목', heading: 'Registry heading', eyebrow: 'Registry category'}
      : original(id));
    try {
      const card = exploration();
      for (const text of ['href="#/kinetics"', '>09</span>', '등록된 제목', 'Registry heading', 'Registry category']) expect(card).toContain(text);
      spy.mockImplementation(id => ({...original(id), status: 'planned'}));
      expect(render()).not.toContain('class="start-explore"');
    } finally {spy.mockRestore();}
  });
});
