import { randomUUID } from 'crypto';
import path from 'path';
import { IDatabase } from '../database/driver';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { WeightRepository } from '../database/repositories/weight-repository';
import { PhotoRepository } from '../database/repositories/photo-repository';
import { MeasurementRepository } from '../database/repositories/measurement-repository';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { WorkoutRepository } from '../database/repositories/workout-repository';
import { ExerciseMediaRepository } from '../database/repositories/exercise-media-repository';
import { PhysiqueProjectionRepository } from '../database/repositories/physique-projection-repository';
import { DailyLogRepository } from '../database/repositories/daily-log-repository';
import { CustomizationRepository } from '../database/repositories/customization-repository';
import { seedDatabase } from '../database/seeds/seedDatabase';
import { calculateNutritionPlan } from '../domain/nutrition-calculator';
import { SubstitutionEngine } from '../domain/substitution-engine';
import { DailyWorkoutPlan, WorkoutEngine } from '../domain/workout-engine';
import {
  calculateMovingAverages,
  calculateWeightDeltas,
  calculateWeightProgress,
  generateDataFreshnessAlerts
} from '../domain/weight-analytics';
import {
  BodyMeasurementRecord,
  CustomFoodInput,
  DashboardSummary,
  Exercise,
  FoodItem,
  NutritionTargets,
  PantryItem,
  PhotoRecord,
  PhotoCreateInput,
  Recipe,
  SubstitutionOption,
  UserProfile,
  WeightAnalyticsPoint,
  WeightRecord,
  WorkoutSession,
  SaveWorkoutTemplateInput,
  WorkoutTemplate,
  WorkoutScheduleEntry,
  SaveWorkoutScheduleInput,
  PhysiqueProjectionInput,
  PhysiqueProjectionSnapshot,
  ExerciseMediaInput,
  ExerciseMediaRecord,
  LoggedMealInput,
  DailyMealEntryInput,
  DailyMealEntry,
  DailyMealHistoryQuery,
  DailyMealCopyInput,
  DailyMealCopyResult,
  NutritionAnalytics,
  NutritionAnalyticsQuery,
  NutritionMealDistributionEntry,
  RecentlyUsedFood,
  MealTemplate,
  SaveMealTemplateInput,
  ApplyMealTemplateInput,
  ApplyMealTemplateResult,
  HydrationLogInput,
  VisualCustomization,
  CustomizationMediaInput,
  CustomizationMediaRecord
} from '../shared/types';
import { calculatePhysiqueProjection } from '../domain/physique-projection';
import { PhotoStorage, StoredPhotoImage } from './photo-storage';
import { ExerciseMediaStorage } from './exercise-media-storage';
import { CustomizationMediaStorage } from './customization-media-storage';

export class FitTrackService {
  private profileRepo: ProfileRepository;
  private weightRepo: WeightRepository;
  private photoRepo: PhotoRepository;
  private measurementRepo: MeasurementRepository;
  private nutritionRepo: NutritionRepository;
  private workoutRepo: WorkoutRepository;
  private projectionRepo: PhysiqueProjectionRepository;
  private exerciseMediaRepo: ExerciseMediaRepository;
  private dailyLogRepo: DailyLogRepository;
  private customizationRepo: CustomizationRepository;
  private workoutEngine: WorkoutEngine;
  private photoStorage: PhotoStorage;
  private exerciseMediaStorage: ExerciseMediaStorage;
  private customizationMediaStorage: CustomizationMediaStorage;

  constructor(
    db: IDatabase,
    photoDirectory = path.join(process.cwd(), 'data', 'photos'),
    exerciseMediaDirectory = path.join(process.cwd(), 'data', 'exercise_media'),
    customizationMediaDirectory = path.join(process.cwd(), 'data', 'customization_media')
  ) {
    const seededCatalogs = seedDatabase(db);
    this.profileRepo = new ProfileRepository(db);
    this.weightRepo = new WeightRepository(db);
    this.photoRepo = new PhotoRepository(db);
    this.photoStorage = new PhotoStorage(photoDirectory);
    this.exerciseMediaStorage = new ExerciseMediaStorage(exerciseMediaDirectory);
    this.customizationMediaStorage = new CustomizationMediaStorage(customizationMediaDirectory);
    this.measurementRepo = new MeasurementRepository(db);
    this.nutritionRepo = seededCatalogs.nutritionRepository;
    this.workoutRepo = seededCatalogs.workoutRepository;
    this.projectionRepo = new PhysiqueProjectionRepository(db);
    this.exerciseMediaRepo = new ExerciseMediaRepository(db);
    this.dailyLogRepo = new DailyLogRepository(db);
    this.customizationRepo = new CustomizationRepository(db);
    this.workoutEngine = new WorkoutEngine(this.workoutRepo.getExercises());
  }

