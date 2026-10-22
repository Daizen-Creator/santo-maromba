import { NutritionAnalyticsQuery, ShoppingExpenseRecord, ShoppingExpenseSummary } from '../shared/types';

export function summarizeShoppingExpenses(
  range: NutritionAnalyticsQuery,
  records: ShoppingExpenseRecord[]
): ShoppingExpenseSummary {
  const expenses = records
    .filter(record => record.purchasedAt.slice(0, 10) >= range.fromDate && record.purchasedAt.slice(0, 10) <= range.toDate)
    .sort((left, right) => left.purchasedAt.localeCompare(right.purchasedAt) || left.foodName.localeCompare(right.foodName, 'pt-BR'));
  const priced = expenses.filter(record => record.totalCost !== undefined && Number.isFinite(record.totalCost));

  return {
    fromDate: range.fromDate,
    toDate: range.toDate,
    totalCost: Number(priced.reduce((total, record) => total + record.totalCost!, 0).toFixed(2)),
    pricedPurchaseCount: priced.length,
    unpricedPurchaseCount: expenses.length - priced.length,
    expenses
  };
}
