import { DailyMealItemLog, FoodItem } from '../shared/types';

export interface NaturalMealParseResult {
  items: DailyMealItemLog[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

const STOP_WORDS = new Set(['a', 'as', 'ao', 'aos', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'para', 'por', 'um', 'uma']);

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function meaningfulTokens(value: string): string[] {
  return normalize(value).split(' ').filter(token => token && !STOP_WORDS.has(token) && !/^\d/.test(token));
}

function roundOne(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function matchFood(description: string, foods: FoodItem[]): FoodItem {
  const describedTokens = new Set(meaningfulTokens(description));
  const matches = foods.flatMap(food => {
    const tokens = [...new Set(meaningfulTokens(food.name))];
    const matchedCount = tokens.filter(token => describedTokens.has(token)).length;
    if (!matchedCount) return [];
    return [{ food, matchedCount, ratio: matchedCount / tokens.length }];
  }).sort((left, right) => right.ratio - left.ratio || right.matchedCount - left.matchedCount);

  const best = matches[0];
  if (!best) throw new Error(`Não reconheci “${description.trim()}” no catálogo local. Confira o nome do alimento ou cadastre-o primeiro.`);
  const tied = matches.filter(match => Math.abs(match.ratio - best.ratio) < 0.000001 && match.matchedCount === best.matchedCount);
  if (tied.length > 1) {
    throw new Error(`“${description.trim()}” corresponde a mais de um alimento. Especifique melhor o nome conforme o catálogo.`);
  }
  return best.food;
}

/** Interpreta itens no formato livre “150 g de frango e 100 g de arroz”. */
export function parseNaturalMealDescription(description: string, foods: FoodItem[]): NaturalMealParseResult {
  const text = description.trim();
  if (!text) throw new Error('Descreva a refeição com quantidades em gramas.');
  if (text.length > 2000) throw new Error('A descrição deve ter até 2.000 caracteres.');

  const quantityPattern = /(\d+(?:[.,]\d+)?)\s*(quilogramas?|quilos?|kg|gramas?|grama|gr|g)\b\s*(?:de|do|da|dos|das)?/giu;
  const quantities = [...text.matchAll(quantityPattern)];
  if (!quantities.length) {
    throw new Error('Informe o peso de cada alimento, por exemplo: “150 g de peito de frango grelhado e 100 g de arroz branco cozido”.');
  }
  if (quantities.length > 20) throw new Error('Registre no máximo 20 alimentos por refeição.');

  const items = quantities.map((match, index) => {
    const amountValue = Number(match[1].replace(',', '.'));
    const unit = match[2].toLowerCase();
    const amountG = amountValue * (/^(?:kg|quilo|quilos|quilograma|quilogramas)$/.test(unit) ? 1000 : 1);
    if (!Number.isFinite(amountG) || amountG < 1 || amountG > 5000) {
      throw new Error('Cada quantidade deve estar entre 1 g e 5.000 g.');
    }
    const start = (match.index ?? 0) + match[0].length;
    const end = quantities[index + 1]?.index ?? text.length;
    const foodDescription = text.slice(start, end).replace(/^[\s,:;.+-]+|[\s,:;.+-]+$/g, '');
    const food = matchFood(foodDescription, foods);
    const ratio = amountG / 100;
    return {
      itemId: `${food.id}-${index + 1}`,
      foodId: food.id,
      foodName: food.name,
      plannedAmountG: amountG,
      consumedAmountG: amountG,
      calories: Math.round(food.calories * ratio),
      proteinG: roundOne(food.proteinG * ratio),
      carbsG: roundOne(food.carbsG * ratio),
      fatsG: roundOne(food.fatsG * ratio),
      dataQuality: food.dataQuality ?? 'unverified',
      dataSource: food.source,
      ...(food.sourceReference ? { sourceReference: food.sourceReference } : {}),
      confidenceLevel: food.confidenceLevel ?? 'unknown'
    } satisfies DailyMealItemLog;
  });

  return {
    items,
    calories: items.reduce((sum, item) => sum + item.calories, 0),
    proteinG: roundOne(items.reduce((sum, item) => sum + item.proteinG, 0)),
    carbsG: roundOne(items.reduce((sum, item) => sum + item.carbsG, 0)),
    fatsG: roundOne(items.reduce((sum, item) => sum + item.fatsG, 0))
  };
}