  // --- PERFIL ---
  getProfile(): UserProfile | null {
    return this.profileRepo.getProfile();
  }

  saveProfile(profileData: Partial<UserProfile> & { name: string; birthDate: string; heightCm: number }): UserProfile {
    return this.profileRepo.saveProfile(profileData);
  }

  // --- HISTÓRICO DE PESO ---
  getWeightHistory(): WeightRecord[] {
    return this.weightRepo.getAll();
  }

  getWeightAnalytics(): WeightAnalyticsPoint[] {
    const records = this.weightRepo.getAll();
    return calculateMovingAverages(records);
  }

  addWeightRecord(input: { date: string; weightKg: number; notes?: string; source?: 'verified' | 'self_reported' }): WeightRecord {
    return this.weightRepo.addRecord(input);
  }

  updateWeightRecord(id: string, updates: { date?: string; weightKg?: number; notes?: string }): WeightRecord {
    return this.weightRepo.updateRecord(id, updates);
  }

  deleteWeightRecord(id: string): void {
    this.weightRepo.deleteRecord(id);
  }

  // --- FOTOS E EVOLUÇÃO VISUAL ---
  getPhotos(): PhotoRecord[] {
    return this.photoRepo.getAll().map(photo => this.withPhotoUrl(photo));
  }

  getPhotosByDate(date: string): PhotoRecord[] {
    return this.photoRepo.getByDate(date).map(photo => this.withPhotoUrl(photo));
  }

  addPhoto(input: PhotoCreateInput): PhotoRecord {
    if (!this.profileRepo.getProfile()) throw new Error('Cadastre seu perfil antes de adicionar fotos.');
    const id = `photo-${randomUUID()}`;
    const filePath = this.photoStorage.save(id, input.imageBytes, input.mimeType);
    try {
      const weightKgAtPhoto = this.weightRepo.getAll().filter(record => record.date === input.date).slice(-1)[0]?.weightKg;
      const record = this.photoRepo.addPhoto({
        id,
        date: input.date,
        weightKgAtPhoto,
        pose: input.pose,
        customPoseName: input.customPoseName,
        filePath,
        lightingNotes: input.lightingNotes,
        notes: input.notes,
        isPrimary: input.isPrimary
      });
      return this.withPhotoUrl(record);
    } catch (error) {
      this.photoStorage.delete(filePath);
      throw error;
    }
  }

  deletePhoto(id: string): void {
    const filePath = this.photoRepo.deletePhoto(id);
    if (/^photo-[a-zA-Z0-9_-]{1,140}\.(jpg|png|webp)$/.test(filePath)) {
      this.photoStorage.delete(filePath);
    }
  }

  updatePhotoNotes(id: string, notes: string): PhotoRecord {
    return this.withPhotoUrl(this.photoRepo.updateNotes(id, notes));
  }

  getPhotoImage(id: string): StoredPhotoImage {
    const photo = this.photoRepo.getById(id);
    if (!photo) throw new Error('Foto não encontrada.');
    return this.photoStorage.read(photo.filePath);
  }

