import {
  BodyMeasurementRecord,
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

const LOCAL_STORAGE_KEY_PROFILE = 'fittrack_profile';
const LOCAL_STORAGE_KEY_WEIGHTS = 'fittrack_weights';
const LOCAL_STORAGE_KEY_MEASUREMENTS = 'fittrack_measurements';
const LOCAL_STORAGE_KEY_PANTRY = 'fittrack_pantry';
const LOCAL_STORAGE_KEY_SESSIONS = 'fittrack_sessions';
const LOCAL_STORAGE_KEY_PROJECTIONS = 'fittrack_physique_projections';
const LOCAL_STORAGE_KEY_DAILY_LOGS = 'fittrack_daily_logs';
const LOCAL_STORAGE_KEY_VISUAL_CUSTOMIZATION = 'fittrack_visual_customization';

const substitutionEngine = new SubstitutionEngine(INITIAL_FOODS, INITIAL_RECIPES);
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
    return [];
  },

  addPhoto: async (data: PhotoCreateInput): Promise<PhotoRecord> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.addPhoto(data);
      if (!res.success) throw new Error(res.error || 'Erro ao anexar foto.');
      return res.data!;
    }
    throw new Error('Para salvar fotos com segurança, abra o aplicativo desktop.');
  },

  updatePhotoNotes: async (id: string, notes: string): Promise<PhotoRecord> => {
    if (!api.isElectron()) throw new Error('Para editar fotos, abra o aplicativo desktop.');
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
    throw new Error('Para excluir fotos, abra o aplicativo desktop.');
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
    return INITIAL_FOODS;
  },

  getRecipes: async (): Promise<Recipe[]> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.getRecipes();
      if (!res.success) throw new Error(res.error || 'Erro ao obter receitas.');
      return res.data || [];
    }
    return INITIAL_RECIPES;
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
      const food = INITIAL_FOODS.find(f => f.id === foodId);
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
    return substitutionEngine.generateSubstitutions(missingFoodId, amountG, pantry);
  },

  findRecipesFromPantry: async (maxPrepTime?: number): Promise<Array<Recipe & { matchRate: number }>> => {
    if (api.isElectron()) {
      const res = await window.fitTrackAPI.findRecipesFromPantry(maxPrepTime);
      if (!res.success) throw new Error(res.error || 'Erro ao buscar receitas.');
      return res.data || [];
    }
    const pantry = await api.getPantry();
    const pantryIds = pantry.map(p => p.foodId);
    return substitutionEngine.findRecipesFromPantry(pantryIds, maxPrepTime);
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
    const waters = logs.filter((entry): entry is HydrationLogInput & { kind: 'water' } => 'kind' in entry && entry.kind === 'water' && entry.date === today);
    const sum = (key: 'calories' | 'proteinG' | 'carbsG' | 'fatsG') => meals.length ? meals.reduce((total, meal) => total + meal[key], 0) : null;

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
      completedMeals: meals.length || null,
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
