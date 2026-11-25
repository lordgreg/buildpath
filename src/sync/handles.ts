import type { WriteSnapshot } from './snapshot.ts';

const DB_NAME = 'filterpath';
const STORE = 'handles';
const DIRECTORY_KEY = 'filters-directory';
const SNAPSHOTS_KEY = 'filters-writes';

type SnapshotMap = Record<string, WriteSnapshot>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const tx = database.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => database.close();
      }),
  );
}

export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await transaction('readwrite', (store) => store.put(handle, DIRECTORY_KEY));
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const value = await transaction<FileSystemDirectoryHandle | undefined>(
      'readonly',
      (store) => store.get(DIRECTORY_KEY),
    );
    return value ?? null;
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await transaction('readwrite', (store) => store.delete(DIRECTORY_KEY));
  await transaction('readwrite', (store) => store.delete(SNAPSHOTS_KEY));
}

async function readSnapshots(): Promise<SnapshotMap> {
  if (typeof indexedDB === 'undefined') return {};
  try {
    const value = await transaction<SnapshotMap | undefined>(
      'readonly',
      (store) => store.get(SNAPSHOTS_KEY),
    );
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

/** What BuildPath last wrote to this file, if it is still remembered. */
export async function loadWriteSnapshot(
  fileName: string,
): Promise<WriteSnapshot | null> {
  const snapshots = await readSnapshots();
  return snapshots[fileName.toLowerCase()] ?? null;
}

export async function saveWriteSnapshot(snapshot: WriteSnapshot): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const snapshots = await readSnapshots();
    snapshots[snapshot.fileName.toLowerCase()] = snapshot;
    await transaction('readwrite', (store) =>
      store.put(snapshots, SNAPSHOTS_KEY),
    );
  } catch {
    // Losing a snapshot only disables an automatic rewrite later.
  }
}

export async function clearWriteSnapshot(fileName: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const snapshots = await readSnapshots();
    if (!(fileName.toLowerCase() in snapshots)) return;
    delete snapshots[fileName.toLowerCase()];
    await transaction('readwrite', (store) =>
      store.put(snapshots, SNAPSHOTS_KEY),
    );
  } catch {
    // Nothing to clear.
  }
}