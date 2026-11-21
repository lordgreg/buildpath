import { useMemo } from 'react';
import { generateFilter } from '../core/filter/generate.ts';
import { cloneKey } from '../core/rules/clone.ts';
import { APP_VERSION } from '../version.ts';
import { loadClone } from './rules/storage.ts';
import { parseWizardHash, wizardHash } from './wizardState.ts';
import LootSimulator from './demo/LootSimulator.tsx';

export default function DemoPage() {
  const state = useMemo(() => parseWizardHash(window.location.hash), []);
  const clone = useMemo(
    () =>
      loadClone(
        cloneKey(
          state,
          state.phase,
          state.strictness,
          state.sections,
          state.theme,
        ),
      ),
    [state],
  );

  const filter = useMemo(
    () =>
      generateFilter({
        selection: state,
        phase: state.phase,
        strictness: state.strictness,
        theme: state.theme,
        sections: state.sections,
        version: APP_VERSION,
        ...(clone ? { rulesOverride: clone.rules } : {}),
      }),
    [state, clone],
  );

  return (
    <LootSimulator
      rules={filter.rules}
      label={`${filter.archetype.name} - ${filter.archetype.verifiedFor}`}
      builderHash={wizardHash(state)}
    />
  );
}