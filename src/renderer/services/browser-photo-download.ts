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
  const objectUrl = environment.urlApi.createObjectURL(blob);
  const anchor = environment.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `santo-maromba-${date}.${extension}`;
  anchor.style.display = 'none';
  environment.document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    environment.schedule(() => environment.urlApi.revokeObjectURL(objectUrl), 1000);
  }
}
