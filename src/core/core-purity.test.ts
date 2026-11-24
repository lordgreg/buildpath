import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CORE = fileURLToPath(new URL('.', import.meta.url));

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('core stays framework-free', () => {
  it('never imports React', () => {
    const offenders = files(CORE).filter((path) =>
      /from\s+['"]react(-dom)?['"]|require\(['"]react(-dom)?['"]\)/.test(
        readFileSync(path, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });
});