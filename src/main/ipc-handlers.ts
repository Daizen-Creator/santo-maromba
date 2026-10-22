import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import {
  InitialHistoryConfirmationSchema,
  HydrationLogInputSchema,
  LoggedMealInputSchema,
  ExerciseMediaIdSchema,
  ExerciseMediaInputSchema,
  PhotoIdSchema,
  PhotoInputSchema,
  PhotoNotesUpdateSchema,
  PhysiqueProjectionInputSchema,
  ProfileInputSchema,
  WeightRecordInputSchema,
  WorkoutSessionInputSchema,
  SaveWorkoutTemplateInputSchema,
  SaveWorkoutScheduleInputSchema,
  SaveCustomMeasurementDefinitionInputSchema,
  SaveCustomMeasurementInputSchema,
  SaveBodyMeasurementInputSchema,
  VisualCustomizationSchema,
  MeasurementUnitPreferencesSchema,
  CustomizationMediaInputSchema,
  CustomizationMediaIdSchema,
  DailyMealDateSchema,
  DailyMealHistoryQuerySchema,
  NutritionAnalyticsQuerySchema,
  DailyMealCopyInputSchema,
  SaveMealTemplateInputSchema,
  ApplyMealTemplateInputSchema,
  ApplyWeeklyMealTemplateInputSchema,
  ReorderDailyMealsInputSchema,
  PantryRecipeSearchInputSchema,
  PantryItemUpdateInputSchema,
  PantryPriceUpdateInputSchema,
  ShoppingListPurchaseInputSchema,
  DailyMealEntryInputSchema,
  DailyMealIdentityInputSchema,
  DailyMealRestoreInputSchema,
  MealPhotoIdentitySchema,
  MealPhotoInputSchema,
  CustomFoodInputSchema,
  CustomFoodUpdateInputSchema,
  RecipeFavoriteInputSchema,
  RecipeServingsInputSchema,
  RecipeFinalWeightInputSchema,
  RecipeFeedbackInputSchema,
  SaveFoodPortionPreferenceInputSchema,
  PersonalDiaryDateSchema,
  PersonalDiaryDateRangeSchema,
  SavePersonalDiaryEntryInputSchema
} from '../shared/schema';
import { FitTrackService } from '../services/fittrack-service';
import { IDatabase } from '../database/driver';

