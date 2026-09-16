import {ModuleHeader} from '../../shared/components/ModuleHeader';
import type {ModuleId} from '../../app/modules';

/**
 * Placeholder for the two Enzyme II modules. They are listed in the registry so the navigation shows the
 * whole shape of the course, and adding the real module later means replacing this one line in App.tsx.
 */
export function ComingSoon({id}: {id: ModuleId}) {
  return (
    <main className="module" data-testid={`module-${id}`}>
      <ModuleHeader id={id} tag={<span className="badge">Coming in Enzyme II</span>} />
      <div className="prose-panel">
        <p>This module is part of the next session, Enzyme II — Inhibition &amp; Regulation. It is not built yet.</p>
        <p>
          Everything it needs from this app already exists: the velocity model in <code>src/kinetics</code> is written as a
          general <code>KineticModel</code>, so an inhibition model is a new implementation of the same interface rather
          than a change to the plotting code.
        </p>
      </div>
    </main>
  );
}
