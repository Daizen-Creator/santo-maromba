import {
  BodyMeasurementRecord,
  SaveBodyMeasurementInput,
  ShapeMilestone,
  ShapeMilestoneInput,
  ProfileGoalHistoryRecord,
  CustomBodyMeasurements,
  CustomMeasurementDefinition,
  CustomMeasurementRecord,
  SaveCustomMeasurementDefinitionInput,
  SaveCustomMeasurementInput,
  CustomFoodInput,
  DashboardSummary,
  Exercise,
  FoodItem,
  NutritionTargets,
  PantryItem,
  PantryRecipeMatch,
  PantryPriceUpdateInput,
  PantryRecipeSearchInput,
  ShoppingListItem,
  ShoppingListPurchaseInput,
  ShoppingExpenseRecord,
  ShoppingExpenseSummary,
  MealPrepEvent,
  MealPrepEventInput,
  PhotoCreateInput,
  PhotoExportResult,
  PhotoRecord,
  Recipe,
  RecipeFeedbackInput,
  SubstitutionOption,
  UserProfile,
  WeightAnalyticsPoint,
  WeightRecord,
  WorkoutSession,
  WorkoutTemplate,
  SaveWorkoutTemplateInput,
  WorkoutScheduleEntry,
  SaveWorkoutScheduleInput,
  PhysiqueProjectionInput,
  PhysiqueProjectionSnapshot,
  ExerciseMediaInput,
  ExerciseMediaRecord,
  LoggedMealInput,
  DailyMealEntry,
  DailyMealEntryInput,
  DailyMealIdentityInput,
  DailyMealRestoreInput,
  MealPhotoInput,
  MealPhotoIdentityInput,
  MealPhotoRecord,
  DailyMealHistoryQuery,
  DailyMealCopyInput,
  DailyMealCopyResult,
  NutritionAnalytics,
  NutritionAnalyticsQuery,
  NutritionMealDistributionEntry,
  MealTemplate,
  SaveMealTemplateInput,
  ApplyMealTemplateInput,
  ApplyMealTemplateResult,
  ApplyWeeklyMealTemplateInput,
  ApplyWeeklyMealTemplateResult,
  ReorderDailyMealsInput,
  RecentlyUsedFood,
  FoodPortionPreference,
  SaveFoodPortionPreferenceInput,
  PersonalDiaryDateRange,
  PersonalDiaryEntry,
  SavePersonalDiaryEntryInput,
  HydrationLogInput,
  MeasurementUnitPreferences,
  CustomizationMediaInput,
  CustomizationMediaRecord,
  VisualCustomization
} from '../../shared/types';
import { calculateNutritionPlan } from '../../domain/nutrition-calculator';
import { calculatePhysiqueProjection } from '../../domain/physique-projection';
import { SubstitutionEngine } from '../../domain/substitution-engine';
import { rankPantryRecipesForProfile } from '../../domain/recipe-compatibility';
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
import { downloadOriginalPhoto } from './browser-photo-download';
import { browserMealPhotoStore } from './browser-meal-photo-store';
import { CustomFoodInputSchema, DailyMealDateSchema, DailyMealHistoryQuerySchema, DailyMealCopyInputSchema, NutritionAnalyticsQuerySchema, MealPrepEventInputSchema, MealPrepEventIdSchema, SaveMealTemplateInputSchema, ApplyMealTemplateInputSchema, ApplyWeeklyMealTemplateInputSchema, ReorderDailyMealsInputSchema, PantryItemUpdateInputSchema, PantryPriceUpdateInputSchema, PantryRecipeSearchInputSchema, ShoppingListPurchaseInputSchema, SaveWorkoutTemplateInputSchema, SaveWorkoutScheduleInputSchema, SaveCustomMeasurementDefinitionInputSchema, SaveCustomMeasurementInputSchema, ProfileInputSchema, ProfileGoalHistoryRecordSchema, SaveBodyMeasurementInputSchema, MeasurementUnitPreferencesSchema, SaveFoodPortionPreferenceInputSchema, PersonalDiaryDateSchema, PersonalDiaryDateRangeSchema, SavePersonalDiaryEntryInputSchema, LoggedMealInputSchema, DailyMealEntryInputSchema, DailyMealIdentityInputSchema, DailyMealRestoreInputSchema, MealPhotoInputSchema, MealPhotoIdentitySchema, RecipeFeedbackInputSchema, WorkoutSessionInputSchema } from '../../shared/schema';
import { PhotoIdSchema, ShapeMilestoneIdSchema, ShapeMilestoneInputSchema } from '../../shared/schema';
import { DEFAULT_MEASUREMENT_UNIT_PREFERENCES } from '../../domain/measurement-units';
import { getRecentlyUsedFoods as selectRecentlyUsedFoods } from '../../domain/recent-foods';
import { filterDailyMealHistory } from '../../domain/daily-meal-history';
import { calculateNutritionAnalytics } from '../../domain/nutrition-analytics';
import { calculateNutritionDistribution } from '../../domain/nutrition-distribution';
import { sortDailyMealEntries } from '../../domain/daily-meal-order';
import { getWorkoutWeekDates } from '../../domain/workout-week-calendar';
import { inferMealTurn } from '../../domain/meal-turn';
import { calculateCustomFoodInput } from '../../domain/custom-food-composition';
import { buildShoppingList } from '../../domain/shopping-list';
import { summarizeShoppingExpenses } from '../../domain/shopping-expenses';
import { resolveRecipeCost } from '../../domain/recipe-cost';
import { PantryConsumptionRecord, reconcilePantryConsumption } from '../../domain/pantry-consumption';

