import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { INITIAL_EXERCISES } from '../database/seeds/exercise-seeds';

const TEST_PNG = new Uint8Array(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ9sAAAAASUVORK5CYII=',
  'base64'
));

describe('Mídia local e progressão de cargas', () => {
  let tempDirectory: string;
  let databasePath: string;
  let mediaDirectory: string;
  let db: IDatabase | null = null;
  let service: FitTrackService;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-workout-'));
    databasePath = path.join(tempDirectory, 'fittrack.db');
    mediaDirectory = path.join(tempDirectory, 'exercise_media');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db, path.join(tempDirectory, 'photos'), mediaDirectory);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('persiste uma demonstração local, relê após reabrir o banco e remove arquivo e metadados', async () => {
    const exercise = INITIAL_EXERCISES[0];
    const media = service.addExerciseMedia({
      exerciseId: exercise.id,
      originalName: 'demonstracao.png',
      mimeType: 'image/png',
      imageBytes: TEST_PNG
    });
    expect(media.filePath).toBe('fittrack-exercise://' + media.id);
    expect(fs.readdirSync(mediaDirectory)).toHaveLength(1);

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db, path.join(tempDirectory, 'photos'), mediaDirectory);

    const reopenedExercise = service.getExercises().find(item => item.id === exercise.id)!;
    expect(reopenedExercise.media).toHaveLength(1);
    expect(Buffer.from(service.getExerciseMediaImage(media.id).bytes)).toEqual(Buffer.from(TEST_PNG));
    service.deleteExerciseMedia(media.id);
    expect(fs.readdirSync(mediaDirectory)).toHaveLength(0);
    expect(service.getExercises().find(item => item.id === exercise.id)?.media).toHaveLength(0);
  });

  it('rejeita arquivo com assinatura diferente do MIME declarado', () => {
    expect(() => service.addExerciseMedia({
      exerciseId: INITIAL_EXERCISES[0].id,
      originalName: 'falso.png',
      mimeType: 'image/png',
      imageBytes: new Uint8Array([1, 2, 3])
    })).toThrow('formato declarado');
  });

  it('persiste RPE e RIR por série e marca recorde de volume real por exercício', async () => {
    const exerciseId = INITIAL_EXERCISES[0].id;
    const first = service.logWorkoutSession({
      date: '2026-10-19', splitName: 'Teste A', completed: true,
      notes: 'Sessão sem desconforto.',
      sets: [{ exerciseId, setNumber: 1, weightKg: 20, reps: 5, rpe: 8, rir: 2.5, notes: 'Pegada confortável.' }]
    });
    expect(first.sets[0].isPr).toBe(true);
    expect(first.sets[0].rpe).toBe(8);
    expect(first.sets[0].rir).toBe(2.5);

    const volumePr = service.logWorkoutSession({
      date: '2026-10-20', splitName: 'Teste A', completed: true,
      notes: 'Dormiu bem antes do treino.',
      sets: [{ exerciseId, setNumber: 1, weightKg: 10, reps: 12, rpe: 9, rir: 0, notes: 'Última série até a falha.' }]
    });
    expect(volumePr.sets[0].weightKg).toBe(10);
    expect(volumePr.sets[0].isPr).toBe(true);
    expect(service.getWorkoutSessions()[0].sets[0].rpe).toBe(9);

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db, path.join(tempDirectory, 'photos'), mediaDirectory);
    const reopenedSets = service.getWorkoutSessions().flatMap(session => session.sets);
    expect(reopenedSets.find(set => set.rpe === 9)?.rir).toBe(0);
    expect(reopenedSets.find(set => set.rpe === 8)?.rir).toBe(2.5);
    const reopenedSessions = service.getWorkoutSessions();
    expect(reopenedSessions.find(session => session.date === '2026-10-19')?.notes).toBe('Sessão sem desconforto.');
    expect(reopenedSessions.flatMap(session => session.sets).find(set => set.rpe === 8)?.notes).toBe('Pegada confortável.');
    expect(reopenedSessions.find(session => session.date === '2026-10-20')?.sets[0].notes).toBe('Última série até a falha.');
  });

  it('persiste sessões parciais e conclusão de cada série sem contar uma sessão parcial como PR', async () => {
    const exerciseId = INITIAL_EXERCISES[0].id;
    const partial = service.logWorkoutSession({
      date: '2026-10-21', splitName: 'Teste parcial', completed: false,
      durationMinutes: 18, perceivedExertion: 7,
      sets: [
        { exerciseId, setNumber: 1, weightKg: 28, reps: 8, completed: true },
        { exerciseId, setNumber: 2, weightKg: 30, reps: 8, completed: false }
      ]
    });

    expect(partial.completed).toBe(false);
    expect(partial.sets.map(set => set.completed)).toEqual([true, false]);
    expect(partial.sets.map(set => Boolean(set.isPr))).toEqual([true, false]);

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db, path.join(tempDirectory, 'photos'), mediaDirectory);
    const reopened = service.getWorkoutSessions().find(session => session.id === partial.id)!;
    expect(reopened.completed).toBe(false);
    expect(reopened.sets.map(set => set.completed)).toEqual([true, false]);
    expect(reopened.sets.map(set => Boolean(set.isPr))).toEqual([true, false]);
  });
});
