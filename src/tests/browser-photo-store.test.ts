import { afterEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { BrowserPhotoStore } from '../renderer/services/browser-photo-store';

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
