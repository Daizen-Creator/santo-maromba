import {
  BodyMeasurementRecord,
  CustomFoodInput,
  DashboardSummary,
  Exercise,
  FoodItem,
  NutritionTargets,
  PantryItem,
  PhotoCreateInput,
  PhotoRecord,
  Recipe,
  SubstitutionOption,
  UserProfile,
  WeightAnalyticsPoint,
  WeightRecord,
  WorkoutSession,
  PhysiqueProjectionInput,
  PhysiqueProjectionSnapshot,
  ExerciseMediaInput,
  ExerciseMediaRecord,
  LoggedMealInput,
  DailyMealEntry,
  DailyMealEntryInput,
  DailyMealHistoryQuery,
  DailyMealCopyInput,
  DailyMealCopyResult,
  MealTemplate,
  SaveMealTemplateInput,
  ApplyMealTemplateInput,
  ApplyMealTemplateResult,
  RecentlyUsedFood,
  HydrationLogInput,
  CustomizationMediaInput,
  CustomizationMediaRecord,
  VisualCustomization
} from '../../shared/types';
import { calculateNutritionPlan } from '../../domain/nutrition-calculator';
import { calculatePhysiqueProjection } from '../../domain/physique-projection';
import { SubstitutionEngine } from '../../domain/substitution-engine';
import { DailyWorkoutPlan, WorkoutEngine } from '../../domain/workout-engine';
import {
  calculateMovingAverages,
  calculateWeightDeltas,
  calculateWeightProgress,
  generateDataFreshnessAlerts
} from '../../domain/weight-analytics';
import { INITIAL_FOODS, INITIAL_RECIPES } from '../../database/seeds/nutrition-seeds';
import { INITIAL_EXERCISES } from '../../database/seeds/exercise-seeds';
import { DEFAULT_VISUAL_CUSTOMIZATION } from '../../domain/visual-customization';
import { browserPhotoStore } from './browser-photo-store';
import { CustomFoodInputSchema, DailyMealHistoryQuerySchema, DailyMealCopyInputSchema, SaveMealTemplateInputSchema, ApplyMealTemplateInputSchema } from '../../shared/schema';
import { getRecentlyUsedFoods as selectRecentlyUsedFoods } from '../../domain/recent-foods';
import { filterDailyMealHistory } from '../../domain/daily-meal-history';

const LOCAL_STORAGE_KEY_PROFILE = 'fittrack_profile';
const LOCAL_STORAGE_KEY_WEIGHTS = 'fittrack_weights';
const LOCAL_STORAGE_KEY_MEASUREMENTS = 'fittrack_measurements';
const LOCAL_STORAGE_KEY_PANTRY = 'fittrack_pantry';
const LOCAL_STORAGE_KEY_SESSIONS = 'fittrack_sessions';
const LOCAL_STORAGE_KEY_PROJECTIONS = 'fittrack_physique_projections';
const LOCAL_STORAGE_KEY_DAILY_LOGS = 'fittrack_daily_logs';
const LOCAL_STORAGE_KEY_DAILY_MEALS = 'fittrack_daily_meals';
const LOCAL_STORAGE_KEY_MEAL_TEMPLATES = 'fittrack_meal_templates';
const LOCAL_STORAGE_KEY_CUSTOM_FOODS = 'fittrack_custom_foods';
const LOCAL_STORAGE_KEY_FAVORITE_FOODS = 'fittrack_favorite_foods';
const LOCAL_STORAGE_KEY_FAVORITE_RECIPES = 'fittrack_favorite_recipes';
const LOCAL_STORAGE_KEY_RECIPE_SERVINGS = 'fittrack_recipe_servings';
const LOCAL_STORAGE_KEY_VISUAL_CUSTOMIZATION = 'fittrack_visual_customization';

const workoutEngine = new WorkoutEngine(INITIAL_EXERCISES);

