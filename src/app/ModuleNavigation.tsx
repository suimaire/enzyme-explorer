import {useEffect, useRef} from 'react';
import {MODULES, hashFor, type ModuleId} from './modules';

/** Scroll only the rail; changing modules must not move the document vertically. */
export function ModuleNavigation({current, navigate}: {current: ModuleId; navigate: (id: ModuleId) => void}) {
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = rail.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const outer = nav.getBoundingClientRect();
    const inner = active.getBoundingClientRect();
    if (inner.left < outer.left) nav.scrollLeft += inner.left - outer.left - 12;
    else if (inner.right > outer.right) nav.scrollLeft += inner.right - outer.right + 12;
  }, [current]);

  return <nav ref={rail} className="module-nav" aria-label="학습 모듈">
    {MODULES.map(m => <a key={m.id} href={hashFor(m.id)}
      aria-current={current === m.id ? 'page' : undefined}
      aria-label={`${m.number ?? m.eyebrow} ${m.title}${m.status === 'planned' ? ' · Enzyme II에서 다룰 예정' : ''}`}
      data-testid={`nav-${m.id}`} onClick={e => {e.preventDefault(); navigate(m.id);}}>
      <small>{m.number ?? m.eyebrow}</small>
      {m.number && <span>{m.id === 'kinetics' ? '반응속도론' : m.title}</span>}
    </a>)}
  </nav>;
}
