import { IDatabase } from '../driver';
import { randomUUID } from 'crypto';
import { CustomFoodInput, FoodItem, PantryItem, Recipe } from '../../shared/types';
import { INITIAL_FOODS, INITIAL_RECIPES } from '../seeds/nutrition-seeds';

export class NutritionRepository {
  constructor(private db: IDatabase) {
    this.seedFoodsAndRecipes();
  }

  private seedFoodsAndRecipes(): void {
    const catalog = this.db.queryOne<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?',
      ['nutrition_catalog_version']
    );
    if (catalog?.value === '5') return;

    this.db.transaction(() => {
      const now = new Date().toISOString();
      for (const food of INITIAL_FOODS) {
        this.db.execute(
          `INSERT INTO foods (
            id, name, category, serving_size_g, calories, protein_g, carbs_g, fats_g,
            fiber_g, is_cooked, price_estimated, substitute_group_id, image_url, image_credit,
            source, data_quality, source_reference, source_date, confidence_level, is_custom, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, category = excluded.category, serving_size_g = excluded.serving_size_g,
            calories = excluded.calories, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g,
            fats_g = excluded.fats_g, fiber_g = excluded.fiber_g, is_cooked = excluded.is_cooked,
            price_estimated = excluded.price_estimated,
            substitute_group_id = excluded.substitute_group_id, image_url = excluded.image_url,
            image_credit = excluded.image_credit, source = excluded.source,
            data_quality = excluded.data_quality, source_reference = excluded.source_reference,
            source_date = excluded.source_date, confidence_level = excluded.confidence_level
          WHERE foods.is_custom = 0`,
          [
            food.id, food.name, food.category, food.servingSizeG, food.calories,
            food.proteinG, food.carbsG, food.fatsG, food.fiberG ?? null,
            food.isCooked ? 1 : 0, food.priceEstimated ?? null, food.substituteGroupId || null,
            food.imageUrl || null, food.imageCredit || null, food.source, food.dataQuality || 'unverified',
            food.sourceReference ?? null, food.sourceDate ?? null, food.confidenceLevel || 'unknown', now
          ]
        );
      }

      for (const recipe of INITIAL_RECIPES) {
        const existing = this.db.queryOne<{ is_custom: number }>(
          'SELECT is_custom FROM recipes WHERE id = ?', [recipe.id]
        );
        if (existing?.is_custom) continue;

        this.db.execute(
          `INSERT INTO recipes (
            id, name, category, prep_time_minutes, instructions, image_url, image_credit,
            budget_swaps, is_favorite, is_custom, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, category = excluded.category, prep_time_minutes = excluded.prep_time_minutes,
            instructions = excluded.instructions, image_url = excluded.image_url,
            image_credit = excluded.image_credit, budget_swaps = excluded.budget_swaps
          WHERE recipes.is_custom = 0`,
          [recipe.id, recipe.name, recipe.category, recipe.prepTimeMinutes, recipe.instructions,
            recipe.imageUrl || null, recipe.imageCredit || null, JSON.stringify(recipe.budgetSwaps || []), now]
        );
        this.db.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipe.id]);
        recipe.ingredients.forEach((ingredient, index) => {
          this.db.execute(
            `INSERT INTO recipe_ingredients (id, recipe_id, food_id, amount_g)
             VALUES (?, ?, ?, ?)`,
            [`ri-${recipe.id}-${index + 1}`, recipe.id, ingredient.foodId, ingredient.amountG]
          );
        });
      }

