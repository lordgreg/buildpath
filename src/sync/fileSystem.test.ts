import { describe, expect, it } from 'vitest';
import {
  backupName,
  ensurePermission,
  filterUpdateKind,
  ForeignBackupError,
  isFilterFileName,
  isOwnedFilterFile,
  isOwnedFilterName,
  listFilterFiles,
  parseFilterHeader,
  probeFilterDirectory,
  readFilterHeader,
  readFilterText,
  removeFilterFile,
  staleFilterFiles,
  writeFilter,
} from './fileSystem.ts';
import { generateFilter } from '../core/filter/generate.ts';
import { PRESET_VERSION } from '../meta/index.ts';

describe('isOwnedFilterName', () => {
  it('recognises the files BuildPath writes, and only those', () => {
    expect(isOwnedFilterName('buildpath-minion-leveling-soft.filter')).toBe(
      true,
    );
    expect(isOwnedFilterName('BuildPath-custom.filter')).toBe(true);
    expect(isOwnedFilterName('neversink.filter')).toBe(false);
  });

  it('still recognises files written before the rename', () => {
    // Filters named filterpath-* may already be in a player's folder.
    expect(isOwnedFilterName('filterpath-minion-leveling-soft.filter')).toBe(
      true,
    );
    expect(isOwnedFilterName('FilterPath-custom.filter')).toBe(true);
  });
});

function fileHandle(name: string, files: Map<string, string>) {
  return {
    kind: 'file',
    name,
    async getFile() {
      const text = files.get(name) ?? '';
      return {
        text: async () => text,
        size: text.length,
        lastModified: 0,
      } as File;
    },
    async createWritable() {
      return {
        write: async (data: unknown) => {
          files.set(name, String(data));
        },
        close: async () => {},
      } as unknown as FileSystemWritableFileStream;
    },
  } as unknown as FileSystemFileHandle;
}

function directory(files: Map<string, string>) {
  return {
    kind: 'directory',
    name: 'Path of Exile',
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name) && !options?.create) {
        throw new DOMException('missing', 'NotFoundError');
      }
      return fileHandle(name, files);
    },
    async *values() {
      for (const name of files.keys()) yield fileHandle(name, files);
    },
    async removeEntry(name: string) {
      files.delete(name);
    },
  } as unknown as FileSystemDirectoryHandle;
}

const HEADER = `# ========================================================================
# BuildPath 0.10.2 - filter format 1
# Build: Necromancer Summon Skeletons - Witch / Necromancer
# League: Covens
# Presets: abc123
`;

describe('filter updates', () => {
  it('classifies a file as current, version-stale or preset-stale', () => {
    expect(
      filterUpdateKind(
        { appVersion: '1.0.0', presetVersion: 'abc' },
        '1.0.0',
        'abc',
      ),
    ).toBeNull();
    expect(
      filterUpdateKind(
        { appVersion: '0.9.0', presetVersion: 'abc' },
        '1.0.0',
        'abc',
      ),
    ).toBe('version');
    expect(
      filterUpdateKind(
        { appVersion: '1.0.0', presetVersion: 'old' },
        '1.0.0',
        'abc',
      ),
    ).toBe('presets');
    expect(
      filterUpdateKind(
        { appVersion: '0.9.0', presetVersion: null },
        '1.0.0',
        'abc',
      ),
    ).toBe('presets');
  });

  it('never marks a file BuildPath did not write as outdated', () => {
    expect(
      filterUpdateKind(
        { appVersion: null, presetVersion: null },
        '1.0.0',
        'abc',
      ),
    ).toBeNull();
  });

  it('never marks a newer or unrecognised file as outdated', () => {
    expect(
      filterUpdateKind(
        { appVersion: '1.2.0', presetVersion: 'other' },
        '1.0.0',
        'abc',
      ),
    ).toBeNull();
    expect(
      filterUpdateKind(
        { appVersion: 'dev', presetVersion: 'other' },
        '1.0.0',
        'abc',
      ),
    ).toBeNull();
    expect(
      filterUpdateKind(
        { appVersion: '1.0.0', presetVersion: 'abc', formatVersion: 99 },
        '1.0.0',
        'other',
      ),
    ).toBeNull();
  });
});

