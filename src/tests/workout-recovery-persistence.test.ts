import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../renderer/services/api';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
}

describe('Recuperação e desconforto no histórico de treino web', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });

  it('salva, relê e valida os campos estruturados de recuperação offline', async () => {
    const input = {
      date: '2026-10-22',
      splitName: 'Treino de teste',
      completed: true,
      discomfortLevel: 4,
      discomfortArea: 'Joelho direito',
      recoveryRating: 3,
      sets: [{ exerciseId: 'agachamento', setNumber: 1, weightKg: 40, reps: 8 }]
    };

    const saved = await api.logWorkoutSession(input);
    expect(saved).toMatchObject({
      discomfortLevel: 4,
      discomfortArea: 'Joelho direito',
      recoveryRating: 3
    });
    expect(await api.getWorkoutSessions()).toMatchObject([{
      id: saved.id,
      discomfortLevel: 4,
      discomfortArea: 'Joelho direito',
      recoveryRating: 3
    }]);
    await expect(api.logWorkoutSession({ ...input, recoveryRating: 6 })).rejects.toThrow();
    await expect(api.logWorkoutSession({ ...input, discomfortLevel: 0, discomfortArea: 'Joelho direito' })).rejects.toThrow();
    await expect(api.logWorkoutSession({ ...input, discomfortLevel: undefined })).rejects.toThrow();
  });
});
