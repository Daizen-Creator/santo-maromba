import { z } from 'zod';

const COLOR_INPUT = z.string().trim().min(1).max(48).refine(value =>
  /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)
  || /^(?:rgb|rgba|hsl|hsla)\([\d.,%/\s+-]+\)$/i.test(value),
  'Use uma cor HEX, RGB ou HSL válida.'
);

export const VisualCustomizationSchema = z.object({
  version: z.literal(1),
  theme: z.object({
    backgroundColor: COLOR_INPUT,
    textColor: COLOR_INPUT,
    cardColor: COLOR_INPUT,
    borderColor: COLOR_INPUT,
    buttonColor: COLOR_INPUT,
    barColor: COLOR_INPUT,
    gradientStart: COLOR_INPUT,
    gradientEnd: COLOR_INPUT,
    gradientEnabled: z.boolean(),
    gradientAngle: z.number().int().min(0).max(360)
  }).strict(),
  background: z.object({
    mediaId: z.string().regex(/^[\w-]{1,80}$/).nullable(),
    fit: z.enum(['cover', 'contain']),
    opacity: z.number().min(0).max(1)
  }).strict(),
  canvasImages: z.array(z.object({
    id: z.string().regex(/^[\w-]{1,80}$/),
    mediaId: z.string().regex(/^[\w-]{1,80}$/),
    xPct: z.number().min(0).max(100),
    yPct: z.number().min(0).max(100),
    widthPct: z.number().min(2).max(100),
    heightPct: z.number().min(2).max(100),
    zIndex: z.number().int().min(1).max(999)
  }).strict()).max(40)
}).strict();

export const CustomizationMediaInputSchema = z.object({
  fileName: z.string().trim().min(1).max(160).refine(value => !value.includes('/') && !value.includes('\\') && !value.includes('\0')),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'video/mp4']),
  kind: z.enum(['background', 'canvas']),
  dataBase64: z.string().min(1).max(35_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/)
}).strict();

export const CustomizationMediaIdSchema = z.string().regex(/^[\w-]{1,80}$/);

export const BiologicalSexSchema = z.enum(['male', 'female', 'unspecified']);
export const ActivityLevelSchema = z.enum(['sedentary', 'light', 'moderate', 'heavy', 'extreme']);
export const TrainingExperienceSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const FitnessGoalSchema = z.enum([
  'muscle_gain',
  'gradual_weight_gain',
  'maintenance',
  'fat_loss',
  'weight_reduction',
  'body_recomposition'
]);

function isRealCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const ProfileInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(60, 'Nome muito longo'),
  birthDate: z.string().refine(isRealCalendarDate, 'Informe uma data de nascimento válida.'),
  heightCm: z.number().min(100, 'Altura deve ser de no mínimo 100 cm').max(250, 'Altura máxima de 250 cm'),
  biologicalSex: BiologicalSexSchema,
  activityLevel: ActivityLevelSchema,
  trainingExperience: TrainingExperienceSchema,
  fitnessGoal: FitnessGoalSchema,
  targetWeightKg: z.number().min(30).max(300).optional(),
  targetDate: z.string().refine(isRealCalendarDate, 'Informe uma data-alvo válida.').optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dietaryPreferences: z.string().max(500).optional(),
  foodBudgetMonthly: z.number().min(0).max(50000).optional(),
  mealsPerDay: z.number().int().min(3, 'Mínimo de 3 refeições').max(6, 'Máximo de 6 refeições'),
  trainingDaysPerWeek: z.number().int().min(1).max(7),
  trainingWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(days => new Set(days).size === days.length, 'Não repita dias da semana.').optional(),
  workSchedule: z.string().max(100).optional(),
  studySchedule: z.string().max(100).optional(),
  sleepSchedule: z.string().max(100).optional(),
  wakeTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  sleepTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  trainingSchedule: z.string().max(100).optional(),
  availableEquipment: z.array(z.string()).optional(),
  interruptionHistoryNotes: z.string().max(1000).optional(),
  initialHistoryConfirmed: z.boolean().optional()
}).refine(profile => Boolean(profile.wakeTime) === Boolean(profile.sleepTime), {
  message: 'Informe os horários de acordar e dormir juntos para ajustar o plano diário.',
  path: ['sleepTime']
}).refine(profile => !profile.wakeTime || profile.wakeTime !== profile.sleepTime, {
  message: 'Os horários de acordar e dormir precisam ser diferentes.',
  path: ['sleepTime']
}).refine(profile => !profile.trainingWeekdays || profile.trainingWeekdays.length === profile.trainingDaysPerWeek, {
  message: 'Selecione a mesma quantidade de dias informada para treinar por semana.',
  path: ['trainingWeekdays']
});

