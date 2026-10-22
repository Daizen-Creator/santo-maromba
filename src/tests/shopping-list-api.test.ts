import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../renderer/services/api';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
};

describe('lista de compras offline da PWA', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('gera a lista da semana, marca compras e persiste quantidades somadas após recarregar', async () => {
    const rice = { itemId: 'rice', foodId: 'food-arroz', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 0, calories: 130, proteinG: 2, carbsG: 28, fatsG: 0.3 };
    const egg = { itemId: 'egg', foodId: 'food-ovo', foodName: 'Ovo', plannedAmountG: 50, consumedAmountG: 20, calories: 75, proteinG: 6, carbsG: 0, fatsG: 5 };
    await api.saveDailyMeal({ date: '2026-10-19', slotId: 'breakfast', mealName: 'Café', scheduledTime: '08:00', status: 'pending', items: [rice] });
    await api.saveDailyMeal({ date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'partial', items: [{ ...rice, consumedAmountG: 40 }, egg] });
    await api.saveDailyMeal({ date: '2026-10-21', slotId: 'dinner', mealName: 'Jantar', scheduledTime: '19:00', status: 'consumed', items: [{ ...rice, consumedAmountG: 100 }] });

    let list = await api.generateShoppingList('2026-10-22');
    expect(list.find(item => item.foodId === 'food-arroz')).toMatchObject({ weekStartDate: '2026-10-19', amountG: 160, purchased: false });
    expect(list.find(item => item.foodId === 'food-ovo')).toMatchObject({ amountG: 30, purchased: false });
    await api.updatePantryPrice({ foodId: 'food-arroz', unitPrice: 5, priceSource: 'Mercado informado' });
    list = await api.setShoppingItemPurchased({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: true });
    expect(list.find(item => item.foodId === 'food-arroz')?.purchased).toBe(true);
    await api.setShoppingItemPurchased({ weekStartDate: '2026-10-19', foodId: 'food-ovo', purchased: true });
    const currentDate = new Date();
    const fromDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const toDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    expect(await api.getShoppingExpenses({ fromDate, toDate })).toMatchObject({
      totalCost: 0.8, pricedPurchaseCount: 1, unpricedPurchaseCount: 1
    });
    await api.setShoppingItemPurchased({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: false });
    expect(await api.getShoppingExpenses({ fromDate, toDate })).toMatchObject({
      totalCost: 0, pricedPurchaseCount: 0, unpricedPurchaseCount: 1
    });
    await api.setShoppingItemPurchased({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: true });
    await api.setShoppingItemPurchased({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: true });
    await api.updatePantryPrice({ foodId: 'food-arroz', unitPrice: 9, priceSource: 'Novo preço' });
    expect((await api.getShoppingExpenses({ fromDate, toDate })).expenses.find(item => item.foodId === 'food-arroz'))
      .toMatchObject({ unitPricePerKg: 5, totalCost: 0.8, priceSource: 'Mercado informado' });
    expect((await api.getShoppingList('2026-10-20')).find(item => item.foodId === 'food-arroz')?.purchased).toBe(true);
    expect((await api.generateShoppingList('2026-10-19')).find(item => item.foodId === 'food-arroz')?.purchased).toBe(true);

    await api.saveDailyMeal({ date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'partial', items: [{ ...rice, plannedAmountG: 120, consumedAmountG: 40 }] });
    const refreshed = await api.generateShoppingList('2026-10-19');
    expect(refreshed.find(item => item.foodId === 'food-arroz')).toMatchObject({ amountG: 180, purchased: false });
    await expect(api.setShoppingItemPurchased({ weekStartDate: '2026-10-19', foodId: 'missing-food', purchased: true })).rejects.toThrow('não pertence');
    expect(await api.getShoppingList('2026-10-19')).toEqual(refreshed);
  });
});
