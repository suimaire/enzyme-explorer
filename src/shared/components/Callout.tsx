/** Badge for any quantity that comes from a chosen teaching parameter rather than from a measurement. */
export const TeachingModel = ({children}: {children?: React.ReactNode}) => (
  <span className="teaching-model">
    <span className="teaching-model-tag">교육용 모델</span>
    {children}
  </span>
);

/** Emphasised warning used where a common shortcut would be wrong (for example Km and affinity). */
export const Caution = ({title, children}: {title: string; children: React.ReactNode}) => (
  <aside className="caution" role="note">
    <h4>
      <span aria-hidden="true">!</span> {title}
    </h4>
    {children}
  </aside>
);

/**
 * Separates what the deposited coordinates actually contain from what is a mechanistic reading of them.
 * Every mechanistic statement in Module 02 is wrapped in one of these.
 */
export const SourceTag = ({kind}: {kind: 'experimental' | 'interpretation'}) =>
  kind === 'experimental' ? (
    <span className="source-tag experimental">실험 구조 데이터</span>
  ) : (
    <span className="source-tag interpretation">반응 메커니즘 해석</span>
  );
