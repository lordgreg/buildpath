import { describe, expect, it } from 'vitest';
import {
  backupName,
  filterUpdateKind,
  isFilterFileName,
  listFilterFiles,
  parseFilterHeader,
  probeFilterDirectory,
  writeFilter,
} from './fileSystem.ts';

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
# FilterPath 0.10.2 - filter format 1
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
});

describe('filter files', () => {
  it('parses the FilterPath header', () => {
    expect(parseFilterHeader(HEADER)).toEqual({
      appVersion: '0.10.2',
      formatVersion: 1,
      presetVersion: 'abc123',
      build: 'Necromancer Summon Skeletons - Witch / Necromancer',
    });
    expect(parseFilterHeader('# something else')).toEqual({
      appVersion: null,
      formatVersion: null,
      presetVersion: null,
      build: null,
    });
  });

  it('recognises filter names and backups', () => {
    expect(isFilterFileName('FilterPath.filter')).toBe(true);
    expect(isFilterFileName('FilterPath.filter.bak')).toBe(false);
    expect(backupName('a.filter')).toBe('a.filter.bak');
  });

  it('lists only filter files with their versions', async () => {
    const files = new Map([
      ['FilterPath-old.filter', HEADER],
      ['notes.txt', 'ignore'],
    ]);
    const listed = await listFilterFiles(directory(files));
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: 'FilterPath-old.filter',
      appVersion: '0.10.2',
      formatVersion: 1,
    });
  });

  it('backs up the previous contents before overwriting', async () => {
    const files = new Map([['FilterPath.filter', 'old text']]);
    const result = await writeFilter(
      directory(files),
      'FilterPath.filter',
      'new text',
    );
    expect(result.backup).toBe('FilterPath.filter.bak');
    expect(files.get('FilterPath.filter.bak')).toBe('old text');
    expect(files.get('FilterPath.filter')).toBe('new text');
  });

  it('creates a new filter without a backup', async () => {
    const files = new Map([['other.filter', 'keep me']]);
    const result = await writeFilter(
      directory(files),
      'FilterPath.filter',
      'new text',
    );
    expect(result.backup).toBeNull();
    expect(files.get('FilterPath.filter')).toBe('new text');
    expect(files.get('other.filter')).toBe('keep me');
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
