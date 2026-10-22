import { downloadBrowserFile } from './browser-file-download';

interface PhotoDownloadEnvironment {
  document: Pick<Document, 'createElement' | 'body'>;
  urlApi: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  schedule: (callback: () => void, delayMs: number) => unknown;
}

export function downloadOriginalPhoto(
  blob: Blob,
  date: string,
  environment: PhotoDownloadEnvironment = {
    document,
    urlApi: URL,
    schedule: (callback, delayMs) => window.setTimeout(callback, delayMs)
  }
): void {
  const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/png' ? 'png' : 'webp';
  downloadBrowserFile(blob, `santo-maromba-${date}.${extension}`, environment);
}
