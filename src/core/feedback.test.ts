import { describe, expect, it } from 'vitest';
import {
  feedbackIssueBody,
  feedbackIssueMarker,
  feedbackIssueTitle,
  summariseReactions,
} from './feedback.ts';

describe('feedback reactions', () => {
  it('counts thumbs up and thumbs down and ignores every other reaction', () => {
    expect(
      summariseReactions(['+1', '+1', '-1', 'heart', 'rocket', '+1']),
    ).toEqual({ up: 3, down: 1 });
    expect(summariseReactions([])).toEqual({ up: 0, down: 0 });
    expect(summariseReactions(['laugh', 'hooray'])).toEqual({ up: 0, down: 0 });
  });
});

describe('feedback issue text', () => {
  it('carries a stable build marker and links the guide', () => {
    const body = feedbackIssueBody({ id: 'boneshatter-juggernaut', name: 'Boneshatter' });
    expect(body).toContain(feedbackIssueMarker('boneshatter-juggernaut'));
    expect(body).toContain('https://lordgreg.github.io/buildpath/build.html#build=boneshatter-juggernaut');
    expect(body).toContain('not a popularity ranking');
  });

  it('names the build in the title without coupling to the marker', () => {
    expect(feedbackIssueTitle('Boneshatter Juggernaut')).toBe(
      'Guide feedback: Boneshatter Juggernaut',
    );
    expect(feedbackIssueMarker('arc-elementalist')).toBe(
      '<!-- buildpath-feedback:arc-elementalist -->',
    );
  });
});
