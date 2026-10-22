import { MealPhotoInputSchema } from '../../shared/schema';
import { MealPhotoInput, MealPhotoRecord } from '../../shared/types';

interface StoredMealPhoto {
  key: string;
  record: Omit<MealPhotoRecord, 'filePath'>;
  mimeType: MealPhotoInput['mimeType'];
  blob: Blob;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao acessar o armazenamento local de fotos.'));
  });
}

export class BrowserMealPhotoStore {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private readonly objectUrls = new Map<string, string>();

  constructor(
    private readonly databaseName = 'santo-maromba-meal-photos',
    private readonly indexedDb: IDBFactory | undefined = globalThis.indexedDB
  ) {}

  private open(): Promise<IDBDatabase> {
    if (!this.indexedDb) return Promise.reject(new Error('Este navegador não oferece armazenamento local para fotos.'));
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = this.indexedDb!.open(this.databaseName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('meal-photos')) {
            request.result.createObjectStore('meal-photos', { keyPath: 'key' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento de fotos.'));
        request.onblocked = () => reject(new Error('Feche outras abas do Santo Maromba para atualizar o armazenamento de fotos.'));
      });
    }
    return this.databasePromise;
  }

  private mealKey(mealEntryId: string): string {
    return mealEntryId;
  }

  private imageUrl(key: string, blob: Blob): string {
    const existing = this.objectUrls.get(key);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(key, url);
    return url;
  }

  private toRecord(photo: StoredMealPhoto): MealPhotoRecord {
    return { ...photo.record, filePath: this.imageUrl(photo.key, photo.blob) };
  }

  async list(date: string): Promise<MealPhotoRecord[]> {
    const db = await this.open();
    const tx = db.transaction('meal-photos', 'readonly');
    const rows = await requestResult(tx.objectStore('meal-photos').getAll()) as StoredMealPhoto[];
    return rows.filter(photo => photo.record.date === date)
      .sort((a, b) => a.record.slotId.localeCompare(b.record.slotId))
      .map(photo => this.toRecord(photo));
  }

  async add(input: MealPhotoInput): Promise<MealPhotoRecord> {
    MealPhotoInputSchema.parse(input);
    const bytes = input.imageBytes;
    const validSignature = input.mimeType === 'image/jpeg'
      ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : input.mimeType === 'image/png'
        ? bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
        : bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
    if (!validSignature) throw new Error('O conteúdo do arquivo não corresponde ao formato da imagem.');

    const now = new Date().toISOString();
    const key = this.mealKey(input.mealEntryId);
    const record = { id: `meal-photo-${crypto.randomUUID()}`, mealEntryId: input.mealEntryId, date: input.date, slotId: input.slotId, createdAt: now };
    const safeBytes = new Uint8Array(bytes.byteLength);
    safeBytes.set(bytes);
    const blob = new Blob([safeBytes.buffer], { type: input.mimeType });
    const db = await this.open();
    const tx = db.transaction('meal-photos', 'readwrite');
    const store = tx.objectStore('meal-photos');
    const previous = await requestResult(store.get(key)) as StoredMealPhoto | undefined;
    await requestResult(store.put({ key, record, mimeType: input.mimeType, blob } satisfies StoredMealPhoto));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Não foi possível salvar a foto neste aparelho.'));
      tx.onabort = () => reject(tx.error || new Error('O salvamento da foto foi cancelado.'));
    });
    if (previous) {
      const oldUrl = this.objectUrls.get(key);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      this.objectUrls.delete(key);
    }
    return this.toRecord({ key, record, mimeType: input.mimeType, blob });
  }

  async delete(mealEntryId: string): Promise<void> {
    const key = this.mealKey(mealEntryId);
    const db = await this.open();
    const tx = db.transaction('meal-photos', 'readwrite');
    await requestResult(tx.objectStore('meal-photos').delete(key));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Não foi possível excluir a foto.'));
      tx.onabort = () => reject(tx.error || new Error('A exclusão da foto foi cancelada.'));
    });
    const url = this.objectUrls.get(key);
    if (url) URL.revokeObjectURL(url);
    this.objectUrls.delete(key);
  }

  close(): void {
    void this.databasePromise?.then(db => db.close());
    this.databasePromise = null;
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
  }
}

export const browserMealPhotoStore = new BrowserMealPhotoStore();