export const ProfileGoalHistoryRecordSchema = z.object({
  id: z.string().min(1).max(160),
  profileId: z.string().min(1).max(160),
  fitnessGoal: FitnessGoalSchema,
  targetWeightKg: z.number().min(30).max(300).nullable(),
  changeKind: z.enum(['initial', 'updated']),
  changedFields: z.array(z.enum(['fitnessGoal', 'targetWeightKg'])).max(2),
  changedAt: z.string().datetime()
}).strict();

export const MeasurementUnitPreferencesSchema = z.object({
  foodMassUnit: z.enum(['g', 'kg']),
  waterVolumeUnit: z.enum(['ml', 'l'])
}).strict();

export const SaveBodyMeasurementInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida para a medição.'),
  heightCm: z.number().finite().min(100).max(250).optional(),
  weightKg: z.number().finite().min(30).max(350).optional(),
  waistCircCm: z.number().finite().min(0.1).max(300).optional(),
  armRelaxedCm: z.number().finite().min(0.1).max(300).optional(),
  armFlexedCm: z.number().finite().min(0.1).max(300).optional(),
  chestCm: z.number().finite().min(0.1).max(300).optional(),
  thighCm: z.number().finite().min(0.1).max(300).optional(),
  hipCm: z.number().finite().min(0.1).max(300).optional(),
  shoulderCircCm: z.number().finite().min(0.1).max(300).optional(),
  calfCm: z.number().finite().min(0.1).max(300).optional(),
  bodyFatPct: z.number().finite().min(0).max(80).optional(),
  source: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(400).optional()
}).strict().refine(input => [
  input.heightCm, input.weightKg, input.waistCircCm, input.armRelaxedCm, input.armFlexedCm,
  input.chestCm, input.thighCm, input.hipCm, input.shoulderCircCm, input.calfCm, input.bodyFatPct
].some(value => value !== undefined), {
  message: 'Informe ao menos um valor corporal para salvar a medição.'
});

export const ShapeMilestoneInputSchema = z.object({
  id: z.string().regex(/^shape-milestone-[a-zA-Z0-9_-]{1,140}$/).optional(),
  title: z.string().trim().min(1).max(100),
  metric: z.enum(['weightKg', 'bodyFatPct', 'waistCircCm', 'armFlexedCm', 'chestCm', 'shoulderCircCm', 'thighCm', 'hipCm', 'calfCm']),
  targetValue: z.number().finite().min(0.1).max(10000),
  direction: z.enum(['increase', 'decrease']),
  targetDate: z.string().refine(isRealCalendarDate, 'Informe uma data-alvo válida.').optional(),
  notes: z.string().trim().max(1000).optional()
}).strict();

export const ShapeMilestoneIdSchema = z.string().regex(/^shape-milestone-[a-zA-Z0-9_-]{1,140}$/);

export const WeightRecordInputSchema = z.object({
  id: z.string().optional(),
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida.'),
  weightKg: z.number().min(30, 'Peso mínimo de 30 kg').max(350, 'Peso máximo de 350 kg'),
  notes: z.string().max(300).optional(),
  source: z.enum(['verified', 'self_reported']).default('verified')
});

export const PhotoPoseSchema = z.enum([
  'front_relaxed',
  'front_flexed',
  'back',
  'side_left',
  'side_right',
  'custom'
]);

export const PhotoInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida para a foto.'),
  pose: PhotoPoseSchema,
  customPoseName: z.string().trim().min(1).max(60).optional(),
  imageBytes: z.instanceof(Uint8Array).refine(bytes => bytes.byteLength > 0 && bytes.byteLength <= 15 * 1024 * 1024, 'A foto deve ter até 15 MB.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  lightingNotes: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(300).optional(),
  isPrimary: z.boolean().optional()
}).superRefine((value, context) => {
  if (value.pose === 'custom' && !value.customPoseName) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['customPoseName'], message: 'Informe o nome da pose personalizada.' });
  }
});

export const PhotoNotesUpdateSchema = z.object({
  id: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/),
  notes: z.string().trim().max(300)
});

export const PhotoIdSchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/);

export const MealPhotoIdentitySchema = z.object({
  mealEntryId: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/)
}).strict();

export const MealPhotoInputSchema = z.object({
  mealEntryId: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida para a refeição.'),
  slotId: z.string().trim().min(1).max(80).regex(/^[\w-]+$/),
  imageBytes: z.instanceof(Uint8Array).refine(bytes => bytes.byteLength > 0 && bytes.byteLength <= 15 * 1024 * 1024, 'A foto deve ter até 15 MB.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'])
}).strict();

