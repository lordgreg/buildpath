import { describe, expect, it } from 'vitest';
import type { Rule } from '../core/filter/types.ts';
import {
  autoWriteVerified,
  hashText,
  headerMatchesSnapshot,
  rulesKey,
  selectionKey,
  snapshotFor,
  type AutoWriteFiles,
  type AutoWriteRequest,
  type SnapshotStore,
  type WriteSnapshot,
} from './snapshot.ts';

const HEADER = (appVersion: string, presetVersion: string) => ({
  appVersion,
  presetVersion,
  formatVersion: 2,
  build: null,
  selection: null,
});

const RULES: Rule[] = [
  { action: 'Hide', section: 'custom', baseTypes: ['Leather Belt'] },
];

function request(overrides: Partial<AutoWriteRequest> = {}): AutoWriteRequest {
  return {
    fileName: 'buildpath-minion-leveling-soft.filter',
    text: 'new text',
    selection: { mode: 'family', familyId: 'minion' },
    rules: RULES,
    dirty: false,
    imported: false,
    appVersion: '0.34.0',
    presetVersion: 'new-preset',
    formatVersion: 2,
    ...overrides,
  };
}

function snapshot(overrides: Partial<WriteSnapshot> = {}): WriteSnapshot {
  return {
    ...snapshotFor({
      fileName: 'buildpath-minion-leveling-soft.filter',
      selection: { mode: 'family', familyId: 'minion' },
      rules: RULES,
      text: 'old text',
      appVersion: '0.33.2',
      presetVersion: 'old-preset',
      formatVersion: 2,
    }),
    ...overrides,
  };
}

function harness(options: {
  stored?: WriteSnapshot | null;
  file?: string | null;
  header?: ReturnType<typeof HEADER> | null;
  writtenHeader?: ReturnType<typeof HEADER> | null;
  failWrite?: boolean;
}) {
  const writes: { name: string; text: string }[] = [];
  const saved: WriteSnapshot[] = [];
  let headerRead = 0;

  const files: AutoWriteFiles = {
    async readText() {
      return options.file === undefined ? 'old text' : options.file;
    },
    async readHeader() {
      headerRead += 1;
      // The first read inspects the file on disk; the second the fresh write.
      if (headerRead === 1) {
        return options.header === undefined
          ? HEADER('0.33.2', 'old-preset')
          : options.header;
      }
      return options.writtenHeader === undefined
        ? HEADER('0.34.0', 'new-preset')
        : options.writtenHeader;
    },
    async write(name, text) {
      if (options.failWrite) throw new Error('disk full');
      writes.push({ name, text });
    },
  };

  const store: SnapshotStore = {
    async load() {
      return options.stored === undefined ? snapshot() : options.stored;
    },
    async save(next) {
      saved.push(next);
    },
  };

  return { files, store, writes, saved };
}

describe('hashText', () => {
  it('is stable and notices a change', () => {
    expect(hashText('Show\n')).toBe(hashText('Show\n'));
    expect(hashText('Show\n')).not.toBe(hashText('Show \n'));
  });
});

describe('stable keys', () => {
  it('ignores key order', () => {
    expect(selectionKey({ mode: 'meta', skillId: 'a', leagueId: 'b' })).toBe(
      selectionKey({ leagueId: 'b', skillId: 'a', mode: 'meta' }),
    );
  });

  it('ignores rule key order but not list order', () => {
    expect(
      rulesKey([{ action: 'Hide', rarity: 'Normal', comment: 'x' }]),
    ).toBe(rulesKey([{ comment: 'x', rarity: 'Normal', action: 'Hide' }]));
    expect(rulesKey([{ action: 'Hide', baseTypes: ['A', 'B'] }])).not.toBe(
      rulesKey([{ action: 'Hide', baseTypes: ['B', 'A'] }]),
    );
  });
});

describe('headerMatchesSnapshot', () => {
  it('requires every recorded header value', () => {
    const stored = snapshot();
    expect(headerMatchesSnapshot(stored, HEADER('0.33.2', 'old-preset'))).toBe(
      true,
    );
    expect(headerMatchesSnapshot(stored, HEADER('0.33.1', 'old-preset'))).toBe(
      false,
    );
    expect(headerMatchesSnapshot(stored, HEADER('0.33.2', 'other'))).toBe(false);
    expect(headerMatchesSnapshot(stored, null)).toBe(false);
  });
});

describe('autoWriteVerified', () => {
  it('rewrites the file and records the new snapshot', async () => {
    const harnessed = harness({});
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: true });
    expect(harnessed.writes).toEqual([
      { name: request().fileName, text: 'new text' },
    ]);
    expect(harnessed.saved).toHaveLength(1);
    expect(harnessed.saved[0]).toMatchObject({
      presetVersion: 'new-preset',
      appVersion: '0.34.0',
      textHash: hashText('new text'),
    });
  });

  it('skips an import session', async () => {
    const harnessed = harness({});
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request({ imported: true }),
    );

    expect(result).toEqual({ ok: false, reason: 'imported' });
    expect(harnessed.writes).toEqual([]);
  });

  it('skips when the builder has unsaved edits', async () => {
    const harnessed = harness({});
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request({ dirty: true }),
    );

    expect(result).toEqual({ ok: false, reason: 'dirty' });
    expect(harnessed.writes).toEqual([]);
  });

  it('skips without a snapshot', async () => {
    const harnessed = harness({ stored: null });
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: false, reason: 'no-snapshot' });
  });

  it('skips when the build state changed since the write', async () => {
    const harnessed = harness({});
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request({ rules: [{ action: 'Show', rarity: 'Rare' }] }),
    );

    expect(result).toEqual({ ok: false, reason: 'state-changed' });
    expect(harnessed.writes).toEqual([]);
  });

  it('skips when the file on disk was edited by hand', async () => {
    const harnessed = harness({ file: 'edited by hand' });
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: false, reason: 'file-changed' });
    expect(harnessed.writes).toEqual([]);
  });

  it('skips when the file is gone', async () => {
    const harnessed = harness({ file: null });
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: false, reason: 'missing-file' });
  });

  it('skips when the stored header no longer matches the file', async () => {
    const harnessed = harness({ header: HEADER('0.30.0', 'old-preset') });
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: false, reason: 'header-mismatch' });
    expect(harnessed.writes).toEqual([]);
  });

  it('reports a write the header does not confirm', async () => {
    const harnessed = harness({ writtenHeader: HEADER('0.34.0', 'other') });
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: false, reason: 'header-mismatch' });
    expect(harnessed.saved).toEqual([]);
  });

  it('reports a failed write and records nothing', async () => {
    const harnessed = harness({ failWrite: true });
    const result = await autoWriteVerified(
      harnessed.files,
      harnessed.store,
      request(),
    );

    expect(result).toEqual({ ok: false, reason: 'write-failed' });
    expect(harnessed.saved).toEqual([]);
  });
});