describe('isOwnedFilterFile', () => {
  it('needs both the BuildPath name and a BuildPath header', () => {
    expect(
      isOwnedFilterFile({ name: 'buildpath-x.filter', appVersion: '1.0.0' }),
    ).toBe(true);
    expect(
      isOwnedFilterFile({ name: 'buildpath-x.filter', appVersion: null }),
    ).toBe(false);
    expect(
      isOwnedFilterFile({ name: 'neversink.filter', appVersion: '1.0.0' }),
    ).toBe(false);
  });
});

describe('generated filters', () => {
  it('are recognised as BuildPath files by their own header', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'soft',
      version: '9.9.9',
    });
    const header = parseFilterHeader(filter.text);
    expect(header).toMatchObject({
      appVersion: '9.9.9',
      presetVersion: PRESET_VERSION,
      selection: expect.stringContaining('mode=family'),
    });
    expect(
      isOwnedFilterFile({ name: filter.fileName, appVersion: header.appVersion }),
    ).toBe(true);
  });
});

describe('staleFilterFiles', () => {
  const file = (
    name: string,
    appVersion: string | null,
    presetVersion: string | null,
  ) => ({ name, appVersion, presetVersion, formatVersion: appVersion ? 1 : null });

  it('lists only outdated BuildPath files other than the current one', () => {
    const files = [
      file('buildpath-old.filter', '0.9.0', 'abc'),
      file('buildpath-current.filter', '0.9.0', 'abc'),
      file('buildpath-fresh.filter', '1.0.0', 'abc'),
      file('buildpath-newer.filter', '2.0.0', 'zzz'),
      file('buildpath-foreign.filter', null, null),
      file('neversink.filter', null, null),
    ];
    expect(
      staleFilterFiles(files, 'buildpath-current.filter', '1.0.0', 'abc').map(
        (entry) => entry.name,
      ),
    ).toEqual(['buildpath-old.filter']);
  });

  it('matches the current file whatever its letter case', () => {
    const files = [file('BuildPath-Current.filter', '0.9.0', 'abc')];
    expect(
      staleFilterFiles(files, 'buildpath-current.filter', '1.0.0', 'abc'),
    ).toEqual([]);
  });

  it('keeps a file from the same release whose preset hash differs', () => {
    // Which of the two is newer cannot be told from the hash alone.
    const files = [file('buildpath-x.filter', '1.0.0', 'other')];
    expect(staleFilterFiles(files, 'buildpath-y.filter', '1.0.0', 'abc')).toEqual(
      [],
    );
  });
});