      this.db.execute(
        `INSERT INTO app_metadata (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        ['nutrition_catalog_version', '5']
      );
    });
  }

  getFoods(): FoodItem[] {
    const rows = this.db.query<any>('SELECT * FROM foods ORDER BY name ASC');
    const storedFavorites = this.db.queryOne<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?', ['favorite_food_ids']
    )?.value;
    let favorites = new Set<string>();
    try {
      if (storedFavorites) favorites = new Set<string>(JSON.parse(storedFavorites));
    } catch {
      favorites = new Set<string>();
    }
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      servingSizeG: Number(r.serving_size_g),
      calories: Number(r.calories),
      proteinG: Number(r.protein_g),
      carbsG: Number(r.carbs_g),
      fatsG: Number(r.fats_g),
      fiberG: r.fiber_g === null || r.fiber_g === undefined ? undefined : Number(r.fiber_g),
      dataQuality: r.data_quality || 'unverified',
      sourceReference: r.source_reference || undefined,
      sourceDate: r.source_date || undefined,
      confidenceLevel: r.confidence_level || 'unknown',
      isCooked: Boolean(r.is_cooked),
      priceEstimated: r.price_estimated ? Number(r.price_estimated) : undefined,
      source: r.source,
      substituteGroupId: r.substitute_group_id || undefined,
      imageUrl: r.image_url || undefined,
      imageCredit: r.image_credit || undefined,
      isCustom: Boolean(r.is_custom),
      isFavorite: favorites.has(r.id)
    }));
  }

  setFoodFavorite(id: string, isFavorite: boolean): FoodItem {
    const exists = this.db.queryOne<{ id: string }>('SELECT id FROM foods WHERE id = ?', [id]);
    if (!exists) throw new Error('Alimento não encontrado.');
    const stored = this.db.queryOne<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?', ['favorite_food_ids']
    )?.value;
    let favorites = new Set<string>();
    try {
      if (stored) favorites = new Set<string>(JSON.parse(stored));
    } catch {
      favorites = new Set<string>();
    }
    if (isFavorite) favorites.add(id);
    else favorites.delete(id);
    this.db.execute(
      `INSERT INTO app_metadata (key, value) VALUES ('favorite_food_ids', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [JSON.stringify([...favorites].sort())]
    );
    const food = this.getFoods().find(item => item.id === id);
    if (!food) throw new Error('Não foi possível carregar o alimento atualizado.');
    return food;
  }

  createCustomFood(input: CustomFoodInput): FoodItem {
    this.assertFoodNameAvailable(input.name);
    const id = `custom-food-${randomUUID()}`;
    this.db.execute(
      `INSERT INTO foods (
        id, name, category, serving_size_g, calories, protein_g, carbs_g, fats_g, fiber_g,
        is_cooked, substitute_group_id, source, data_quality, confidence_level, is_custom, created_at
      ) VALUES (?, ?, ?, 100, ?, ?, ?, ?, ?, ?, ?, 'Informado pelo usuário', 'user_reported', 'unknown', 1, ?)`,
      [id, input.name.trim(), input.category, input.calories, input.proteinG, input.carbsG, input.fatsG,
        input.fiberG ?? null, input.isCooked ? 1 : 0, input.substituteGroupId?.trim() || null, new Date().toISOString()]
    );
    return this.requireFood(id);
  }

  updateCustomFood(id: string, input: CustomFoodInput): FoodItem {
    const existing = this.db.queryOne<{ id: string }>(
      'SELECT id FROM foods WHERE id = ? AND is_custom = 1', [id]
    );
    if (!existing) throw new Error('Alimento personalizado não encontrado.');
    this.assertFoodNameAvailable(input.name, id);
    this.db.execute(
      `UPDATE foods SET name = ?, category = ?, serving_size_g = 100, calories = ?, protein_g = ?,
       carbs_g = ?, fats_g = ?, fiber_g = ?, is_cooked = ?, substitute_group_id = ?,
       source = 'Informado pelo usuário', data_quality = 'user_reported', confidence_level = 'unknown'
       WHERE id = ? AND is_custom = 1`,
      [input.name.trim(), input.category, input.calories, input.proteinG, input.carbsG, input.fatsG,
        input.fiberG ?? null, input.isCooked ? 1 : 0, input.substituteGroupId?.trim() || null, id]
    );
    return this.requireFood(id);
  }

  private assertFoodNameAvailable(name: string, exceptId?: string): void {
    const duplicate = this.db.queryOne<{ id: string }>(
      'SELECT id FROM foods WHERE name = ? COLLATE NOCASE AND (? IS NULL OR id <> ?) LIMIT 1',
      [name.trim(), exceptId ?? null, exceptId ?? null]
    );
    if (duplicate) throw new Error('Já existe um alimento com esse nome no catálogo.');
  }

  private requireFood(id: string): FoodItem {
    const food = this.getFoods().find(item => item.id === id);
    if (!food) throw new Error('Não foi possível carregar o alimento salvo.');
    return food;
  }

