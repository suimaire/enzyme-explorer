import type {ReactNode} from 'react';

/** Explicit local navigation, following 02's scroll + preventScroll focus return pattern. */
export function jumpToSection(target: HTMLElement) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.focus({preventScroll: true});
  target.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
}

export function SectionJumpButton({targetId, children}: {targetId: string; children: ReactNode}) {
  return <button type="button" className="section-jump mobile-experiment-helper" aria-controls={targetId}
    onClick={() => {
      const target = document.getElementById(targetId);
      if (target) jumpToSection(target);
    }}>{children}</button>;
}
