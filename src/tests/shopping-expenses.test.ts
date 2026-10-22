import { describe, expect, it } from 'vitest';
import { summarizeShoppingExpenses } from '../domain/shopping-expenses';
import { ShoppingExpenseRecord } from '../shared/types';

const record = (id: string, purchasedAt: string, totalCost?: number): ShoppingExpenseRecord => ({
  id, weekStartDate: '2026-10-19', foodId: id, foodName: id, amountG: 100,
  purchasedAt, unitPricePerKg: totalCost === undefined ? undefined : totalCost * 10,
  totalCost, priceSource: totalCost === undefined ? undefined : 'Mercado informado'
});

describe('relatório de gastos da lista de compras', () => {
  it('soma somente compras com preço registrado e conta separadamente itens sem preço', () => {
    const summary = summarizeShoppingExpenses(
      { fromDate: '2026-10-01', toDate: '2026-10-31' },
      [record('sem-preco', '2026-10-22T12:00:00.000Z'), record('arroz', '2026-10-21T12:00:00.000Z', 0.8)]
    );
    expect(summary).toMatchObject({ totalCost: 0.8, pricedPurchaseCount: 1, unpricedPurchaseCount: 1 });
    expect(summary.expenses.map(item => item.id)).toEqual(['arroz', 'sem-preco']);
  });

  it('ignora compras fora do período consultado', () => {
    expect(summarizeShoppingExpenses(
      { fromDate: '2026-10-20', toDate: '2026-10-25' },
      [record('anterior', '2026-10-19T23:59:59.000Z', 4), record('dentro', '2026-10-20T00:00:00.000Z', 2)]
    )).toMatchObject({ totalCost: 2, pricedPurchaseCount: 1, unpricedPurchaseCount: 0 });
  });
});
