import { useCallback, useEffect, useState } from 'react';
import { coerceSelection } from '../meta/index.ts';
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
      const next = { ...previous, ...patch };
      return { ...next, ...coerceSelection(next) };
    });
  }, []);

  return [state, update];
}

export { DEFAULT_STATE };