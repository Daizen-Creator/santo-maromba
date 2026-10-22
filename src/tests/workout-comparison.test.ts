import { describe, expect, it } from 'vitest';
import { compareWorkoutSetWithHistory } from '../domain/workout-comparison';
import { WorkoutSet } from '../shared/types';

const makeSet = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 'set-1', exerciseId: 'supino', exerciseName: 'Supino', setNumber: 1,
  weightKg: 50, reps: 8, completed: true, ...overrides
});

describe('Comparação com a execução anterior', () => {
  it('compara a série atual com a mais recente da mesma posição e calcula diferenças', () => {
    const previous = makeSet({ id: 'previous', weightKg: 50, reps: 8 });
    const current = { exerciseId: 'supino', setNumber: 1, weightKg: 55, reps: 9 };
    const result = compareWorkoutSetWithHistory(current, [
      previous,
      makeSet({ id: 'later-set', setNumber: 2, weightKg: 45, reps: 10 })
    ]);

    expect(result?.previous.id).toBe('previous');
    expect(result?.weightDeltaKg).toBe(5);
    expect(result?.repsDelta).toBe(1);
    expect(result?.volumeDelta).toBe(95);
  });

  it('ignora séries não concluídas e informa a anterior sem calcular com valores vazios', () => {
    const previous = makeSet({ weightKg: 40, reps: 10 });
    const result = compareWorkoutSetWithHistory(
      { exerciseId: 'supino', setNumber: 1, weightKg: 0, reps: 0 },
      [makeSet({ id: 'unfinished', completed: false }), previous]
    );
    expect(result?.previous.id).toBe('set-1');
    expect(result?.weightDeltaKg).toBeUndefined();
  });

  it('não compara exercícios sem histórico concluído', () => {
    expect(compareWorkoutSetWithHistory(
      { exerciseId: 'supino', setNumber: 1, weightKg: 60, reps: 5 },
      [makeSet({ exerciseId: 'remada' }), makeSet({ completed: false })]
    )).toBeNull();
  });
});