export const api = {
  isElectron: (): boolean => {
    return typeof window !== 'undefined' && Boolean(window.fitTrackAPI);
  },

  // --- PERFIL ---
  getProfile: async (): Promise<UserProfile | null> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getProfile();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar perfil.');
      return res.data || null;
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILE);
    return json ? JSON.parse(json) : null;
  },

  saveProfile: async (profile: any): Promise<UserProfile> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveProfile(profile);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar perfil.');
      return res.data!;
    }
    const current = (await api.getProfile()) || {};
    const updated = { ...current, ...profile, updatedAt: new Date().toISOString() };
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE, JSON.stringify(updated));
    return updated;
  },

  confirmInitialHistory: async (data: any): Promise<UserProfile> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.confirmInitialHistory(data);
      if (!res.success) throw new Error(res.error || 'Erro ao confirmar histórico.');
      return res.data!;
    }
    const current = await api.getProfile();
    if (!current) throw new Error('Preencha e salve o perfil antes de confirmar os dados iniciais.');
    const updated: UserProfile = {
      ...current,
      heightCm: data.confirmedHeightCm,
      birthDate: data.confirmedBirthDate,
      targetWeightKg: data.targetWeightKg,
      initialHistoryConfirmed: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE, JSON.stringify(updated));
    return updated;
  },

  // --- PESAGENS ---
  getWeightHistory: async (): Promise<WeightRecord[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getWeightHistory();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar pesos.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_WEIGHTS);
    return json ? JSON.parse(json) : [];
  },

  addWeightRecord: async (record: any): Promise<WeightRecord> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addWeightRecord(record);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar peso.');
      return res.data!;
    }
    const list = await api.getWeightHistory();
    const newRec: WeightRecord = {
      id: `w-${Date.now()}`,
      date: record.date,
      weightKg: record.weightKg,
      notes: record.notes,
      source: record.source || 'verified',
      createdAt: new Date().toISOString()
    };
    list.push(newRec);
    localStorage.setItem(LOCAL_STORAGE_KEY_WEIGHTS, JSON.stringify(list));
    return newRec;
  },

  updateWeightRecord: async (id: string, record: any): Promise<WeightRecord> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.updateWeightRecord(id, record);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar peso.');
      return res.data!;
    }
    const list = await api.getWeightHistory();
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...record };
      localStorage.setItem(LOCAL_STORAGE_KEY_WEIGHTS, JSON.stringify(list));
      return list[idx];
    }
    throw new Error('Registro não encontrado');
  },

  deleteWeightRecord: async (id: string): Promise<void> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deleteWeightRecord(id);
      if (!res.success) throw new Error(res.error || 'Erro ao deletar peso.');
      return;
    }
    let list = await api.getWeightHistory();
    list = list.filter(r => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY_WEIGHTS, JSON.stringify(list));
  },

  getWeightAnalytics: async (): Promise<WeightAnalyticsPoint[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getWeightAnalytics();
      if (!res.success) throw new Error(res.error || 'Erro nas análises.');
      return res.data || [];
    }
    const list = await api.getWeightHistory();
    return calculateMovingAverages(list);
  },

  // --- FOTOS DO SHAPE ---
  getPhotos: async (): Promise<PhotoRecord[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getPhotos();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar fotos.');
      return res.data || [];
    }
    return browserPhotoStore.list();
  },

  addPhoto: async (data: PhotoCreateInput): Promise<PhotoRecord> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addPhoto(data);
      if (!res.success) throw new Error(res.error || 'Erro ao anexar foto.');
      return res.data!;
    }
    return browserPhotoStore.add(data);
  },

  updatePhotoNotes: async (id: string, notes: string): Promise<PhotoRecord> => {
    if (!api.isElectron()) return browserPhotoStore.updateNotes(id, notes);
    const res = await window.fitTrackAPI.updatePhotoNotes(id, notes);
    if (!res.success) throw new Error(res.error || 'Erro ao atualizar observações da foto.');
    return res.data!;
  },

  deletePhoto: async (id: string): Promise<void> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deletePhoto(id);
      if (!res.success) throw new Error(res.error || 'Erro ao excluir foto.');
      return;
    }
    await browserPhotoStore.delete(id);
  },

  // --- MEDIDAS ---
  getMeasurements: async (): Promise<BodyMeasurementRecord[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getMeasurements();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar medidas.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_MEASUREMENTS);
    return json ? JSON.parse(json) : [];
  },

  saveMeasurement: async (data: any): Promise<BodyMeasurementRecord> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveMeasurement(data);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar medidas.');
      return res.data!;
    }
    const list = await api.getMeasurements();
    const existingIdx = list.findIndex(m => m.date === data.date);
    const updatedRec: BodyMeasurementRecord = {
      id: existingIdx !== -1 ? list[existingIdx].id : `m-${Date.now()}`,
      date: data.date,
      weightKg: data.weightKg,
      waistCircCm: data.waistCircCm,
      armRelaxedCm: data.armRelaxedCm,
      armFlexedCm: data.armFlexedCm,
      chestCm: data.chestCm,
      thighCm: data.thighCm,
      hipCm: data.hipCm,
      shoulderCircCm: data.shoulderCircCm,
      calfCm: data.calfCm,
      bodyFatPct: data.bodyFatPct,
      source: data.source || 'Fita Métrica',
      notes: data.notes,
      createdAt: new Date().toISOString()
    };
    if (existingIdx !== -1) {
      list[existingIdx] = updatedRec;
    } else {
      list.unshift(updatedRec);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_MEASUREMENTS, JSON.stringify(list));
    return updatedRec;
  },

  getPhysiqueProjections: async (): Promise<PhysiqueProjectionSnapshot[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getPhysiqueProjections();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar projeções.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTIONS);
    return json ? JSON.parse(json) : [];
  },

  savePhysiqueProjection: async (input: PhysiqueProjectionInput): Promise<PhysiqueProjectionSnapshot> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.savePhysiqueProjection(input);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar projeção.');
      return res.data!;
    }
    const current = await api.getPhysiqueProjections();
    const saved: PhysiqueProjectionSnapshot = {
      id: 'projection-' + Date.now(),
      createdAt: new Date().toISOString(),
      ...calculatePhysiqueProjection(input),
      comparisons: []
    };
    const updated = [saved, ...current];
    localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTIONS, JSON.stringify(updated));
    return saved;
  },

  // --- NUTRIÇÃO, 200 RECEITAS & SUBSTITUIÇÕES ---
  getFoods: async (): Promise<FoodItem[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getFoods();
      if (!res.success) throw new Error(res.error || 'Erro ao obter alimentos.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_FOODS);
    const customFoods: FoodItem[] = json ? JSON.parse(json) : [];
    const favorites = new Set<string>(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_FOODS) || '[]'));
    return [...INITIAL_FOODS, ...customFoods].map(food => ({ ...food, isFavorite: favorites.has(food.id) }));
  },

  setFoodFavorite: async (id: string, isFavorite: boolean): Promise<FoodItem> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.setFoodFavorite(id, isFavorite);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar favorito.');
      return res.data!;
    }
    const food = (await api.getFoods()).find(item => item.id === id);
    if (!food) throw new Error('Alimento não encontrado.');
    const favorites = new Set<string>(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_FOODS) || '[]'));
    if (isFavorite) favorites.add(id);
    else favorites.delete(id);
    localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITE_FOODS, JSON.stringify([...favorites]));
    return { ...food, isFavorite };
  },

  saveCustomFood: async (input: CustomFoodInput, id?: string): Promise<FoodItem> => {
    const validatedInput = CustomFoodInputSchema.parse(input);
    if (api.isElectron()) {
      const res = id
        ? await window.fitTrackAPI.updateCustomFood(id, validatedInput)
        : await window.fitTrackAPI.createCustomFood(validatedInput);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar alimento personalizado.');
      return res.data!;
    }

    const customFoods = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_FOODS) || '[]') as FoodItem[];
    const duplicate = [...INITIAL_FOODS, ...customFoods].find(food =>
      food.name.localeCompare(validatedInput.name, undefined, { sensitivity: 'accent' }) === 0 && food.id !== id
    );
    if (duplicate) throw new Error('Já existe um alimento com esse nome no catálogo.');

    const existing = id ? customFoods.find(food => food.id === id && food.isCustom) : undefined;
    if (id && !existing) throw new Error('Alimento personalizado não encontrado.');
    const food: FoodItem = {
      id: existing?.id || `custom-food-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      name: validatedInput.name,
      category: validatedInput.category,
      servingSizeG: 100,
      calories: validatedInput.calories,
      proteinG: validatedInput.proteinG,
      carbsG: validatedInput.carbsG,
      fatsG: validatedInput.fatsG,
      fiberG: validatedInput.fiberG,
      isCooked: validatedInput.isCooked ?? false,
      source: 'Informado pelo usuário',
      dataQuality: 'user_reported',
      confidenceLevel: 'unknown',
      substituteGroupId: validatedInput.substituteGroupId?.trim() || undefined,
      isCustom: true
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM_FOODS, JSON.stringify([
      ...customFoods.filter(item => item.id !== food.id), food
    ]));
    return food;
  },

  getRecipes: async (): Promise<Recipe[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getRecipes();
      if (!res.success) throw new Error(res.error || 'Erro ao obter receitas.');
      return res.data || [];
    }
    const favorites = new Set<string>(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_RECIPES) || '[]'));
    const servingValues = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RECIPE_SERVINGS) || '{}') as Record<string, number>;
    return INITIAL_RECIPES.map(recipe => ({ ...recipe, servings: servingValues[recipe.id] ?? 1, isFavorite: favorites.has(recipe.id) }));
  },

  setRecipeFavorite: async (id: string, isFavorite: boolean): Promise<Recipe> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.setRecipeFavorite(id, isFavorite);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar favorito.');
      return res.data!;
    }
    const recipe = INITIAL_RECIPES.find(item => item.id === id);
    if (!recipe) throw new Error('Receita não encontrada.');
    const favorites = new Set<string>(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FAVORITE_RECIPES) || '[]'));
    if (isFavorite) favorites.add(id);
    else favorites.delete(id);
    localStorage.setItem(LOCAL_STORAGE_KEY_FAVORITE_RECIPES, JSON.stringify([...favorites]));
    return { ...recipe, isFavorite };
  },

  setRecipeServings: async (id: string, servings: number): Promise<Recipe> => {
    if (!Number.isInteger(servings) || servings < 1 || servings > 50) {
      throw new Error('O rendimento deve ser um número inteiro entre 1 e 50 porções.');
    }
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.setRecipeServings(id, servings);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar o rendimento da receita.');
      return res.data!;
    }
    const recipe = INITIAL_RECIPES.find(item => item.id === id);
    if (!recipe) throw new Error('Receita não encontrada.');
    const servingValues = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RECIPE_SERVINGS) || '{}') as Record<string, number>;
    servingValues[id] = servings;
    localStorage.setItem(LOCAL_STORAGE_KEY_RECIPE_SERVINGS, JSON.stringify(servingValues));
    return { ...recipe, servings };
  },

  getPantry: async (): Promise<PantryItem[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getPantry();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar despensa.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY);
    return json ? JSON.parse(json) : [];
  },

  updatePantry: async (foodId: string, amountG: number): Promise<void> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.updatePantry(foodId, amountG);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar despensa.');
      return;
    }
    const pantry = await api.getPantry();
    const existing = pantry.find(p => p.foodId === foodId);
    if (existing) {
      existing.amountAvailableG = amountG;
      existing.updatedAt = new Date().toISOString().split('T')[0];
    } else {
      const food = (await api.getFoods()).find(f => f.id === foodId);
      if (food) {
        pantry.push({
          id: `p-${Date.now()}`,
          foodId,
          foodName: food.name,
          amountAvailableG: amountG,
          updatedAt: new Date().toISOString().split('T')[0]
        });
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY, JSON.stringify(pantry));
  },

  getSubstitutions: async (missingFoodId: string, amountG: number): Promise<SubstitutionOption[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getSubstitutions(missingFoodId, amountG);
      if (!res.success) throw new Error(res.error || 'Erro nas substituições.');
      return res.data || [];
    }
    const pantry = await api.getPantry();
    const [foods, recipes] = await Promise.all([api.getFoods(), api.getRecipes()]);
    return new SubstitutionEngine(foods, recipes).generateSubstitutions(missingFoodId, amountG, pantry)
      .map(option => ({
        ...option,
        items: option.items.map(item => {
          const food = foods.find(candidate => candidate.id === item.foodId);
          return {
            ...item,
            dataQuality: food?.dataQuality ?? item.dataQuality ?? 'unverified',
            dataSource: food?.source ?? item.dataSource ?? 'Origem não registrada',
            sourceReference: food?.sourceReference ?? item.sourceReference,
            confidenceLevel: food?.confidenceLevel ?? item.confidenceLevel ?? 'unknown'
          };
        })
      }));
  },

  findRecipesFromPantry: async (maxPrepTime?: number): Promise<Array<Recipe & { matchRate: number }>> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.findRecipesFromPantry(maxPrepTime);
      if (!res.success) throw new Error(res.error || 'Erro ao buscar receitas.');
      return res.data || [];
    }
    const pantry = await api.getPantry();
    const pantryIds = pantry.map(p => p.foodId);
    const [foods, recipes] = await Promise.all([api.getFoods(), api.getRecipes()]);
    return new SubstitutionEngine(foods, recipes).findRecipesFromPantry(pantryIds, maxPrepTime);
  },

  // --- TREINOS ---
  getExercises: async (): Promise<Exercise[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getExercises();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar exercícios.');
      return res.data || [];
    }
    return INITIAL_EXERCISES;
  },

  addExerciseMedia: async (input: ExerciseMediaInput): Promise<ExerciseMediaRecord> => {
    if (!api.isElectron()) throw new Error('Anexe mídias de exercício pelo aplicativo desktop.');
    const res = await window.fitTrackAPI.addExerciseMedia(input);
    if (!res.success) throw new Error(res.error || 'Erro ao salvar mídia do exercício.');
    return res.data!;
  },

  deleteExerciseMedia: async (id: string): Promise<void> => {
    if (!api.isElectron()) throw new Error('Exclua mídias de exercício pelo aplicativo desktop.');
    const res = await window.fitTrackAPI.deleteExerciseMedia(id);
    if (!res.success) throw new Error(res.error || 'Erro ao excluir mídia do exercício.');
  },

  getWorkoutSessions: async (): Promise<WorkoutSession[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getWorkoutSessions();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar sessões de treino.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_SESSIONS);
    return json ? JSON.parse(json) : [];
  },

  logWorkoutSession: async (sessionData: any): Promise<WorkoutSession> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.logWorkoutSession(sessionData);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar treino.');
      return res.data!;
    }
    const sessions = await api.getWorkoutSessions();
    const newS: WorkoutSession = {
      id: `ws-${Date.now()}`,
      date: sessionData.date,
      splitName: sessionData.splitName,
      completed: sessionData.completed,
      durationMinutes: sessionData.durationMinutes,
      perceivedExertion: sessionData.perceivedExertion,
      notes: sessionData.notes,
      sets: sessionData.sets,
      createdAt: new Date().toISOString()
    };
    sessions.unshift(newS);
    localStorage.setItem(LOCAL_STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    return newS;
  },

  generateWorkoutSplit: async (): Promise<DailyWorkoutPlan[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.generateWorkoutSplit();
      if (!res.success) throw new Error(res.error || 'Erro ao gerar divisão de treino.');
      return res.data || [];
    }
    const profile = await api.getProfile();
    const days = profile?.trainingDaysPerWeek || 5;
    const isReturning = Boolean(profile?.interruptionHistoryNotes && profile.interruptionHistoryNotes.includes('Retorno'));
    return workoutEngine.generateSplit(days, isReturning);
  },

  // --- METAS & DASHBOARD ---
  calculateTargets: async (): Promise<NutritionTargets | null> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.calculateTargets();
      if (!res.success) throw new Error(res.error || 'Erro ao calcular metas.');
      return res.data || null;
    }
    const profile = await api.getProfile();
    const weights = await api.getWeightHistory();
    const latest = weights[weights.length - 1];
    return profile && latest ? calculateNutritionPlan(profile, latest.weightKg) : null;
  },

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getDashboardSummary();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar resumo do painel.');
      return res.data!;
    }
    const profile = await api.getProfile();
    const weights = await api.getWeightHistory();
    const latest = weights[weights.length - 1];
    const deltas = calculateWeightDeltas(weights);
    const targets = profile && latest ? calculateNutritionPlan(profile, latest.weightKg) : null;
    const alerts = generateDataFreshnessAlerts(latest || null);
    const progress = calculateWeightProgress(
      weights.length > 0 ? weights[0].weightKg : null,
      deltas.currentWeightKg,
      profile?.targetWeightKg || null
    );
    const sessions = await api.getWorkoutSessions();

    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const logs: Array<LoggedMealInput | HydrationLogInput & { kind: 'water' }> = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_LOGS) || '[]');
    const meals = logs.filter((entry): entry is LoggedMealInput => 'mealName' in entry && entry.date === today);
    const dailyMeals: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const consumedDailyMeals = dailyMeals.filter(entry => entry.date === today && (entry.status === 'consumed' || entry.status === 'partial'));
    const waters = logs.filter((entry): entry is HydrationLogInput & { kind: 'water' } => 'kind' in entry && entry.kind === 'water' && entry.date === today);
    const sum = (key: 'calories' | 'proteinG' | 'carbsG' | 'fatsG') =>
      meals.length || consumedDailyMeals.length
        ? meals.reduce((total, meal) => total + meal[key], 0) + consumedDailyMeals.reduce((total, meal) => total + meal[key], 0)
        : null;

    return {
      currentWeightKg: deltas.currentWeightKg,
      weeklyWeightDeltaKg: deltas.weeklyDeltaKg,
      monthlyWeightDeltaKg: deltas.monthlyDeltaKg,
      movingAverage7dKg: deltas.movingAverage7dKg,
      targetWeightKg: profile?.targetWeightKg || null,
      weightProgressPct: progress,
      nutritionTargets: targets,
      waterGoalMl: targets?.waterMl ?? null,
      waterLoggedMl: waters.length ? waters.reduce((total, log) => total + log.amountMl, 0) : null,
      caloriesLogged: sum('calories'),
      proteinLoggedG: sum('proteinG'),
      carbsLoggedG: sum('carbsG'),
      fatsLoggedG: sum('fatsG'),
      completedMeals: (meals.length + consumedDailyMeals.length) || null,
      totalPlannedMeals: profile?.mealsPerDay ?? null,
      trainingDaysCompleted: sessions.filter(s => s.completed).length,
      trainingDaysPlanned: profile?.trainingDaysPerWeek ?? null,
      outdatedDataAlerts: alerts
    };
  },

  addLoggedMeal: async (input: LoggedMealInput): Promise<DashboardSummary> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addLoggedMeal(input);
      if (!res.success) throw new Error(res.error || 'Erro ao registrar a refeição.');
      return res.data!;
    }
    const logs: any[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_LOGS) || '[]');
    logs.push(input);
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_LOGS, JSON.stringify(logs));
    return api.getDashboardSummary();
  },

  getDailyMeals: async (date: string): Promise<DailyMealEntry[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getDailyMeals(date);
      if (!res.success) throw new Error(res.error || 'Erro ao carregar o checklist alimentar.');
      return res.data || [];
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    return entries.filter(entry => entry.date === date);
  },

  getRecentlyUsedFoods: async (): Promise<RecentlyUsedFood[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getRecentlyUsedFoods();
      if (!res.success) throw new Error(res.error || 'Erro ao consultar alimentos recentes.');
      return res.data || [];
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    return selectRecentlyUsedFoods(entries);
  },

  getMealHistory: async (input: DailyMealHistoryQuery): Promise<DailyMealEntry[]> => {
    const query = DailyMealHistoryQuerySchema.parse(input);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getMealHistory(query);
      if (!res.success) throw new Error(res.error || 'Erro ao consultar o histórico alimentar.');
      return res.data || [];
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    return filterDailyMealHistory(entries, query);
  },

  saveDailyMeal: async (input: DailyMealEntryInput): Promise<DailyMealEntry> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveDailyMeal(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar o checklist alimentar.');
      return res.data;
    }
    const now = new Date().toISOString();
    const consumed = input.status === 'consumed' || input.status === 'partial';
    const totals = input.items.reduce((sum, item) => {
      const ratio = consumed && item.plannedAmountG > 0 ? item.consumedAmountG / item.plannedAmountG : 0;
      sum.calories += item.calories * ratio;
      sum.proteinG += item.proteinG * ratio;
      sum.carbsG += item.carbsG * ratio;
      sum.fatsG += item.fatsG * ratio;
      return sum;
    }, { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
    const entry: DailyMealEntry = {
      ...input,
      id: `daily-meal-${input.date}-${input.slotId}`,
      ...totals,
      completedAt: consumed ? now : undefined,
      updatedAt: now
    };
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const index = entries.findIndex(existing => existing.date === input.date && existing.slotId === input.slotId);
    if (index >= 0) entries[index] = entry;
    else entries.push(entry);
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(entries));
    return entry;
  },

  copyDailyMeals: async (rawInput: DailyMealCopyInput): Promise<DailyMealCopyResult> => {
    const input = DailyMealCopyInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.copyDailyMeals(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao copiar refeições.');
      return res.data;
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const source = entries.filter(entry => entry.date === input.sourceDate);
    const occupiedSlots = new Set(entries.filter(entry => entry.date === input.targetDate).map(entry => entry.slotId));
    let copiedCount = 0;
    let skippedCount = 0;
    const copied: DailyMealEntry[] = [];
    for (const meal of source) {
      if (occupiedSlots.has(meal.slotId)) {
        skippedCount += 1;
        continue;
      }
      copied.push({
        ...meal,
        date: input.targetDate,
        id: `daily-meal-${input.targetDate}-${meal.slotId}`,
        status: 'pending',
        items: meal.items.map(item => ({ ...item, consumedAmountG: 0 })),
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatsG: 0,
        note: undefined,
        completedAt: undefined,
        updatedAt: new Date().toISOString()
      });
      occupiedSlots.add(meal.slotId);
      copiedCount += 1;
    }
    if (copied.length) localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify([...entries, ...copied]));
    return { ...input, copiedCount, skippedCount };
  },

  getMealTemplates: async (): Promise<MealTemplate[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getMealTemplates();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar modelos de refeições.');
      return res.data || [];
    }
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_MEAL_TEMPLATES) || '[]');
  },

  saveMealTemplate: async (rawInput: SaveMealTemplateInput): Promise<MealTemplate> => {
    const input = SaveMealTemplateInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveMealTemplate(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar modelo de refeições.');
      return res.data;
    }
    const templates = await api.getMealTemplates();
    const normalizedName = input.name.normalize('NFC').toLocaleLowerCase('pt-BR');
    if (templates.some(template => template.name.normalize('NFC').toLocaleLowerCase('pt-BR') === normalizedName)) {
      throw new Error('Já existe um modelo com esse nome.');
    }
    const sourceMeals = await api.getDailyMeals(input.sourceDate);
    if (!sourceMeals.length) throw new Error('Não há refeições salvas nessa data para criar um modelo.');
    const template: MealTemplate = {
      id: `template-${globalThis.crypto.randomUUID()}`,
      name: input.name,
      sourceDate: input.sourceDate,
      createdAt: new Date().toISOString(),
      meals: sourceMeals.map(meal => ({
        slotId: meal.slotId,
        mealName: meal.mealName,
        scheduledTime: meal.scheduledTime,
        recipeId: meal.recipeId,
        items: meal.items.map(item => ({ ...item, consumedAmountG: 0 }))
      }))
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_MEAL_TEMPLATES, JSON.stringify([template, ...templates]));
    return template;
  },

  applyMealTemplate: async (rawInput: ApplyMealTemplateInput): Promise<ApplyMealTemplateResult> => {
    const input = ApplyMealTemplateInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.applyMealTemplate(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao aplicar modelo de refeições.');
      return res.data;
    }
    const template = (await api.getMealTemplates()).find(candidate => candidate.id === input.templateId);
    if (!template) throw new Error('Modelo de refeições não encontrado.');
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const occupiedSlots = new Set(entries.filter(entry => entry.date === input.targetDate).map(entry => entry.slotId));
    const now = new Date().toISOString();
    const added: DailyMealEntry[] = [];
    let skippedCount = 0;
    for (const meal of template.meals) {
      if (occupiedSlots.has(meal.slotId)) {
        skippedCount += 1;
        continue;
      }
      added.push({
        id: `daily-meal-${input.targetDate}-${meal.slotId}`,
        date: input.targetDate,
        slotId: meal.slotId,
        mealName: meal.mealName,
        scheduledTime: meal.scheduledTime,
        recipeId: meal.recipeId,
        status: 'pending',
        items: meal.items.map(item => ({ ...item, consumedAmountG: 0 })),
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatsG: 0,
        updatedAt: now
      });
      occupiedSlots.add(meal.slotId);
    }
    if (added.length) localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify([...entries, ...added]));
    return {
      templateId: template.id,
      templateName: template.name,
      targetDate: input.targetDate,
      copiedCount: added.length,
      skippedCount
    };
  },

  addHydrationLog: async (input: HydrationLogInput): Promise<DashboardSummary> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addHydrationLog(input);
      if (!res.success) throw new Error(res.error || 'Erro ao registrar água.');
      return res.data!;
    }
    const logs: any[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_LOGS) || '[]');
    logs.push({ ...input, kind: 'water' });
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_LOGS, JSON.stringify(logs));
    return api.getDashboardSummary();
  },

  getVisualCustomization: async (): Promise<VisualCustomization> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getVisualCustomization();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar a personalização.');
      return res.data!;
    }
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_VISUAL_CUSTOMIZATION);
    return saved ? JSON.parse(saved) : DEFAULT_VISUAL_CUSTOMIZATION;
  },

  saveVisualCustomization: async (config: VisualCustomization): Promise<VisualCustomization> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveVisualCustomization(config);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar a personalização.');
      return res.data!;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_VISUAL_CUSTOMIZATION, JSON.stringify(config));
    return config;
  },

  getCustomizationMedia: async (): Promise<CustomizationMediaRecord[]> => {
    if (!api.isElectron()) return [];
    const res = await window.fitTrackAPI.getCustomizationMedia();
    if (!res.success) throw new Error(res.error || 'Erro ao carregar os arquivos personalizados.');
    return res.data || [];
  },

  addCustomizationMedia: async (input: CustomizationMediaInput): Promise<CustomizationMediaRecord> => {
    if (!api.isElectron()) throw new Error('O armazenamento de mídia está disponível no aplicativo desktop.');
    const res = await window.fitTrackAPI.addCustomizationMedia(input);
    if (!res.success) throw new Error(res.error || 'Erro ao salvar a mídia.');
    return res.data!;
  },

  deleteCustomizationMedia: async (id: string): Promise<void> => {
    if (!api.isElectron()) return;
    const res = await window.fitTrackAPI.deleteCustomizationMedia(id);
    if (!res.success) throw new Error(res.error || 'Erro ao excluir a mídia.');
  }
};
