import { FoodItem, PantryItem, Recipe, SubstitutionOption } from '../shared/types';
import { INITIAL_FOODS, INITIAL_RECIPES } from '../database/seeds/nutrition-seeds';

/**
 * Motor de Substituição Inteligente de Alimentos (4 Níveis)
 */
export class SubstitutionEngine {
  private foods: FoodItem[];
  private recipes: Recipe[];

  constructor(customFoods?: FoodItem[], customRecipes?: Recipe[]) {
    this.foods = customFoods || INITIAL_FOODS;
    this.recipes = customRecipes || INITIAL_RECIPES;
  }

  /**
   * Gera opções nos 4 níveis de substituição para um alimento específico que o usuário não possui
   */
  generateSubstitutions(
    missingFoodId: string,
    originalAmountG: number,
    _pantryItems: PantryItem[] = []
  ): SubstitutionOption[] {
    const missing = this.foods.find(f => f.id === missingFoodId);
    if (!missing) return [];

    const factor = originalAmountG / 100;
    const origCal = Math.round(missing.calories * factor);
    const origProt = Number((missing.proteinG * factor).toFixed(1));
    const origCarb = Number((missing.carbsG * factor).toFixed(1));
    const origFat = Number((missing.fatsG * factor).toFixed(1));

    const options: SubstitutionOption[] = [];

    // Nível A: Substituto Direto (mesma categoria ou perfil nutricional)
    const sameSubstituteGroup = missing.substituteGroupId
      ? this.foods.filter(food => food.id !== missing.id && food.substituteGroupId === missing.substituteGroupId)
      : [];
    const directCandidate = sameSubstituteGroup[0] || this.foods.find(
      food => food.id !== missing.id && (food.category === missing.category || (missing.proteinG > 15 && food.proteinG > 15))
    );

    if (directCandidate) {
      // Se for fonte de proteína, calibra pela proteína; caso contrário, pelas calorias
      let neededG = 100;
      if (missing.proteinG > 10 && directCandidate.proteinG > 0) {
        neededG = Math.round((origProt / directCandidate.proteinG) * 100);
      } else if (directCandidate.calories > 0) {
        neededG = Math.round((origCal / directCandidate.calories) * 100);
      }

      const candFactor = neededG / 100;
      const cCal = Math.round(directCandidate.calories * candFactor);
      const cProt = Number((directCandidate.proteinG * candFactor).toFixed(1));
      const cCarb = Number((directCandidate.carbsG * candFactor).toFixed(1));
      const cFat = Number((directCandidate.fatsG * candFactor).toFixed(1));
      const cost = Number(((directCandidate.priceEstimated || 1) * candFactor).toFixed(2));

      options.push({
        id: 'sub-direct-1',
        level: 'direct',
        levelTitle: 'Nível A: Substituto Direto',
        description: `Substituir ${missing.name} por ${directCandidate.name}`,
        items: [
          {
            foodId: directCandidate.id,
            foodName: directCandidate.name,
            amountG: neededG,
            calories: cCal,
            proteinG: cProt,
            carbsG: cCarb,
            fatsG: cFat,
            estimatedCost: cost
          }
        ],
        totalCalories: cCal,
        totalProteinG: cProt,
        totalCarbsG: cCarb,
        totalFatsG: cFat,
        deltaCalories: cCal - origCal,
        deltaProteinG: Number((cProt - origProt).toFixed(1)),
        deltaCarbsG: Number((cCarb - origCarb).toFixed(1)),
        deltaFatsG: Number((cFat - origFat).toFixed(1)),
        totalCost: cost,
        rationale: `Mesma função nutricional primária. Ajustado em ${neededG}g para igualar a entrega de ${missing.proteinG > 10 ? 'proteína' : 'energia'}.`
      });
    }

    // Nível B: Combinação de Alimentos (dois alimentos que combinados atingem o objetivo)
    const comboFood1 = this.foods.find(f => f.id === 'food-pao-frances' || f.id === 'food-aveia')!;
    const comboFood2 = this.foods.find(f => f.id === 'food-leite-desnatado' || f.id === 'food-queijo-minas')!;

    if (comboFood1 && comboFood2) {
      const g1 = 50;
      const g2 = 150;
      const f1 = g1 / 100;
      const f2 = g2 / 100;

      const comboCal = Math.round(comboFood1.calories * f1 + comboFood2.calories * f2);
      const comboProt = Number((comboFood1.proteinG * f1 + comboFood2.proteinG * f2).toFixed(1));
      const comboCarb = Number((comboFood1.carbsG * f1 + comboFood2.carbsG * f2).toFixed(1));
      const comboFat = Number((comboFood1.fatsG * f1 + comboFood2.fatsG * f2).toFixed(1));
      const comboCost = Number(((comboFood1.priceEstimated || 1) * f1 + (comboFood2.priceEstimated || 1) * f2).toFixed(2));

      options.push({
        id: 'sub-combo-1',
        level: 'combination',
        levelTitle: 'Nível B: Combinação de Alimentos Acessíveis',
        description: `Combinar ${comboFood1.name} (${g1}g) + ${comboFood2.name} (${g2}g)`,
        items: [
          {
            foodId: comboFood1.id,
            foodName: comboFood1.name,
            amountG: g1,
            calories: Math.round(comboFood1.calories * f1),
            proteinG: Number((comboFood1.proteinG * f1).toFixed(1)),
            carbsG: Number((comboFood1.carbsG * f1).toFixed(1)),
            fatsG: Number((comboFood1.fatsG * f1).toFixed(1)),
            estimatedCost: Number(((comboFood1.priceEstimated || 1) * f1).toFixed(2))
          },
          {
            foodId: comboFood2.id,
            foodName: comboFood2.name,
            amountG: g2,
            calories: Math.round(comboFood2.calories * f2),
            proteinG: Number((comboFood2.proteinG * f2).toFixed(1)),
            carbsG: Number((comboFood2.carbsG * f2).toFixed(1)),
            fatsG: Number((comboFood2.fatsG * f2).toFixed(1)),
            estimatedCost: Number(((comboFood2.priceEstimated || 1) * f2).toFixed(2))
          }
        ],
        totalCalories: comboCal,
        totalProteinG: comboProt,
        totalCarbsG: comboCarb,
        totalFatsG: comboFat,
        deltaCalories: comboCal - origCal,
        deltaProteinG: Number((comboProt - origProt).toFixed(1)),
        deltaCarbsG: Number((comboCarb - origCarb).toFixed(1)),
        deltaFatsG: Number((comboFat - origFat).toFixed(1)),
        totalCost: comboCost,
        rationale: 'Combinação sinérgica de carboidratos complexos e proteínas lácteas de alta digestibilidade.'
      });
    }

    // Nível C: Refeição Alternativa Prática (seleciona uma receita pronta do catálogo)
    const altRecipe = this.recipes.find(
      r => !r.ingredients.some(ing => ing.foodId === missing.id) && Math.abs(r.totalCalories - origCal * 1.5) < 300
    ) || this.recipes[0];

    if (altRecipe) {
      options.push({
        id: 'sub-alt-meal-1',
        level: 'alternative_meal',
        levelTitle: 'Nível C: Refeição Alternativa Completa',
        description: `Trocar preparação inteira por: ${altRecipe.name}`,
        items: altRecipe.ingredients.map(ing => ({
          foodId: ing.foodId,
          foodName: ing.foodName,
          amountG: ing.amountG,
          calories: ing.calories,
          proteinG: ing.proteinG,
          carbsG: ing.carbsG,
          fatsG: ing.fatsG,
          estimatedCost: 2.50
        })),
        totalCalories: altRecipe.totalCalories,
        totalProteinG: altRecipe.totalProteinG,
        totalCarbsG: altRecipe.totalCarbsG,
        totalFatsG: altRecipe.totalFatsG,
        deltaCalories: altRecipe.totalCalories - origCal,
        deltaProteinG: Number((altRecipe.totalProteinG - origProt).toFixed(1)),
        deltaCarbsG: Number((altRecipe.totalCarbsG - origCarb).toFixed(1)),
        deltaFatsG: Number((altRecipe.totalFatsG - origFat).toFixed(1)),
        totalCost: altRecipe.estimatedCost || 3.00,
        rationale: `Substitui a refeição inteira por uma opção pronta de preparo em ${altRecipe.prepTimeMinutes} minutos sem precisar do ingrediente faltante.`
      });
    }

    // Nível D: Opção Econômica (menor custo por porção)
    const cheapFood = this.foods
      .filter(f => f.id !== missing.id)
      .sort((a, b) => (a.priceEstimated || 99) - (b.priceEstimated || 99))[0];

    if (cheapFood) {
      const g = 150;
      const f = g / 100;
      const cCal = Math.round(cheapFood.calories * f);
      const cProt = Number((cheapFood.proteinG * f).toFixed(1));
      const cCarb = Number((cheapFood.carbsG * f).toFixed(1));
      const cFat = Number((cheapFood.fatsG * f).toFixed(1));
      const cost = Number(((cheapFood.priceEstimated || 0.5) * f).toFixed(2));

      options.push({
        id: 'sub-econ-1',
        level: 'economic',
        levelTitle: 'Nível D: Opção Mais Econômica',
        description: `Alternativa de Baixo Custo: ${cheapFood.name} (${g}g)`,
        items: [
          {
            foodId: cheapFood.id,
            foodName: cheapFood.name,
            amountG: g,
            calories: cCal,
            proteinG: cProt,
            carbsG: cCarb,
            fatsG: cFat,
            estimatedCost: cost
          }
        ],
        totalCalories: cCal,
        totalProteinG: cProt,
        totalCarbsG: cCarb,
        totalFatsG: cFat,
        deltaCalories: cCal - origCal,
        deltaProteinG: Number((cProt - origProt).toFixed(1)),
        deltaCarbsG: Number((cCarb - origCarb).toFixed(1)),
        deltaFatsG: Number((cFat - origFat).toFixed(1)),
        totalCost: cost,
        rationale: 'Opção com o menor custo financeiro estimado por grama no catálogo de alimentos.'
      });
    }

    return options;
  }

