import { useCallback, useState } from 'react';

const PREFIX = 'filterpath.ui.';

/** Reads a remembered collapse flag, falling back when nothing is stored. */
export function readOpenFlag(key: string, fallback = false): boolean {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

/** Remembers a collapse flag; storage failures are ignored. */
export function writeOpenFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(PREFIX + key, value ? '1' : '0');
  } catch {
    // Ignore storage failures; the in-memory state still works.
  }
}

/**
 * Collapse state for a `<details>` section, remembered per key so the user's
 * choice survives a reload.
 */
export function usePersistedOpen(
  key: string,
  defaultOpen = false,
): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(() => readOpenFlag(key, defaultOpen));
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      writeOpenFlag(key, next);
    },
    [key],
  );
  return [open, setOpen];
}
