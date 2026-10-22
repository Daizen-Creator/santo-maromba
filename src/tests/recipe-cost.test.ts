import { describe, expect, it } from 'vitest';
import { resolveRecipeCost } from '../domain/recipe-cost';
import { PantryItem, Recipe } from '../shared/types';

const recipe: Recipe = {
  id: 'meal-1', name: 'Arroz e frango', category: 'lunch', prepTimeMinutes: 20, instructions: '', servings: 2,
  ingredients: [
    { foodId: 'rice', foodName: 'Arroz', amountG: 300, calories: 390, proteinG: 7, carbsG: 84, fatsG: 1 },
    { foodId: 'chicken', foodName: 'Frango', amountG: 200, calories: 330, proteinG: 62, carbsG: 0, fatsG: 7 }
  ],
  totalCalories: 720, totalProteinG: 69, totalCarbsG: 84, totalFatsG: 8, estimatedCost: 12
};
const pantry: PantryItem[] = [
  { id: 'rice', foodId: 'rice', foodName: 'Arroz', amountAvailableG: 100, unitPrice: 10, priceSource: 'Loja A', priceUpdatedAt: '2026-10-22', updatedAt: '2026-10-22' },
  { id: 'chicken', foodId: 'chicken', foodName: 'Frango', amountAvailableG: 100, unitPrice: 30, priceSource: 'Loja B', priceUpdatedAt: '2026-10-22', updatedAt: '2026-10-22' }
];

describe('custo de receita com preços do usuário', () => {
  it('calcula custo do lote apenas quando todos os ingredientes têm preço identificado', () => {
    expect(resolveRecipeCost(recipe, pantry)).toMatchObject({ estimatedCost: 9, costSource: 'user_prices' });
  });

  it('preserva a estimativa do catálogo se algum ingrediente não tiver preço informado', () => {
    expect(resolveRecipeCost(recipe, pantry.slice(0, 1))).toMatchObject({ estimatedCost: 12, costSource: 'catalog_estimate' });
  });
});
