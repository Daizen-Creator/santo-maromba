import { describe, it, expect } from 'vitest';
import { SubstitutionEngine } from '../domain/substitution-engine';
import { INITIAL_FOODS, INITIAL_RECIPES } from '../database/seeds/nutrition-seeds';

describe('Motor de Substituição Inteligente (4 Níveis) e Despensa', () => {
  const engine = new SubstitutionEngine(INITIAL_FOODS, INITIAL_RECIPES);

  it('deve gerar opções nos 4 níveis quando o alimento estiver indisponível', () => {
    // Caso de uso real: falta ovos (food-ovo, 100g = 2 ovos)
    const options = engine.generateSubstitutions('food-ovo', 100, []);

    expect(options.length).toBeGreaterThanOrEqual(3);

    // Nível A: Substituto direto
    const direct = options.find(o => o.level === 'direct');
    expect(direct).toBeDefined();
    expect(direct?.levelTitle).toContain('Nível A');
    expect(direct?.items[0].foodId).not.toBe('food-ovo');
    expect(direct?.totalProteinG).toBeGreaterThanOrEqual(10); // Mantém bom aporte proteico

    // Nível B: Combinação
    const combo = options.find(o => o.level === 'combination');
    expect(combo).toBeDefined();
    expect(combo?.items.length).toBeGreaterThanOrEqual(2);

    // Nível C: Refeição alternativa
    const altMeal = options.find(o => o.level === 'alternative_meal');
    expect(altMeal).toBeDefined();
    expect(altMeal?.levelTitle).toContain('Nível C');

    // Nível D: Opção econômica
    const econ = options.find(o => o.level === 'economic');
    expect(econ).toBeDefined();
    expect(econ?.levelTitle).toContain('Nível D');
    expect(econ?.totalCost).toBeDefined();
  });

  it('deve calcular a diferença nutricional (delta) em relação à opção original', () => {
    const options = engine.generateSubstitutions('food-frango', 150, []);
    expect(options.length).toBeGreaterThan(0);

    const first = options[0];
    expect(typeof first.deltaCalories).toBe('number');
    expect(typeof first.deltaProteinG).toBe('number');
  });

  it('deve classificar receitas na despensa pelo match rate ("O que posso comer agora")', () => {
    // Usuário tem apenas arroz, feijão e ovos
    const pantryItems = ['food-arroz', 'food-feijao', 'food-ovo'].map(foodId => ({
      id: `pantry-${foodId}`, foodId, foodName: foodId, amountAvailableG: 5000, updatedAt: '2026-10-22T12:00:00.000Z'
    }));
    const matched = engine.findRecipesFromPantry(pantryItems, 30);

    expect(matched.length).toBeGreaterThan(0);
    expect(matched.every(recipe => recipe.matchRate > 0)).toBe(true);
    // As primeiras opções devem ter maior matchRate
    expect(matched[0].matchRate).toBeGreaterThanOrEqual(matched[matched.length - 1].matchRate);

    const completeRecipes = engine.findRecipesFromPantry(pantryItems, 30, true);
    expect(completeRecipes.length).toBeGreaterThan(0);
    expect(completeRecipes.every(recipe => recipe.matchRate === 100)).toBe(true);
  });

  it('calcula disponibilidade pela quantidade em estoque e exclui itens insuficientes no filtro estrito', () => {
    const food = { id: 'rice', name: 'Arroz', category: 'carb' as const, servingSizeG: 100, calories: 130, proteinG: 2, carbsG: 28, fatsG: 0.3, isCooked: true, source: 'Teste' };
    const recipes = [
      { id: 'rice-egg', name: 'Arroz e ovo', category: 'lunch' as const, prepTimeMinutes: 10, instructions: '', servings: 1,
        ingredients: [
          { foodId: 'rice', foodName: 'Arroz', amountG: 100, calories: 130, proteinG: 2, carbsG: 28, fatsG: 0.3 },
          { foodId: 'egg', foodName: 'Ovo', amountG: 50, calories: 75, proteinG: 6, carbsG: 0, fatsG: 5 }
        ], totalCalories: 205, totalProteinG: 8, totalCarbsG: 28, totalFatsG: 5.3 },
      { id: 'rice-only', name: 'Arroz', category: 'lunch' as const, prepTimeMinutes: 5, instructions: '', servings: 1,
        ingredients: [{ foodId: 'rice', foodName: 'Arroz', amountG: 100, calories: 130, proteinG: 2, carbsG: 28, fatsG: 0.3 }], totalCalories: 130, totalProteinG: 2, totalCarbsG: 28, totalFatsG: 0.3 },
      { id: 'almost', name: 'Quase completo', category: 'lunch' as const, prepTimeMinutes: 15, instructions: '', servings: 1,
        ingredients: [...Array.from({ length: 199 }, () => ({ foodId: 'rice', foodName: 'Arroz', amountG: 1, calories: 1, proteinG: 0, carbsG: 1, fatsG: 0 })),
          { foodId: 'egg', foodName: 'Ovo', amountG: 1, calories: 1, proteinG: 0, carbsG: 0, fatsG: 0 }],
        totalCalories: 200, totalProteinG: 0, totalCarbsG: 199, totalFatsG: 0 }
    ];
    const pantry = [{ id: 'rice-stock', foodId: 'rice', foodName: 'Arroz', amountAvailableG: 150, updatedAt: '2026-10-22T12:00:00.000Z' }];
    const search = new SubstitutionEngine([food], recipes);
    expect(search.findRecipesFromPantry(pantry).map(recipe => [recipe.id, recipe.matchRate])).toEqual([['rice-only', 100], ['almost', 99], ['rice-egg', 50]]);
    expect(search.findRecipesFromPantry(pantry, undefined, true).map(recipe => recipe.id)).toEqual(['rice-only']);
  });
});