export function registerIpcHandlers(
  db: IDatabase,
  photoDirectory?: string,
  exerciseMediaDirectory?: string,
  customizationMediaDirectory?: string,
  mealPhotoDirectory?: string
): FitTrackService {
  const service = new FitTrackService(db, photoDirectory, exerciseMediaDirectory, customizationMediaDirectory, mealPhotoDirectory);

  const getCallingWindow = (event: Electron.IpcMainInvokeEvent): BrowserWindow => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('Ação de janela não permitida para este processo.');
    }
    return window;
  };

  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_MAXIMIZED, event => getCallingWindow(event).isMaximized());
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, event => getCallingWindow(event).minimize());
  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, event => {
    const window = getCallingWindow(event);
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
    return window.isMaximized();
  });
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, event => getCallingWindow(event).close());

  // --- PERFIL ---
  ipcMain.handle(IPC_CHANNELS.GET_PROFILE, async () => {
    try {
      return { success: true, data: service.getProfile() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROFILE_GOAL_HISTORY, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getProfileGoalHistory() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar o histórico de metas.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_PROFILE, async (_, rawData) => {
    try {
      const parsed = ProfileInputSchema.parse(rawData);
      const saved = service.saveProfile(parsed);
      return { success: true, data: saved };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao validar perfil.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONFIRM_INITIAL_HISTORY, async (_, rawData) => {
    try {
      const parsed = InitialHistoryConfirmationSchema.parse(rawData);
      const saved = service.confirmInitialHistory(parsed);
      return { success: true, data: saved };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao confirmar histórico inicial.' };
    }
  });

  // --- HISTÓRICO DE PESO ---
  ipcMain.handle(IPC_CHANNELS.GET_WEIGHT_HISTORY, async () => {
    try {
      return { success: true, data: service.getWeightHistory() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_WEIGHT_RECORD, async (_, rawData) => {
    try {
      const parsed = WeightRecordInputSchema.parse(rawData);
      const added = service.addWeightRecord(parsed);
      return { success: true, data: added };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao validar registro de peso.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_WEIGHT_RECORD, async (_, { id, data }) => {
    try {
      const parsed = WeightRecordInputSchema.partial().parse(data);
      const updated = service.updateWeightRecord(id, parsed);
      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_WEIGHT_RECORD, async (_, id: string) => {
    try {
      service.deleteWeightRecord(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_WEIGHT_ANALYTICS, async () => {
    try {
      return { success: true, data: service.getWeightAnalytics() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- FOTOS DO SHAPE ---
  ipcMain.handle(IPC_CHANNELS.GET_PHOTOS, async () => {
    try {
      return { success: true, data: service.getPhotos() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_PHOTO, async (_, data) => {
    try {
      const parsed = PhotoInputSchema.parse(data);
      const photo = service.addPhoto(parsed);
      return { success: true, data: photo };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PHOTO_NOTES, async (_, rawData) => {
    try {
      const parsed = PhotoNotesUpdateSchema.parse(rawData);
      const photo = service.updatePhotoNotes(parsed.id, parsed.notes);
      return { success: true, data: photo };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao atualizar observações da foto.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PHOTO, async (_, id: string) => {
    try {
      service.deletePhoto(PhotoIdSchema.parse(id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- MEDIDAS CORPORAIS ---
  ipcMain.handle(IPC_CHANNELS.GET_MEASUREMENTS, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getMeasurements() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_MEASUREMENT, async (event, rawData) => {
    try {
      getCallingWindow(event);
      const meas = service.saveMeasurement(SaveBodyMeasurementInputSchema.parse(rawData));
      return { success: true, data: meas };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_CUSTOM_MEASUREMENTS, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getCustomMeasurements() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar as medidas personalizadas.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CUSTOM_MEASUREMENT_DEFINITION, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveCustomMeasurementDefinition(SaveCustomMeasurementDefinitionInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível criar a medida personalizada.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CUSTOM_MEASUREMENT, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveCustomMeasurement(SaveCustomMeasurementInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar o valor da medida.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_PHYSIQUE_PROJECTION, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = PhysiqueProjectionInputSchema.parse(rawInput);
      return { success: true, data: service.savePhysiqueProjection(input) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a projeção.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PHYSIQUE_PROJECTIONS, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getPhysiqueProjections() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar as projeções.' };
    }
  });

  // --- NUTRIÇÃO, 200 RECEITAS & SUBSTITUIÇÕES ---
  ipcMain.handle(IPC_CHANNELS.GET_FOODS, async () => {
    try {
      return { success: true, data: service.getFoods() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_FOOD_PORTION_PREFERENCES, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getFoodPortionPreferences() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar as porções habituais.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_FOOD_PORTION_PREFERENCE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = SaveFoodPortionPreferenceInputSchema.parse(rawInput);
      return { success: true, data: service.saveFoodPortionPreference(input.foodId, input.amountG) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a porção habitual.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PERSONAL_DIARY_ENTRIES, async (event, rawRange) => {
    try {
      getCallingWindow(event);
      const range = PersonalDiaryDateRangeSchema.parse(rawRange);
      return { success: true, data: service.getPersonalDiaryEntries(range) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar o diário pessoal.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_PERSONAL_DIARY_ENTRY, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = SavePersonalDiaryEntryInputSchema.parse(rawInput);
      return { success: true, data: service.savePersonalDiaryEntry(input) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a anotação.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PERSONAL_DIARY_ENTRY, async (event, rawDate) => {
    try {
      getCallingWindow(event);
      const date = PersonalDiaryDateSchema.parse(rawDate);
      return { success: true, data: service.deletePersonalDiaryEntry(date) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível excluir a anotação.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_CUSTOM_FOOD, async (_, rawInput) => {
    try {
      return { success: true, data: service.createCustomFood(CustomFoodInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível cadastrar o alimento.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_FOOD_FAVORITE, async (_, rawInput) => {
    try {
      const input = RecipeFavoriteInputSchema.parse(rawInput);
      return { success: true, data: service.setFoodFavorite(input.id, input.isFavorite) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível atualizar o favorito.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_CUSTOM_FOOD, async (_, rawInput) => {
    try {
      const input = CustomFoodUpdateInputSchema.parse(rawInput);
      return { success: true, data: service.updateCustomFood(input.id, input.food) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível atualizar o alimento.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_RECIPES, async () => {
    try {
      return { success: true, data: service.getRecipes() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_RECIPE_FAVORITE, async (_, rawInput) => {
    try {
      const input = RecipeFavoriteInputSchema.parse(rawInput);
      return { success: true, data: service.setRecipeFavorite(input.id, input.isFavorite) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível atualizar o favorito.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_RECIPE_SERVINGS, async (_, rawInput) => {
    try {
      const input = RecipeServingsInputSchema.parse(rawInput);
      return { success: true, data: service.setRecipeServings(input.id, input.servings) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar o rendimento da receita.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_RECIPE_FINAL_WEIGHT, async (_, rawInput) => {
    try {
      const input = RecipeFinalWeightInputSchema.parse(rawInput);
      return { success: true, data: service.setRecipeFinalWeight(input.id, input.finalWeightG) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar o peso final da receita.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_RECIPE_FEEDBACK, async (_, rawInput) => {
    try {
      const input = RecipeFeedbackInputSchema.parse(rawInput);
      return { success: true, data: service.setRecipeFeedback(input.id, input) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a avaliação da receita.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PANTRY, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getPantry() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PANTRY, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const { foodId, amountG, expiresAt } = PantryItemUpdateInputSchema.parse(rawInput);
      service.updatePantryItem(foodId, amountG, expiresAt);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PANTRY_PRICE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = PantryPriceUpdateInputSchema.parse(rawInput);
      service.updatePantryPrice(input.foodId, input.unitPrice, input.priceSource);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível atualizar o preço informado.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SUBSTITUTIONS, async (_, { missingFoodId, amountG }) => {
    try {
      const options = service.getSubstitutions(missingFoodId, amountG);
      return { success: true, data: options };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FIND_RECIPES_FROM_PANTRY, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = PantryRecipeSearchInputSchema.parse(rawInput || {});
      const matched = service.findRecipesFromPantry(input);
      return { success: true, data: matched };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SHOPPING_LIST, async (event, rawWeekStartDate) => {
    try {
      getCallingWindow(event);
      const weekStartDate = DailyMealDateSchema.parse(rawWeekStartDate);
      return { success: true, data: service.getShoppingList(weekStartDate) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar a lista de compras.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENERATE_SHOPPING_LIST, async (event, rawWeekStartDate) => {
    try {
      getCallingWindow(event);
      const weekStartDate = DailyMealDateSchema.parse(rawWeekStartDate);
      return { success: true, data: service.generateShoppingList(weekStartDate) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível gerar a lista de compras.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_SHOPPING_ITEM_PURCHASED, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = ShoppingListPurchaseInputSchema.parse(rawInput);
      return { success: true, data: service.setShoppingItemPurchased(input) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível atualizar a compra.' };
    }
  });

  // --- TREINOS ---
  ipcMain.handle(IPC_CHANNELS.GET_EXERCISES, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getExercises() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_EXERCISE_MEDIA, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = ExerciseMediaInputSchema.parse(rawInput);
      return { success: true, data: service.addExerciseMedia(input) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a mídia.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_EXERCISE_MEDIA, async (event, rawId) => {
    try {
      getCallingWindow(event);
      service.deleteExerciseMedia(ExerciseMediaIdSchema.parse(rawId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível excluir a mídia.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_WORKOUT_SESSIONS, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getWorkoutSessions() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOG_WORKOUT_SESSION, async (event, sessionData) => {
    try {
      getCallingWindow(event);
      const parsed = WorkoutSessionInputSchema.parse(sessionData);
      const logged = service.logWorkoutSession(parsed);
      return { success: true, data: logged };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENERATE_WORKOUT_SPLIT, async event => {
    try {
      getCallingWindow(event);
      const split = service.generateWorkoutSplit();
      return { success: true, data: split };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_WORKOUT_TEMPLATES, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getWorkoutTemplates() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar os modelos de treino.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_WORKOUT_TEMPLATE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveWorkoutTemplate(SaveWorkoutTemplateInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar o modelo de treino.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_WORKOUT_SCHEDULE, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getWorkoutSchedule() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar a agenda de treino.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_WORKOUT_SCHEDULE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveWorkoutScheduleEntry(SaveWorkoutScheduleInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a agenda de treino.' };
    }
  });

  // --- DASHBOARD & SISTEMA ---
  ipcMain.handle(IPC_CHANNELS.CALCULATE_TARGETS, async () => {
    try {
      return { success: true, data: service.calculateTargets() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_DASHBOARD_SUMMARY, async () => {
    try {
      return { success: true, data: service.getDashboardSummary() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_LOGGED_MEAL, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      service.logMeal(LoggedMealInputSchema.parse(rawInput));
      return { success: true, data: service.getDashboardSummary() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível registrar a refeição.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_DAILY_MEALS, async (event, rawDate) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getDailyMeals(DailyMealDateSchema.parse(rawDate)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar as refeições do dia.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_RECENTLY_USED_FOODS, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getRecentlyUsedFoods() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar alimentos recentes.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_MEAL_HISTORY, async (event, rawQuery) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getMealHistory(DailyMealHistoryQuerySchema.parse(rawQuery)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar o histórico alimentar.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_NUTRITION_ANALYTICS, async (event, rawQuery) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getNutritionAnalytics(NutritionAnalyticsQuerySchema.parse(rawQuery)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível calcular as médias nutricionais.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_NUTRITION_DISTRIBUTION, async (event, rawDate) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getNutritionDistribution(DailyMealDateSchema.parse(rawDate)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar a distribuição alimentar.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.COPY_DAILY_MEALS, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.copyDailyMeals(DailyMealCopyInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível copiar as refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_MEAL_TEMPLATES, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getMealTemplates() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível consultar os modelos de refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_MEAL_TEMPLATE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveMealTemplate(SaveMealTemplateInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar o modelo de refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.APPLY_MEAL_TEMPLATE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.applyMealTemplate(ApplyMealTemplateInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível aplicar o modelo de refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.APPLY_WEEKLY_MEAL_TEMPLATE, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.applyMealTemplateToWeek(ApplyWeeklyMealTemplateInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível montar o plano semanal de refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REORDER_DAILY_MEALS, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.reorderDailyMeals(ReorderDailyMealsInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível reordenar as refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_DAILY_MEAL, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = DailyMealEntryInputSchema.parse(rawInput);
      return { success: true, data: service.saveDailyMeal(input) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar o checklist da refeição.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_DAILY_MEAL, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.deleteDailyMeal(DailyMealIdentityInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível excluir o lançamento alimentar.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RESTORE_DAILY_MEAL, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.restoreDailyMeal(DailyMealRestoreInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível desfazer a exclusão do lançamento.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_MEAL_PHOTOS, async (event, rawDate) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getMealPhotos(DailyMealDateSchema.parse(rawDate)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar as fotos das refeições.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_MEAL_PHOTO, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.addMealPhoto(MealPhotoInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a foto da refeição.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_MEAL_PHOTO, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      const input = MealPhotoIdentitySchema.parse(rawInput);
      service.deleteMealPhoto(input.mealEntryId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível excluir a foto da refeição.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_HYDRATION_LOG, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      service.logWater(HydrationLogInputSchema.parse(rawInput));
      return { success: true, data: service.getDashboardSummary() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível registrar a água.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    return { success: true, data: app.getVersion() };
  });

  ipcMain.handle(IPC_CHANNELS.GET_VISUAL_CUSTOMIZATION, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getVisualCustomization() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_VISUAL_CUSTOMIZATION, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveVisualCustomization(VisualCustomizationSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar a personalização.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_MEASUREMENT_UNITS, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.getMeasurementUnits() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível carregar as unidades.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_MEASUREMENT_UNITS, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.saveMeasurementUnits(MeasurementUnitPreferencesSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível salvar as unidades.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_CUSTOMIZATION_MEDIA, async event => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.listCustomizationMedia() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.ADD_CUSTOMIZATION_MEDIA, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.addCustomizationMedia(CustomizationMediaInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível guardar o arquivo.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CUSTOMIZATION_MEDIA, async (event, rawId) => {
    try {
      getCallingWindow(event);
      service.deleteCustomizationMedia(CustomizationMediaIdSchema.parse(rawId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível excluir o arquivo.' };
    }
  });

  return service;
}
