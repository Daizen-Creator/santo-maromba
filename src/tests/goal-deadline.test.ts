import { describe, expect, it } from 'vitest';
import { getGoalDeadlineProgress } from '../domain/goal-deadline';

describe('Acompanhamento do prazo da meta de peso', () => {
  it('calcula dias restantes, diferença real de peso e ritmo aritmético', () => {
    expect(getGoalDeadlineProgress('2026-11-21', 90, 80, '2026-10-22')).toEqual({
      daysRemaining: 30,
      status: 'upcoming',
      remainingWeightKg: -10,
      weeklyChangeNeededKg: -2.33
    });
  });

  it('distingue o prazo de hoje do prazo vencido e não inventa peso ausente', () => {
    expect(getGoalDeadlineProgress('2026-10-22', null, 80, '2026-10-22')).toEqual({
      daysRemaining: 0, status: 'today', remainingWeightKg: null, weeklyChangeNeededKg: null
    });
    expect(getGoalDeadlineProgress('2026-10-20', 82, 80, '2026-10-22')).toMatchObject({
      daysRemaining: -2, status: 'overdue', remainingWeightKg: -2, weeklyChangeNeededKg: null
    });
  });

  it('rejeita datas de calendário impossíveis', () => {
    expect(getGoalDeadlineProgress('2026-02-30', 80, 75, '2026-02-01')).toBeNull();
  });
});
