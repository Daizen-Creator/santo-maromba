import { afterEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { BrowserMealPhotoStore } from '../renderer/services/browser-meal-photo-store';

const input = {
  mealEntryId: 'meal-a',
  date: '2026-10-22',
  slotId: 'dinner',
  imageBytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]),
  mimeType: 'image/png' as const
};

describe('BrowserMealPhotoStore — fotos offline da PWA', () => {
  const stores: BrowserMealPhotoStore[] = [];

  afterEach(() => stores.splice(0).forEach(store => store.close()));

  it('mantém a foto após fechar e reabrir o armazenamento IndexedDB', async () => {
    const indexedDb = new IDBFactory();
    const first = new BrowserMealPhotoStore('meal-photos-reopen-test', indexedDb);
    stores.push(first);
    const saved = await first.add(input);
    first.close();

    const reopened = new BrowserMealPhotoStore('meal-photos-reopen-test', indexedDb);
    stores.push(reopened);
    const photos = await reopened.list(input.date);
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ id: saved.id, date: input.date, slotId: input.slotId });
    const bytes = await fetch(photos[0].filePath).then(response => response.arrayBuffer());
    expect(Array.from(new Uint8Array(bytes as ArrayBuffer)))
      .toEqual(Array.from(input.imageBytes));
  });

  it('substitui uma foto do mesmo slot, separa datas e exclui o vínculo', async () => {
    const store = new BrowserMealPhotoStore('meal-photos-slots-test', new IDBFactory());
    stores.push(store);
    const first = await store.add(input);
    const second = await store.add(input);
    await store.add({ ...input, mealEntryId: 'meal-b', date: '2026-10-23' });
    expect(second.id).not.toBe(first.id);
    expect(await store.list(input.date)).toEqual([second]);

    await store.delete(input.mealEntryId);
    expect(await store.list(input.date)).toEqual([]);
    expect(await store.list('2026-10-23')).toHaveLength(1);
  });

  it('rejeita data e assinatura de imagem inválidas', async () => {
    const store = new BrowserMealPhotoStore('meal-photos-validation-test', new IDBFactory());
    stores.push(store);
    await expect(store.add({ ...input, date: '2026-02-30' })).rejects.toThrow();
    await expect(store.add({ ...input, imageBytes: new Uint8Array([1, 2, 3]) })).rejects.toThrow('O conteúdo do arquivo não corresponde ao formato da imagem.');
  });
});
