const DB_NAME = 'filterpath';
const STORE = 'handles';
const DIRECTORY_KEY = 'filters-directory';

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
}