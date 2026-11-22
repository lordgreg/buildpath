import {
  loadSoundsHandle,
  saveSoundsHandle,
} from '../../sync/handles.ts';

/**
 * Read-only folder the demo plays custom alert sounds from. The files are the
 * same ones the game reads next to a filter, so playback matches 1:1 without
 * FilterPath shipping any audio.
 */
export function supportsSoundsFolder(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickSoundsFolder(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ mode: 'read', startIn: 'documents' });
}

export async function ensureReadPermission(
  handle: FileSystemDirectoryHandle,
  request = true,
): Promise<PermissionState> {
  const descriptor = { mode: 'read' as const };
  const current = (await handle.queryPermission?.(descriptor)) ?? 'granted';
  if (current === 'granted') return current;
  if (!request) return current;
  return (await handle.requestPermission?.(descriptor)) ?? 'denied';
}

export { loadSoundsHandle, saveSoundsHandle };

/** Reads one sound file, or null when the folder does not contain it. */
export async function loadSoundBlob(
  handle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<Blob | null> {
  try {
    const fileHandle = await handle.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}