  getRecipes(): Recipe[] {
    const rows = this.db.query<any>('SELECT * FROM recipes ORDER BY name ASC');
    return rows.map(row => {
      const ingredients = this.db.query<any>(
        `SELECT ri.food_id, f.name, ri.amount_g, f.calories, f.protein_g, f.carbs_g, f.fats_g, f.price_estimated,
                f.source, f.data_quality, f.source_reference, f.confidence_level
         FROM recipe_ingredients ri
         JOIN foods f ON f.id = ri.food_id
         WHERE ri.recipe_id = ?
         ORDER BY ri.id ASC`,
        [row.id]
      ).map(ingredient => {
        const amount = Number(ingredient.amount_g) / 100;
        return {
          foodId: ingredient.food_id,
          foodName: ingredient.name,
          amountG: Number(ingredient.amount_g),
          calories: Math.round(Number(ingredient.calories) * amount),
          proteinG: Number((Number(ingredient.protein_g) * amount).toFixed(1)),
          carbsG: Number((Number(ingredient.carbs_g) * amount).toFixed(1)),
          fatsG: Number((Number(ingredient.fats_g) * amount).toFixed(1)),
          dataQuality: ingredient.data_quality || 'unverified',
          dataSource: ingredient.source || 'Origem não registrada',
          sourceReference: ingredient.source_reference || undefined,
          confidenceLevel: ingredient.confidence_level || 'unknown',
          priceEstimated: ingredient.price_estimated ? Number(ingredient.price_estimated) : 0
        };
      });

      return {
        id: row.id,
        name: row.name,
        category: row.category,
        prepTimeMinutes: Number(row.prep_time_minutes || 0),
        instructions: row.instructions,
        imageUrl: row.image_url || undefined,
        imageCredit: row.image_credit || undefined,
        ingredients,
        totalCalories: ingredients.reduce((sum, ingredient) => sum + ingredient.calories, 0),
        totalProteinG: Number(ingredients.reduce((sum, ingredient) => sum + ingredient.proteinG, 0).toFixed(1)),
        totalCarbsG: Number(ingredients.reduce((sum, ingredient) => sum + ingredient.carbsG, 0).toFixed(1)),
        totalFatsG: Number(ingredients.reduce((sum, ingredient) => sum + ingredient.fatsG, 0).toFixed(1)),
        estimatedCost: Number(ingredients.reduce((sum, ingredient) =>
          sum + ingredient.priceEstimated * ingredient.amountG / 100, 0).toFixed(2)),
        budgetSwaps: row.budget_swaps ? JSON.parse(row.budget_swaps) : [],
        isFavorite: Boolean(row.is_favorite)
      };
    });
  }

  setRecipeFavorite(id: string, isFavorite: boolean): Recipe {
    const result = this.db.execute('UPDATE recipes SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
    if (result.changes === 0) throw new Error('Receita não encontrada.');
    const recipe = this.getRecipes().find(item => item.id === id);
    if (!recipe) throw new Error('Não foi possível carregar a receita atualizada.');
    return recipe;
  }

  getPantry(): PantryItem[] {
    const rows = this.db.query<any>(
      `SELECT p.id, p.food_id, f.name as food_name, p.amount_available_g, p.unit_price, p.updated_at
       FROM pantry_items p
       JOIN foods f ON p.food_id = f.id
       ORDER BY f.name ASC`
    );

    return rows.map(r => ({
      id: r.id,
      foodId: r.food_id,
      foodName: r.food_name,
      amountAvailableG: Number(r.amount_available_g),
      unitPrice: r.unit_price ? Number(r.unit_price) : undefined,
      updatedAt: r.updated_at
    }));
  }

  updatePantryItem(foodId: string, amountAvailableG: number): void {
    const existing = this.db.queryOne<any>('SELECT id FROM pantry_items WHERE food_id = ?', [foodId]);
    const now = new Date().toISOString();

    if (existing) {
      this.db.execute(
        'UPDATE pantry_items SET amount_available_g = ?, updated_at = ? WHERE id = ?',
        [amountAvailableG, now, existing.id]
      );
    } else {
      const id = `pantry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.execute(
        'INSERT INTO pantry_items (id, food_id, amount_available_g, updated_at) VALUES (?, ?, ?, ?)',
        [id, foodId, amountAvailableG, now]
      );
    }
  }

  removePantryItem(foodId: string): void {
    this.db.execute('DELETE FROM pantry_items WHERE food_id = ?', [foodId]);
  }
}
