import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import {
  BodyMeasurementRecord,
  SaveBodyMeasurementInput,
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
  ProfileGoalHistoryRecord,
  WeightAnalyticsPoint,
  WeightRecord,
  WorkoutSession,
  WorkoutTemplate,
  SaveWorkoutTemplateInput,
  WorkoutScheduleEntry,
  SaveWorkoutScheduleInput,
  CustomBodyMeasurements,
  CustomMeasurementDefinition,
  CustomMeasurementRecord,
  SaveCustomMeasurementDefinitionInput,
  SaveCustomMeasurementInput,
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
  NutritionAnalytics,
  NutritionAnalyticsQuery,
  NutritionMealDistributionEntry,
  MealTemplate,
  SaveMealTemplateInput,
  ApplyMealTemplateInput,
  ApplyMealTemplateResult,
  RecentlyUsedFood,
  HydrationLogInput,
  AppUpdateStatus,
  CustomizationMediaInput,
  CustomizationMediaRecord,
  VisualCustomization,
  MeasurementUnitPreferences,
  CustomFoodInput
} from '../shared/types';
import { DailyWorkoutPlan } from '../domain/workout-engine';

export interface FitTrackAPI {
  // Perfil
  getProfile: () => Promise<{ success: boolean; data?: UserProfile | null; error?: string }>;
  getProfileGoalHistory: () => Promise<{ success: boolean; data?: ProfileGoalHistoryRecord[]; error?: string }>;
  saveProfile: (profile: any) => Promise<{ success: boolean; data?: UserProfile; error?: string }>;
  confirmInitialHistory: (data: any) => Promise<{ success: boolean; data?: UserProfile; error?: string }>;

  // Histórico de Peso
  getWeightHistory: () => Promise<{ success: boolean; data?: WeightRecord[]; error?: string }>;
  addWeightRecord: (record: { date: string; weightKg: number; notes?: string; source?: string }) => Promise<{ success: boolean; data?: WeightRecord; error?: string }>;
  updateWeightRecord: (id: string, record: any) => Promise<{ success: boolean; data?: WeightRecord; error?: string }>;
  deleteWeightRecord: (id: string) => Promise<{ success: boolean; error?: string }>;
  getWeightAnalytics: () => Promise<{ success: boolean; data?: WeightAnalyticsPoint[]; error?: string }>;

  // Fotos
  getPhotos: () => Promise<{ success: boolean; data?: PhotoRecord[]; error?: string }>;
  addPhoto: (data: PhotoCreateInput) => Promise<{ success: boolean; data?: PhotoRecord; error?: string }>;
  updatePhotoNotes: (id: string, notes: string) => Promise<{ success: boolean; data?: PhotoRecord; error?: string }>;
  deletePhoto: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Medidas
  getMeasurements: () => Promise<{ success: boolean; data?: BodyMeasurementRecord[]; error?: string }>;
  saveMeasurement: (data: SaveBodyMeasurementInput) => Promise<{ success: boolean; data?: BodyMeasurementRecord; error?: string }>;
  getCustomMeasurements: () => Promise<{ success: boolean; data?: CustomBodyMeasurements; error?: string }>;
  saveCustomMeasurementDefinition: (input: SaveCustomMeasurementDefinitionInput) => Promise<{ success: boolean; data?: CustomMeasurementDefinition; error?: string }>;
  saveCustomMeasurement: (input: SaveCustomMeasurementInput) => Promise<{ success: boolean; data?: CustomMeasurementRecord; error?: string }>;

  // Projeções físicas
  savePhysiqueProjection: (input: PhysiqueProjectionInput) => Promise<{ success: boolean; data?: PhysiqueProjectionSnapshot; error?: string }>;
  getPhysiqueProjections: () => Promise<{ success: boolean; data?: PhysiqueProjectionSnapshot[]; error?: string }>;

