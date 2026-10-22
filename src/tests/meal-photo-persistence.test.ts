import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';

const TEST_PNG = new Uint8Array(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ9sAAAAASUVORK5CYII=',
  'base64'
));

describe('Fotos de refeição — persistência local', () => {
  let directory = '';
  let databasePath = '';
  let db: IDatabase | null = null;
  let service: FitTrackService;
  const photoDirectory = () => path.join(directory, 'photos');
  const mealPhotoDirectory = () => path.join(directory, 'meal_photos');

  const openService = async () => {
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db, photoDirectory(), undefined, undefined, mealPhotoDirectory());
  };

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-meal-photo-'));
    databasePath = path.join(directory, 'fittrack.db');
    await openService();
  });

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('salva no armazenamento local e reabre metadados e imagem após reiniciar o serviço', async () => {
    const meal = service.saveDailyMeal({ date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '13:00', status: 'consumed', items: [] });
    const input = { mealEntryId: meal.id, date: meal.date, slotId: meal.slotId, imageBytes: TEST_PNG, mimeType: 'image/png' as const };
    const saved = service.addMealPhoto(input);
    expect(saved.filePath).toBe(`fittrack-meal-photo://${saved.id}`);
    expect(fs.readdirSync(mealPhotoDirectory())).toHaveLength(1);

    db!.close();
    await openService();
    expect(service.getMealPhotos(input.date)).toEqual([saved]);
    expect(Buffer.from(service.getMealPhotoImage(saved.id).bytes)).toEqual(Buffer.from(TEST_PNG));
  });

  it('troca a imagem do mesmo horário e exclui apenas esse anexo', () => {
    const meal = service.saveDailyMeal({ date: '2026-10-22', slotId: 'breakfast', mealName: 'Café', scheduledTime: '07:00', status: 'consumed', items: [] });
    const input = { mealEntryId: meal.id, date: meal.date, slotId: meal.slotId, imageBytes: TEST_PNG, mimeType: 'image/png' as const };
    const first = service.addMealPhoto(input);
    const replacement = service.addMealPhoto(input);
    expect(replacement.id).not.toBe(first.id);
    expect(service.getMealPhotos('2026-10-22')).toEqual([replacement]);
    expect(() => service.getMealPhotoImage(first.id)).toThrow('Foto da refeição não encontrada.');

    service.deleteMealPhoto(meal.id);
    expect(service.getMealPhotos('2026-10-22')).toEqual([]);
    expect(fs.readdirSync(mealPhotoDirectory())).toEqual([]);
  });

  it('rejeita formatos declarados incorretamente e entradas inválidas', () => {
    expect(() => service.addMealPhoto({
      mealEntryId: 'meal-not-saved', date: '2026-02-30', slotId: 'lunch', imageBytes: TEST_PNG, mimeType: 'image/png'
    })).toThrow();
    const meal = service.saveDailyMeal({ date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '13:00', status: 'consumed', items: [] });
    expect(() => service.addMealPhoto({
      mealEntryId: meal.id, date: meal.date, slotId: meal.slotId, imageBytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png'
    })).toThrow('O conteúdo do arquivo não corresponde ao formato da imagem.');
  });

  it('não permite anexar imagem a um registro de refeição que não exista', () => {
    expect(() => service.addMealPhoto({
      mealEntryId: 'meal-not-saved', date: '2026-10-22', slotId: 'lunch', imageBytes: TEST_PNG, mimeType: 'image/png'
    })).toThrow('Salve a refeição neste aparelho antes de anexar uma foto.');
  });
});
