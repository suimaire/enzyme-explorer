import {createContext, useCallback, useContext, useState, useSyncExternalStore, type ReactNode, type SetStateAction} from 'react';
import {createLearningSession, type LearningModule, type LearningSession, type LearningSnapshots} from './learningSessionStore';

const SessionContext = createContext<LearningSession | null>(null);
const ModuleContext = createContext<LearningModule | null>(null);

export function LearningSessionProvider({children, session}: {children: ReactNode; session?: LearningSession}) {
  const [ownedSession] = useState(createLearningSession);
  return <SessionContext.Provider value={session ?? ownedSession}>{children}</SessionContext.Provider>;
}
export function LearningModuleScope({module, children}: {module: LearningModule; children: ReactNode}) {
  return <ModuleContext.Provider value={module}>{children}</ModuleContext.Provider>;
}

export function useLearningState<M extends LearningModule, K extends keyof LearningSnapshots[M]>(module: M, key: K) {
  const context = useContext(SessionContext);
  // Standalone module previews/tests also work, without a process-wide singleton.
  const [fallback] = useState(createLearningSession);
  const session = context ?? fallback;
  const get = useCallback(() => session.get(module, key), [session, module, key]);
  const value = useSyncExternalStore(session.subscribe, get, get);
  const set = useCallback((update: SetStateAction<LearningSnapshots[M][K]>) => session.set(module, key, update), [session, module, key]);
  return [value, set] as const;
}

/** Shared prediction/reveal components use the current module's progress bucket. */
export function useLearningProgress<K extends 'predictions' | 'reveals'>(key: K) {
  const module = useContext(ModuleContext);
  const [value, set] = useLearningState(module ?? 'kinetics', key);
  const [local, setLocal] = useState<LearningSnapshots['kinetics'][K]>({});
  return module ? [value, set] as const : [local, setLocal] as const;
}

export function useResetLearningModule(module: LearningModule) {
  const session = useContext(SessionContext);
  return useCallback(() => session?.reset(module), [session, module]);
}
