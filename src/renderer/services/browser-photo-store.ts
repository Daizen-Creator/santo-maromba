import { PhotoInputSchema } from '../../shared/schema';
import { PhotoCreateInput, PhotoRecord } from '../../shared/types';

interface StoredPhoto {
  record: Omit<PhotoRecord, 'filePath'>;
  mimeType: PhotoCreateInput['mimeType'];
  blob: Blob;
}

const DATABASE_NAME = 'santo-maromba-mobile';
const STORE_NAME = 'shape-photos';
const DATABASE_VERSION = 1;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao acessar o armazenamento local.'));
  });
}

export class BrowserPhotoStore {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private readonly objectUrls = new Map<string, string>();

  constructor(
    private readonly databaseName = DATABASE_NAME,
    private readonly indexedDb: IDBFactory | undefined = globalThis.indexedDB
  ) {}

  private open(): Promise<IDBDatabase> {
    if (!this.indexedDb) return Promise.reject(new Error('Este navegador não oferece armazenamento local de fotos.'));
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = this.indexedDb!.open(this.databaseName, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'record.id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento local de fotos.'));
        request.onblocked = () => reject(new Error('Feche outras abas do Santo Maromba para atualizar o armazenamento de fotos.'));
      });
    }
    return this.databasePromise;
  }

  private async readAll(): Promise<StoredPhoto[]> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return requestResult(tx.objectStore(STORE_NAME).getAll());
  }

  private photoUrl(id: string, blob: Blob): string {
    const current = this.objectUrls.get(id);
    if (current) return current;
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(id, url);
    return url;
  }

  async list(): Promise<PhotoRecord[]> {
    const rows = await this.readAll();
    return rows
      .sort((a, b) => b.record.date.localeCompare(a.record.date) || b.record.createdAt.localeCompare(a.record.createdAt))
      .map(({ record, blob }) => ({ ...record, filePath: this.photoUrl(record.id, blob) }));
  }

  async add(input: PhotoCreateInput): Promise<PhotoRecord> {
    PhotoInputSchema.parse(input);
    const now = new Date().toISOString();
    const record: Omit<PhotoRecord, 'filePath'> = {
      id: crypto.randomUUID(),
      date: input.date,
      pose: input.pose,
      customPoseName: input.customPoseName?.trim() || undefined,
      lightingNotes: input.lightingNotes?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      isPrimary: input.isPrimary ?? false,
      createdAt: now
    };
    const photoBytes = new Uint8Array(input.imageBytes.byteLength);
    photoBytes.set(input.imageBytes);
    const blob = new Blob([photoBytes.buffer], { type: input.mimeType });
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).add({ record, mimeType: input.mimeType, blob } satisfies StoredPhoto);
    await requestResult(request);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Não foi possível salvar a foto neste aparelho.'));
      tx.onabort = () => reject(tx.error || new Error('O salvamento da foto foi cancelado.'));
    });
    return { ...record, filePath: this.photoUrl(record.id, blob) };
  }

  async updateNotes(id: string, notes: string): Promise<PhotoRecord> {
    const normalizedNotes = notes.trim();
    if (!id || normalizedNotes.length > 300) throw new Error('As observações devem ter até 300 caracteres.');
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const current = await requestResult(store.get(id)) as StoredPhoto | undefined;
    if (!current) throw new Error('Foto não encontrada neste aparelho.');
    const updated: StoredPhoto = { ...current, record: { ...current.record, notes: normalizedNotes || undefined } };
    await requestResult(store.put(updated));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Não foi possível atualizar as observações.'));
      tx.onabort = () => reject(tx.error || new Error('A atualização das observações foi cancelada.'));
    });
    return { ...updated.record, filePath: this.photoUrl(id, updated.blob) };
  }

  async delete(id: string): Promise<void> {
    if (!id) throw new Error('Identificador da foto inválido.');
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await requestResult(tx.objectStore(STORE_NAME).delete(id));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Não foi possível excluir a foto.'));
      tx.onabort = () => reject(tx.error || new Error('A exclusão da foto foi cancelada.'));
    });
    const url = this.objectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.objectUrls.delete(id);
  }

  close(): void {
    void this.databasePromise?.then(db => db.close());
    this.databasePromise = null;
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
  }
}

export const browserPhotoStore = new BrowserPhotoStore();
