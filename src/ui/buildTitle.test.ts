import { describe, expect, it } from 'vitest';
import { buildGuideTitle } from './buildTitle.ts';

describe('build guide title', () => {
  it('names the build in the browser tab', () => {
    expect(buildGuideTitle('Boneshatter Juggernaut')).toBe(
      'Boneshatter Juggernaut · BuildPath build guide',
    );
  });

  it('falls back to the page title when no build is selected', () => {
    expect(buildGuideTitle()).toBe('BuildPath build guide');
    expect(buildGuideTitle(null)).toBe('BuildPath build guide');
  });
});