  // Nutrição & Substituições
  getFoods: () => Promise<{ success: boolean; data?: FoodItem[]; error?: string }>;
  setFoodFavorite: (id: string, isFavorite: boolean) => Promise<{ success: boolean; data?: FoodItem; error?: string }>;
  createCustomFood: (food: CustomFoodInput) => Promise<{ success: boolean; data?: FoodItem; error?: string }>;
  updateCustomFood: (id: string, food: CustomFoodInput) => Promise<{ success: boolean; data?: FoodItem; error?: string }>;
  getRecipes: () => Promise<{ success: boolean; data?: Recipe[]; error?: string }>;
  setRecipeFavorite: (id: string, isFavorite: boolean) => Promise<{ success: boolean; data?: Recipe; error?: string }>;
  setRecipeServings: (id: string, servings: number) => Promise<{ success: boolean; data?: Recipe; error?: string }>;
  getPantry: () => Promise<{ success: boolean; data?: PantryItem[]; error?: string }>;
  updatePantry: (foodId: string, amountG: number) => Promise<{ success: boolean; error?: string }>;
  getSubstitutions: (missingFoodId: string, amountG: number) => Promise<{ success: boolean; data?: SubstitutionOption[]; error?: string }>;
  findRecipesFromPantry: (maxPrepTime?: number) => Promise<{ success: boolean; data?: Array<Recipe & { matchRate: number }>; error?: string }>;

  // Treinos
  getExercises: () => Promise<{ success: boolean; data?: Exercise[]; error?: string }>;
  addExerciseMedia: (input: ExerciseMediaInput) => Promise<{ success: boolean; data?: ExerciseMediaRecord; error?: string }>;
  deleteExerciseMedia: (id: string) => Promise<{ success: boolean; error?: string }>;
  getWorkoutSessions: () => Promise<{ success: boolean; data?: WorkoutSession[]; error?: string }>;
  logWorkoutSession: (sessionData: any) => Promise<{ success: boolean; data?: WorkoutSession; error?: string }>;
  generateWorkoutSplit: () => Promise<{ success: boolean; data?: DailyWorkoutPlan[]; error?: string }>;
  getWorkoutTemplates: () => Promise<{ success: boolean; data?: WorkoutTemplate[]; error?: string }>;
  saveWorkoutTemplate: (input: SaveWorkoutTemplateInput) => Promise<{ success: boolean; data?: WorkoutTemplate; error?: string }>;
  getWorkoutSchedule: () => Promise<{ success: boolean; data?: WorkoutScheduleEntry[]; error?: string }>;
  saveWorkoutScheduleEntry: (input: SaveWorkoutScheduleInput) => Promise<{ success: boolean; data?: WorkoutScheduleEntry; error?: string }>;

  // Dashboard & Metas
  calculateTargets: () => Promise<{ success: boolean; data?: NutritionTargets | null; error?: string }>;
  getDashboardSummary: () => Promise<{ success: boolean; data?: DashboardSummary; error?: string }>;
  addLoggedMeal: (input: LoggedMealInput) => Promise<{ success: boolean; data?: DashboardSummary; error?: string }>;
  getDailyMeals: (date: string) => Promise<{ success: boolean; data?: DailyMealEntry[]; error?: string }>;
  getMealHistory: (query: DailyMealHistoryQuery) => Promise<{ success: boolean; data?: DailyMealEntry[]; error?: string }>;
  getNutritionAnalytics: (query: NutritionAnalyticsQuery) => Promise<{ success: boolean; data?: NutritionAnalytics; error?: string }>;
  getNutritionDistribution: (date: string) => Promise<{ success: boolean; data?: NutritionMealDistributionEntry[]; error?: string }>;
  copyDailyMeals: (input: DailyMealCopyInput) => Promise<{ success: boolean; data?: DailyMealCopyResult; error?: string }>;
  getMealTemplates: () => Promise<{ success: boolean; data?: MealTemplate[]; error?: string }>;
  saveMealTemplate: (input: SaveMealTemplateInput) => Promise<{ success: boolean; data?: MealTemplate; error?: string }>;
  applyMealTemplate: (input: ApplyMealTemplateInput) => Promise<{ success: boolean; data?: ApplyMealTemplateResult; error?: string }>;
  getRecentlyUsedFoods: () => Promise<{ success: boolean; data?: RecentlyUsedFood[]; error?: string }>;
  saveDailyMeal: (input: DailyMealEntryInput) => Promise<{ success: boolean; data?: DailyMealEntry; error?: string }>;
  addHydrationLog: (input: HydrationLogInput) => Promise<{ success: boolean; data?: DashboardSummary; error?: string }>;
  getAppVersion: () => Promise<{ success: boolean; data?: string }>;
  onUpdateStatus: (listener: (status: AppUpdateStatus) => void) => () => void;

