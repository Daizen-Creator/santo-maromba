import { afterEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { BrowserPhotoStore } from '../renderer/services/browser-photo-store';
import { downloadOriginalPhoto } from '../renderer/services/browser-photo-download';

const photoInput = {
  date: '2026-10-22',
  pose: 'front_relaxed' as const,
  imageBytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3]),
  mimeType: 'image/png' as const,
  notes: 'Luz natural'
};

describe('BrowserPhotoStore — persistência local do PWA', () => {
  const stores: BrowserPhotoStore[] = [];

  afterEach(() => {
    stores.splice(0).forEach(store => store.close());
  });

  it('salva a imagem e reabre seus metadados e bytes após recriar o store', async () => {
    const indexedDb = new IDBFactory();
    const databaseName = 'photos-reopen';
    const firstStore = new BrowserPhotoStore(databaseName, indexedDb);
    stores.push(firstStore);
    const saved = await firstStore.add(photoInput, 82.4);

    firstStore.close();
    const reopenedStore = new BrowserPhotoStore(databaseName, indexedDb);
    stores.push(reopenedStore);
    const reopened = await reopenedStore.list();

    expect(reopened).toHaveLength(1);
    expect(reopened[0]).toMatchObject({
      id: saved.id,
      date: photoInput.date,
      weightKgAtPhoto: 82.4,
      pose: photoInput.pose,
      notes: photoInput.notes
    });
    const image = await fetch(reopened[0].filePath).then(response => response.arrayBuffer());
    expect(Array.from(new Uint8Array(image))).toEqual(Array.from(photoInput.imageBytes));
    const original = await reopenedStore.getOriginalBlob(saved.id);
    expect(original.type).toBe(photoInput.mimeType);
    expect(Array.from(new Uint8Array(await original.arrayBuffer()))).toEqual(Array.from(photoInput.imageBytes));
  });

  it('edita notas e exclui a foto persistida', async () => {
    const store = new BrowserPhotoStore('photos-update-delete', new IDBFactory());
    stores.push(store);
    const photo = await store.add(photoInput);

    await store.updateNotes(photo.id, 'Comparação mensal');
    expect((await store.list())[0].notes).toBe('Comparação mensal');

    await store.delete(photo.id);
    expect(await store.list()).toEqual([]);
  });

  it('rejeita datas inválidas e arquivos acima do limite', async () => {
    const store = new BrowserPhotoStore('photos-validation', new IDBFactory());
    stores.push(store);

    await expect(store.add({ ...photoInput, date: '2026-02-30' })).rejects.toThrow();
    await expect(store.add({ ...photoInput, imageBytes: new Uint8Array(15 * 1024 * 1024 + 1) })).rejects.toThrow();
  });
});

describe('exportação da foto original no PWA', () => {
  it('baixa o blob original com nome por data e revoga o URL temporário', () => {
    const anchor = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn(),
      remove: vi.fn()
    } as unknown as HTMLAnchorElement;
    const document = {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn() }
    } as unknown as Document;
    const urlApi = {
      createObjectURL: vi.fn(() => 'blob:original-photo'),
      revokeObjectURL: vi.fn()
    };
    const schedule = vi.fn((callback: () => void) => callback());
    const blob = new Blob([photoInput.imageBytes], { type: photoInput.mimeType });

    downloadOriginalPhoto(blob, photoInput.date, { document, urlApi, schedule });

    expect(urlApi.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor.href).toBe('blob:original-photo');
    expect(anchor.download).toBe('santo-maromba-2026-10-22.png');
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:original-photo');
  });
});