const LOCAL_STORAGE_KEY_PROFILE = 'fittrack_profile';
const LOCAL_STORAGE_KEY_PROFILE_GOAL_HISTORY = 'fittrack_profile_goal_history';
const LOCAL_STORAGE_KEY_WEIGHTS = 'fittrack_weights';
const LOCAL_STORAGE_KEY_MEASUREMENTS = 'fittrack_measurements';
const LOCAL_STORAGE_KEY_SHAPE_MILESTONES = 'fittrack_shape_milestones';
const LOCAL_STORAGE_KEY_CUSTOM_MEASUREMENT_DEFINITIONS = 'fittrack_custom_measurement_definitions';
const LOCAL_STORAGE_KEY_CUSTOM_MEASUREMENTS = 'fittrack_custom_measurements';
const LOCAL_STORAGE_KEY_PANTRY = 'fittrack_pantry';
const LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION = 'fittrack_pantry_consumption';
const LOCAL_STORAGE_KEY_SHOPPING_LISTS = 'fittrack_shopping_lists';
const LOCAL_STORAGE_KEY_SHOPPING_EXPENSES = 'fittrack_shopping_expenses';
const LOCAL_STORAGE_KEY_MEAL_PREP_EVENTS = 'fittrack_meal_prep_events';
const LOCAL_STORAGE_KEY_SESSIONS = 'fittrack_sessions';
const LOCAL_STORAGE_KEY_WORKOUT_TEMPLATES = 'fittrack_workout_templates';
const LOCAL_STORAGE_KEY_WORKOUT_SCHEDULE = 'fittrack_workout_schedule';
const LOCAL_STORAGE_KEY_PROJECTIONS = 'fittrack_physique_projections';
const LOCAL_STORAGE_KEY_DAILY_LOGS = 'fittrack_daily_logs';
const LOCAL_STORAGE_KEY_DAILY_MEALS = 'fittrack_daily_meals';
const LOCAL_STORAGE_KEY_MEAL_TEMPLATES = 'fittrack_meal_templates';
const LOCAL_STORAGE_KEY_CUSTOM_FOODS = 'fittrack_custom_foods';
const LOCAL_STORAGE_KEY_FAVORITE_FOODS = 'fittrack_favorite_foods';
const LOCAL_STORAGE_KEY_FOOD_PORTION_PREFERENCES = 'fittrack_food_portion_preferences';
const LOCAL_STORAGE_KEY_PERSONAL_DIARY = 'fittrack_personal_diary';
const LOCAL_STORAGE_KEY_FAVORITE_RECIPES = 'fittrack_favorite_recipes';
const LOCAL_STORAGE_KEY_RECIPE_SERVINGS = 'fittrack_recipe_servings';
const LOCAL_STORAGE_KEY_RECIPE_FINAL_WEIGHTS = 'fittrack_recipe_final_weights';
const LOCAL_STORAGE_KEY_RECIPE_FEEDBACK = 'fittrack_recipe_feedback';
const LOCAL_STORAGE_KEY_VISUAL_CUSTOMIZATION = 'fittrack_visual_customization';
const LOCAL_STORAGE_KEY_MEASUREMENT_UNITS = 'fittrack_measurement_units';

const workoutEngine = new WorkoutEngine(INITIAL_EXERCISES);

