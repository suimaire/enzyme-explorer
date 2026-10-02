import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {App} from '../src/app/App';
import {MODULES, hashFor} from '../src/app/modules';

afterEach(() => vi.unstubAllGlobals());

describe('header portal navigation', () => {
  it.each(MODULES)('provides one labelled same-tab portal button beside the breadcrumb outside the $id module rail', ({id}) => {
    vi.stubGlobal('window', {location: {hash: hashFor(id)}});
    const html = renderToStaticMarkup(<App />);
    const header = html.match(/<header\b[\s\S]*?<\/header>/)![0];
    const anchors = header.match(/<a\b[\s\S]*?<\/a>/g)!;
    const portal = anchors.filter(a => a.includes('aria-label="메인 포털로 돌아가기"'));
    expect(anchors).toHaveLength(2);
    expect(portal).toHaveLength(1);
    expect(portal[0]).toContain('href="https://suimaire.github.io/"');
    expect(portal[0]).toContain('aria-label="메인 포털로 돌아가기"');
    expect(portal[0]).toContain('← 메인 포털');
    expect(portal[0]).not.toMatch(/\btarget=|\brole="button"|\btabindex=/);
    expect(html.match(/href="https:\/\/suimaire\.github\.io\/"/g)).toHaveLength(1);

    const rail = html.match(/<nav\b[^>]*class="module-nav"[\s\S]*?<\/nav>/)![0];
    expect(rail).not.toContain('https://suimaire.github.io/');
    expect(rail.match(/<a\b/g)).toHaveLength(7);
    for (const module of MODULES) expect(rail).toContain(`href="${hashFor(module.id)}"`);
    expect(rail).toContain('class="module-planned" aria-hidden="true">예정</span>');
    expect(rail.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.indexOf('</header>')).toBeLessThan(html.indexOf('class="module-nav"'));
  });

  it('keeps the skip link before the portal and module links in keyboard order', () => {
    vi.stubGlobal('window', {location: {hash: '#/start'}});
    const html = renderToStaticMarkup(<App />);
    const links = html.match(/<a\b[\s\S]*?<\/a>/g)!;
    expect(html.startsWith('<a class="skip-link"')).toBe(true);
    expect(links[0]).toContain('href="#main-content"');
    expect(links[0]).toContain('본문으로 건너뛰기');
    expect(links[1]).toContain('분자 · 생화학 탐구');
    expect(links[2]).toContain('aria-label="메인 포털로 돌아가기"');
    expect(links[3]).toContain('href="#/start"');
  });
});
