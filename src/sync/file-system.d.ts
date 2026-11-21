interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  queryPermission?(descriptor?: {
    mode?: 'read' | 'readwrite';
  }): Promise<PermissionState>;
  requestPermission?(descriptor?: {
    mode?: 'read' | 'readwrite';
  }): Promise<PermissionState>;
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite';
    startIn?: 'documents' | 'desktop' | 'downloads';
  }): Promise<FileSystemDirectoryHandle>;
}