import { describe, expect, it } from 'vitest';
import { searchFoods, searchRecipes } from '../domain/nutrition-catalog';
import { INITIAL_FOODS, INITIAL_RECIPES } from '../database/seeds/nutrition-seeds';

describe('Busca no catálogo nutricional', () => {
  it('encontra alimentos por nome sem diferenciar maiúsculas e acentos', () => {
    expect(searchFoods(INITIAL_FOODS, 'ARROZ').some(food => food.id === 'food-arroz')).toBe(true);
    const apple = { ...INITIAL_FOODS[0], id: 'custom-maçã', name: 'Maçã vermelha' };
    expect(searchFoods([apple], 'maca vermelha')).toEqual([apple]);
  });

  it('encontra receitas pelo nome ou por um ingrediente', () => {
    const byName = searchRecipes(INITIAL_RECIPES, INITIAL_RECIPES[0].name.slice(0, 5));
    const ingredientName = INITIAL_RECIPES[0].ingredients[0].foodName;
    const byIngredient = searchRecipes(INITIAL_RECIPES, ingredientName);
    expect(byName.some(recipe => recipe.id === INITIAL_RECIPES[0].id)).toBe(true);
    expect(byIngredient.length).toBeGreaterThan(0);
    expect(byIngredient.every(recipe => recipe.ingredients.some(item =>
      item.foodName.toLocaleLowerCase('pt-BR').includes(ingredientName.toLocaleLowerCase('pt-BR'))
    ))).toBe(true);
  });
});
