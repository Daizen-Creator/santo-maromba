import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { DEFAULT_VISUAL_CUSTOMIZATION } from '../domain/visual-customization';
import { CustomizationMediaInput } from '../shared/types';

const PNG_BYTES = Buffer.from('89504e470d0a1a0a', 'hex');
const MEDIA_INPUT: CustomizationMediaInput = {
  fileName: 'fundo.png',
  mimeType: 'image/png',
  kind: 'background',
  dataBase64: PNG_BYTES.toString('base64')
};

describe('Personalização visual offline-first', () => {
  let directory: string;
  let dbPath: string;
  let mediaDirectory: string;
  let db: IDatabase | null = null;
  let service: FitTrackService;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-customization-'));
    dbPath = path.join(directory, 'fittrack.db');
    mediaDirectory = path.join(directory, 'customization_media');
    db = await createDatabaseDriver(dbPath);
    await runMigrations(db);
    service = new FitTrackService(db, path.join(directory, 'photos'), path.join(directory, 'exercise_media'), mediaDirectory);
  });

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('persiste tema e arquivo local após fechar e reabrir o banco', async () => {
    const media = service.addCustomizationMedia(MEDIA_INPUT);
    const config = {
      ...DEFAULT_VISUAL_CUSTOMIZATION,
      theme: { ...DEFAULT_VISUAL_CUSTOMIZATION.theme, buttonColor: 'hsl(145 42% 52%)', gradientEnabled: true },
      background: { ...DEFAULT_VISUAL_CUSTOMIZATION.background, mediaId: media.id, fit: 'contain' as const }
    };
    service.saveVisualCustomization(config);
    expect(service.getCustomizationMediaImage(media.id).bytes).toEqual(PNG_BYTES);

    db!.close();
    db = await createDatabaseDriver(dbPath);
    await runMigrations(db);
    service = new FitTrackService(db, path.join(directory, 'photos'), path.join(directory, 'exercise_media'), mediaDirectory);

    expect(service.getVisualCustomization()).toEqual(config);
    expect(service.listCustomizationMedia()).toHaveLength(1);
    expect(service.getCustomizationMediaImage(media.id)).toEqual({ bytes: PNG_BYTES, mimeType: 'image/png' });

    service.saveVisualCustomization({ ...config, background: { ...config.background, mediaId: null } });
    service.deleteCustomizationMedia(media.id);
    expect(service.listCustomizationMedia()).toHaveLength(0);
    expect(() => service.getCustomizationMediaImage(media.id)).toThrow('não encontrada');
  });

  it('rejeita arquivo com assinatura incompatível e protege mídia que ainda está em uso', () => {
    expect(() => service.addCustomizationMedia({ ...MEDIA_INPUT, dataBase64: Buffer.from('not a png').toString('base64') }))
      .toThrow('não corresponde');

    const media = service.addCustomizationMedia(MEDIA_INPUT);
    service.saveVisualCustomization({
      ...DEFAULT_VISUAL_CUSTOMIZATION,
      background: { ...DEFAULT_VISUAL_CUSTOMIZATION.background, mediaId: media.id }
    });
    expect(() => service.deleteCustomizationMedia(media.id)).toThrow('Remova esta mídia');
    expect(service.getCustomizationMediaImage(media.id).bytes).toEqual(PNG_BYTES);
  });
});
