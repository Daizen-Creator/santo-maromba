import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { FitTrackService } from '../services/fittrack-service';

const TEST_PNG = new Uint8Array(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ9sAAAAASUVORK5CYII=',
  'base64'
));

describe('Persistência local de fotos do shape', () => {
  let tempDirectory: string;
  let databasePath: string;
  let photoDirectory: string;
  let db: IDatabase | null = null;
  let service: FitTrackService;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-photo-'));
    databasePath = path.join(tempDirectory, 'fittrack.db');
    photoDirectory = path.join(tempDirectory, 'photos');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    new ProfileRepository(db).saveProfile({
      id: 'default-user',
      name: 'Pessoa Teste',
      birthDate: '1990-01-01',
      heightCm: 170
    });
    service = new FitTrackService(db, photoDirectory);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('mantém arquivo e metadados disponíveis após fechar e reabrir o SQLite', async () => {
    const added = service.addPhoto({
      date: '2026-10-19',
      pose: 'front_relaxed',
      imageBytes: TEST_PNG,
      mimeType: 'image/png',
      notes: 'Registro local de teste'
    });
    expect(added.filePath).toBe(`fittrack-photo://${added.id}`);

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db, photoDirectory);

    const saved = service.getPhotosByDate('2026-10-19');
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(added.id);
    expect(Buffer.from(service.getPhotoImage(added.id).bytes)).toEqual(Buffer.from(TEST_PNG));
  });

  it('consulta várias fotos na mesma data, edita observações e exclui somente a escolhida', () => {
    const first = service.addPhoto({
      date: '2026-10-19', pose: 'front_relaxed', imageBytes: TEST_PNG, mimeType: 'image/png'
    });
    const second = service.addPhoto({
      date: '2026-10-19', pose: 'side_left', imageBytes: TEST_PNG, mimeType: 'image/png'
    });

    expect(service.getPhotosByDate('2026-10-19')).toHaveLength(2);
    expect(service.updatePhotoNotes(second.id, 'Perfil esquerdo').notes).toBe('Perfil esquerdo');
    service.deletePhoto(first.id);

    expect(service.getPhotos().some(photo => photo.id === first.id)).toBe(false);
    expect(service.getPhotos().some(photo => photo.id === second.id)).toBe(true);
    expect(() => service.getPhotoImage(first.id)).toThrow('Foto não encontrada.');
    expect(Buffer.from(service.getPhotoImage(second.id).bytes)).toEqual(Buffer.from(TEST_PNG));
  });

  it('rejeita assinatura incompatível com o tipo declarado', () => {
    expect(() => service.addPhoto({
      date: '2026-10-19',
      pose: 'front_relaxed',
      imageBytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png'
    })).toThrow();
  });
});