export const InitialHistoryConfirmationSchema = z.object({
  confirmedHeightCm: z.number().min(100).max(250),
  confirmedBirthDate: z.string().refine(isRealCalendarDate, 'Informe uma data de nascimento válida.'),
  eggLimitAccepted: z.boolean().default(false),
  targetWeightKg: z.number().min(40).max(200)
});

export const PhysiqueProjectionInputSchema = z.object({
  asOfDate: z.string().refine(isRealCalendarDate, 'Informe uma data base válida.'),
  age: z.number().int().min(18).max(100),
  heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(30).max(350),
  bodyFatPct: z.number().min(3).max(60),
  trainingExperience: TrainingExperienceSchema,
  adherencePercent: z.number().min(0).max(100),
  goal: z.enum(['muscle_gain', 'recomposition', 'fat_loss']),
  measurements: z.object({
    shouldersCm: z.number().positive().max(300).optional(),
    chestCm: z.number().positive().max(300).optional(),
    armCm: z.number().positive().max(300).optional(),
    waistCm: z.number().positive().max(300).optional(),
    thighCm: z.number().positive().max(300).optional()
  }).strict()
}).strict();

export const ExerciseMediaInputSchema = z.object({
  exerciseId: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/),
  originalName: z.string().trim().min(1).max(180),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'video/mp4']),
  imageBytes: z.instanceof(Uint8Array).refine(
    bytes => bytes.byteLength > 0 && bytes.byteLength <= 50 * 1024 * 1024,
    'A mídia deve ter até 50 MB.'
  )
}).strict();

export const ExerciseMediaIdSchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/);

export const CustomFoodInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(['protein', 'carb', 'fat', 'fruit', 'vegetable', 'dairy', 'legume', 'supplement']),
  calories: z.number().finite().min(0).max(1000),
  proteinG: z.number().finite().min(0).max(100),
  carbsG: z.number().finite().min(0).max(100),
  fatsG: z.number().finite().min(0).max(100),
  fiberG: z.number().finite().min(0).max(100).optional(),
  isCooked: z.boolean().default(false),
  substituteGroupId: z.string().trim().min(1).max(80).optional(),
  ingredients: z.array(z.object({
    foodId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
    amountG: z.number().finite().min(0.1).max(50000)
  }).strict()).min(1).max(40).optional(),
  finalWeightG: z.number().finite().min(1).max(50000).optional()
}).strict().superRefine((value, context) => {
  if (value.finalWeightG !== undefined && !value.ingredients?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['finalWeightG'], message: 'Informe ingredientes para usar o peso final.' });
  }
  const ids = value.ingredients?.map(ingredient => ingredient.foodId) || [];
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['ingredients'], message: 'Cada ingrediente deve aparecer uma única vez.' });
  }
});

export const CustomFoodIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const CustomFoodUpdateInputSchema = z.object({
  id: CustomFoodIdSchema,
  food: CustomFoodInputSchema
}).strict();
export const RecipeFavoriteInputSchema = z.object({
  id: CustomFoodIdSchema,
  isFavorite: z.boolean()
}).strict();
export const RecipeServingsInputSchema = z.object({
  id: CustomFoodIdSchema,
  servings: z.number().int().min(1).max(50)
}).strict();
export const RecipeFinalWeightInputSchema = z.object({
  id: CustomFoodIdSchema,
  finalWeightG: z.number().min(1).max(50000).nullable()
}).strict();
export const RecipeFeedbackInputSchema = z.object({
  id: CustomFoodIdSchema,
  rating: z.number().int().min(1).max(5).nullable(),
  personalNotes: z.string().trim().max(2000)
}).strict();
export const SaveFoodPortionPreferenceInputSchema = z.object({
  foodId: CustomFoodIdSchema,
  amountG: z.number().min(1).max(5000).nullable()
}).strict();
export const PersonalDiaryDateSchema = z.string().refine(isRealCalendarDate, 'Informe uma data válida para o diário.');
export const PersonalDiaryDateRangeSchema = z.object({
  fromDate: PersonalDiaryDateSchema,
  toDate: PersonalDiaryDateSchema
}).strict().refine(range => range.fromDate <= range.toDate, 'A data inicial deve ser anterior à data final.');
export const SavePersonalDiaryEntryInputSchema = z.object({
  date: PersonalDiaryDateSchema,
  note: z.string().trim().min(1, 'Escreva uma observação antes de salvar.').max(3000)
}).strict();

