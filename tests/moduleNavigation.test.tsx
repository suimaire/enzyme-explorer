import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {App} from '../src/app/App';
import {ModuleNavigation, ensureActiveItemVisible, observeActiveModule} from '../src/app/ModuleNavigation';
import {MODULES} from '../src/app/modules';

afterEach(() => vi.unstubAllGlobals());

describe('planned module rail (UX-014)', () => {
  const render = (current: 'start' | 'inhibition' = 'start') => renderToStaticMarkup(<ModuleNavigation current={current} navigate={() => {}} />);
  it('shows one small planned indicator only on 04', () => {
    const html = render();
    expect(html.match(/class="module-planned"/g)).toHaveLength(1);
    const links = html.match(/<a\b[\s\S]*?<\/a>/g)!;
    for (const [index, entry] of MODULES.entries()) {
      expect(links[index].includes('class="module-planned"')).toBe(entry.status === 'planned');
    }
    expect(html).toContain('class="module-planned" aria-hidden="true">예정</span>');
  });
  it('keeps 04 as a keyboard-accessible link to the planned announcement', () => {
    const link = render().match(/<a\b[^>]*href="#\/inhibition"[\s\S]*?<\/a>/)![0];
    expect(link).toContain('data-testid="nav-inhibition"');
    expect(link).not.toMatch(/disabled|tabindex="-1"|aria-disabled/);
  });
  it('announces planned status once and hides the repeated visual wording', () => {
    const link = render().match(/<a\b[^>]*href="#\/inhibition"[\s\S]*?<\/a>/)![0];
    const name = link.match(/aria-label="([^"]+)"/)![1];
    expect(name).toContain('04 효소 저해');
    expect(name.match(/예정/g)).toHaveLength(1);
    expect(link).toContain('aria-hidden="true">예정</span>');
  });
  it('retains current-page semantics and the planned indicator together', () => {
    const link = render('inhibition').match(/<a\b[^>]*href="#\/inhibition"[\s\S]*?<\/a>/)![0];
    expect(link).toContain('aria-current="page"');
    expect(link).toContain('class="module-planned"');
  });
});

describe('global footer scope (UX-015)', () => {
  it.each(MODULES)('uses the same global wording on $id', entry => {
    vi.stubGlobal('window', {location: {hash: `#/${entry.id}`}});
    const footer = renderToStaticMarkup(<App />).match(/<footer>[\s\S]*?<\/footer>/)![0];
    expect(footer).toContain('Enzyme Explorer · 효소의 촉매 작용, 반응속도론과 조절');
    expect(footer).not.toMatch(/Enzyme I|효소 저해|전체 과정|모든 효소/);
  });
});

// Geometry changes with scrollLeft, like a real rail. No DOM emulation dependency is needed.
function railFixture({width = 390, left = 584, right = 690} = {}) {
  const geometry = {width, left, right};
  let scroll = 0;
  const writes = vi.fn();
  const active = {getBoundingClientRect: vi.fn(() => ({left: geometry.left - scroll, right: geometry.right - scroll}))};
  const nav = {
    querySelector: vi.fn(() => active),
    getBoundingClientRect: vi.fn(() => ({left: 0, right: geometry.width, width: geometry.width})),
    get scrollLeft() {return scroll;},
    set scrollLeft(value: number) {scroll = value; writes(value);},
  };
  return {nav: nav as unknown as HTMLElement, active, geometry, writes};
}

function resizeEnvironment() {
  let callback: () => void;
  const observe = vi.fn(), disconnect = vi.fn();
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const request = vi.fn((fn: FrameRequestCallback) => {frames.set(++id, fn); return id;});
  const cancel = vi.fn((key: number) => frames.delete(key));
  vi.stubGlobal('ResizeObserver', class {
    constructor(fn: () => void) {callback = fn;}
    observe = observe;
    disconnect = disconnect;
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return {observe, disconnect, request, cancel, resize: () => callback(), flush: () => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0));
  }};
}