describe('filter files', () => {
  it('reads a file header and text, and reports a missing file', async () => {
    const files = new Map([['BuildPath.filter', HEADER]]);
    const handle = directory(files);

    expect(await readFilterHeader(handle, 'BuildPath.filter')).toEqual({
      appVersion: '0.10.2',
      formatVersion: 1,
      presetVersion: 'abc123',
      build: 'Necromancer Summon Skeletons - Witch / Necromancer',
      selection: null,
    });
    expect(await readFilterText(handle, 'BuildPath.filter')).toBe(HEADER);
    expect(await readFilterHeader(handle, 'missing.filter')).toBeNull();
    expect(await readFilterText(handle, 'missing.filter')).toBeNull();
  });

  it('reads only the start of a file to find its header', async () => {
    // A full read of every filter in the folder is wasteful; the listing must
    // slice the file instead.
    const handle = {
      kind: 'directory',
      name: 'Path of Exile',
      async *values() {
        yield {
          kind: 'file',
          name: 'BuildPath.filter',
          async getFile() {
            return {
              size: 100_000,
              lastModified: 0,
              async text() {
                throw new Error('read the whole file');
              },
              slice(start: number, end?: number) {
                return {
                  async text() {
                    return HEADER.slice(start, end);
                  },
                };
              },
            } as unknown as File;
          },
        };
      },
    } as unknown as FileSystemDirectoryHandle;

    const listed = await listFilterFiles(handle);
    expect(listed[0]).toMatchObject({
      name: 'BuildPath.filter',
      appVersion: '0.10.2',
      presetVersion: 'abc123',
    });
  });

  it('parses the BuildPath header', () => {
    expect(parseFilterHeader(HEADER)).toEqual({
      appVersion: '0.10.2',
      formatVersion: 1,
      presetVersion: 'abc123',
      build: 'Necromancer Summon Skeletons - Witch / Necromancer',
      selection: null,
    });
    expect(parseFilterHeader('# something else')).toEqual({
      appVersion: null,
      formatVersion: null,
      presetVersion: null,
      build: null,
      selection: null,
    });
  });

  it('parses a header written before the rename', () => {
    expect(
      parseFilterHeader('# FilterPath 0.40.0 - filter format 2').appVersion,
    ).toBe('0.40.0');
  });

  it('reads the header only from the leading comment block', () => {
    const foreign = `# NeverSink's filter\n\nShow\n# BuildPath 1.0.0 - filter format 1\n# Presets: abc\n`;
    expect(parseFilterHeader(foreign)).toMatchObject({
      appVersion: null,
      presetVersion: null,
    });
    expect(parseFilterHeader(HEADER.replace(/\n/g, '\r\n'))).toMatchObject({
      appVersion: '0.10.2',
      presetVersion: 'abc123',
    });
  });

  it('reads the Selection line a generated filter carries', () => {
    const text = `${HEADER}# Selection: mode=family&family=minion&phase=leveling&strictness=soft\n`;
    expect(parseFilterHeader(text).selection).toBe(
      'mode=family&family=minion&phase=leveling&strictness=soft',
    );
  });

  it('recognises filter names and backups', () => {
    expect(isFilterFileName('BuildPath.filter')).toBe(true);
    expect(isFilterFileName('BuildPath.filter.bak')).toBe(false);
    expect(backupName('a.filter')).toBe('a.filter.bak');
  });

  it('lists only filter files with their versions', async () => {
    const files = new Map([
      ['BuildPath-old.filter', HEADER],
      ['notes.txt', 'ignore'],
    ]);
    const listed = await listFilterFiles(directory(files));
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: 'BuildPath-old.filter',
      appVersion: '0.10.2',
      formatVersion: 1,
    });
  });

  it('backs up the previous contents before overwriting', async () => {
    const files = new Map([['BuildPath.filter', 'old text']]);
    const result = await writeFilter(
      directory(files),
      'BuildPath.filter',
      'new text',
    );
    expect(result.backup).toBe('BuildPath.filter.bak');
    expect(files.get('BuildPath.filter.bak')).toBe('old text');
    expect(files.get('BuildPath.filter')).toBe('new text');
  });

  it('creates a new filter without a backup', async () => {
    const files = new Map([['other.filter', 'keep me']]);
    const result = await writeFilter(
      directory(files),
      'BuildPath.filter',
      'new text',
    );
    expect(result.backup).toBeNull();
    expect(files.get('BuildPath.filter')).toBe('new text');
    expect(files.get('other.filter')).toBe('keep me');
  });

  it('backs up over an earlier BuildPath backup', async () => {
    const files = new Map([
      ['buildpath-a.filter', `${HEADER}new`],
      ['buildpath-a.filter.bak', `${HEADER}old`],
    ]);
    await writeFilter(directory(files), 'buildpath-a.filter', 'newest');
    expect(files.get('buildpath-a.filter.bak')).toBe(`${HEADER}new`);
    expect(files.get('buildpath-a.filter')).toBe('newest');
  });

  it('refuses to overwrite a backup BuildPath did not write', async () => {
    const files = new Map([
      ['buildpath-a.filter', `${HEADER}mine`],
      ['buildpath-a.filter.bak', 'my original hand-made filter'],
    ]);
    await expect(
      writeFilter(directory(files), 'buildpath-a.filter', 'new'),
    ).rejects.toBeInstanceOf(ForeignBackupError);
    expect(files.get('buildpath-a.filter.bak')).toBe(
      'my original hand-made filter',
    );
    expect(files.get('buildpath-a.filter')).toBe(`${HEADER}mine`);
  });

  it('overwrites an empty backup', async () => {
    const files = new Map([
      ['buildpath-a.filter', `${HEADER}mine`],
      ['buildpath-a.filter.bak', ''],
    ]);
    await writeFilter(directory(files), 'buildpath-a.filter', 'new');
    expect(files.get('buildpath-a.filter.bak')).toBe(`${HEADER}mine`);
  });

  it('removes a filter and its backup, leaving other files alone', async () => {
    const files = new Map([
      ['buildpath-a.filter', `${HEADER}current`],
      ['buildpath-a.filter.bak', `${HEADER}previous`],
      ['other.filter', 'keep me'],
    ]);
    await removeFilterFile(directory(files), 'buildpath-a.filter');
    expect(files.has('buildpath-a.filter')).toBe(false);
    expect(files.has('buildpath-a.filter.bak')).toBe(false);
    expect(files.get('other.filter')).toBe('keep me');
  });

  it('refuses to remove a file BuildPath did not write', async () => {
    const files = new Map([['buildpath-x.filter', 'a foreign filter']]);
    await expect(
      removeFilterFile(directory(files), 'buildpath-x.filter'),
    ).rejects.toThrow();
    expect(files.get('buildpath-x.filter')).toBe('a foreign filter');
  });

  it('keeps a backup BuildPath did not write when removing', async () => {
    const files = new Map([
      ['buildpath-a.filter', `${HEADER}current`],
      ['buildpath-a.filter.bak', 'my original hand-made filter'],
    ]);
    await removeFilterFile(directory(files), 'buildpath-a.filter');
    expect(files.has('buildpath-a.filter')).toBe(false);
    expect(files.get('buildpath-a.filter.bak')).toBe(
      'my original hand-made filter',
    );
  });
});

