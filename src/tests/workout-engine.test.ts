import { describe, it, expect } from 'vitest';
import { WorkoutEngine } from '../domain/workout-engine';
import { INITIAL_EXERCISES } from '../database/seeds/exercise-seeds';

describe('Motor de Treino e Divisões Semanais', () => {
  const engine = new WorkoutEngine(INITIAL_EXERCISES);

  it('deve gerar divisão de 3 dias baseada em Full Body com descanso', () => {
    const split = engine.generateSplit(3, false);
    expect(split).toHaveLength(3);
    expect(split[0].splitTitle).toContain('Full Body');
    expect(split[0].exercises.length).toBeGreaterThan(0);
  });

  it('deve gerar divisão de 5 dias baseada em Push / Pull / Legs e Upper / Lower', () => {
    const split = engine.generateSplit(5, false);
    expect(split).toHaveLength(5);
    expect(split[0].splitTitle).toContain('Push');
    expect(split[1].splitTitle).toContain('Pull');
    expect(split[2].splitTitle).toContain('Legs');
  });

  it('deve incluir recuperação ativa e não sobrecarregar em 7 dias disponíveis', () => {
    const split = engine.generateSplit(7, false);
    expect(split.some(p => p.splitTitle.includes('Recuperação Ativa'))).toBe(true);
  });

  it('deve reduzir o volume inicial em retornos após interrupção longa (1 a 2 meses)', () => {
    const normalSplit = engine.generateSplit(5, false);
    const returningSplit = engine.generateSplit(5, true);

    const normalSets = normalSplit[0].exercises[0].sets;
    const returningSets = returningSplit[0].exercises[0].sets;

    expect(returningSets).toBeLessThanOrEqual(normalSets);
  });

  it('deve sugerir progressão de carga quando a meta de repetições for superada com folga', () => {
    const sets = [
      { id: '1', exerciseId: 'ex-supino-reto', exerciseName: 'Supino', setNumber: 1, weightKg: 60, reps: 10, completed: true, rpe: 7 }
    ];

    const suggestion = engine.suggestProgression('ex-supino-reto', sets, 10);
    expect(suggestion.suggestedWeightKg).toBe(62); // +2kg
    expect(suggestion.rationale).toContain('Aumente');
  });
});
