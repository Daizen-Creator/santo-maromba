import { describe, expect, it } from 'vitest';
import { moveDailyMealSlot, sortDailyMealEntries } from '../domain/daily-meal-order';
import { DailyMealEntry } from '../shared/types';

const meal = (slotId: string, scheduledTime: string, sortOrder?: number): DailyMealEntry => ({
  id: slotId, date: '2026-10-22', slotId, sortOrder, mealName: slotId, scheduledTime, status: 'pending',
  items: [], calories: 0, proteinG: 0, carbsG: 0, fatsG: 0, updatedAt: '2026-10-22T12:00:00.000Z'
});

describe('ordem do plano alimentar', () => {
  it('mantém horário por padrão e respeita ordem explícita após salvar', () => {
    const entries = [meal('dinner', '20:00'), meal('breakfast', '08:00'), meal('lunch', '12:00')];
    expect(sortDailyMealEntries(entries).map(entry => entry.slotId)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(sortDailyMealEntries(entries.map(entry => ({ ...entry, sortOrder: ({ dinner: 0, breakfast: 1, lunch: 2 } as Record<string, number>)[entry.slotId] })))
      .map(entry => entry.slotId)).toEqual(['dinner', 'breakfast', 'lunch']);
  });

  it('move acima/abaixo troca slots vizinhos e respeita os limites', () => {
    const entries = [meal('breakfast', '08:00'), meal('lunch', '12:00'), meal('dinner', '20:00')];
    expect(moveDailyMealSlot(entries, 'lunch', -1)).toEqual(['lunch', 'breakfast', 'dinner']);
    expect(moveDailyMealSlot(entries, 'lunch', 1)).toEqual(['breakfast', 'dinner', 'lunch']);
    expect(moveDailyMealSlot(entries, 'breakfast', -1)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(() => moveDailyMealSlot(entries, 'unknown', 1)).toThrow('A refeição não existe');
  });
});
