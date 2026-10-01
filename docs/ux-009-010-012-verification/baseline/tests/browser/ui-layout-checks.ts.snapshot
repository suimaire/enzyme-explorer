/** Development-only browser regressions. Run via regulation-harness.html?motion=reduce&uiAudit=1. */
export function installLayoutChecks() {
  const contexts = new Set<HTMLCanvasElement>();
  const lost = new Set<HTMLCanvasElement>();
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
    const context = original.apply(this, args);
    if (/^webgl/.test(args[0]) && context && !contexts.has(this)) {
      contexts.add(this);
      this.dataset.auditCanvas = String(contexts.size);
      this.addEventListener('webglcontextlost', () => {lost.add(this); report();});
    }
    return context;
  } as typeof original;
  const output = document.createElement('pre');
  output.dataset.testid = 'ui-audit';
  output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
  const start = document.createElement('button');
  start.textContent = 'UI 회귀 검사 실행';
  document.body.append(start, output);
  let checks: string[] = [];
  function report() {output.textContent = JSON.stringify({checks, contextsCreated: contexts.size, contextsLost: lost.size, connectedCanvases: [...contexts].filter(c => c.isConnected).length}, null, 2);}
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === text)!;
  async function click(text: string) {const element = button(text); if (!element) throw new Error(`Missing button: ${text}`); element.click(); await frame();}
  function assert(condition: boolean, name: string) {if (!condition) throw new Error(name); checks.push(`PASS ${name}`); report();}
  async function waitForCanvas() {
    for (let n = 0; n < 180; n++) {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="reg-structure-viewer"] canvas');
      if (canvas) return canvas;
      await frame();
    }
    throw new Error('WebGL canvas not created');
  }
  start.onclick = async () => {
    start.disabled = true;
    checks = [];
    try {
      for (let n = 0; n < 180 && !button('실제 3D 구조'); n++) await frame();
      await click('실제 3D 구조');
      const canvas = await waitForCanvas();
      const host = canvas.parentElement!;
      const dialog = canvas.closest('dialog')!;
      assert(document.querySelector('.reg-workspace')!.classList.contains('reg-workspace-structure'), 'structure focus layout');
      assert(!!document.querySelector('[data-testid="reg-result-summary"]'), 'result summary retained');
      assert(document.querySelector('[data-testid="reg-ser-schematic"]')!.textContent!.includes('독립적인 2D 개념도'), 'Ser33 scope and schematic retained');
      await click('PFK-2 도메인');
      canvas.focus();
      canvas.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
      canvas.dispatchEvent(new KeyboardEvent('keydown', {key: '+', bubbles: true}));
      const camera = [host.dataset.cameraPosition, host.dataset.cameraTarget, host.dataset.cameraDistance].join('|');
      const before = contexts.size;
      for (let n = 0; n < 12; n++) {
        await click('크게 보기');
        assert(dialog.matches(':modal'), `modal open ${n + 1}`);
        if (n === 0) {
          canvas.focus();
          canvas.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
          assert(document.activeElement === button('전체 이량체'), 'Tab wraps to first modal control');
          button('전체 이량체').dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true, cancelable: true}));
          assert(document.activeElement === canvas, 'Shift+Tab wraps to viewer');
        }
        if (n % 2) {dialog.dispatchEvent(new Event('cancel', {cancelable: true})); await frame();}
        else await click('닫기');
        assert(!dialog.matches(':modal') && dialog.open, `inline restored ${n + 1}`);
      }
      assert(contexts.size === before && canvas.isConnected && host.querySelector('canvas') === canvas, '12 open/close cycles reuse canvas and context');
      assert(camera === [host.dataset.cameraPosition, host.dataset.cameraTarget, host.dataset.cameraDistance].join('|'), 'camera orientation, target and zoom preserved');
      assert(button('PFK-2 도메인').getAttribute('aria-pressed') === 'true', 'selection preserved');
      assert(document.activeElement === button('크게 보기') && document.body.style.overflow !== 'hidden', 'focus restored and scroll unlocked');
      await click('조절 경로');
      assert(!document.querySelector('.reg-workspace')!.classList.contains('reg-workspace-structure'), 'normal pathway layout restored');
      await click('중간 신호 직접 조작');
      assert(!document.querySelector('.reg-workspace')!.classList.contains('reg-workspace-structure'), 'normal intervention layout retained');
      await click('실제 3D 구조');
      assert(canvas.isConnected && contexts.size === before, 'tab changes reuse canvas');
      assert(camera === [host.dataset.cameraPosition, host.dataset.cameraTarget, host.dataset.cameraDistance].join('|'), 'tab changes preserve camera');
      assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'no page horizontal overflow');
      const oldLost = lost.size;
      document.querySelector<HTMLAnchorElement>('[data-testid="nav-start"]')!.click();
      for (let n = 0; n < 120 && lost.size === oldLost; n++) await frame();
      assert(!canvas.isConnected && lost.has(canvas), 'module exit disposes renderer and loses its context');
      checks.push('ALL UI CHECKS PASSED');
    } catch (error) {checks.push(`FAIL ${String(error)}`);}
    finally {start.disabled = false; report();}
  };
  report();
}
