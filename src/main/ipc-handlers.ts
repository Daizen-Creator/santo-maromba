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
  VisualCustomizationSchema,
  CustomizationMediaInputSchema,
  CustomizationMediaIdSchema,
  DailyMealDateSchema,
  DailyMealHistoryQuerySchema,
  DailyMealCopyInputSchema,
  DailyMealEntryInputSchema,
  CustomFoodInputSchema,
  CustomFoodUpdateInputSchema,
  RecipeFavoriteInputSchema,
  RecipeServingsInputSchema
} from '../shared/schema';
import { FitTrackService } from '../services/fittrack-service';
import { IDatabase } from '../database/driver';

export function registerIpcHandlers(
  db: IDatabase,
  photoDirectory?: string,
  exerciseMediaDirectory?: string,
  customizationMediaDirectory?: string
): FitTrackService {
  const service = new FitTrackService(db, photoDirectory, exerciseMediaDirectory, customizationMediaDirectory);

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
  ipcMain.handle(IPC_CHANNELS.GET_MEASUREMENTS, async () => {
    try {
      return { success: true, data: service.getMeasurements() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_MEASUREMENT, async (_, data) => {
    try {
      const meas = service.saveMeasurement(data);
      return { success: true, data: meas };
    } catch (err: any) {
      return { success: false, error: err.message };
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

  ipcMain.handle(IPC_CHANNELS.GET_PANTRY, async () => {
    try {
      return { success: true, data: service.getPantry() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PANTRY, async (_, { foodId, amountG }) => {
    try {
      service.updatePantryItem(foodId, amountG);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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

  ipcMain.handle(IPC_CHANNELS.FIND_RECIPES_FROM_PANTRY, async (_, maxPrepTime) => {
    try {
      const matched = service.findRecipesFromPantry(maxPrepTime);
      return { success: true, data: matched };
    } catch (err: any) {
      return { success: false, error: err.message };
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

  ipcMain.handle(IPC_CHANNELS.COPY_DAILY_MEALS, async (event, rawInput) => {
    try {
      getCallingWindow(event);
      return { success: true, data: service.copyDailyMeals(DailyMealCopyInputSchema.parse(rawInput)) };
    } catch (err: any) {
      return { success: false, error: err.message || 'Não foi possível copiar as refeições.' };
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