  /**
   * Recurso: "O que posso comer com o que tenho?"
   * Avalia a despensa do usuário e classifica receitas por adequação
   */
  findRecipesFromPantry(pantryItems: PantryItem[], maxPrepTime?: number, requireAllIngredients = false): Array<Recipe & { matchRate: number }> {
    const availableByFoodId = new Map(pantryItems.map(item => [item.foodId, item.amountAvailableG]));
    const scored = this.recipes.map(recipe => {
      const totalIngs = recipe.ingredients.length;
      if (totalIngs === 0) return { ...recipe, matchRate: 0, allIngredientsAvailable: false };

      const matchedIngs = recipe.ingredients.filter(ing => (availableByFoodId.get(ing.foodId) || 0) >= ing.amountG).length;
      const matchRate = Math.floor((matchedIngs / totalIngs) * 100);

      return {
        ...recipe,
        matchRate,
        allIngredientsAvailable: matchedIngs === totalIngs
      };
    });

    return scored
      .filter(r => !maxPrepTime || r.prepTimeMinutes <= maxPrepTime)
      .filter(r => r.matchRate > 0 && (!requireAllIngredients || r.allIngredientsAvailable))
      .map(({ allIngredientsAvailable: _allIngredientsAvailable, ...recipe }) => recipe)
      .sort((a, b) => b.matchRate - a.matchRate || b.totalProteinG - a.totalProteinG);
  }
}
