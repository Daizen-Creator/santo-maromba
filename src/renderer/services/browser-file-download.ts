export interface BrowserFileDownloadEnvironment {
  document: Pick<Document, 'createElement' | 'body'>;
  urlApi: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  schedule: (callback: () => void, delayMs: number) => unknown;
}

export function downloadBrowserFile(
  blob: Blob,
  fileName: string,
  environment: BrowserFileDownloadEnvironment = {
    document,
    urlApi: URL,
    schedule: (callback, delayMs) => window.setTimeout(callback, delayMs)
  }
): void {
  const objectUrl = environment.urlApi.createObjectURL(blob);
  const anchor = environment.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  environment.document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    environment.schedule(() => environment.urlApi.revokeObjectURL(objectUrl), 1000);
  }
}
