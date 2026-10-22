import { CustomFoodInput, FoodItem } from '../shared/types';

export interface CalculatedCustomFoodComposition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  fiberG?: number;
  ingredientWeightG: number;
  finalWeightG: number;
}

const round = (value: number): number => Number(value.toFixed(2));

export function calculateCustomFoodComposition(
  ingredients: NonNullable<CustomFoodInput['ingredients']>,
  foods: FoodItem[],
  finalWeightG?: number
): CalculatedCustomFoodComposition {
  if (ingredients.length < 1 || ingredients.length > 40) throw new Error('Adicione entre 1 e 40 ingredientes.');
  const seen = new Set<string>();
  const selected = ingredients.map(ingredient => {
    if (!Number.isFinite(ingredient.amountG) || ingredient.amountG <= 0 || ingredient.amountG > 50000) {
      throw new Error('A quantidade de cada ingrediente deve estar entre 0,1 e 50.000 g.');
    }
    if (seen.has(ingredient.foodId)) throw new Error('Cada ingrediente deve aparecer uma única vez.');
    seen.add(ingredient.foodId);
    const food = foods.find(item => item.id === ingredient.foodId);
    if (!food) throw new Error('Um dos ingredientes não existe no catálogo deste dispositivo.');
    if (!Number.isFinite(food.servingSizeG) || food.servingSizeG <= 0) throw new Error(`A porção base de ${food.name} não é válida.`);
    return { food, amountG: ingredient.amountG };
  });

  const ingredientWeightG = selected.reduce((sum, item) => sum + item.amountG, 0);
  const finalWeight = finalWeightG ?? ingredientWeightG;
  if (!Number.isFinite(finalWeight) || finalWeight <= 0 || finalWeight > 50000) {
    throw new Error('O peso final preparado deve estar entre 1 e 50.000 g.');
  }
  const nutrient = (key: 'calories' | 'proteinG' | 'carbsG' | 'fatsG') =>
    selected.reduce((sum, item) => sum + item.food[key] * item.amountG / item.food.servingSizeG, 0) * 100 / finalWeight;
  const fiberKnownForAll = selected.every(item => item.food.fiberG !== undefined && Number.isFinite(item.food.fiberG));
  const fiberG = fiberKnownForAll
    ? selected.reduce((sum, item) => sum + (item.food.fiberG || 0) * item.amountG / item.food.servingSizeG, 0) * 100 / finalWeight
    : undefined;

  return {
    calories: round(nutrient('calories')),
    proteinG: round(nutrient('proteinG')),
    carbsG: round(nutrient('carbsG')),
    fatsG: round(nutrient('fatsG')),
    fiberG: fiberG === undefined ? undefined : round(fiberG),
    ingredientWeightG: round(ingredientWeightG),
    finalWeightG: round(finalWeight)
  };
}

export function calculateCustomFoodInput(
  input: CustomFoodInput,
  foods: FoodItem[],
  exceptFoodId?: string
): CustomFoodInput {
  if (!input.ingredients?.length) return input;
  if (exceptFoodId && input.ingredients.some(item => item.foodId === exceptFoodId)) {
    throw new Error('Um alimento não pode incluir a si mesmo na própria composição.');
  }
  const calculated = calculateCustomFoodComposition(input.ingredients, foods, input.finalWeightG);
  return {
    ...input,
    calories: calculated.calories,
    proteinG: calculated.proteinG,
    carbsG: calculated.carbsG,
    fatsG: calculated.fatsG,
    fiberG: calculated.fiberG,
    finalWeightG: calculated.finalWeightG
  };
}
