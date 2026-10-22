import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../database/seeds/exercise-seeds';
import { WorkoutEngine } from '../domain/workout-engine';
import { serializeWorkoutPlans } from '../domain/workout-templates';
import { api } from '../renderer/services/api';

describe('Modelos de treino offline na PWA', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('salva no armazenamento local e reabre o modelo pela API offline', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    const plans = serializeWorkoutPlans(new WorkoutEngine(INITIAL_EXERCISES).generateSplit(3));

    const saved = await api.saveWorkoutTemplate({ name: 'PWA Full Body', plans });
    expect((await api.getWorkoutTemplates()).map(template => template.id)).toEqual([saved.id]);
    expect(values.size).toBe(1);
  });

  it('salva e reabre dias de treino e descanso no modo offline', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    await api.saveWorkoutScheduleEntry({ date: '2026-10-22', kind: 'training', title: 'Costas' });
    await api.saveWorkoutScheduleEntry({ date: '2026-10-23', kind: 'rest' });
    const entries = await api.getWorkoutSchedule();
    expect(entries.map(entry => entry.kind)).toEqual(['rest', 'training']);
    expect(values.size).toBe(1);
  });
});
