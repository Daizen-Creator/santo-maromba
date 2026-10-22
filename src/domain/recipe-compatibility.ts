import { Recipe } from '../shared/types';
import { getRecipeNutritionPerServing } from './recipe-portions';

export interface RecipeProfileRestrictions {
  allergies?: string[];
  dietaryRestrictions?: string[];
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const ALLERGEN_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: 'gluten', pattern: /gluten|wheat|barley|rye|trigo|cevada|centeio|pao|macarrao|biscoito/ },
  { id: 'dairy', pattern: /lactose|leite|milk|iogurte|yogurt|queijo|cheese|ricota|cottage|whey|caseina|requeijao/ },
  { id: 'egg', pattern: /(?:^|[-\s])ovos?(?:$|[-\s])|omelete|clara[- ]de[- ]ovo|(?:^|[-\s])eggs?(?:$|[-\s])/ },
  { id: 'peanut', pattern: /amendoim|peanut/ },
  { id: 'soy', pattern: /soja|tofu|shoyu/ },
  { id: 'fish', pattern: /peixe|fish|tilapia|atum|sardinha|salmao|bacalhau/ },
  { id: 'shellfish', pattern: /camarao|shrimp|lagosta|caranguejo|mexilhao|ostra/ },
  { id: 'tree_nut', pattern: /castanha|cashew|walnut|noz|amendoa|almond|avel|pistache/ }
];

function allergenIds(value: string): string[] {
  const normalized = normalize(value);
  return ALLERGEN_RULES.filter(rule => rule.pattern.test(normalized)).map(rule => rule.id);
}

function restrictionMeansAvoiding(value: string): boolean {
  const normalized = normalize(value);
  if (/limite|limitar|maximo|reduzir|quantidade/.test(normalized)) return false;
  if (/nao (tenho|possuo) (alergia|intolerancia)|nao sou (vegetarian|vegano)/.test(normalized)) return false;
  return /sem |evit|nao gosto|nao consumo|nao consumir|nao posso|intoler|alerg|celiac|vegetarian|vegano/.test(`${normalized} `)
    || allergenIds(normalized).length > 0;
}

function restrictionsContain(restrictions: string[], pattern: RegExp): boolean {
  return restrictions.some(value => {
    const normalized = normalize(value);
    return restrictionMeansAvoiding(normalized) && pattern.test(normalized);
  });
}

function ingredientNames(recipe: Recipe): string[] {
  return recipe.ingredients.flatMap(ingredient => [ingredient.foodId, ingredient.foodName]).map(normalize);
}

export function isRecipeCompatible(recipe: Recipe, profile: RecipeProfileRestrictions): boolean {
  const ingredients = ingredientNames(recipe);
  const recipeAllergens = new Set(ingredients.flatMap(allergenIds));
  const allergyTerms = (profile.allergies || []).map(normalize).filter(Boolean);
  const restrictionTerms = (profile.dietaryRestrictions || []).map(normalize).filter(Boolean);

  const blockedAllergens = [
    ...allergyTerms.flatMap(allergenIds),
    ...restrictionTerms.filter(restrictionMeansAvoiding).flatMap(allergenIds)
  ];
  if (blockedAllergens.some(id => recipeAllergens.has(id))) return false;

  const directAllergyTerms = allergyTerms.filter(term => allergenIds(term).length === 0);
  if (directAllergyTerms.some(term => ingredients.some(name => name.includes(term)))) return false;

  const vegetarian = restrictionsContain(restrictionTerms, /vegetarian/);
  const vegan = restrictionsContain(restrictionTerms, /vegano/);
  const animalFoods = /frango|carne|boi|patinho|porco|peru|linguica|salsicha|peixe|tilapia|atum|sardinha|salmao|bacalhau|camarao|lagosta|caranguejo|mexilhao|ostra/;
  const allAnimalFoods = /(?:^|[-\s])ovos?(?:$|[-\s])|omelete|(?:^|[-\s])eggs?(?:$|[-\s])|leite|milk|iogurte|yogurt|queijo|cheese|ricota|cottage|whey|caseina|mel|frango|carne|boi|patinho|porco|peru|linguica|salsicha|peixe|tilapia|atum|sardinha|salmao|bacalhau|camarao|lagosta|caranguejo|mexilhao|ostra/;
  const isPlantBased = (name: string) => /soja|vegetal|tofu|plant-based/.test(name);
  if (vegan && ingredients.some(name => !isPlantBased(name) && allAnimalFoods.test(name))) return false;
  if (vegetarian && ingredients.some(name => !isPlantBased(name) && animalFoods.test(name))) return false;

  return true;
}

export function filterRecipesForProfile<T extends Recipe>(recipes: T[], profile: RecipeProfileRestrictions): T[] {
  return recipes.filter(recipe => isRecipeCompatible(recipe, profile));
}

const PREFERENCE_STOP_WORDS = new Set([
  'prefiro', 'prefere', 'gosto', 'gosta', 'quero', 'queria', 'opcao', 'opcoes', 'receita', 'receitas',
  'comida', 'de', 'do', 'da', 'dos', 'das', 'e', 'ou', 'com', 'para', 'por', 'um', 'uma', 'o', 'a',
  'mais', 'menos', 'alto', 'alta', 'baixo', 'baixa', 'rico', 'rica', 'proteina', 'proteinas',
  'carbo', 'carboidrato', 'rapido', 'rapida', 'pratico', 'pratica', 'barato', 'barata', 'economico', 'economica'
]);

export function getRecipePreferenceScore(recipe: Recipe, preferences?: string): number {
  if (!preferences?.trim()) return 0;
  const normalized = normalize(preferences);
  const nutrition = getRecipeNutritionPerServing(recipe);
  const ingredientText = ingredientNames(recipe);
  let score = 0;

  if (/econom|barat|baixo custo/.test(normalized) && recipe.estimatedCost !== undefined) {
    score += 10 / (1 + Math.max(0, recipe.estimatedCost));
  }
  if (/rapido|pratico|pouco tempo/.test(normalized)) {
    score += Math.max(0, 10 - recipe.prepTimeMinutes / 5);
  }
  if (/mais proteina|alto.*proteina|rico.*proteina/.test(normalized)) {
    score += Math.min(60, nutrition.proteinG) / 10;
  }
  if (/menos carbo|baixo.*carbo/.test(normalized)) {
    score += Math.max(0, 8 - nutrition.carbsG / 10);
  }
  if (/vegano/.test(normalized)) {
    score += isRecipeCompatible(recipe, { dietaryRestrictions: ['vegano'] }) ? 8 : -8;
  } else if (/vegetarian/.test(normalized)) {
    score += isRecipeCompatible(recipe, { dietaryRestrictions: ['vegetariano'] }) ? 8 : -8;
  }

  for (const segment of normalized.split(/[;,\n]+/).filter(Boolean)) {
    const sign = /nao gosto|nao curto|evito|nao prefiro/.test(segment) ? -1 : 1;
    const terms = segment.split(/[^\p{L}\p{N}]+/u)
      .filter(term => term.length >= 3 && !PREFERENCE_STOP_WORDS.has(term));
    for (const term of new Set(terms)) {
      if (ingredientText.some(name => name.includes(term))) score += sign * 2;
    }
  }

  return score;
}

export function rankRecipesByPreferences<T extends Recipe>(
  recipes: T[],
  preferences?: string,
  baseScore: (recipe: T) => number = () => 0
): T[] {
  return recipes.map((recipe, index) => ({
    recipe,
    index,
    score: baseScore(recipe) + getRecipePreferenceScore(recipe, preferences)
  })).sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.recipe);
}
