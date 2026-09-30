import {useEffect, useRef, useState, type ReactNode} from 'react';

/** A single mounted viewer switches between an inline dialog and the native modal top layer. */
export function StructureFrame({controls, children}: {controls: ReactNode; children: ReactNode}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {document.body.style.overflow = previous;};
  }, [expanded]);

  function changeExpanded(next: boolean) {
    const element = dialog.current;
    if (!element) return;
    // Closing and reopening this same DOM node preserves its canvas and WebGL context.
    element.close();
    if (next) element.showModal();
    else element.show();
    setExpanded(next);
    toggle.current?.focus({preventScroll: true});
  }

  return <dialog open ref={dialog} className="reg-structure-frame" data-expanded={expanded}
    role={expanded ? 'dialog' : 'region'} aria-modal={expanded || undefined} aria-label="PFKFB1 · PDB 1K6M"
    onKeyDown={event => {
      if (!expanded || event.key !== 'Tab') return;
      const stops = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]')];
      const first = stops[0], last = stops.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
    }}
    onCancel={event => {event.preventDefault(); changeExpanded(false);}}>
    <div className="reg-structure-toolbar">
      <strong className="reg-focus-title">PFKFB1 · PDB 1K6M</strong>
      {controls}
      <button ref={toggle} type="button" className="reg-expand" aria-expanded={expanded} onClick={() => changeExpanded(!expanded)}>{expanded ? '닫기' : '크게 보기'}</button>
    </div>
    {children}
    <p className="reg-focus-caption">드래그 회전 · 휠 확대 · 방향 키 / + / −<br/>고정된 실험 좌표 · Ser33과 phosphorylation 전후의 실제 atomic motion은 이 구조에서 직접 확인하지 않습니다.</p>
  </dialog>;
}