export const WorkoutSessionInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data de treino válida.'),
  splitName: z.string().trim().min(1).max(120),
  completed: z.boolean(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  perceivedExertion: z.number().int().min(1).max(10).optional(),
  discomfortLevel: z.number().int().min(0).max(10).optional(),
  discomfortArea: z.string().trim().max(120).optional(),
  recoveryRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(500).optional(),
  sets: z.array(z.object({
    exerciseId: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/),
    setNumber: z.number().int().min(1).max(100),
    weightKg: z.number().min(0.1).max(1000),
    reps: z.number().int().min(1).max(500),
    completed: z.boolean().default(true),
    rpe: z.number().min(1).max(10).optional(),
    rir: z.number().min(0).max(10).optional(),
    notes: z.string().trim().max(200).optional()
  }).strict()).min(1).max(100)
}).strict().refine(input => !input.discomfortArea || (input.discomfortLevel !== undefined && input.discomfortLevel > 0), {
  message: 'Informe uma intensidade maior que zero ao indicar a região do desconforto.',
  path: ['discomfortArea']
});

export const WorkoutTemplatePlanSchema = z.object({
  dayName: z.string().trim().min(1).max(40),
  splitTitle: z.string().trim().min(1).max(120),
  focusMuscles: z.string().trim().max(200),
  recoveryNotes: z.string().trim().max(500),
  exercises: z.array(z.object({
    exerciseId: z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/),
    sets: z.number().int().min(1).max(30),
    repRange: z.string().trim().min(1).max(50),
    restSeconds: z.number().int().min(0).max(3600),
    recommendedWeightKg: z.number().min(0.1).max(1000).optional()
  }).strict()).max(50)
}).strict();

export const SaveWorkoutTemplateInputSchema = z.object({
  id: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  name: z.string().trim().min(1).max(80),
  plans: z.array(WorkoutTemplatePlanSchema).min(1).max(14)
}).strict().refine(input => input.plans.reduce((total, plan) => total + plan.exercises.length, 0) <= 120, {
  message: 'O modelo pode conter no máximo 120 itens de exercício.',
  path: ['plans']
}).refine(input => input.plans.some(plan => plan.exercises.length > 0), {
  message: 'Adicione ao menos um exercício antes de salvar o modelo.',
  path: ['plans']
});

export const SaveWorkoutScheduleInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data de treino válida.'),
  kind: z.enum(['training', 'rest', 'deload']),
  title: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(400).optional()
}).strict();

export const SaveCustomMeasurementDefinitionInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  unit: z.string().trim().min(1).max(10).regex(/^[\p{L}\p{N}%°./ -]+$/u, 'Informe uma unidade simples, como cm ou kg.')
}).strict();

export const SaveCustomMeasurementInputSchema = z.object({
  definitionId: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/),
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida para a medida.'),
  value: z.number().min(0.1).max(10000),
  notes: z.string().trim().max(200).optional()
}).strict();

export const LoggedMealInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida.'),
  mealName: z.string().trim().min(1).max(80),
  mealTurn: z.enum(['breakfast', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'supper']).optional(),
  calories: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(2000),
  fatsG: z.number().min(0).max(1000)
}).strict();

export const HydrationLogInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida.'),
  amountMl: z.number().int().min(1).max(5000)
}).strict();

export const PantryRecipeSearchInputSchema = z.object({
  maxPrepTime: z.number().int().min(1).max(360).optional(),
  requireAllIngredients: z.boolean().optional()
}).strict();

export const PantryItemUpdateInputSchema = z.object({
  foodId: z.string().trim().min(1).max(100).regex(/^[\w-]+$/),
  amountG: z.number().finite().min(0).max(100000),
  expiresAt: z.string().refine(isRealCalendarDate, 'Informe uma data de validade válida.').nullable().optional(),
  isLeftover: z.boolean().optional()
}).strict();

export const PantryPriceUpdateInputSchema = z.object({
  foodId: z.string().trim().min(1).max(100).regex(/^[\w-]+$/),
  unitPrice: z.number().finite().min(0).max(1000000).nullable(),
  priceSource: z.string().trim().min(1).max(120).nullable()
}).strict().refine(input => input.unitPrice === null || input.priceSource !== null, {
  message: 'Informe a origem do preço.',
  path: ['priceSource']
});

export const ShoppingListPurchaseInputSchema = z.object({
  weekStartDate: z.string().refine(isRealCalendarDate, 'Informe uma semana válida.'),
  foodId: z.string().trim().min(1).max(120).regex(/^[\w-]+$/),
  purchased: z.boolean()
}).strict();

