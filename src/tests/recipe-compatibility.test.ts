import { describe, expect, it } from 'vitest';
import { filterRecipesForProfile, isRecipeCompatible } from '../domain/recipe-compatibility';
import { Recipe, RecipeIngredient } from '../shared/types';

const ingredient = (foodId: string, foodName: string): RecipeIngredient => ({
  foodId, foodName, amountG: 100, calories: 120, proteinG: 10, carbsG: 10, fatsG: 4
});

const recipe = (id: string, ...ingredients: RecipeIngredient[]): Recipe => ({
  id,
  name: `Receita ${id}`,
  category: 'snack',
  prepTimeMinutes: 10,
  instructions: 'Misture e sirva.',
  ingredients,
  servings: 1,
  totalCalories: 120,
  totalProteinG: 10,
  totalCarbsG: 10,
  totalFatsG: 4
});

const chicken = recipe('frango', ingredient('food-frango', 'Peito de frango'));
const milk = recipe('leite', ingredient('food-leite-desnatado', 'Leite desnatado'));
const egg = recipe('ovo', ingredient('food-ovo', 'Ovo cozido'));
const bread = recipe('pao', ingredient('food-pao-frances', 'Pão francês'));
const soyProtein = recipe('soja', ingredient('food-soja', 'Proteína de soja'));
const cassavaFlour = recipe('mandioca', ingredient('food-farinha-mandioca', 'Farinha de mandioca'));
const customFruit = recipe('fruta', ingredient('custom-fruta', 'Abacaxi'));

describe('Compatibilidade do catálogo com alergias e restrições do perfil', () => {
  it('exclui ingredientes identificados como alergênicos e mantém receitas compatíveis', () => {
    expect(filterRecipesForProfile([milk, chicken], { allergies: ['Intolerância a lactose'] }).map(item => item.id))
      .toEqual(['frango']);
    expect(isRecipeCompatible(bread, { allergies: ['trigo'] })).toBe(false);
    expect(isRecipeCompatible(soyProtein, { allergies: ['soja'] })).toBe(false);
  });

  it('aplica restrições sem glúten e vegetarianas às sugestões', () => {
    expect(filterRecipesForProfile([bread, chicken, egg, soyProtein, cassavaFlour], { dietaryRestrictions: ['Sem glúten'] })
      .map(item => item.id)).toEqual(['frango', 'ovo', 'soja', 'mandioca']);
    expect(filterRecipesForProfile([chicken, milk, egg, soyProtein], { dietaryRestrictions: ['vegetariano'] })
      .map(item => item.id)).toEqual(['leite', 'ovo', 'soja']);
    expect(filterRecipesForProfile([milk, egg, soyProtein], { dietaryRestrictions: ['vegano'] })
      .map(item => item.id)).toEqual(['soja']);
  });

  it('não transforma limites de consumo em proibição e aceita termos de alergia personalizados', () => {
    expect(isRecipeCompatible(egg, { dietaryRestrictions: ['Limite de 2 ovos por dia'] })).toBe(true);
    expect(isRecipeCompatible(customFruit, { allergies: ['abacaxi'] })).toBe(false);
    expect(isRecipeCompatible(chicken, { dietaryRestrictions: ['não sou vegetariano'] })).toBe(true);
  });
});
