import { describe, expect, it } from 'vitest';
import { reconcilePantryConsumption } from '../domain/pantry-consumption';
import { DailyMealEntryInput, PantryItem } from '../shared/types';

const meal = (status: DailyMealEntryInput['status'], consumedAmountG: number): DailyMealEntryInput => ({
  date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status,
  items: [{ itemId: 'rice-1', foodId: 'food-arroz', foodName: 'Arroz', plannedAmountG: 200,
    consumedAmountG, calories: 260, proteinG: 5, carbsG: 56, fatsG: 1 }]
});
const pantry: PantryItem[] = [{ id: 'stock-rice', foodId: 'food-arroz', foodName: 'Arroz', amountAvailableG: 500, updatedAt: '2026-10-22' }];

describe('baixa idempotente do estoque ao consumir refeições', () => {
  it('desconta o consumo confirmado uma vez e ajusta edições, exclusão e restauração', () => {
    let result = reconcilePantryConsumption(meal('consumed', 200), pantry, [], '2026-10-22T12:00:00.000Z');
    expect(result.pantry[0].amountAvailableG).toBe(300);
    expect(result.records).toMatchObject([{ consumedG: 200, deductedG: 200 }]);

    result = reconcilePantryConsumption(meal('consumed', 200), result.pantry, result.records);
    expect(result.pantry[0].amountAvailableG).toBe(300);

    result = reconcilePantryConsumption(meal('partial', 80), result.pantry, result.records);
    expect(result.pantry[0].amountAvailableG).toBe(420);
    expect(result.records).toMatchObject([{ consumedG: 80, deductedG: 80 }]);

    result = reconcilePantryConsumption(meal('pending', 0), result.pantry, result.records);
    expect(result.pantry[0].amountAvailableG).toBe(500);
    expect(result.records).toEqual([]);
  });

  it('não cria estoque negativo e não devolve mais do que foi descontado', () => {
    const limitedStock = [{ ...pantry[0], amountAvailableG: 35 }];
    let result = reconcilePantryConsumption(meal('consumed', 200), limitedStock, []);
    expect(result.pantry[0].amountAvailableG).toBe(0);
    expect(result.records).toMatchObject([{ consumedG: 200, deductedG: 35 }]);
    result = reconcilePantryConsumption(meal('pending', 0), result.pantry, result.records);
    expect(result.pantry[0].amountAvailableG).toBe(35);
  });
});
