// Development-only fault-injection fixture, not a production entry point.
// CSS media queries still follow the real browser setting; only the JS branch is emulated.
import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import '../../src/styles.css';
const params = new URLSearchParams(location.search);
if (params.get('webgl') === 'unavailable') {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
    if (/^webgl|experimental-webgl/.test(args[0])) return null;
    return original.apply(this, args);
  } as typeof original;
}
if (params.get('motion') === 'reduce') {
  const original = window.matchMedia.bind(window);
  window.matchMedia = query => {
    const media = original(query);
    if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', {value: true});
    return media;
  };
}
createRoot(document.getElementById('root')!).render(<App />);
// Render the network audit as visible test output, independent of app internals.
const report = document.createElement('output');
report.setAttribute('data-testid', 'network-audit');
report.style.cssText = 'display:block;padding:12px;border:2px dashed #789;margin:16px';
document.body.append(report);
const origins = new Set<string>();
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) origins.add(new URL(entry.name).origin);
  report.textContent = `검증용 리소스 출처: ${[...origins].join(', ')}. 외부 리소스: ${[...origins].filter(o => o !== location.origin).length}`;
}).observe({type: 'resource', buffered: true});