  // Personalização visual: configurações e arquivos locais validados no processo principal
  getVisualCustomization: () => Promise<{ success: boolean; data?: VisualCustomization; error?: string }>;
  saveVisualCustomization: (config: VisualCustomization) => Promise<{ success: boolean; data?: VisualCustomization; error?: string }>;
  getMeasurementUnits: () => Promise<{ success: boolean; data?: MeasurementUnitPreferences; error?: string }>;
  saveMeasurementUnits: (preferences: MeasurementUnitPreferences) => Promise<{ success: boolean; data?: MeasurementUnitPreferences; error?: string }>;
  getCustomizationMedia: () => Promise<{ success: boolean; data?: CustomizationMediaRecord[]; error?: string }>;
  addCustomizationMedia: (input: CustomizationMediaInput) => Promise<{ success: boolean; data?: CustomizationMediaRecord; error?: string }>;
  deleteCustomizationMedia: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Controles da janela: ações limitadas e validadas no processo principal
  getWindowMaximized: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  toggleWindowMaximize: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
}

const api: FitTrackAPI = {
  getProfile: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILE),
  getProfileGoalHistory: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILE_GOAL_HISTORY),
  saveProfile: (profile) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROFILE, profile),
  confirmInitialHistory: (data) => ipcRenderer.invoke(IPC_CHANNELS.CONFIRM_INITIAL_HISTORY, data),

  getWeightHistory: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WEIGHT_HISTORY),
  addWeightRecord: (record) => ipcRenderer.invoke(IPC_CHANNELS.ADD_WEIGHT_RECORD, record),
  updateWeightRecord: (id, record) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_WEIGHT_RECORD, { id, data: record }),
  deleteWeightRecord: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_WEIGHT_RECORD, id),
  getWeightAnalytics: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WEIGHT_ANALYTICS),

  getPhotos: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PHOTOS),
  addPhoto: (data) => ipcRenderer.invoke(IPC_CHANNELS.ADD_PHOTO, data),
  updatePhotoNotes: (id, notes) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PHOTO_NOTES, { id, notes }),
  deletePhoto: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PHOTO, id),

  getMeasurements: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MEASUREMENTS),
  saveMeasurement: (data) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_MEASUREMENT, data),
  getCustomMeasurements: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CUSTOM_MEASUREMENTS),
  saveCustomMeasurementDefinition: input => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CUSTOM_MEASUREMENT_DEFINITION, input),
  saveCustomMeasurement: input => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CUSTOM_MEASUREMENT, input),

  savePhysiqueProjection: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_PHYSIQUE_PROJECTION, input),
  getPhysiqueProjections: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PHYSIQUE_PROJECTIONS),

  getFoods: () => ipcRenderer.invoke(IPC_CHANNELS.GET_FOODS),
  setFoodFavorite: (id, isFavorite) => ipcRenderer.invoke(IPC_CHANNELS.SET_FOOD_FAVORITE, { id, isFavorite }),
  createCustomFood: food => ipcRenderer.invoke(IPC_CHANNELS.ADD_CUSTOM_FOOD, food),
  updateCustomFood: (id, food) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CUSTOM_FOOD, { id, food }),
  getRecipes: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RECIPES),
  setRecipeFavorite: (id, isFavorite) => ipcRenderer.invoke(IPC_CHANNELS.SET_RECIPE_FAVORITE, { id, isFavorite }),
  setRecipeServings: (id, servings) => ipcRenderer.invoke(IPC_CHANNELS.SET_RECIPE_SERVINGS, { id, servings }),
  getPantry: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PANTRY),
  updatePantry: (foodId, amountG) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PANTRY, { foodId, amountG }),
  getSubstitutions: (missingFoodId, amountG) => ipcRenderer.invoke(IPC_CHANNELS.GET_SUBSTITUTIONS, { missingFoodId, amountG }),
  findRecipesFromPantry: (maxPrepTime) => ipcRenderer.invoke(IPC_CHANNELS.FIND_RECIPES_FROM_PANTRY, maxPrepTime),

  getExercises: () => ipcRenderer.invoke(IPC_CHANNELS.GET_EXERCISES),
  addExerciseMedia: (input) => ipcRenderer.invoke(IPC_CHANNELS.ADD_EXERCISE_MEDIA, input),
  deleteExerciseMedia: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_EXERCISE_MEDIA, id),
  getWorkoutSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKOUT_SESSIONS),
  logWorkoutSession: (sessionData) => ipcRenderer.invoke(IPC_CHANNELS.LOG_WORKOUT_SESSION, sessionData),
  generateWorkoutSplit: () => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_WORKOUT_SPLIT),
  getWorkoutTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKOUT_TEMPLATES),
  saveWorkoutTemplate: input => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WORKOUT_TEMPLATE, input),
  getWorkoutSchedule: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKOUT_SCHEDULE),
  saveWorkoutScheduleEntry: input => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WORKOUT_SCHEDULE, input),

  calculateTargets: () => ipcRenderer.invoke(IPC_CHANNELS.CALCULATE_TARGETS),
  getDashboardSummary: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DASHBOARD_SUMMARY),
  addLoggedMeal: (input) => ipcRenderer.invoke(IPC_CHANNELS.ADD_LOGGED_MEAL, input),
  getDailyMeals: (date) => ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_MEALS, date),
  getMealHistory: (query) => ipcRenderer.invoke(IPC_CHANNELS.GET_MEAL_HISTORY, query),
  getNutritionAnalytics: (query) => ipcRenderer.invoke(IPC_CHANNELS.GET_NUTRITION_ANALYTICS, query),
  getNutritionDistribution: (date) => ipcRenderer.invoke(IPC_CHANNELS.GET_NUTRITION_DISTRIBUTION, date),
  copyDailyMeals: (input) => ipcRenderer.invoke(IPC_CHANNELS.COPY_DAILY_MEALS, input),
  getMealTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MEAL_TEMPLATES),
  saveMealTemplate: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_MEAL_TEMPLATE, input),
  applyMealTemplate: (input) => ipcRenderer.invoke(IPC_CHANNELS.APPLY_MEAL_TEMPLATE, input),
  getRecentlyUsedFoods: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RECENTLY_USED_FOODS),
  saveDailyMeal: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_DAILY_MEAL, input),
  addHydrationLog: (input) => ipcRenderer.invoke(IPC_CHANNELS.ADD_HYDRATION_LOG, input),
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  onUpdateStatus: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, status: AppUpdateStatus) => listener(status);
    ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_STATUS, handler);
  },
  getVisualCustomization: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VISUAL_CUSTOMIZATION),
  saveVisualCustomization: (config) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_VISUAL_CUSTOMIZATION, config),
  getMeasurementUnits: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MEASUREMENT_UNITS),
  saveMeasurementUnits: (preferences) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_MEASUREMENT_UNITS, preferences),
  getCustomizationMedia: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CUSTOMIZATION_MEDIA),
  addCustomizationMedia: (input) => ipcRenderer.invoke(IPC_CHANNELS.ADD_CUSTOMIZATION_MEDIA, input),
  deleteCustomizationMedia: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_CUSTOMIZATION_MEDIA, id),

  getWindowMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_MAXIMIZED),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  toggleWindowMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE)
};

contextBridge.exposeInMainWorld('fitTrackAPI', api);
