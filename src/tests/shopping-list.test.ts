import { describe, expect, it } from 'vitest';
import { buildShoppingList } from '../domain/shopping-list';
import { groupShoppingListItems } from '../domain/shopping-list-sections';
import { DailyMealEntry, FoodItem, ShoppingListItem } from '../shared/types';

const meal = (date: string, slotId: string, status: DailyMealEntry['status'], items: DailyMealEntry['items']): DailyMealEntry => ({
  id: `${date}-${slotId}`, date, slotId, mealName: slotId, scheduledTime: '12:00', status, items,
  calories: 0, proteinG: 0, carbsG: 0, fatsG: 0, updatedAt: `${date}T12:00:00.000Z`
});
const food = (foodId: string, plannedAmountG: number, consumedAmountG = 0) => ({
  itemId: `${foodId}-item`, foodId, foodName: foodId, plannedAmountG, consumedAmountG,
  calories: 100, proteinG: 10, carbsG: 10, fatsG: 2
});
const foods = [
  { id: 'rice', name: 'Arroz', category: 'carb', servingSizeG: 100, calories: 130, proteinG: 2, carbsG: 28, fatsG: 0, isCooked: true, source: 'local' },
  { id: 'egg', name: 'Ovo', category: 'protein', servingSizeG: 100, calories: 150, proteinG: 13, carbsG: 1, fatsG: 10, isCooked: true, source: 'local' }
] as FoodItem[];

describe('lista de compras gerada do plano alimentar', () => {
  it('soma itens repetidos e desconta consumo parcial, sem incluir refeições já consumidas ou ignoradas', () => {
    const entries = [
      meal('2026-10-19', 'breakfast', 'pending', [food('rice', 100)]),
      meal('2026-10-20', 'lunch', 'partial', [food('rice', 100, 40), food('egg', 50, 20)]),
      meal('2026-10-21', 'dinner', 'consumed', [food('rice', 200, 200)]),
      meal('2026-10-22', 'snack', 'skipped', [food('egg', 100)]),
      meal('2026-10-25', 'supper', 'deferred', [food('egg', 25)]),
      meal('2026-10-26', 'breakfast', 'pending', [food('rice', 500)])
    ];
    const result = buildShoppingList('2026-10-22', entries, foods, [], '2026-10-22T12:00:00.000Z');
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ weekStartDate: '2026-10-19', foodId: 'egg', foodName: 'Ovo', amountG: 55, category: 'protein', purchased: false }),
      expect.objectContaining({ weekStartDate: '2026-10-19', foodId: 'rice', foodName: 'Arroz', amountG: 160, category: 'carb', purchased: false })
    ]));
  });

  it('mantém marcação de comprado somente quando a quantidade não mudou', () => {
    const old: ShoppingListItem[] = [{
      id: 'shopping-2026-10-19-rice', weekStartDate: '2026-10-19', foodId: 'rice', foodName: 'Arroz',
      amountG: 100, category: 'carb', purchased: true, updatedAt: '2026-10-20T12:00:00.000Z'
    }];
    const entries = [meal('2026-10-19', 'lunch', 'pending', [food('rice', 100)])];
    expect(buildShoppingList('2026-10-19', entries, foods, old)[0].purchased).toBe(true);
    expect(buildShoppingList('2026-10-19', [meal('2026-10-19', 'lunch', 'pending', [food('rice', 110)])], foods, old)[0].purchased).toBe(false);
  });

  it('agrupa a lista por categoria do catálogo e mantém itens sem categoria em Outros', () => {
    const items: ShoppingListItem[] = [
      { id: '1', weekStartDate: '2026-10-19', foodId: 'egg', foodName: 'Ovo', amountG: 100, category: 'protein', purchased: false, updatedAt: 'now' },
      { id: '2', weekStartDate: '2026-10-19', foodId: 'rice', foodName: 'Arroz', amountG: 200, category: 'carb', purchased: true, updatedAt: 'now' },
      { id: '3', weekStartDate: '2026-10-19', foodId: 'other', foodName: 'Item avulso', amountG: 20, purchased: false, updatedAt: 'now' }
    ];
    expect(groupShoppingListItems(items)).toEqual([
      { category: 'protein', label: 'Proteínas', items: [items[0]] },
      { category: 'carb', label: 'Carboidratos', items: [items[1]] },
      { category: null, label: 'Outros', items: [items[2]] }
    ]);
  });
});