describe('rail visibility and resize lifecycle (UX-016)', () => {
  it('moves a right-clipped link only to the nearest edge with the existing inset', () => {
    const {nav, writes} = railFixture();
    ensureActiveItemVisible(nav);
    expect(nav.scrollLeft).toBe(312);
    expect(writes).toHaveBeenCalledTimes(1);
    ensureActiveItemVisible(nav);
    expect(writes).toHaveBeenCalledTimes(1);
  });
  it('moves a left-clipped link toward the left without centering', () => {
    const {nav} = railFixture({left: 90, right: 196});
    nav.scrollLeft = 120;
    ensureActiveItemVisible(nav);
    expect(nav.scrollLeft).toBe(78);
  });
  it('preserves scrollLeft when the whole active item is visible', () => {
    const {nav, writes} = railFixture({left: 30, right: 136});
    ensureActiveItemVisible(nav);
    expect(writes).not.toHaveBeenCalled();
  });
  it('tolerates a missing active link', () => {
    const {nav, writes} = railFixture();
    vi.mocked(nav.querySelector).mockReturnValue(null);
    ensureActiveItemVisible(nav);
    expect(writes).not.toHaveBeenCalled();
  });
  it('uses the same adjustment for initial route entry and width changes', () => {
    const env = resizeEnvironment();
    const {nav, geometry} = railFixture({width: 1440});
    const cleanup = observeActiveModule(nav)!;
    expect(env.observe).toHaveBeenCalledWith(nav);
    expect(nav.scrollLeft).toBe(0);
    geometry.width = 390; env.resize();
    expect(nav.scrollLeft).toBe(0);
    env.flush();
    expect(nav.scrollLeft).toBe(312);
    cleanup();
  });
  it('respects manual scrolling and ignores initial delivery or unchanged width', () => {
    const env = resizeEnvironment();
    const {nav, geometry} = railFixture();
    const cleanup = observeActiveModule(nav)!;
    nav.scrollLeft = 0;
    env.resize(); env.flush();
    expect(nav.scrollLeft).toBe(0);
    expect(env.request).not.toHaveBeenCalled();
    geometry.width = 380; env.resize(); env.flush();
    expect(nav.scrollLeft).toBe(322);
    cleanup();
  });
  it('coalesces multiple width changes into one frame using the latest geometry', () => {
    const env = resizeEnvironment();
    const {nav, geometry, writes} = railFixture({width: 1440});
    const cleanup = observeActiveModule(nav)!;
    geometry.width = 768; env.resize();
    geometry.width = 390; env.resize();
    expect(env.request).toHaveBeenCalledTimes(1);
    env.flush();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(nav.scrollLeft).toBe(312);
    cleanup();
  });
  it('does not recenter a visible item after a width change', () => {
    const env = resizeEnvironment();
    const {nav, geometry, writes} = railFixture({left: 30, right: 136});
    const cleanup = observeActiveModule(nav)!;
    geometry.width = 380; env.resize(); env.flush();
    expect(writes).not.toHaveBeenCalled();
    cleanup();
  });
  it('disconnects and cancels pending work on effect cleanup', () => {
    const env = resizeEnvironment();
    const {nav, geometry, writes} = railFixture({width: 1440});
    const cleanup = observeActiveModule(nav)!;
    geometry.width = 390; env.resize(); cleanup(); env.flush();
    expect(env.disconnect).toHaveBeenCalledTimes(1);
    expect(env.cancel).toHaveBeenCalledWith(1);
    expect(writes).not.toHaveBeenCalled();
  });
  it('does not cancel an already completed frame during cleanup', () => {
    const env = resizeEnvironment();
    const {nav, geometry} = railFixture({width: 1440});
    const cleanup = observeActiveModule(nav)!;
    geometry.width = 390; env.resize(); env.flush(); cleanup();
    expect(env.disconnect).toHaveBeenCalledTimes(1);
    expect(env.cancel).not.toHaveBeenCalled();
  });
  it('retains route visibility in environments without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const {nav} = railFixture();
    expect(observeActiveModule(nav)).toBeUndefined();
    expect(nav.scrollLeft).toBe(312);
  });
});
