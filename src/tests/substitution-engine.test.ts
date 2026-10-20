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
    const pantryFoodIds = ['food-arroz', 'food-feijao', 'food-ovo'];
    const matched = engine.findRecipesFromPantry(pantryFoodIds, 30);

    expect(matched.length).toBeGreaterThan(0);
    // As primeiras opções devem ter maior matchRate
    expect(matched[0].matchRate).toBeGreaterThanOrEqual(matched[matched.length - 1].matchRate);
  });
});
