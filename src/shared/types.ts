export type BiologicalSex = 'male' | 'female' | 'unspecified';

export type ActivityLevel =
  | 'sedentary'       // 1.2 - Pouco ou nenhum exercício
  | 'light'           // 1.375 - Exercício leve 1 a 3 dias/semana
  | 'moderate'        // 1.55 - Exercício moderado 3 a 5 dias/semana
  | 'heavy'           // 1.725 - Exercício intenso 6 a 7 dias/semana
  | 'extreme';        // 1.9 - Atleta de alto rendimento / trabalho braçal pesado

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

export type FitnessGoal =
  | 'muscle_gain'       // Ganhar massa muscular (superávit calórico controlado)
  | 'gradual_weight_gain' // Ganhar peso gradualmente (superávit leve)
  | 'maintenance'       // Manter o peso (equilíbrio energético)
  | 'fat_loss'          // Perder gordura (déficit calórico moderado)
  | 'weight_reduction'  // Reduzir peso (déficit controlado)
  | 'body_recomposition'; // Recomposição corporal (manutenção ou leve déficit com alta proteína)

export interface UserProfile {
  id: string;
  name: string;
  birthDate: string; // ISO format: YYYY-MM-DD
  age?: number;
  heightCm: number;
  biologicalSex: BiologicalSex;
  activityLevel: ActivityLevel;
  trainingExperience: TrainingExperience;
  fitnessGoal: FitnessGoal;
  targetWeightKg?: number;
  dietaryRestrictions?: string[];
  allergies?: string[];
  dietaryPreferences?: string;
  foodBudgetMonthly?: number;
  mealsPerDay: number; // 3, 4, 5, 6
  trainingDaysPerWeek: number; // 3, 5, 7 or custom
  workSchedule?: string;
  studySchedule?: string;
  sleepSchedule?: string;
  trainingSchedule?: string;
  availableEquipment?: string[];
  interruptionHistoryNotes?: string;
  initialHistoryConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeightRecord {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
  source: 'verified' | 'self_reported'; // Relato anterior vs medição verificada
  createdAt: string;
}

export interface WeightAnalyticsPoint {
  date: string;
  weightKg: number;
  movingAverage7d: number | null;
  source: 'verified' | 'self_reported';
}

export interface NutritionTargets {
  bmr: number; // TMB (Taxa Metabólica Basal)
  tdee: number; // GET (Gasto Energético Total)
  targetCalories: number; // Calorias recomendadas para a meta
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  proteinKcal: number;
  carbKcal: number;
  fatKcal: number;
  proteinPct: number;
  carbPct: number;
  fatPct: number;
  waterMl: number; // Meta estimada de água
  bmi: number; // IMC
  bmiCategory: string;
  targetPaceKgPerWeek: number; // Ritmo de mudança semanal pretendido
  formulaUsed: string;
  uncertaintyNotes?: string;
}

export interface TargetChangeHistory {
  id: string;
  date: string;
  previousCalories: number;
  proposedCalories: number;
  reason: string;
  basisData: string;
  status: 'accepted' | 'rejected' | 'edited';
  createdAt: string;
}

export interface DashboardSummary {
  currentWeightKg: number | null;
  weeklyWeightDeltaKg: number | null;
  monthlyWeightDeltaKg: number | null;
  movingAverage7dKg: number | null;
  targetWeightKg: number | null;
  weightProgressPct: number | null;
  nutritionTargets: NutritionTargets | null;
  waterGoalMl: number | null;
  waterLoggedMl: number | null;
  caloriesLogged: number | null;
  proteinLoggedG: number | null;
  carbsLoggedG: number | null;
  fatsLoggedG: number | null;
  completedMeals: number | null;
  totalPlannedMeals: number | null;
  trainingDaysCompleted: number;
  trainingDaysPlanned: number | null;
  outdatedDataAlerts: string[];
}

export interface LoggedMealInput {
  date: string;
  mealName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

export interface HydrationLogInput {
  date: string;
  amountMl: number;
}

export type DailyMealStatus = 'pending' | 'preparing' | 'consumed' | 'partial' | 'deferred' | 'skipped' | 'cancelled';

export interface DailyMealItemLog {
  itemId: string;
  foodId: string;
  foodName: string;
  plannedAmountG: number;
  consumedAmountG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  dataQuality?: NutritionDataQuality;
  dataSource?: string;
  sourceReference?: string;
  confidenceLevel?: NutritionConfidenceLevel;
}

export interface DailyMealEntryInput {
  date: string;
  slotId: string;
  mealName: string;
  scheduledTime: string;
  recipeId?: string;
  status: DailyMealStatus;
  items: DailyMealItemLog[];
  note?: string;
}

export interface DailyMealEntry extends DailyMealEntryInput {
  id: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  completedAt?: string;
  updatedAt: string;
}

export interface DailyMealHistoryQuery {
  fromDate: string;
  toDate: string;
  search?: string;
}

export interface DailyMealCopyInput {
  sourceDate: string;
  targetDate: string;
}

export interface DailyMealCopyResult extends DailyMealCopyInput {
  copiedCount: number;
  skippedCount: number;
}

export interface RecentlyUsedFood {
  foodId: string;
  foodName: string;
  lastUsedDate: string;
  lastUsedAt: string;
  lastAmountG: number;
  useCount: number;
  dataQuality?: NutritionDataQuality;
  dataSource?: string;
}

export interface DailyIntakeProgress {
  date: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  waterMl: number | null;
  mealsLogged: number | null;
}

// ============================================================================
// MÓDULO — FOTOS DO SHAPE E EVOLUÇÃO VISUAL
// ============================================================================
export type PhotoPose =
  | 'front_relaxed'  // Frente relaxada
  | 'front_flexed'   // Frente contraída
  | 'back'           // Costas
  | 'side_left'      // Perfil esquerdo
  | 'side_right'     // Perfil direito
  | 'custom';        // Pose personalizada

export interface PhotoRecord {
  id: string;
  profileId?: string;
  date: string; // YYYY-MM-DD
  pose: PhotoPose;
  customPoseName?: string;
  filePath: string; // URL local restrita do protocolo fittrack-photo
  lightingNotes?: string;
  notes?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface PhotoCreateInput {
  date: string;
  pose: PhotoPose;
  customPoseName?: string;
  imageBytes: Uint8Array;
  mimeType: string;
  lightingNotes?: string;
  notes?: string;
  isPrimary?: boolean;
}

export interface BodyMeasurementRecord {
  id: string;
  profileId?: string;
  date: string; // YYYY-MM-DD
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
  source: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// MÓDULO — PROJEÇÃO FÍSICA (estimativas, nunca medições reais)
// ============================================================================
export type ProjectionGoal = 'muscle_gain' | 'recomposition' | 'fat_loss';

export interface ProjectionMeasurementBaseline {
  shouldersCm?: number;
  chestCm?: number;
  armCm?: number;
  waistCm?: number;
  thighCm?: number;
}

export interface PhysiqueProjectionInput {
  asOfDate: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  bodyFatPct: number;
  trainingExperience: TrainingExperience;
  adherencePercent: number;
  goal: ProjectionGoal;
  measurements: ProjectionMeasurementBaseline;
}

export interface PhysiqueProjectionPoint {
  months: number;
  targetDate: string;
  weightKg: number;
  leanMassKg: number;
  fatMassKg: number;
  bodyFatPct: number;
  ffmi: number;
  shouldersCm?: number;
  chestCm?: number;
  armCm?: number;
  waistCm?: number;
  thighCm?: number;
  shoulderWaistRatio?: number;
}

export interface PhysiqueProjectionResult {
  input: PhysiqueProjectionInput;
  points: PhysiqueProjectionPoint[];
  assumptions: string[];
}

export interface ProjectionRealizedComparison {
  months: 3 | 6 | 9 | 12;
  targetDate: string;
  expectedWeightKg: number;
  actualWeightKg: number | null;
  actualDate?: string;
  differenceKg?: number;
}

export interface PhysiqueProjectionSnapshot extends PhysiqueProjectionResult {
  id: string;
  createdAt: string;
  comparisons: ProjectionRealizedComparison[];
}

export interface AppUpdateStatus {
  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
  message: string;
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
}

export type CustomizationMediaKind = 'background' | 'canvas';

export interface CustomizationMediaInput {
  fileName: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'video/mp4';
  kind: CustomizationMediaKind;
  dataBase64: string;
}

export interface CustomizationMediaRecord {
  id: string;
  fileName: string;
  mimeType: CustomizationMediaInput['mimeType'];
  kind: CustomizationMediaKind;
  mediaUrl: string;
  createdAt: string;
}

export interface CustomizationCanvasImage {
  id: string;
  mediaId: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  zIndex: number;
}

export interface VisualCustomization {
  version: 1;
  theme: {
    backgroundColor: string;
    textColor: string;
    cardColor: string;
    borderColor: string;
    buttonColor: string;
    barColor: string;
    gradientStart: string;
    gradientEnd: string;
    gradientEnabled: boolean;
    gradientAngle: number;
  };
  background: {
    mediaId: string | null;
    fit: 'cover' | 'contain';
    opacity: number;
  };
  canvasImages: CustomizationCanvasImage[];
}

export interface DayActivityData {
  date: string;
  weightRecord?: WeightRecord;
  photos: PhotoRecord[];
  measurement?: BodyMeasurementRecord;
  workoutSession?: WorkoutSession;
}

// ============================================================================
// MÓDULO — NUTRIÇÃO, ALIMENTOS, DESPENSA E SUBSTITUIÇÕES
// ============================================================================
export type FoodCategory =
  | 'protein'
  | 'carb'
  | 'fat'
  | 'fruit'
  | 'vegetable'
  | 'dairy'
  | 'legume'
  | 'supplement';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  servingSizeG: number; // Padrão 100g
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  fiberG?: number;
  dataQuality?: NutritionDataQuality;
  sourceReference?: string;
  sourceDate?: string;
  confidenceLevel?: NutritionConfidenceLevel;
  isCooked: boolean;
  priceEstimated?: number; // Preço estimado por 100g
  source: string;
  substituteGroupId?: string;
  imageUrl?: string;
  imageCredit?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
}

export interface CustomFoodInput {
  name: string;
  category: FoodCategory;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  fiberG?: number;
  isCooked?: boolean;
  substituteGroupId?: string;
}

export type NutritionDataQuality = 'verified' | 'estimated' | 'user_reported' | 'unverified';
export type NutritionConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export type MealTurn =
  | 'breakfast'    // Café da manhã
  | 'lunch'        // Almoço
  | 'snack'        // Lanche
  | 'pre_workout'  // Pré-treino
  | 'post_workout' // Pós-treino
  | 'dinner'       // Jantar
  | 'supper';      // Ceia

export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  amountG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  dataQuality?: NutritionDataQuality;
  dataSource?: string;
  sourceReference?: string;
  confidenceLevel?: NutritionConfidenceLevel;
}

export interface Recipe {
  id: string;
  name: string;
  category: MealTurn;
  prepTimeMinutes: number;
  instructions: string;
  ingredients: RecipeIngredient[];
  /** Porções informadas para a receita inteira; receitas do catálogo começam com 1 porção. */
  servings?: number;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  estimatedCost?: number;
  budgetSwaps?: string[];
  imageUrl?: string;
  imageCredit?: string;
  isFavorite?: boolean;
}

export type SubstitutionLevel =
  | 'direct'           // Nível A: Substituto direto
  | 'combination'      // Nível B: Combinação de alimentos
  | 'alternative_meal' // Nível C: Refeição alternativa
  | 'economic';        // Nível D: Opção econômica

export interface SubstitutionOption {
  id: string;
  level: SubstitutionLevel;
  levelTitle: string;
  description: string;
  items: Array<{
    foodId: string;
    foodName: string;
    amountG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
    estimatedCost?: number;
    dataQuality?: NutritionDataQuality;
    dataSource?: string;
    sourceReference?: string;
    confidenceLevel?: NutritionConfidenceLevel;
  }>;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  deltaCalories: number;
  deltaProteinG: number;
  deltaCarbsG: number;
  deltaFatsG: number;
  totalCost?: number;
  rationale: string;
}

export interface PantryItem {
  id: string;
  foodId: string;
  foodName: string;
  amountAvailableG: number;
  unitPrice?: number;
  updatedAt: string;
}

// ============================================================================
// MÓDULO — TREINOS, EXERCÍCIOS E PROGRESSÃO DE CARGAS
// ============================================================================
export type MuscleGroup =
  | 'peitoral'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'antebracos'
  | 'abdomen'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilhas';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  instructions: string;
  description?: string;
  executionTips?: string;
  imageUrl?: string;
  imageCredit?: string;
  youtubeUrl?: string;
  commonErrors?: string;
  alternatives?: string[];
  media?: ExerciseMediaRecord[];
}

export interface ExerciseMediaRecord {
  id: string;
  exerciseId: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'video/mp4';
  originalName: string;
  filePath: string;
  createdAt: string;
}

export interface ExerciseMediaInput {
  exerciseId: string;
  originalName: string;
  mimeType: ExerciseMediaRecord['mimeType'];
  imageBytes: Uint8Array;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  rpe?: number; // Percepção de esforço 1 a 10
  isPr?: boolean;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  splitName: string;
  completed: boolean;
  durationMinutes?: number;
  perceivedExertion?: number;
  sets: WorkoutSet[];
  notes?: string;
  createdAt: string;
}
