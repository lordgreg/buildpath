import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Rule } from '../core/filter/types.ts';
import { coerceSelection } from '../meta/index.ts';
import { buildHash } from './buildSnapshot.ts';
import { loadGoodState, saveGoodState, type GoodState } from './goodState.ts';
import {
  loadCustomRulesWithNotices,
  saveCustomRules,
} from './rules/storage.ts';
import {
  asSelected,
  DEFAULT_STATE,
  parseWizardHash,
  ruleKey,
  wizardHash,
  type WizardState,
} from './wizardState.ts';

const LIVE_HASH_KEY = 'filterpath:hash';

export interface BuildSession {
  state: WizardState;
  customRules: Rule[];
  good: GoodState;
  dirty: boolean;
  /** Class-name migrations from the last load, ready to show once. */
  notices: string[];
  /** localStorage refused a write, so this session will not be remembered. */
  storageFailed: boolean;
  update: (patch: Partial<WizardState>) => void;
  setRules: (rules: Rule[]) => void;
  /** Adopt a build as both the live state and the new good state. */
  load: (state: WizardState, rules: Rule[], notices?: string[]) => void;
  /** Mark the current live build as the good state (e.g. after a download). */
  commit: (state: WizardState, rules: Rule[]) => void;
  /** Discard edits and go back to the good state. */
  reset: () => void;
  /** Start a brand-new, empty filter. */
  startNew: () => void;
  clearNotices: () => void;
}

interface Resolved {
  state: WizardState;
  customRules: Rule[];
  good: GoodState;
  notices: string[];
}

function readLiveHash(): string | null {
  try {
    return sessionStorage.getItem(LIVE_HASH_KEY);
  } catch {
    return null;
  }
}

/**
 * Decide what the builder opens with. A share code or an external link wins;
 * otherwise the persisted good state is restored, so a refresh or coming back
 * from another page discards the draft that was left in the URL.
 */
function resolveInitial(): Resolved {
  const hash = window.location.hash;
  const raw = hash.replace(/^#/, '');
  const params = new URLSearchParams(raw);

  if (params.get('code') !== null) {
    // The mount import effect replaces this from the captured payload.
    const parsed = parseWizardHash(hash);
    return {
      state: parsed,
      customRules: [],
      good: { state: parsed, customRules: [] },
      notices: [],
    };
  }

  // `raw` equals what this tab last wrote only for our own live draft.
  const external = raw !== '' && readLiveHash() !== raw;
  if (external) {
    const parsed = parseWizardHash(hash);
    const { rules, notices } = loadCustomRulesWithNotices(ruleKey(parsed));
    return {
      state: parsed,
      customRules: rules,
      good: { state: parsed, customRules: rules },
      notices,
    };
  }

  const stored = loadGoodState();
  if (stored) {
    return {
      state: stored.state,
      customRules: stored.customRules,
      good: stored,
      notices: stored.notices,
    };
  }

  return {
    state: DEFAULT_STATE,
    customRules: [],
    good: { state: DEFAULT_STATE, customRules: [] },
    notices: [],
  };
}

export function useBuildSession(): BuildSession {
  const [initial] = useState(resolveInitial);
  const [state, setState] = useState<WizardState>(initial.state);
  const [customRules, setCustomRules] = useState<Rule[]>(initial.customRules);
  const [good, setGood] = useState<GoodState>(initial.good);
  const [notices, setNotices] = useState<string[]>(initial.notices);
  const [storageFailed, setStorageFailed] = useState(false);
  const lastKey = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // The good state is the durable copy; drafts never overwrite it.
  useEffect(() => {
    if (!saveGoodState(good)) setStorageFailed(true);
  }, [good]);

  // Switching build loads that build's My rules. Loads and resets save their
  // rules under the key first, so reading them back here is a no-op.
  useEffect(() => {
    const key = state.mode === 'start' ? 'start' : ruleKey(state);
    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (state.mode === 'start') {
      setCustomRules([]);
      setNotices([]);
      return;
    }
    const { rules, notices: migrationNotices } = loadCustomRulesWithNotices(key);
    setCustomRules(rules);
    setNotices(migrationNotices);
  }, [state]);

  // Mirror the live state into the URL and session storage for the loot
  // simulator and shareable links.
  useEffect(() => {
    const hash = wizardHash(state);
    try {
      sessionStorage.setItem(LIVE_HASH_KEY, hash);
    } catch {
      // Session storage can be blocked; the URL still carries the state.
    }
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('filterpath');
      channel.postMessage({ type: 'state', hash });
      channel.close();
    }
    if (window.location.hash.slice(1) !== hash) {
      window.history.replaceState(null, '', `#${hash}`);
    }
  }, [state]);

  // A page restored from the bfcache keeps its DOM; discard the draft again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const stored = loadGoodState();
      if (!stored) return;
      setState(stored.state);
      setCustomRules(stored.customRules);
      setGood(stored);
      setNotices(stored.notices);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((previous) => {
      const next = { ...previous, ...patch };
      if (next.mode === 'start') return next;
      return { ...next, ...coerceSelection(asSelected(next)) };
    });
  }, []);

  const setRules = useCallback((rules: Rule[]) => {
    setCustomRules(rules);
    const current = stateRef.current;
    if (current.mode !== 'start') saveCustomRules(ruleKey(current), rules);
  }, []);

  const load = useCallback(
    (nextState: WizardState, rules: Rule[], nextNotices: string[] = []) => {
      setState(nextState);
      setCustomRules(rules);
      if (nextState.mode !== 'start') saveCustomRules(ruleKey(nextState), rules);
      setGood({ state: nextState, customRules: rules });
      setNotices(nextNotices);
    },
    [],
  );

  const commit = useCallback((nextState: WizardState, rules: Rule[]) => {
    setGood({ state: nextState, customRules: rules });
  }, []);

  const reset = useCallback(() => {
    setState(good.state);
    setCustomRules(good.customRules);
    if (good.state.mode !== 'start') {
      saveCustomRules(ruleKey(good.state), good.customRules);
    }
  }, [good]);

  const startNew = useCallback(() => {
    setState(DEFAULT_STATE);
    setCustomRules([]);
    setGood({ state: DEFAULT_STATE, customRules: [] });
    setNotices([]);
  }, []);

  const clearNotices = useCallback(() => setNotices([]), []);

  const dirty = useMemo(
    () => buildHash(state, customRules) !== buildHash(good.state, good.customRules),
    [state, customRules, good],
  );

  return {
    state,
    customRules,
    good,
    dirty,
    notices,
    storageFailed,
    update,
    setRules,
    load,
    commit,
    reset,
    startNew,
    clearNotices,
  };
}
