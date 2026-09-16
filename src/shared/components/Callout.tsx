/** Badge for any quantity that comes from a chosen teaching parameter rather than from a measurement. */
export const TeachingModel = ({children}: {children?: React.ReactNode}) => (
  <span className="teaching-model">
    <span className="teaching-model-tag">Teaching model</span>
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
    <span className="source-tag experimental">Experimental structure</span>
  ) : (
    <span className="source-tag interpretation">Mechanistic interpretation</span>
  );