export const DailyMealEntryInputSchema = z.object({
  date: z.string().refine(isRealCalendarDate, 'Informe uma data válida.'),
  slotId: z.string().trim().min(1).max(80).regex(/^[\w-]+$/),
  sortOrder: z.number().int().min(0).max(500).optional(),
  mealName: z.string().trim().min(1).max(80),
  mealTurn: z.enum(['breakfast', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'supper']).optional(),
  scheduledTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  recipeId: z.string().trim().max(100).optional(),
  status: z.enum(['pending', 'preparing', 'consumed', 'partial', 'deferred', 'skipped', 'cancelled']),
  items: z.array(z.object({
    itemId: z.string().trim().min(1).max(140),
    foodId: z.string().trim().min(1).max(100),
    foodName: z.string().trim().min(1).max(120),
    plannedAmountG: z.number().min(0).max(5000),
    consumedAmountG: z.number().min(0).max(5000),
    calories: z.number().min(0).max(10000),
    proteinG: z.number().min(0).max(1000),
    carbsG: z.number().min(0).max(2000),
    fatsG: z.number().min(0).max(1000),
    dataQuality: z.enum(['verified', 'estimated', 'user_reported', 'unverified']).optional(),
    dataSource: z.string().trim().max(160).optional(),
    sourceReference: z.string().trim().max(500).optional(),
    confidenceLevel: z.enum(['high', 'medium', 'low', 'unknown']).optional()
}).strict()).max(100),
  note: z.string().trim().max(300).optional()
}).strict();

export const DailyMealDateSchema = z.string().refine(isRealCalendarDate, 'Informe uma data válida.');
export const DailyMealIdentityInputSchema = z.object({
  date: DailyMealDateSchema,
  slotId: z.string().trim().min(1).max(80).regex(/^[\w-]+$/)
}).strict();
export const DailyMealRestoreInputSchema = DailyMealEntryInputSchema.extend({
  id: z.string().trim().min(1).max(180),
  calories: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(2000),
  fatsG: z.number().min(0).max(1000),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime()
}).strict();
export const DailyMealHistoryQuerySchema = z.object({
  fromDate: DailyMealDateSchema,
  toDate: DailyMealDateSchema,
  search: z.string().trim().max(100).optional()
}).strict().refine(query => query.fromDate <= query.toDate, {
  message: 'A data inicial deve ser anterior ou igual à data final.',
  path: ['toDate']
});
export const NutritionAnalyticsQuerySchema = z.object({
  fromDate: DailyMealDateSchema,
  toDate: DailyMealDateSchema
}).strict().refine(query => query.fromDate <= query.toDate, {
  message: 'A data inicial deve ser anterior ou igual à data final.',
  path: ['toDate']
}).refine(query => {
  const from = new Date(`${query.fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${query.toDate}T00:00:00.000Z`).getTime();
  return (to - from) / 86_400_000 <= 366;
}, {
  message: 'Consulte no máximo 367 dias por vez.',
  path: ['toDate']
});
export const MealPrepEventInputSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  date: DailyMealDateSchema,
  scheduledTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário de preparo válido.'),
  recipeId: z.string().trim().min(1).max(100).regex(/^[\w-]+$/),
  servings: z.number().int().min(1).max(50),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(['planned', 'prepared', 'cancelled'])
}).strict();
export const MealPrepEventIdSchema = z.string().trim().min(1).max(80);
export const DailyMealCopyInputSchema = z.object({
  sourceDate: DailyMealDateSchema,
  targetDate: DailyMealDateSchema
}).strict().refine(input => input.sourceDate !== input.targetDate, {
  message: 'Escolha datas diferentes para copiar as refeições.',
  path: ['targetDate']
});
export const SaveMealTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sourceDate: DailyMealDateSchema
}).strict();
export const ApplyMealTemplateInputSchema = z.object({
  templateId: CustomFoodIdSchema,
  targetDate: DailyMealDateSchema
}).strict();
export const ApplyWeeklyMealTemplateInputSchema = z.object({
  templateId: CustomFoodIdSchema,
  weekStartDate: DailyMealDateSchema
}).strict();
export const ReorderDailyMealsInputSchema = z.object({
  date: DailyMealDateSchema,
  slotIds: z.array(z.string().trim().min(1).max(80).regex(/^[\w-]+$/)).min(2).max(100)
}).strict().refine(input => new Set(input.slotIds).size === input.slotIds.length, {
  message: 'Cada refeição deve aparecer uma vez na nova ordem.',
  path: ['slotIds']
});
