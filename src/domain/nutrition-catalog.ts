import { FoodItem, Recipe } from '../shared/types';

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function searchFoods(foods: FoodItem[], searchTerm: string): FoodItem[] {
  const query = normalize(searchTerm);
  if (!query) return foods;
  return foods.filter(food => normalize(`${food.name} ${food.category} ${food.source}`).includes(query));
}

export function searchRecipes(recipes: Recipe[], searchTerm: string): Recipe[] {
  const query = normalize(searchTerm);
  if (!query) return recipes;
  return recipes.filter(recipe => normalize(recipe.name).includes(query)
    || recipe.ingredients.some(ingredient => normalize(ingredient.foodName).includes(query)));
}