describe('ensurePermission', () => {
  function handle(state: PermissionState, request: PermissionState = 'granted') {
    let requested = false;
    const directory = {
      queryPermission: async () => state,
      requestPermission: async () => {
        requested = true;
        return request;
      },
    } as unknown as FileSystemDirectoryHandle;
    return { directory, requested: () => requested };
  }

  it('returns an existing grant without prompting', async () => {
    const { directory, requested } = handle('granted');
    expect(await ensurePermission(directory)).toBe('granted');
    expect(requested()).toBe(false);
  });

  it('queries without prompting when request is false', async () => {
    const { directory, requested } = handle('prompt');
    expect(await ensurePermission(directory, false)).toBe('prompt');
    expect(requested()).toBe(false);
  });

  it('requests permission when the user asks for it', async () => {
    const { directory, requested } = handle('prompt', 'granted');
    expect(await ensurePermission(directory)).toBe('granted');
    expect(requested()).toBe(true);
  });
});

describe('directory write probe', () => {
  it('writes and removes a temporary file', async () => {
    const files = new Map<string, string>();
    const result = await probeFilterDirectory(directory(files));
    expect(result).toEqual({ read: true, write: 'ok' });
    expect([...files.keys()]).toEqual([]);
  });

  it('reports a read-only folder', async () => {
    const handle = {
      async *values() {},
      async getFileHandle() {
        throw new DOMException('denied', 'NotAllowedError');
      },
    } as unknown as FileSystemDirectoryHandle;
    expect(await probeFilterDirectory(handle)).toEqual({
      read: true,
      write: 'read-only',
    });
  });

  it('reports an unreadable folder', async () => {
    const handle = {
      async *values() {
        throw new DOMException('denied', 'NotAllowedError');
      },
      async getFileHandle() {
        throw new DOMException('denied', 'NotAllowedError');
      },
    } as unknown as FileSystemDirectoryHandle;
    expect(await probeFilterDirectory(handle)).toEqual({
      read: false,
      write: 'error',
    });
  });
});
