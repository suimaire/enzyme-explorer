import {useCallback, useEffect, useState} from 'react';
import {hashFor, moduleFromHash, type ModuleId} from './modules';
import {modelNotesSectionFromHash, type ModelNotesSection} from './modelNotesNavigation';

/** Current module from the URL hash, kept in sync with the browser's back and forward buttons. */
export function useHashModule(): [ModuleId, (id: ModuleId) => void, ModelNotesSection | null] {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((next: ModuleId) => {
    window.location.hash = hashFor(next);
    // Each module starts at its own question rather than at the scroll position of the previous one.
    window.scrollTo({top: 0});
  }, []);
  return [moduleFromHash(hash), navigate, modelNotesSectionFromHash(hash)];
}
