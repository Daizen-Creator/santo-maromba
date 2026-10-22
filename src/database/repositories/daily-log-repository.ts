import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import { ApplyMealTemplateInput, ApplyMealTemplateResult, DailyIntakeProgress, DailyMealCopyInput, DailyMealCopyResult, DailyMealEntry, DailyMealEntryInput, DailyMealHistoryQuery, HydrationLogInput, LoggedMealInput, MealTemplate, MealTemplateMeal, NutritionAnalytics, NutritionAnalyticsQuery, RecentlyUsedFood, SaveMealTemplateInput } from '../../shared/types';
import { getRecentlyUsedFoods } from '../../domain/recent-foods';
import { filterDailyMealHistory } from '../../domain/daily-meal-history';
import { calculateNutritionAnalytics } from '../../domain/nutrition-analytics';

export class DailyLogRepository {
  constructor(private db: IDatabase) {}

  addMeal(input: LoggedMealInput): void {
    this.db.execute(
      `INSERT INTO logged_meals (
        id, date, meal_name, calories, protein_g, carbs_g, fats_g, items_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'meal-' + randomUUID(), input.date, input.mealName.trim(), input.calories,
        input.proteinG, input.carbsG, input.fatsG, '[]', new Date().toISOString()
      ]
    );
  }

  addWater(input: HydrationLogInput): void {
    this.db.execute(
      'INSERT INTO hydration_logs (id, date, amount_ml, logged_at) VALUES (?, ?, ?, ?)',
      ['water-' + randomUUID(), input.date, input.amountMl, new Date().toISOString()]
    );
  }

  getMeals(date: string): DailyMealEntry[] {
    const rows = this.db.query<any>(
      `SELECT * FROM daily_meal_entries WHERE date = ? ORDER BY scheduled_time, slot_id`, [date]
    );
    return rows.map(row => ({
      id: row.id,
      date: row.date,
      slotId: row.slot_id,
      mealName: row.meal_name,
      scheduledTime: row.scheduled_time,
      recipeId: row.recipe_id || undefined,
      status: row.status,
      items: JSON.parse(row.items_json || '[]'),
      calories: Number(row.calories),
      proteinG: Number(row.protein_g),
      carbsG: Number(row.carbs_g),
      fatsG: Number(row.fats_g),
      note: row.note || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at
    }));
  }

  getRecentlyUsedFoods(limit = 12): RecentlyUsedFood[] {
    const rows = this.db.query<any>(
      `SELECT id, date, slot_id, meal_name, scheduled_time, recipe_id, status, items_json,
              calories, protein_g, carbs_g, fats_g, note, completed_at, updated_at
       FROM daily_meal_entries ORDER BY updated_at DESC`
    );
    const entries: DailyMealEntry[] = [];
    for (const row of rows) {
      try {
        const items = JSON.parse(row.items_json || '[]');
        if (!Array.isArray(items)) continue;
        entries.push({
          id: row.id,
          date: row.date,
          slotId: row.slot_id,
          mealName: row.meal_name,
          scheduledTime: row.scheduled_time,
          recipeId: row.recipe_id || undefined,
          status: row.status,
          items,
          calories: Number(row.calories),
          proteinG: Number(row.protein_g),
          carbsG: Number(row.carbs_g),
          fatsG: Number(row.fats_g),
          note: row.note || undefined,
          completedAt: row.completed_at || undefined,
          updatedAt: row.updated_at
        });
      } catch {
        // Um lançamento legado/corrompido não deve bloquear a consulta das outras refeições.
      }
    }
    return getRecentlyUsedFoods(entries, limit);
  }

  getMealHistory(query: DailyMealHistoryQuery): DailyMealEntry[] {
    const rows = this.db.query<any>(
      `SELECT * FROM daily_meal_entries WHERE date >= ? AND date <= ?
       ORDER BY date DESC, scheduled_time DESC, updated_at DESC`,
      [query.fromDate, query.toDate]
    );
    const entries: DailyMealEntry[] = [];
    for (const row of rows) {
      try {
        const items = JSON.parse(row.items_json || '[]');
        if (!Array.isArray(items)) continue;
        entries.push({
          id: row.id,
          date: row.date,
          slotId: row.slot_id,
          mealName: row.meal_name,
          scheduledTime: row.scheduled_time,
          recipeId: row.recipe_id || undefined,
          status: row.status,
          items,
          calories: Number(row.calories),
          proteinG: Number(row.protein_g),
          carbsG: Number(row.carbs_g),
          fatsG: Number(row.fats_g),
          note: row.note || undefined,
          completedAt: row.completed_at || undefined,
          updatedAt: row.updated_at
        });
      } catch {
        // Ignora somente o registro inválido; os demais continuam pesquisáveis.
      }
    }
    return filterDailyMealHistory(entries, query);
  }

  getNutritionAnalytics(query: NutritionAnalyticsQuery): NutritionAnalytics {
    const loggedMeals = this.db.query<any>(
      `SELECT date, meal_name, calories, protein_g, carbs_g, fats_g
       FROM logged_meals WHERE date >= ? AND date <= ?`,
      [query.fromDate, query.toDate]
    ).map(row => ({
      date: row.date,
      mealName: row.meal_name,
      calories: Number(row.calories),
      proteinG: Number(row.protein_g),
      carbsG: Number(row.carbs_g),
      fatsG: Number(row.fats_g)
    } satisfies LoggedMealInput));
    const mealEntries = this.getMealHistory(query);
    return calculateNutritionAnalytics(query, mealEntries, loggedMeals);
  }

  copyMeals(input: DailyMealCopyInput): DailyMealCopyResult {
    const sourceMeals = this.getMeals(input.sourceDate);
    let copiedCount = 0;
    let skippedCount = 0;
    this.db.transaction(() => {
      for (const meal of sourceMeals) {
        const targetExists = this.db.queryOne<{ present: number }>(
          'SELECT 1 AS present FROM daily_meal_entries WHERE date = ? AND slot_id = ?',
          [input.targetDate, meal.slotId]
        );
        if (targetExists) {
          skippedCount += 1;
          continue;
        }
        this.saveMeal({
          date: input.targetDate,
          slotId: meal.slotId,
          mealName: meal.mealName,
          scheduledTime: meal.scheduledTime,
          recipeId: meal.recipeId,
          status: 'pending',
          items: meal.items.map(item => ({ ...item, consumedAmountG: 0 }))
        });
        copiedCount += 1;
      }
    });
    return { ...input, copiedCount, skippedCount };
  }

  getMealTemplates(): MealTemplate[] {
    const rows = this.db.query<any>('SELECT * FROM meal_templates ORDER BY updated_at DESC, name COLLATE NOCASE');
    const templates: MealTemplate[] = [];
    for (const row of rows) {
      try {
        const meals = JSON.parse(row.meals_json || '[]');
        if (!Array.isArray(meals)) continue;
        templates.push({
          id: row.id,
          name: row.name,
          sourceDate: row.source_date,
          meals: meals as MealTemplateMeal[],
          createdAt: row.created_at
        });
      } catch {
        // Um modelo inválido não impede a consulta dos demais.
      }
    }
    return templates;
  }

  saveMealTemplate(input: SaveMealTemplateInput): MealTemplate {
    const name = input.name.trim();
    if (!name || name.length > 80) throw new Error('O nome do modelo deve ter entre 1 e 80 caracteres.');
    const normalizedName = name.normalize('NFC').toLocaleLowerCase('pt-BR');
    if (this.getMealTemplates().some(template => template.name.normalize('NFC').toLocaleLowerCase('pt-BR') === normalizedName)) {
      throw new Error('Já existe um modelo com esse nome.');
    }
    const entries = this.getMeals(input.sourceDate);
    if (!entries.length) throw new Error('Não há refeições salvas nessa data para criar um modelo.');
    const meals: MealTemplateMeal[] = entries.map(entry => ({
      slotId: entry.slotId,
      mealName: entry.mealName,
      scheduledTime: entry.scheduledTime,
      recipeId: entry.recipeId,
      items: entry.items.map(item => ({ ...item, consumedAmountG: 0 }))
    }));
    const now = new Date().toISOString();
    const id = `template-${randomUUID()}`;
    this.db.execute(
      'INSERT INTO meal_templates (id, name, source_date, meals_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, input.sourceDate, JSON.stringify(meals), now, now]
    );
    const template = this.getMealTemplates().find(item => item.id === id);
    if (!template) throw new Error('Não foi possível carregar o modelo salvo.');
    return template;
  }

  applyMealTemplate(input: ApplyMealTemplateInput): ApplyMealTemplateResult {
    const template = this.getMealTemplates().find(item => item.id === input.templateId);
    if (!template) throw new Error('Modelo de refeições não encontrado.');
    let copiedCount = 0;
    let skippedCount = 0;
    this.db.transaction(() => {
      for (const meal of template.meals) {
        const occupied = this.db.queryOne<{ present: number }>(
          'SELECT 1 AS present FROM daily_meal_entries WHERE date = ? AND slot_id = ?',
          [input.targetDate, meal.slotId]
        );
        if (occupied) {
          skippedCount += 1;
          continue;
        }
        this.saveMeal({
          date: input.targetDate,
          slotId: meal.slotId,
          mealName: meal.mealName,
          scheduledTime: meal.scheduledTime,
          recipeId: meal.recipeId,
          status: 'pending',
          items: meal.items.map(item => ({ ...item, consumedAmountG: 0 }))
        });
        copiedCount += 1;
      }
    });
    return {
      templateId: template.id,
      templateName: template.name,
      targetDate: input.targetDate,
      copiedCount,
      skippedCount
    };
  }

  saveMeal(input: DailyMealEntryInput): DailyMealEntry {
    const now = new Date().toISOString();
    const countsAsConsumed = input.status === 'consumed' || input.status === 'partial';
    const totals = input.items.reduce((sum, item) => {
      const ratio = countsAsConsumed && item.plannedAmountG > 0
        ? item.consumedAmountG / item.plannedAmountG
        : 0;
      sum.calories += item.calories * ratio;
      sum.proteinG += item.proteinG * ratio;
      sum.carbsG += item.carbsG * ratio;
      sum.fatsG += item.fatsG * ratio;
      return sum;
    }, { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
    const id = `daily-meal-${input.date}-${input.slotId}`;
    const completedAt = countsAsConsumed ? now : null;

    this.db.execute(
      `INSERT INTO daily_meal_entries (
        id, date, slot_id, meal_name, scheduled_time, recipe_id, status, items_json,
        calories, protein_g, carbs_g, fats_g, note, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date, slot_id) DO UPDATE SET
        meal_name = excluded.meal_name, scheduled_time = excluded.scheduled_time,
        recipe_id = excluded.recipe_id, status = excluded.status, items_json = excluded.items_json,
        calories = excluded.calories, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g,
        fats_g = excluded.fats_g, note = excluded.note,
        completed_at = CASE
          WHEN excluded.status IN ('consumed', 'partial')
            AND daily_meal_entries.status IN ('consumed', 'partial')
          THEN daily_meal_entries.completed_at
          ELSE excluded.completed_at
        END,
        updated_at = excluded.updated_at`,
      [id, input.date, input.slotId, input.mealName.trim(), input.scheduledTime, input.recipeId || null,
        input.status, JSON.stringify(input.items), totals.calories, totals.proteinG, totals.carbsG,
        totals.fatsG, input.note?.trim() || null, completedAt, now]
    );
    return this.getMeals(input.date).find(meal => meal.slotId === input.slotId)!;
  }

  getProgress(date: string): DailyIntakeProgress {
    const meals = this.db.queryOne<any>(
      `SELECT COUNT(*) AS meal_count, SUM(calories) AS calories,
        SUM(protein_g) AS protein_g, SUM(carbs_g) AS carbs_g, SUM(fats_g) AS fats_g
       FROM logged_meals WHERE date = ?`, [date]
    );
    const checkedMeals = this.db.queryOne<any>(
      `SELECT COUNT(*) AS meal_count, SUM(calories) AS calories,
        SUM(protein_g) AS protein_g, SUM(carbs_g) AS carbs_g, SUM(fats_g) AS fats_g
       FROM daily_meal_entries WHERE date = ? AND status IN ('consumed', 'partial')`, [date]
    );
    const water = this.db.queryOne<{ amount_ml: number | null; entries: number }>(
      'SELECT SUM(amount_ml) AS amount_ml, COUNT(*) AS entries FROM hydration_logs WHERE date = ?', [date]
    );
    const mealCount = Number(meals?.meal_count || 0) + Number(checkedMeals?.meal_count || 0);
    const total = (key: 'calories' | 'protein_g' | 'carbs_g' | 'fats_g') => {
      if (mealCount === 0) return null;
      return Number(meals?.[key] || 0) + Number(checkedMeals?.[key] || 0);
    };
    return {
      date,
      calories: total('calories'),
      proteinG: total('protein_g'),
      carbsG: total('carbs_g'),
      fatsG: total('fats_g'),
      waterMl: Number(water?.entries) > 0 ? Number(water?.amount_ml) : null,
      mealsLogged: mealCount > 0 ? mealCount : null
    };
  }
}