  migrateLegacyPhotoFiles(): void {
    for (const photo of this.photoRepo.getAll()) {
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo.filePath);
      if (!match) continue;
      try {
        const bytes = Buffer.from(match[2], 'base64');
        const existingFile = [`${photo.id}.jpg`, `${photo.id}.png`, `${photo.id}.webp`]
          .find(fileName => this.photoStorage.has(fileName));
        const filePath = existingFile || this.photoStorage.save(photo.id, bytes, match[1]);
        this.photoRepo.updateFilePath(photo.id, filePath);
      } catch (error) {
        console.error(`[Photos] Não foi possível migrar a imagem local ${photo.id}:`, error);
      }
    }
  }

  private withPhotoUrl(photo: PhotoRecord): PhotoRecord {
    return { ...photo, filePath: `fittrack-photo://${encodeURIComponent(photo.id)}` };
  }

  // --- MEDIDAS CORPORAIS ---
  getMeasurements(): BodyMeasurementRecord[] {
    return this.measurementRepo.getAll();
  }

  saveMeasurement(data: {
    date: string;
    weightKg?: number;
    waistCircCm?: number;
    armRelaxedCm?: number;
    armFlexedCm?: number;
    chestCm?: number;
    thighCm?: number;
    hipCm?: number;
    shoulderCircCm?: number;
    calfCm?: number;
    bodyFatPct?: number;
    source?: string;
    notes?: string;
  }): BodyMeasurementRecord {
    return this.measurementRepo.saveMeasurement(data);
  }

  savePhysiqueProjection(input: PhysiqueProjectionInput): PhysiqueProjectionSnapshot {
    const profile = this.profileRepo.getProfile();
    if (!profile) throw new Error('Cadastre seu perfil antes de salvar uma projeção.');
    const result = calculatePhysiqueProjection(input);
    return this.projectionRepo.save(result, profile.id);
  }

  getPhysiqueProjections(): PhysiqueProjectionSnapshot[] {
    const profile = this.profileRepo.getProfile();
    return profile ? this.projectionRepo.getAll(profile.id) : [];
  }

  // --- NUTRIÇÃO, 200 RECEITAS E SUBSTITUIÇÕES ---
  getFoods(): FoodItem[] {
    return this.nutritionRepo.getFoods();
  }

  createCustomFood(input: CustomFoodInput): FoodItem {
    return this.nutritionRepo.createCustomFood(input);
  }

  setFoodFavorite(id: string, isFavorite: boolean): FoodItem {
    return this.nutritionRepo.setFoodFavorite(id, isFavorite);
  }

  updateCustomFood(id: string, input: CustomFoodInput): FoodItem {
    return this.nutritionRepo.updateCustomFood(id, input);
  }

  getRecipes(): Recipe[] {
    return this.nutritionRepo.getRecipes();
  }

  setRecipeFavorite(id: string, isFavorite: boolean): Recipe {
    return this.nutritionRepo.setRecipeFavorite(id, isFavorite);
  }

  setRecipeServings(id: string, servings: number): Recipe {
    return this.nutritionRepo.setRecipeServings(id, servings);
  }

  getPantry(): PantryItem[] {
    return this.nutritionRepo.getPantry();
  }

  updatePantryItem(foodId: string, amountG: number): void {
    this.nutritionRepo.updatePantryItem(foodId, amountG);
  }

  removePantryItem(foodId: string): void {
    this.nutritionRepo.removePantryItem(foodId);
  }

  getSubstitutions(missingFoodId: string, amountG: number): SubstitutionOption[] {
    const pantry = this.nutritionRepo.getPantry();
    const engine = new SubstitutionEngine(this.nutritionRepo.getFoods(), this.nutritionRepo.getRecipes());
    const foodById = new Map(this.nutritionRepo.getFoods().map(food => [food.id, food]));
    return engine.generateSubstitutions(missingFoodId, amountG, pantry).map(option => ({
      ...option,
      items: option.items.map(item => {
        const food = foodById.get(item.foodId);
        return {
          ...item,
          dataQuality: food?.dataQuality ?? item.dataQuality ?? 'unverified',
          dataSource: food?.source ?? item.dataSource ?? 'Origem não registrada',
          sourceReference: food?.sourceReference ?? item.sourceReference,
          confidenceLevel: food?.confidenceLevel ?? item.confidenceLevel ?? 'unknown'
        };
      })
    }));
  }

  findRecipesFromPantry(maxPrepTime?: number): Array<Recipe & { matchRate: number }> {
    const pantry = this.nutritionRepo.getPantry();
    const pantryIds = pantry.map(p => p.foodId);
    return new SubstitutionEngine(this.nutritionRepo.getFoods(), this.nutritionRepo.getRecipes())
      .findRecipesFromPantry(pantryIds, maxPrepTime);
  }

  // --- TREINOS E EXERCÍCIOS ---
  getExercises(): Exercise[] {
    return this.workoutRepo.getExercises().map(exercise => ({
      ...exercise,
      media: this.exerciseMediaRepo.getByExercise(exercise.id)
    }));
  }

  getExerciseMedia(exerciseId: string): ExerciseMediaRecord[] {
    return this.exerciseMediaRepo.getByExercise(exerciseId);
  }

  addExerciseMedia(input: ExerciseMediaInput): ExerciseMediaRecord {
    if (!this.workoutRepo.getExercises().some(exercise => exercise.id === input.exerciseId)) {
      throw new Error('Exercício não encontrado na biblioteca.');
    }
    const id = 'exercise-media-' + randomUUID();
    const fileName = this.exerciseMediaStorage.save(id, input.imageBytes, input.mimeType);
    try {
      const originalName = path.basename(input.originalName).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
      return this.exerciseMediaRepo.add({
        id,
        exerciseId: input.exerciseId,
        fileName,
        mimeType: input.mimeType,
        originalName: originalName || 'mídia de exercício'
      });
    } catch (error) {
      this.exerciseMediaStorage.delete(fileName);
      throw error;
    }
  }

  getExerciseMediaImage(mediaId: string): { bytes: Uint8Array; mimeType: ExerciseMediaRecord['mimeType'] } {
    const media = this.exerciseMediaRepo.getById(mediaId);
    if (!media) throw new Error('Mídia não encontrada.');
    const fileName = this.exerciseMediaRepo.getFileName(mediaId);
    if (!fileName) throw new Error('Mídia não encontrada.');
    return { bytes: this.exerciseMediaStorage.read(fileName), mimeType: media.mimeType };
  }

  deleteExerciseMedia(mediaId: string): void {
    const fileName = this.exerciseMediaRepo.delete(mediaId);
    if (!fileName) throw new Error('Mídia não encontrada.');
    this.exerciseMediaStorage.delete(fileName);
  }

  getWorkoutSessions(): WorkoutSession[] {
    return this.workoutRepo.getSessions();
  }

  logWorkoutSession(sessionData: {
    date: string;
    splitName: string;
    completed: boolean;
    durationMinutes?: number;
    perceivedExertion?: number;
    notes?: string;
    sets: any[];
  }): WorkoutSession {
    return this.workoutRepo.logSession(sessionData);
  }

  generateWorkoutSplit(): DailyWorkoutPlan[] {
    const profile = this.profileRepo.getProfile();
    const days = profile?.trainingDaysPerWeek || 5;
    const isReturning = Boolean(profile?.interruptionHistoryNotes && profile.interruptionHistoryNotes.includes('Retorno'));
    return this.workoutEngine.generateSplit(days, isReturning);
  }

  getWorkoutTemplates(): WorkoutTemplate[] {
    return this.workoutRepo.getTemplates();
  }

  saveWorkoutTemplate(input: SaveWorkoutTemplateInput): WorkoutTemplate {
    return this.workoutRepo.saveTemplate(input);
  }

  getWorkoutSchedule(): WorkoutScheduleEntry[] {
    return this.workoutRepo.getSchedule();
  }

  saveWorkoutScheduleEntry(input: SaveWorkoutScheduleInput): WorkoutScheduleEntry {
    return this.workoutRepo.saveScheduleEntry(input);
  }

  logMeal(input: LoggedMealInput): void {
    this.dailyLogRepo.addMeal(input);
  }

  logWater(input: HydrationLogInput): void {
    this.dailyLogRepo.addWater(input);
  }

  getDailyMeals(date: string): DailyMealEntry[] {
    return this.dailyLogRepo.getMeals(date);
  }

  getRecentlyUsedFoods(): RecentlyUsedFood[] {
    return this.dailyLogRepo.getRecentlyUsedFoods();
  }

  getMealHistory(query: DailyMealHistoryQuery): DailyMealEntry[] {
    return this.dailyLogRepo.getMealHistory(query);
  }

  getNutritionAnalytics(query: NutritionAnalyticsQuery): NutritionAnalytics {
    return this.dailyLogRepo.getNutritionAnalytics(query);
  }

  getNutritionDistribution(date: string): NutritionMealDistributionEntry[] {
    return this.dailyLogRepo.getNutritionDistribution(date);
  }

  copyDailyMeals(input: DailyMealCopyInput): DailyMealCopyResult {
    return this.dailyLogRepo.copyMeals(input);
  }

  getMealTemplates(): MealTemplate[] {
    return this.dailyLogRepo.getMealTemplates();
  }

  saveMealTemplate(input: SaveMealTemplateInput): MealTemplate {
    return this.dailyLogRepo.saveMealTemplate(input);
  }

  applyMealTemplate(input: ApplyMealTemplateInput): ApplyMealTemplateResult {
    return this.dailyLogRepo.applyMealTemplate(input);
  }

  saveDailyMeal(input: DailyMealEntryInput): DailyMealEntry {
    return this.dailyLogRepo.saveMeal(input);
  }

  // --- DASHBOARD & METAS ---
  calculateTargets(): NutritionTargets | null {
    const profile = this.profileRepo.getProfile();
    if (!profile) return null;

    const latestWeight = this.weightRepo.getLatest();
    return latestWeight ? calculateNutritionPlan(profile, latestWeight.weightKg) : null;
  }

  getDashboardSummary(): DashboardSummary {
    const profile = this.profileRepo.getProfile();
    const records = this.weightRepo.getAll();
    const latestWeight = this.weightRepo.getLatest();
    const deltas = calculateWeightDeltas(records);

    let nutritionTargets: NutritionTargets | null = null;
    if (profile && latestWeight) {
      nutritionTargets = calculateNutritionPlan(profile, latestWeight.weightKg);
    }

    const initialRecord = records.length > 0 ? records[0] : null;
    const progressPct = calculateWeightProgress(
      initialRecord?.weightKg ?? null,
      deltas.currentWeightKg,
      profile?.targetWeightKg ?? null
    );

    const alerts = generateDataFreshnessAlerts(latestWeight);
    const sessions = this.workoutRepo.getSessions();
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const dateString = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const weekStartDate = dateString(startOfWeek);
    const todayDate = dateString(today);
    const completedWorkoutsThisWeek = sessions.filter(s => s.completed && s.date >= weekStartDate && s.date <= todayDate).length;
    const intake = this.dailyLogRepo.getProgress(todayDate);

    return {
      currentWeightKg: deltas.currentWeightKg,
      weeklyWeightDeltaKg: deltas.weeklyDeltaKg,
      monthlyWeightDeltaKg: deltas.monthlyDeltaKg,
      movingAverage7dKg: deltas.movingAverage7dKg,
      targetWeightKg: profile?.targetWeightKg ?? null,
      weightProgressPct: progressPct,
      nutritionTargets,
      waterGoalMl: nutritionTargets?.waterMl ?? null,
      waterLoggedMl: intake.waterMl,
      caloriesLogged: intake.calories,
      proteinLoggedG: intake.proteinG,
      carbsLoggedG: intake.carbsG,
      fatsLoggedG: intake.fatsG,
      completedMeals: intake.mealsLogged,
      totalPlannedMeals: profile?.mealsPerDay ?? null,
      trainingDaysCompleted: completedWorkoutsThisWeek,
      trainingDaysPlanned: profile?.trainingDaysPerWeek ?? null,
      outdatedDataAlerts: alerts
    };
  }

  getVisualCustomization(): VisualCustomization {
    return this.customizationRepo.getConfig();
  }

  saveVisualCustomization(config: VisualCustomization): VisualCustomization {
    return this.customizationRepo.saveConfig(config);
  }

  listCustomizationMedia(): CustomizationMediaRecord[] {
    return this.customizationRepo.listMedia();
  }

  addCustomizationMedia(input: CustomizationMediaInput): CustomizationMediaRecord {
    const stored = this.customizationMediaStorage.save(input);
    try {
      return this.customizationRepo.addMedia(input, stored.id, stored.filePath, new Date().toISOString());
    } catch (error) {
      this.customizationMediaStorage.remove(stored.filePath);
      throw error;
    }
  }

  getCustomizationMediaImage(id: string): { bytes: Buffer; mimeType: CustomizationMediaInput['mimeType'] } {
    const media = this.customizationRepo.getMedia(id);
    if (!media) throw new Error('Mídia de personalização não encontrada.');
    return { bytes: this.customizationMediaStorage.read(media.file_path), mimeType: media.mime_type };
  }

  deleteCustomizationMedia(id: string): void {
    const media = this.customizationRepo.getMedia(id);
    if (!media) return;
    const customization = this.customizationRepo.getConfig();
    if (customization.background.mediaId === id || customization.canvasImages.some(image => image.mediaId === id)) {
      throw new Error('Remova esta mídia do fundo e das camadas antes de excluí-la.');
    }
    this.customizationMediaStorage.remove(media.file_path);
    this.customizationRepo.deleteMedia(id);
  }

  confirmInitialHistory(data: {
    confirmedHeightCm: number;
    confirmedBirthDate: string;
    eggLimitAccepted: boolean;
    targetWeightKg: number;
  }): UserProfile {
    let profile = this.profileRepo.getProfile();

    const name = profile?.name ?? 'Usuário FitTrack';
    const restrictions = profile?.dietaryRestrictions ? [...profile.dietaryRestrictions] : [];
    if (data.eggLimitAccepted && !restrictions.includes('Limite de ~2 ovos/dia')) {
      restrictions.push('Limite de ~2 ovos/dia');
    }

    const updatedProfile = this.profileRepo.saveProfile({
      id: profile?.id,
      name,
      birthDate: data.confirmedBirthDate,
      heightCm: data.confirmedHeightCm,
      targetWeightKg: data.targetWeightKg,
      dietaryRestrictions: restrictions,
      initialHistoryConfirmed: true
    });
    return updatedProfile;
  }
}
