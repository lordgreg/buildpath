import { useCallback, useEffect, useState } from 'react';
import { getArchetype } from '../core/archetypes/index.ts';
import {
  DEFAULT_STATE,
  parseWizardHash,
  wizardHash,
  type WizardState,
} from './wizardState.ts';

export function useWizardState(): [
  WizardState,
  (patch: Partial<WizardState>) => void,
] {
  const [state, setState] = useState<WizardState>(() =>
    parseWizardHash(window.location.hash),
  );

  useEffect(() => {
    const hash = wizardHash(state);
    if (window.location.hash.slice(1) !== hash) {
      window.history.replaceState(null, '', `#${hash}`);
    }
  }, [state]);

  useEffect(() => {
    const onHashChange = () => setState(parseWizardHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((previous) => {
      if (patch.archetypeId && !getArchetype(patch.archetypeId)) {
        return previous;
      }
      return { ...previous, ...patch };
    });
  }, []);

  return [state, update];
}

export { DEFAULT_STATE };