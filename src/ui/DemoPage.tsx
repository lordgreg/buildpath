import { useEffect, useMemo, useState } from 'react';
import { generateFilter } from '../core/filter/generate.ts';
import { configKey } from '../core/rules/key.ts';
import { APP_VERSION } from '../version.ts';
import { loadCustomRules } from './rules/storage.ts';
import { parseWizardHash, wizardHash, type WizardState } from './wizardState.ts';
import LootSimulator from './demo/LootSimulator.tsx';

function latestBuilderHash(): string | null {
  try {
    return sessionStorage.getItem('filterpath:hash');
  } catch {
    return null;
  }
}

export default function DemoPage() {
  const [state, setState] = useState<WizardState>(() => {
    if (!window.location.hash) {
      const latest = latestBuilderHash();
      if (latest) return parseWizardHash(`#${latest}`);
    }
    return parseWizardHash(window.location.hash);
  });

  useEffect(() => {
    const apply = (hash: string) => {
      if (!hash) return;
      setState(parseWizardHash(`#${hash}`));
      if (window.location.hash.slice(1) !== hash) {
        window.history.replaceState(null, '', `#${hash}`);
      }
    };

    const channel =
      'BroadcastChannel' in window
        ? new BroadcastChannel('filterpath')
        : null;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; hash?: string };
      if (data?.type === 'state' && typeof data.hash === 'string') {
        apply(data.hash);
      }
    };
    channel?.addEventListener('message', onMessage);

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const latest = latestBuilderHash();
      if (latest) apply(latest);
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const latest = latestBuilderHash();
      if (latest && window.location.hash.slice(1) !== latest) apply(latest);
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      channel?.removeEventListener('message', onMessage);
      channel?.close();
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const customRules = useMemo(() => {
    return loadCustomRules(configKey(state));
  }, [state]);

  const filter = useMemo(
    () =>
      generateFilter({
        selection: state,
        phase: state.phase,
        strictness: state.strictness,
        theme: state.theme,
        soundPack: state.soundPack,
        sections: state.sections,
        version: APP_VERSION,
        customRules,
        buildName: state.name,
      }),
    [state, customRules],
  );

  return (
    <LootSimulator
      rules={filter.rules}
      label={`${filter.archetype.name} - ${filter.archetype.verifiedFor}`}
      fileName={filter.fileName}
      builderHash={wizardHash(state)}
    />
  );
}