function recordBrowserProfileGoalChange(previous: UserProfile | null, next: UserProfile, changedAt: string): void {
  const changedFields: ProfileGoalHistoryRecord['changedFields'] = previous
    ? [
        ...(previous.fitnessGoal !== next.fitnessGoal ? ['fitnessGoal' as const] : []),
        ...((previous.targetWeightKg ?? null) !== (next.targetWeightKg ?? null) ? ['targetWeightKg' as const] : [])
      ]
    : ['fitnessGoal', 'targetWeightKg'];
  if (changedFields.length === 0) return;

  const current = api.getProfileGoalHistoryFromStorage();
  const record: ProfileGoalHistoryRecord = {
    id: `profile-goal-${globalThis.crypto.randomUUID()}`,
    profileId: next.id,
    fitnessGoal: next.fitnessGoal,
    targetWeightKg: next.targetWeightKg ?? null,
    changeKind: previous ? 'updated' : 'initial',
    changedFields,
    changedAt
  };
  localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE_GOAL_HISTORY, JSON.stringify([record, ...current]));
}

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

  getProfileGoalHistoryFromStorage: (): ProfileGoalHistoryRecord[] => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PROFILE_GOAL_HISTORY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap(item => {
        const result = ProfileGoalHistoryRecordSchema.safeParse(item);
        return result.success ? [result.data] : [];
      });
    } catch {
      return [];
    }
  },

  getProfileGoalHistory: async (): Promise<ProfileGoalHistoryRecord[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getProfileGoalHistory();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar o histórico de metas.');
      return res.data || [];
    }
    return api.getProfileGoalHistoryFromStorage();
  },

  saveProfile: async (profile: any): Promise<UserProfile> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveProfile(profile);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar perfil.');
      return res.data!;
    }
    const validatedProfile = ProfileInputSchema.parse(profile);
    const current = await api.getProfile();
    const now = new Date().toISOString();
    const updated = {
      ...current,
      ...validatedProfile,
      id: current?.id || validatedProfile.id || 'default-user',
      createdAt: current?.createdAt || now,
      updatedAt: now
    } as UserProfile;
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE, JSON.stringify(updated));
    recordBrowserProfileGoalChange(current, updated, now);
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
      id: current.id || 'default-user',
      heightCm: data.confirmedHeightCm,
      birthDate: data.confirmedBirthDate,
      targetWeightKg: data.targetWeightKg,
      initialHistoryConfirmed: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE, JSON.stringify(updated));
    recordBrowserProfileGoalChange(current, updated, updated.updatedAt);
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
    const weightKgAtPhoto = (await api.getWeightHistory()).filter(record => record.date === data.date).slice(-1)[0]?.weightKg;
    return browserPhotoStore.add(data, weightKgAtPhoto);
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

  exportPhoto: async (rawId: string): Promise<PhotoExportResult> => {
    const id = PhotoIdSchema.parse(rawId);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.exportPhoto(id);
      if (!res.success) throw new Error(res.error || 'Não foi possível exportar a foto original.');
      if (!res.data) throw new Error('O aplicativo não confirmou a exportação da foto.');
      return res.data;
    }

    const [photo, blob] = await Promise.all([
      api.getPhotos().then(list => list.find(item => item.id === id)),
      browserPhotoStore.getOriginalBlob(id)
    ]);
    if (!photo) throw new Error('Foto não encontrada neste aparelho.');
    downloadOriginalPhoto(blob, photo.date);
    return { cancelled: false };
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

  saveMeasurement: async (rawData: SaveBodyMeasurementInput): Promise<BodyMeasurementRecord> => {
    const data = SaveBodyMeasurementInputSchema.parse(rawData);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveMeasurement(data);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar medidas.');
      return res.data!;
    }
    const list = await api.getMeasurements();
    const existingIdx = list.findIndex(m => m.date === data.date);
    const existing = existingIdx !== -1 ? list[existingIdx] : undefined;
    const updatedRec: BodyMeasurementRecord = {
      ...existing,
      id: existing?.id || `m-${Date.now()}`,
      date: data.date,
      heightCm: data.heightCm ?? existing?.heightCm,
      weightKg: data.weightKg ?? existing?.weightKg,
      waistCircCm: data.waistCircCm ?? existing?.waistCircCm,
      armRelaxedCm: data.armRelaxedCm ?? existing?.armRelaxedCm,
      armFlexedCm: data.armFlexedCm ?? existing?.armFlexedCm,
      chestCm: data.chestCm ?? existing?.chestCm,
      thighCm: data.thighCm ?? existing?.thighCm,
      hipCm: data.hipCm ?? existing?.hipCm,
      shoulderCircCm: data.shoulderCircCm ?? existing?.shoulderCircCm,
      calfCm: data.calfCm ?? existing?.calfCm,
      bodyFatPct: data.bodyFatPct ?? existing?.bodyFatPct,
      source: data.source || existing?.source || 'Fita Métrica',
      notes: data.notes ?? existing?.notes,
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    if (existingIdx !== -1) {
      list[existingIdx] = updatedRec;
    } else {
      list.unshift(updatedRec);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_MEASUREMENTS, JSON.stringify(list));
    return updatedRec;
  },

  getShapeMilestones: async (): Promise<ShapeMilestone[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getShapeMilestones();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar os marcos do shape.');
      return res.data || [];
    }
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SHAPE_MILESTONES) || '[]') as ShapeMilestone[];
  },

  saveShapeMilestone: async (rawInput: ShapeMilestoneInput): Promise<ShapeMilestone> => {
    const input = ShapeMilestoneInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveShapeMilestone(input);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar o marco.');
      return res.data!;
    }
    const list = await api.getShapeMilestones();
    const existing = input.id ? list.find(item => item.id === input.id) : undefined;
    if (input.id && !existing) throw new Error('Este marco não existe mais. Atualize a lista antes de editar.');
    const now = new Date().toISOString();
    const saved: ShapeMilestone = {
      ...input,
      id: existing?.id || input.id || `shape-milestone-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_SHAPE_MILESTONES, JSON.stringify([
      ...list.filter(item => item.id !== saved.id), saved
    ]));
    return saved;
  },

  deleteShapeMilestone: async (rawId: string): Promise<void> => {
    const id = ShapeMilestoneIdSchema.parse(rawId);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deleteShapeMilestone(id);
      if (!res.success) throw new Error(res.error || 'Erro ao excluir o marco.');
      return;
    }
    const list = await api.getShapeMilestones();
    if (!list.some(item => item.id === id)) throw new Error('Este marco já foi removido.');
    localStorage.setItem(LOCAL_STORAGE_KEY_SHAPE_MILESTONES, JSON.stringify(list.filter(item => item.id !== id)));
  },

  getCustomMeasurements: async (): Promise<CustomBodyMeasurements> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getCustomMeasurements();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar medidas personalizadas.');
      return res.data || { definitions: [], records: [] };
    }
    try {
      const definitionsRaw = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_MEASUREMENT_DEFINITIONS) || '[]');
      const recordsRaw = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_MEASUREMENTS) || '[]');
      if (!Array.isArray(definitionsRaw) || !Array.isArray(recordsRaw)) return { definitions: [], records: [] };
      const definitions: CustomMeasurementDefinition[] = definitionsRaw.flatMap(item => {
        const parsed = SaveCustomMeasurementDefinitionInputSchema.safeParse({ name: item?.name, unit: item?.unit });
        if (!parsed.success || typeof item?.id !== 'string' || typeof item?.createdAt !== 'string') return [];
        return [{ id: item.id, ...parsed.data, createdAt: item.createdAt }];
      });
      const definitionIds = new Set(definitions.map(item => item.id));
      const records: CustomMeasurementRecord[] = recordsRaw.flatMap(item => {
        const parsed = SaveCustomMeasurementInputSchema.safeParse({
          definitionId: item?.definitionId, date: item?.date, value: item?.value, notes: item?.notes
        });
        if (!parsed.success || !definitionIds.has(parsed.data.definitionId) || typeof item?.id !== 'string' || typeof item?.createdAt !== 'string' || typeof item?.updatedAt !== 'string') return [];
        return [{ id: item.id, ...parsed.data, createdAt: item.createdAt, updatedAt: item.updatedAt }];
      });
      return { definitions, records };
    } catch {
      return { definitions: [], records: [] };
    }
  },

  saveCustomMeasurementDefinition: async (rawInput: SaveCustomMeasurementDefinitionInput): Promise<CustomMeasurementDefinition> => {
    const input = SaveCustomMeasurementDefinitionInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveCustomMeasurementDefinition(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao criar medida personalizada.');
      return res.data;
    }
    const current = await api.getCustomMeasurements();
    const normalizedName = input.name.normalize('NFC').toLocaleLowerCase('pt-BR');
    if (current.definitions.some(item => item.name.normalize('NFC').toLocaleLowerCase('pt-BR') === normalizedName)) {
      throw new Error('Já existe uma medida personalizada com esse nome.');
    }
    const definition: CustomMeasurementDefinition = {
      id: `custom-measure-${globalThis.crypto.randomUUID()}`,
      ...input,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM_MEASUREMENT_DEFINITIONS, JSON.stringify([...current.definitions, definition]));
    return definition;
  },

  saveCustomMeasurement: async (rawInput: SaveCustomMeasurementInput): Promise<CustomMeasurementRecord> => {
    const input = SaveCustomMeasurementInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveCustomMeasurement(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar medida personalizada.');
      return res.data;
    }
    const current = await api.getCustomMeasurements();
    if (!current.definitions.some(definition => definition.id === input.definitionId)) throw new Error('A medida personalizada selecionada não existe.');
    const existing = current.records.find(record => record.definitionId === input.definitionId && record.date === input.date);
    const now = new Date().toISOString();
    const record: CustomMeasurementRecord = {
      id: existing?.id || `custom-measure-value-${globalThis.crypto.randomUUID()}`,
      ...input,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const records = [record, ...current.records.filter(item => !(item.definitionId === input.definitionId && item.date === input.date))];
    localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM_MEASUREMENTS, JSON.stringify(records));
    return record;
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

  getFoodPortionPreferences: async (): Promise<FoodPortionPreference[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getFoodPortionPreferences();
      if (!res.success) throw new Error(res.error || 'Erro ao consultar porções habituais.');
      return res.data || [];
    }
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FOOD_PORTION_PREFERENCES) || '[]');
  },

  saveFoodPortionPreference: async (rawInput: SaveFoodPortionPreferenceInput): Promise<FoodPortionPreference | null> => {
    const input = SaveFoodPortionPreferenceInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveFoodPortionPreference(input);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar porção habitual.');
      return res.data ?? null;
    }
    if (!(await api.getFoods()).some(food => food.id === input.foodId)) {
      throw new Error('Alimento não encontrado.');
    }
    const current = await api.getFoodPortionPreferences();
    const updated = input.amountG === null
      ? current.filter(item => item.foodId !== input.foodId)
      : [
          ...current.filter(item => item.foodId !== input.foodId),
          { ...input, amountG: input.amountG, updatedAt: new Date().toISOString() }
        ];
    localStorage.setItem(LOCAL_STORAGE_KEY_FOOD_PORTION_PREFERENCES, JSON.stringify(updated));
    return updated.find(item => item.foodId === input.foodId) ?? null;
  },

  getPersonalDiaryEntries: async (rawRange: PersonalDiaryDateRange): Promise<PersonalDiaryEntry[]> => {
    const range = PersonalDiaryDateRangeSchema.parse(rawRange);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getPersonalDiaryEntries(range);
      if (!res.success) throw new Error(res.error || 'Erro ao consultar o diário pessoal.');
      return res.data || [];
    }
    const entries: PersonalDiaryEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PERSONAL_DIARY) || '[]');
    return entries.filter(entry => entry.date >= range.fromDate && entry.date <= range.toDate)
      .sort((left, right) => right.date.localeCompare(left.date));
  },

  savePersonalDiaryEntry: async (rawInput: SavePersonalDiaryEntryInput): Promise<PersonalDiaryEntry> => {
    const input = SavePersonalDiaryEntryInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.savePersonalDiaryEntry(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar a anotação do diário.');
      return res.data;
    }
    const entries: PersonalDiaryEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PERSONAL_DIARY) || '[]');
    const existing = entries.find(entry => entry.date === input.date);
    const now = new Date().toISOString();
    const saved: PersonalDiaryEntry = {
      id: existing?.id || `diary-${globalThis.crypto.randomUUID()}`,
      date: input.date,
      note: input.note,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_PERSONAL_DIARY, JSON.stringify([
      ...entries.filter(entry => entry.date !== input.date), saved
    ]));
    return saved;
  },

  deletePersonalDiaryEntry: async (rawDate: string): Promise<boolean> => {
    const date = PersonalDiaryDateSchema.parse(rawDate);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deletePersonalDiaryEntry(date);
      if (!res.success) throw new Error(res.error || 'Erro ao excluir a anotação do diário.');
      return Boolean(res.data);
    }
    const entries: PersonalDiaryEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PERSONAL_DIARY) || '[]');
    const updated = entries.filter(entry => entry.date !== date);
    const removed = updated.length !== entries.length;
    localStorage.setItem(LOCAL_STORAGE_KEY_PERSONAL_DIARY, JSON.stringify(updated));
    return removed;
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

    const composedInput = calculateCustomFoodInput(validatedInput, await api.getFoods(), id);
    const customFoods = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM_FOODS) || '[]') as FoodItem[];
    const duplicate = [...INITIAL_FOODS, ...customFoods].find(food =>
      food.name.localeCompare(composedInput.name, undefined, { sensitivity: 'accent' }) === 0 && food.id !== id
    );
    if (duplicate) throw new Error('Já existe um alimento com esse nome no catálogo.');

    const existing = id ? customFoods.find(food => food.id === id && food.isCustom) : undefined;
    if (id && !existing) throw new Error('Alimento personalizado não encontrado.');
    const food: FoodItem = {
      id: existing?.id || `custom-food-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      name: composedInput.name,
      category: composedInput.category,
      servingSizeG: 100,
      calories: composedInput.calories,
      proteinG: composedInput.proteinG,
      carbsG: composedInput.carbsG,
      fatsG: composedInput.fatsG,
      fiberG: composedInput.fiberG,
      isCooked: composedInput.isCooked ?? false,
      source: 'Informado pelo usuário',
      dataQuality: 'user_reported',
      confidenceLevel: 'unknown',
      substituteGroupId: composedInput.substituteGroupId?.trim() || undefined,
      composition: composedInput.ingredients,
      compositionFinalWeightG: composedInput.finalWeightG,
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
    const finalWeights = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RECIPE_FINAL_WEIGHTS) || '{}') as Record<string, number>;
    const feedbackValues = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RECIPE_FEEDBACK) || '{}') as Record<string, { rating: number | null; personalNotes: string }>;
    const pantry = await api.getPantry();
    return INITIAL_RECIPES.map(recipe => resolveRecipeCost({
      ...recipe,
      servings: servingValues[recipe.id] ?? 1,
      finalWeightG: finalWeights[recipe.id],
      isFavorite: favorites.has(recipe.id),
      userRating: feedbackValues[recipe.id]?.rating ?? undefined,
      personalNotes: feedbackValues[recipe.id]?.personalNotes ?? ''
    }, pantry));
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

  setRecipeFinalWeight: async (id: string, finalWeightG: number | null): Promise<Recipe> => {
    if (finalWeightG !== null && (!Number.isFinite(finalWeightG) || finalWeightG < 1 || finalWeightG > 50000)) {
      throw new Error('O peso final deve ficar entre 1 g e 50.000 g.');
    }
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.setRecipeFinalWeight(id, finalWeightG);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar o peso final da receita.');
      return res.data!;
    }
    const recipe = INITIAL_RECIPES.find(item => item.id === id);
    if (!recipe) throw new Error('Receita não encontrada.');
    const finalWeights = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RECIPE_FINAL_WEIGHTS) || '{}') as Record<string, number>;
    if (finalWeightG === null) delete finalWeights[id];
    else finalWeights[id] = Math.round((finalWeightG + Number.EPSILON) * 10) / 10;
    localStorage.setItem(LOCAL_STORAGE_KEY_RECIPE_FINAL_WEIGHTS, JSON.stringify(finalWeights));
    return { ...recipe, finalWeightG: finalWeights[id] };
  },

  setRecipeFeedback: async (input: RecipeFeedbackInput): Promise<Recipe> => {
    const validated = RecipeFeedbackInputSchema.parse(input);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.setRecipeFeedback(validated);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar avaliação da receita.');
      return res.data!;
    }
    const recipe = INITIAL_RECIPES.find(item => item.id === validated.id);
    if (!recipe) throw new Error('Receita não encontrada.');
    const feedbackValues = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RECIPE_FEEDBACK) || '{}') as Record<string, { rating: number | null; personalNotes: string }>;
    feedbackValues[validated.id] = { rating: validated.rating, personalNotes: validated.personalNotes };
    localStorage.setItem(LOCAL_STORAGE_KEY_RECIPE_FEEDBACK, JSON.stringify(feedbackValues));
    return { ...recipe, userRating: validated.rating ?? undefined, personalNotes: validated.personalNotes };
  },

  getPantry: async (): Promise<PantryItem[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getPantry();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar despensa.');
      return res.data || [];
    }
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY);
    return json ? (JSON.parse(json) as PantryItem[]).map(item => ({ ...item, isLeftover: Boolean(item.isLeftover) })) : [];
  },

  updatePantry: async (foodId: string, amountG: number, expiresAt?: string | null, isLeftover?: boolean): Promise<void> => {
    const input = PantryItemUpdateInputSchema.parse({ foodId, amountG, expiresAt, isLeftover });
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.updatePantry(input.foodId, input.amountG, input.expiresAt, input.isLeftover);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar despensa.');
      return;
    }
    const pantry = await api.getPantry();
    const existing = pantry.find(p => p.foodId === input.foodId);
    const stockChanged = !existing || existing.amountAvailableG !== input.amountG;
    if (existing) {
      existing.amountAvailableG = input.amountG;
      existing.updatedAt = new Date().toISOString().split('T')[0];
      if (input.expiresAt !== undefined) existing.expiresAt = input.expiresAt || undefined;
      if (input.isLeftover !== undefined) existing.isLeftover = input.isLeftover;
    } else {
      const food = (await api.getFoods()).find(f => f.id === input.foodId);
      if (!food) throw new Error('Alimento não encontrado no catálogo.');
      if (food) {
        pantry.push({
          id: `p-${Date.now()}`,
          foodId: input.foodId,
          foodName: food.name,
          amountAvailableG: input.amountG,
          expiresAt: input.expiresAt || undefined,
          isLeftover: input.isLeftover ?? false,
          updatedAt: new Date().toISOString().split('T')[0]
        });
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY, JSON.stringify(pantry));
    if (stockChanged) {
      const consumption: PantryConsumptionRecord[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION) || '[]');
      localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION, JSON.stringify(
        consumption.map(record => record.foodId === input.foodId ? { ...record, deductedG: 0 } : record)
      ));
    }
  },

  updatePantryPrice: async (rawInput: PantryPriceUpdateInput): Promise<void> => {
    const input = PantryPriceUpdateInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.updatePantryPrice(input);
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar o preço informado.');
      return;
    }
    const pantry = await api.getPantry();
    const existing = pantry.find(item => item.foodId === input.foodId);
    const food = (await api.getFoods()).find(item => item.id === input.foodId);
    if (!food) throw new Error('Alimento não encontrado no catálogo.');
    const now = new Date().toISOString();
    if (existing) {
      existing.unitPrice = input.unitPrice ?? undefined;
      existing.priceSource = input.priceSource ?? undefined;
      existing.priceUpdatedAt = input.unitPrice === null ? undefined : now;
    } else {
      pantry.push({
        id: `p-${Date.now()}`,
        foodId: input.foodId,
        foodName: food.name,
        amountAvailableG: 0,
        unitPrice: input.unitPrice ?? undefined,
        priceSource: input.priceSource ?? undefined,
        priceUpdatedAt: input.unitPrice === null ? undefined : now,
        updatedAt: now
      });
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

  findRecipesFromPantry: async (rawInput: PantryRecipeSearchInput = {}): Promise<PantryRecipeMatch[]> => {
    const input = PantryRecipeSearchInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.findRecipesFromPantry(input);
      if (!res.success) throw new Error(res.error || 'Erro ao buscar receitas.');
      return res.data || [];
    }
    const [pantry, foods, recipes, profile] = await Promise.all([
      api.getPantry(), api.getFoods(), api.getRecipes(), api.getProfile()
    ]);
    const matches = new SubstitutionEngine(foods, recipes)
      .findRecipesFromPantry(pantry, input.maxPrepTime, input.requireAllIngredients);
    return rankPantryRecipesForProfile(matches, profile);
  },

  getShoppingList: async (rawWeekStartDate: string): Promise<ShoppingListItem[]> => {
    const weekStartDate = getWorkoutWeekDates(DailyMealDateSchema.parse(rawWeekStartDate))[0];
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getShoppingList(weekStartDate);
      if (!res.success) throw new Error(res.error || 'Erro ao carregar a lista de compras.');
      return res.data || [];
    }
    const lists: Record<string, ShoppingListItem[]> = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SHOPPING_LISTS) || '{}');
    return lists[weekStartDate] || [];
  },

  generateShoppingList: async (rawWeekStartDate: string): Promise<ShoppingListItem[]> => {
    const weekDates = getWorkoutWeekDates(DailyMealDateSchema.parse(rawWeekStartDate));
    const weekStartDate = weekDates[0];
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.generateShoppingList(weekStartDate);
      if (!res.success) throw new Error(res.error || 'Erro ao gerar a lista de compras.');
      return res.data || [];
    }
    const [meals, foods, previous] = await Promise.all([
      api.getMealHistory({ fromDate: weekStartDate, toDate: weekDates[6] }),
      api.getFoods(),
      api.getShoppingList(weekStartDate)
    ]);
    const items = buildShoppingList(weekStartDate, meals, foods, previous);
    const lists: Record<string, ShoppingListItem[]> = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SHOPPING_LISTS) || '{}');
    localStorage.setItem(LOCAL_STORAGE_KEY_SHOPPING_LISTS, JSON.stringify({ ...lists, [weekStartDate]: items }));
    return items;
  },

  setShoppingItemPurchased: async (rawInput: ShoppingListPurchaseInput): Promise<ShoppingListItem[]> => {
    const input = ShoppingListPurchaseInputSchema.parse(rawInput);
    const weekStartDate = getWorkoutWeekDates(input.weekStartDate)[0];
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.setShoppingItemPurchased({ ...input, weekStartDate });
      if (!res.success) throw new Error(res.error || 'Erro ao atualizar a lista de compras.');
      return res.data || [];
    }
    const lists: Record<string, ShoppingListItem[]> = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SHOPPING_LISTS) || '{}');
    const current = lists[weekStartDate] || [];
    const selected = current.find(item => item.foodId === input.foodId);
    if (!selected) throw new Error('O item não pertence à lista de compras desta semana.');
    if (selected.purchased === input.purchased) return current;
    const now = new Date().toISOString();
    const updated = current.map(item => item.foodId === input.foodId
      ? { ...item, purchased: input.purchased, updatedAt: now }
      : item);
    localStorage.setItem(LOCAL_STORAGE_KEY_SHOPPING_LISTS, JSON.stringify({ ...lists, [weekStartDate]: updated }));
    const expenses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SHOPPING_EXPENSES) || '[]') as ShoppingExpenseRecord[];
    if (input.purchased) {
      const pantryItem = (await api.getPantry()).find(item => item.foodId === selected.foodId);
      const hasUserPrice = pantryItem?.unitPrice !== undefined && Boolean(pantryItem.priceSource && pantryItem.priceUpdatedAt);
      const unitPricePerKg = hasUserPrice ? pantryItem!.unitPrice : undefined;
      const totalCost = unitPricePerKg === undefined
        ? undefined
        : Math.round((unitPricePerKg * selected.amountG / 1000 + Number.EPSILON) * 100) / 100;
      expenses.push({
        id: `shopping-expense-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
        weekStartDate, foodId: selected.foodId, foodName: selected.foodName, amountG: selected.amountG,
        purchasedAt: now, unitPricePerKg, totalCost, priceSource: hasUserPrice ? pantryItem!.priceSource : undefined
      });
    } else {
      const latestIndex = expenses.reduce((latest, expense, index) =>
        expense.weekStartDate === weekStartDate && expense.foodId === selected.foodId
          && (latest < 0 || expense.purchasedAt > expenses[latest].purchasedAt) ? index : latest, -1);
      if (latestIndex >= 0) expenses.splice(latestIndex, 1);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_SHOPPING_EXPENSES, JSON.stringify(expenses));
    return updated;
  },

  getShoppingExpenses: async (rawRange: NutritionAnalyticsQuery): Promise<ShoppingExpenseSummary> => {
    const range = NutritionAnalyticsQuerySchema.parse(rawRange);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getShoppingExpenses(range);
      if (!res.success) throw new Error(res.error || 'Não foi possível consultar os gastos.');
      return res.data!;
    }
    const expenses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SHOPPING_EXPENSES) || '[]') as ShoppingExpenseRecord[];
    return summarizeShoppingExpenses(range, expenses);
  },

  getMealPrepEvents: async (rawRange: NutritionAnalyticsQuery): Promise<MealPrepEvent[]> => {
    const range = NutritionAnalyticsQuerySchema.parse(rawRange);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getMealPrepEvents(range);
      if (!res.success) throw new Error(res.error || 'Não foi possível carregar o calendário de preparo.');
      return res.data || [];
    }
    const events = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_MEAL_PREP_EVENTS) || '[]') as MealPrepEvent[];
    return events.filter(event => event.date >= range.fromDate && event.date <= range.toDate)
      .sort((left, right) => left.date.localeCompare(right.date) || left.scheduledTime.localeCompare(right.scheduledTime));
  },

  saveMealPrepEvent: async (rawInput: MealPrepEventInput): Promise<MealPrepEvent> => {
    const input = MealPrepEventInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveMealPrepEvent(input);
      if (!res.success) throw new Error(res.error || 'Não foi possível salvar o preparo.');
      return res.data!;
    }
    const recipe = (await api.getRecipes()).find(item => item.id === input.recipeId);
    if (!recipe) throw new Error('A receita escolhida não existe no catálogo local.');
    const events = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_MEAL_PREP_EVENTS) || '[]') as MealPrepEvent[];
    const existing = input.id ? events.find(event => event.id === input.id) : undefined;
    if (input.id && !existing) throw new Error('O preparo não existe mais no calendário.');
    const now = new Date().toISOString();
    const event: MealPrepEvent = {
      ...input,
      id: input.id || `meal-prep-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
      recipeName: recipe.name,
      notes: input.notes || undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_MEAL_PREP_EVENTS, JSON.stringify([
      ...events.filter(item => item.id !== event.id), event
    ]));
    return event;
  },

  deleteMealPrepEvent: async (rawId: string): Promise<void> => {
    const id = MealPrepEventIdSchema.parse(rawId);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deleteMealPrepEvent(id);
      if (!res.success) throw new Error(res.error || 'Não foi possível excluir o preparo.');
      return;
    }
    const events = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_MEAL_PREP_EVENTS) || '[]') as MealPrepEvent[];
    if (!events.some(event => event.id === id)) throw new Error('O preparo não existe mais no calendário.');
    localStorage.setItem(LOCAL_STORAGE_KEY_MEAL_PREP_EVENTS, JSON.stringify(events.filter(event => event.id !== id)));
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
    const validatedSession = WorkoutSessionInputSchema.parse(sessionData);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.logWorkoutSession(validatedSession);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar treino.');
      return res.data!;
    }
    const sessions = await api.getWorkoutSessions();
    const exercises = await api.getExercises();
    const exerciseNames = new Map(exercises.map(exercise => [exercise.id, exercise.name]));
    const newS: WorkoutSession = {
      id: `ws-${Date.now()}`,
      date: validatedSession.date,
      splitName: validatedSession.splitName,
      completed: validatedSession.completed,
      durationMinutes: validatedSession.durationMinutes,
      perceivedExertion: validatedSession.perceivedExertion,
      discomfortLevel: validatedSession.discomfortLevel,
      discomfortArea: validatedSession.discomfortArea,
      recoveryRating: validatedSession.recoveryRating,
      notes: validatedSession.notes,
      sets: validatedSession.sets.map((set, index) => ({
        ...set,
        id: `set-${Date.now()}-${index}`,
        exerciseName: exerciseNames.get(set.exerciseId) || set.exerciseId
      })),
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
    return workoutEngine.generateSplit(days, isReturning, profile?.trainingWeekdays);
  },

  getWorkoutTemplates: async (): Promise<WorkoutTemplate[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getWorkoutTemplates();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar modelos de treino.');
      return res.data || [];
    }
    try {
      const templates = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUT_TEMPLATES) || '[]') as WorkoutTemplate[];
      if (!Array.isArray(templates)) return [];
      return templates.flatMap(template => {
        const parsed = SaveWorkoutTemplateInputSchema.safeParse({ name: template?.name, plans: template?.plans });
        if (!parsed.success || typeof template?.id !== 'string' || typeof template?.createdAt !== 'string' || typeof template?.updatedAt !== 'string') return [];
        return [{ id: template.id, name: parsed.data.name, plans: parsed.data.plans, createdAt: template.createdAt, updatedAt: template.updatedAt }];
      });
    } catch {
      return [];
    }
  },

  saveWorkoutTemplate: async (rawInput: SaveWorkoutTemplateInput): Promise<WorkoutTemplate> => {
    const input = SaveWorkoutTemplateInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveWorkoutTemplate(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar modelo de treino.');
      return res.data;
    }
    const exercises = await api.getExercises();
    const exerciseIds = new Set(exercises.map(exercise => exercise.id));
    const missingId = input.plans.flatMap(plan => plan.exercises).find(item => !exerciseIds.has(item.exerciseId));
    if (missingId) throw new Error(`O exercício ${missingId.exerciseId} não existe no catálogo local.`);
    const templates = await api.getWorkoutTemplates();
    const existing = input.id ? templates.find(template => template.id === input.id) : undefined;
    if (input.id && !existing) throw new Error('O modelo de treino selecionado não existe mais.');
    const normalizedName = input.name.normalize('NFC').toLocaleLowerCase('pt-BR');
    if (templates.some(template => template.id !== input.id && template.name.normalize('NFC').toLocaleLowerCase('pt-BR') === normalizedName)) {
      throw new Error('Já existe um modelo de treino com esse nome.');
    }
    if (!input.plans.some(plan => plan.exercises.length > 0)) throw new Error('Adicione ao menos um exercício antes de salvar o modelo.');
    const now = new Date().toISOString();
    const template: WorkoutTemplate = {
      id: existing?.id || `workout-template-${globalThis.crypto.randomUUID()}`,
      name: input.name,
      plans: input.plans,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_WORKOUT_TEMPLATES, JSON.stringify(
      existing ? templates.map(item => item.id === existing.id ? template : item) : [template, ...templates]
    ));
    return template;
  },

  getWorkoutSchedule: async (): Promise<WorkoutScheduleEntry[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getWorkoutSchedule();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar a agenda de treino.');
      return res.data || [];
    }
    try {
      const entries = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUT_SCHEDULE) || '[]') as WorkoutScheduleEntry[];
      if (!Array.isArray(entries)) return [];
      return entries.flatMap(entry => {
        const parsed = SaveWorkoutScheduleInputSchema.safeParse({
          date: entry?.date,
          kind: entry?.kind,
          title: entry?.title,
          notes: entry?.notes
        });
        if (!parsed.success || typeof entry?.id !== 'string' || typeof entry?.createdAt !== 'string' || typeof entry?.updatedAt !== 'string') return [];
        return [{ id: entry.id, ...parsed.data, createdAt: entry.createdAt, updatedAt: entry.updatedAt }];
      }).sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  },

  saveWorkoutScheduleEntry: async (rawInput: SaveWorkoutScheduleInput): Promise<WorkoutScheduleEntry> => {
    const input = SaveWorkoutScheduleInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveWorkoutScheduleEntry(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar a agenda de treino.');
      return res.data;
    }
    const entries = await api.getWorkoutSchedule();
    const current = entries.find(entry => entry.date === input.date);
    const now = new Date().toISOString();
    const saved: WorkoutScheduleEntry = {
      id: current?.id || `workout-schedule-${globalThis.crypto.randomUUID()}`,
      ...input,
      createdAt: current?.createdAt || now,
      updatedAt: now
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_WORKOUT_SCHEDULE, JSON.stringify([saved, ...entries.filter(entry => entry.date !== input.date)]));
    return saved;
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
    input = LoggedMealInputSchema.parse(input);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addLoggedMeal(input);
      if (!res.success) throw new Error(res.error || 'Erro ao registrar a refeição.');
      return res.data!;
    }
    const logs: any[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_LOGS) || '[]');
    const id = `quick-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${logs.length}`}`;
    logs.push({ ...input, id, createdAt: new Date().toISOString() });
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
    return sortDailyMealEntries(entries.filter(entry => entry.date === date).map(entry => ({
      ...entry,
      mealTurn: entry.mealTurn || inferMealTurn(entry.slotId, entry.mealName)
    })));
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
    return filterDailyMealHistory(entries, query).map(entry => ({
      ...entry,
      mealTurn: entry.mealTurn || inferMealTurn(entry.slotId, entry.mealName)
    }));
  },

  getNutritionAnalytics: async (rawInput: NutritionAnalyticsQuery): Promise<NutritionAnalytics> => {
    const query = NutritionAnalyticsQuerySchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getNutritionAnalytics(query);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao calcular as médias nutricionais.');
      return res.data;
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const storedLogs: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_LOGS) || '[]');
    const loggedMeals: LoggedMealInput[] = storedLogs.filter(log =>
      log.kind !== 'water'
      && typeof log.date === 'string'
      && typeof log.mealName === 'string'
      && [log.calories, log.proteinG, log.carbsG, log.fatsG].every(value => typeof value === 'number' && Number.isFinite(value))
    ).map(log => ({
      date: log.date as string,
      mealName: log.mealName as string,
      mealTurn: typeof log.mealTurn === 'string' ? log.mealTurn as LoggedMealInput['mealTurn'] : inferMealTurn('', log.mealName as string),
      calories: log.calories as number,
      proteinG: log.proteinG as number,
      carbsG: log.carbsG as number,
      fatsG: log.fatsG as number
    }));
    return calculateNutritionAnalytics(query, entries, loggedMeals);
  },

  getNutritionDistribution: async (rawDate: string): Promise<NutritionMealDistributionEntry[]> => {
    const date = DailyMealDateSchema.parse(rawDate);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getNutritionDistribution(date);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao consultar refeições consumidas.');
      return res.data;
    }
    const storedEntries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const entries = storedEntries.map(entry => ({ ...entry, mealTurn: entry.mealTurn || inferMealTurn(entry.slotId, entry.mealName) }));
    const storedLogs: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_LOGS) || '[]');
    const loggedMeals = storedLogs.flatMap((log, index) => {
      if (log.kind === 'water' || log.date !== date || typeof log.mealName !== 'string'
        || ![log.calories, log.proteinG, log.carbsG, log.fatsG].every(value => typeof value === 'number' && Number.isFinite(value))) return [];
      return [{
        id: typeof log.id === 'string' ? log.id : `quick-${date}-${index}`,
        date,
        mealName: log.mealName,
        mealTurn: typeof log.mealTurn === 'string' ? log.mealTurn as LoggedMealInput['mealTurn'] : inferMealTurn('', log.mealName),
        calories: log.calories as number,
        proteinG: log.proteinG as number,
        carbsG: log.carbsG as number,
        fatsG: log.fatsG as number,
        loggedAt: typeof log.createdAt === 'string' ? log.createdAt : undefined
      }];
    });
    return calculateNutritionDistribution(date, entries, loggedMeals);
  },

  saveDailyMeal: async (input: DailyMealEntryInput): Promise<DailyMealEntry> => {
    input = DailyMealEntryInputSchema.parse(input);
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
      mealTurn: input.mealTurn || inferMealTurn(input.slotId, input.mealName),
      id: `daily-meal-${input.date}-${input.slotId}`,
      ...totals,
      completedAt: consumed ? now : undefined,
      updatedAt: now
    };
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const index = entries.findIndex(existing => existing.date === input.date && existing.slotId === input.slotId);
    const previous = index >= 0 ? entries[index] : null;
    if (entry.sortOrder === undefined && previous?.sortOrder !== undefined) entry.sortOrder = previous.sortOrder;
    if (consumed && previous && (previous.status === 'consumed' || previous.status === 'partial') && previous.completedAt) {
      entry.completedAt = previous.completedAt;
    }
    const pantry: PantryItem[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY) || '[]');
    const pantryConsumption: PantryConsumptionRecord[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION) || '[]');
    const reconciledPantry = reconcilePantryConsumption(input, pantry, pantryConsumption, now);
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY, JSON.stringify(reconciledPantry.pantry));
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION, JSON.stringify(reconciledPantry.records));
    if (index >= 0) entries[index] = entry;
    else entries.push(entry);
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(entries));
    return entry;
  },

  deleteDailyMeal: async (rawInput: DailyMealIdentityInput): Promise<DailyMealEntry> => {
    const input = DailyMealIdentityInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deleteDailyMeal(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao excluir o lançamento alimentar.');
      return res.data;
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const entry = entries.find(item => item.date === input.date && item.slotId === input.slotId);
    if (!entry) throw new Error('O lançamento alimentar não foi encontrado.');
    const pantry: PantryItem[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY) || '[]');
    const records: PantryConsumptionRecord[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION) || '[]');
    const reconciled = reconcilePantryConsumption({ ...entry, status: 'pending' }, pantry, records);
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY, JSON.stringify(reconciled.pantry));
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION, JSON.stringify(reconciled.records));
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(entries.filter(item => item.id !== entry.id)));
    return { ...entry, mealTurn: entry.mealTurn || inferMealTurn(entry.slotId, entry.mealName) };
  },

  restoreDailyMeal: async (rawInput: DailyMealRestoreInput): Promise<DailyMealEntry> => {
    const input = DailyMealRestoreInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.restoreDailyMeal(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao desfazer a exclusão do lançamento.');
      return res.data;
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    if (entries.some(item => item.date === input.date && item.slotId === input.slotId)) {
      throw new Error('Já existe uma refeição neste horário; remova o novo registro antes de desfazer a exclusão.');
    }
    const restored: DailyMealEntry = {
      ...input,
      mealTurn: input.mealTurn || inferMealTurn(input.slotId, input.mealName)
    };
    const pantry: PantryItem[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY) || '[]');
    const records: PantryConsumptionRecord[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION) || '[]');
    const reconciled = reconcilePantryConsumption(input, pantry, records);
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY, JSON.stringify(reconciled.pantry));
    localStorage.setItem(LOCAL_STORAGE_KEY_PANTRY_CONSUMPTION, JSON.stringify(reconciled.records));
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify([...entries, restored]));
    return restored;
  },

  getMealPhotos: async (rawDate: string): Promise<MealPhotoRecord[]> => {
    const date = DailyMealDateSchema.parse(rawDate);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getMealPhotos(date);
      if (!res.success) throw new Error(res.error || 'Erro ao carregar fotos de refeições.');
      return res.data || [];
    }
    return browserMealPhotoStore.list(date);
  },

  addMealPhoto: async (rawInput: MealPhotoInput): Promise<MealPhotoRecord> => {
    const input = MealPhotoInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addMealPhoto(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao salvar foto da refeição.');
      return res.data;
    }
    return browserMealPhotoStore.add(input);
  },

  deleteMealPhoto: async (rawInput: MealPhotoIdentityInput): Promise<void> => {
    const input = MealPhotoIdentitySchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.deleteMealPhoto(input);
      if (!res.success) throw new Error(res.error || 'Erro ao excluir foto da refeição.');
      return;
    }
    await browserMealPhotoStore.delete(input.mealEntryId);
  },

  copyDailyMeals: async (rawInput: DailyMealCopyInput): Promise<DailyMealCopyResult> => {
    const input = DailyMealCopyInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.copyDailyMeals(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao copiar refeições.');
      return res.data;
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const source = sortDailyMealEntries(entries.filter(entry => entry.date === input.sourceDate));
    const existingTarget = sortDailyMealEntries(entries.filter(entry => entry.date === input.targetDate));
    const occupiedSlots = new Set(existingTarget.map(entry => entry.slotId));
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
    if (copied.length) {
      const order = new Map([...existingTarget, ...copied].map((entry, index) => [entry.slotId, index]));
      const updated = [...entries, ...copied].map(entry => entry.date === input.targetDate
        ? { ...entry, sortOrder: order.get(entry.slotId) }
        : entry);
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(updated));
    }
    return { ...input, copiedCount, skippedCount };
  },

  reorderDailyMeals: async (rawInput: ReorderDailyMealsInput): Promise<DailyMealEntry[]> => {
    const input = ReorderDailyMealsInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.reorderDailyMeals(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao reordenar as refeições.');
      return res.data;
    }
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    const dateEntries = entries.filter(entry => entry.date === input.date);
    const existingSlots = new Set(dateEntries.map(entry => entry.slotId));
    if (input.slotIds.length !== dateEntries.length || new Set(input.slotIds).size !== dateEntries.length
      || input.slotIds.some(slotId => !existingSlots.has(slotId))) {
      throw new Error('A lista mudou desde que você abriu a semana. Recarregue e tente novamente.');
    }
    const order = new Map(input.slotIds.map((slotId, index) => [slotId, index]));
    const now = new Date().toISOString();
    const updated = entries.map(entry => entry.date === input.date
      ? { ...entry, sortOrder: order.get(entry.slotId), updatedAt: now }
      : entry);
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(updated));
    return sortDailyMealEntries(updated.filter(entry => entry.date === input.date));
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
    const existingTarget = sortDailyMealEntries(entries.filter(entry => entry.date === input.targetDate));
    const occupiedSlots = new Set(existingTarget.map(entry => entry.slotId));
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
    if (added.length) {
      const order = new Map([...existingTarget, ...added].map((entry, index) => [entry.slotId, index]));
      const updated = [...entries, ...added].map(entry => entry.date === input.targetDate
        ? { ...entry, sortOrder: order.get(entry.slotId) }
        : entry);
      localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(updated));
    }
    return {
      templateId: template.id,
      templateName: template.name,
      targetDate: input.targetDate,
      copiedCount: added.length,
      skippedCount
    };
  },

  applyMealTemplateToWeek: async (rawInput: ApplyWeeklyMealTemplateInput): Promise<ApplyWeeklyMealTemplateResult> => {
    const input = ApplyWeeklyMealTemplateInputSchema.parse(rawInput);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.applyMealTemplateToWeek(input);
      if (!res.success || !res.data) throw new Error(res.error || 'Erro ao montar o plano semanal de refeições.');
      return res.data;
    }
    const template = (await api.getMealTemplates()).find(candidate => candidate.id === input.templateId);
    if (!template) throw new Error('Modelo de refeições não encontrado.');
    const dates = getWorkoutWeekDates(input.weekStartDate);
    const entries: DailyMealEntry[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_MEALS) || '[]');
    let updated = [...entries];
    let copiedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();
    for (const date of dates) {
      const existingTarget = sortDailyMealEntries(updated.filter(entry => entry.date === date));
      const occupiedSlots = new Set(existingTarget.map(entry => entry.slotId));
      const added: DailyMealEntry[] = [];
      for (const meal of template.meals) {
        if (occupiedSlots.has(meal.slotId)) {
          skippedCount += 1;
          continue;
        }
        added.push({
          id: `daily-meal-${date}-${meal.slotId}`,
          date,
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
        copiedCount += 1;
      }
      if (added.length) {
        const order = new Map([...existingTarget, ...added].map((entry, index) => [entry.slotId, index]));
        updated = [...updated, ...added].map(entry => entry.date === date
          ? { ...entry, sortOrder: order.get(entry.slotId), updatedAt: now }
          : entry);
      }
    }
    if (copiedCount) localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_MEALS, JSON.stringify(updated));
    return { ...input, weekStartDate: dates[0], templateName: template.name, dates, copiedCount, skippedCount };
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
  },

  getMeasurementUnits: async (): Promise<MeasurementUnitPreferences> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getMeasurementUnits();
      if (!res.success) throw new Error(res.error || 'Erro ao carregar as unidades.');
      return res.data || { ...DEFAULT_MEASUREMENT_UNIT_PREFERENCES };
    }
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MEASUREMENT_UNITS);
    if (!raw) return { ...DEFAULT_MEASUREMENT_UNIT_PREFERENCES };
    try {
      const parsed = MeasurementUnitPreferencesSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : { ...DEFAULT_MEASUREMENT_UNIT_PREFERENCES };
    } catch {
      return { ...DEFAULT_MEASUREMENT_UNIT_PREFERENCES };
    }
  },

  saveMeasurementUnits: async (rawPreferences: MeasurementUnitPreferences): Promise<MeasurementUnitPreferences> => {
    const preferences = MeasurementUnitPreferencesSchema.parse(rawPreferences);
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.saveMeasurementUnits(preferences);
      if (!res.success) throw new Error(res.error || 'Erro ao salvar as unidades.');
      return res.data!;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_MEASUREMENT_UNITS, JSON.stringify(preferences));
    return preferences;
  }
};
