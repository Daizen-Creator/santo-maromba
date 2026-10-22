import React, { useState, useMemo, useEffect } from 'react';
import {
  Utensils,
  Search,
  Clock,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ChefHat,
  CheckCircle2,
  Circle,
  SkipForward,
  Plus,
  Star,
  Trash2,
  ImagePlus,
  X
} from 'lucide-react';
import { ApplyMealTemplateInput, ApplyMealTemplateResult, ApplyWeeklyMealTemplateResult, CustomFoodInput, DailyMealCopyInput, DailyMealCopyResult, DailyMealEntry, DailyMealEntryInput, DailyMealHistoryQuery, DailyMealIdentityInput, DailyMealItemLog, DailyMealRestoreInput, DailyMealStatus, DashboardSummary, FoodItem, FoodPortionPreference, MealPhotoInput, MealPhotoRecord, MealTemplate, MealTurn, NutritionMealDistributionEntry, NutritionTargets, PantryItem, PantryRecipeSearchInput, Recipe, RecipeFeedbackInput, RecentlyUsedFood, ReorderDailyMealsInput, SaveFoodPortionPreferenceInput, SaveMealTemplateInput, ShoppingListItem, ShoppingListPurchaseInput, SubstitutionOption } from '../../shared/types';
import { buildMealSchedule } from '../../domain/meal-schedule';
import { filterRecipesForProfile, getRecipePreferenceScore, rankRecipesByPreferences } from '../../domain/recipe-compatibility';
import { CustomFoodLibrary } from '../components/CustomFoodLibrary';
import { searchRecipes } from '../../domain/nutrition-catalog';
import { getIngredientPerServing, getRecipeNutritionPer100g, getRecipeNutritionPerServing } from '../../domain/recipe-portions';
import { DAILY_MEAL_STATUSES, summarizeDailyMealStatuses } from '../../domain/meal-status-summary';
import { calculateConsumedFromLeftovers, calculateLeftoverAmount } from '../../domain/meal-leftovers';
import { compareMealNutrition } from '../../domain/meal-nutrition-comparison';
import { getMaxPlannedAmountG, scalePlannedMealItem } from '../../domain/planned-meal-portion';
import { NutritionBalanceMetric, calculateNutritionBalance } from '../../domain/nutrition-balance';
import { displayMassToGrams, formatFoodMass, gramsToDisplayMass } from '../../domain/measurement-units';
import { useMeasurementUnits } from '../hooks/use-measurement-units';
import { NaturalMealParseResult, parseNaturalMealDescription } from '../../domain/natural-meal-parser';
import { getMealTurnLabel, MEAL_TURN_OPTIONS } from '../../domain/meal-turn';
import { createPlannedMealFoodItem, removePlannedMealFoodItem } from '../../domain/meal-composition';
import { WeeklyMealPlanner } from '../components/WeeklyMealPlanner';

const nutritionQualityLabel = (quality: DailyMealItemLog['dataQuality']): string => {
  switch (quality) {
    case 'verified': return 'Fonte verificada';
    case 'estimated': return 'Estimativa local';
    case 'user_reported': return 'Informado pelo usuário';
    default: return 'Fonte não verificada';
  }
};

const formatDateInput = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

const formatNutritionBalance = (balance: NutritionBalanceMetric | null, unit: string): string => {
  if (!balance) return 'Sem registro';
  if (balance.remaining === 0) return 'Meta atingida';
  const amount = unit === 'kcal' ? Math.round(Math.abs(balance.remaining)).toString() : Math.abs(balance.remaining).toFixed(1);
  return balance.remaining > 0 ? `Faltam ${amount} ${unit}` : `Acima da meta em ${amount} ${unit}`;
};

interface NutritionViewProps {
  targets: NutritionTargets | null;
  summary: DashboardSummary | null;
  mealsPerDay: number;
  wakeTime?: string;
  sleepTime?: string;
  allergies?: string[];
  dietaryRestrictions?: string[];
  dietaryPreferences?: string;
  foods: FoodItem[];
  recipes: Recipe[];
  dailyMealEntries: DailyMealEntry[];
  onGetNutritionDistribution: (date: string) => Promise<NutritionMealDistributionEntry[]>;
  pantry: PantryItem[];
  onGetSubstitutions: (foodId: string, amountG: number) => Promise<SubstitutionOption[]>;
  onUpdatePantry: (foodId: string, amountG: number) => Promise<void>;
  onFindRecipesFromPantry: (input?: PantryRecipeSearchInput) => Promise<Array<Recipe & { matchRate: number }>>;
  onSaveDailyMeal: (input: DailyMealEntryInput) => Promise<void>;
  onDeleteDailyMeal: (input: DailyMealIdentityInput) => Promise<DailyMealEntry>;
  onRestoreDailyMeal: (input: DailyMealRestoreInput) => Promise<DailyMealEntry>;
  onSaveCustomFood: (input: CustomFoodInput, id?: string) => Promise<FoodItem>;
  onGetRecentlyUsedFoods: () => Promise<RecentlyUsedFood[]>;
  onGetFoodPortionPreferences: () => Promise<FoodPortionPreference[]>;
  onSaveFoodPortionPreference: (input: SaveFoodPortionPreferenceInput) => Promise<FoodPortionPreference | null>;
  onGetMealHistory: (query: DailyMealHistoryQuery) => Promise<DailyMealEntry[]>;
  onGetMealPhotos: (date: string) => Promise<MealPhotoRecord[]>;
  onAddMealPhoto: (input: MealPhotoInput) => Promise<MealPhotoRecord>;
  onDeleteMealPhoto: (input: { mealEntryId: string }) => Promise<void>;
  onCopyDailyMeals: (input: DailyMealCopyInput) => Promise<DailyMealCopyResult>;
  onGetMealTemplates: () => Promise<MealTemplate[]>;
  onSaveMealTemplate: (input: SaveMealTemplateInput) => Promise<MealTemplate>;
  onApplyMealTemplate: (input: ApplyMealTemplateInput) => Promise<ApplyMealTemplateResult>;
  onApplyWeeklyMealTemplate: (input: { templateId: string; weekStartDate: string }) => Promise<ApplyWeeklyMealTemplateResult>;
  onReorderDailyMeals: (input: ReorderDailyMealsInput) => Promise<DailyMealEntry[]>;
  onGetShoppingList: (weekStartDate: string) => Promise<ShoppingListItem[]>;
  onGenerateShoppingList: (weekStartDate: string) => Promise<ShoppingListItem[]>;
  onSetShoppingItemPurchased: (input: ShoppingListPurchaseInput) => Promise<ShoppingListItem[]>;
  onSetRecipeFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  onSetRecipeServings: (id: string, servings: number) => Promise<void>;
  onSetRecipeFinalWeight: (id: string, finalWeightG: number | null) => Promise<void>;
  onSetRecipeFeedback: (input: RecipeFeedbackInput) => Promise<void>;
  onSetFoodFavorite: (id: string, isFavorite: boolean) => Promise<void>;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  targets,
  summary,
  mealsPerDay,
  wakeTime,
  sleepTime,
  allergies,
  dietaryRestrictions,
  dietaryPreferences,
  foods,
  recipes,
  dailyMealEntries,
  onGetNutritionDistribution,
  pantry,
  onGetSubstitutions,
  onUpdatePantry,
  onFindRecipesFromPantry,
  onSaveDailyMeal,
  onDeleteDailyMeal,
  onRestoreDailyMeal,
  onSaveCustomFood,
  onGetRecentlyUsedFoods,
  onGetFoodPortionPreferences,
  onSaveFoodPortionPreference,
  onGetMealHistory,
  onGetMealPhotos,
  onAddMealPhoto,
  onDeleteMealPhoto,
  onCopyDailyMeals,
  onGetMealTemplates,
  onSaveMealTemplate,
  onApplyMealTemplate,
  onApplyWeeklyMealTemplate,
  onReorderDailyMeals,
  onGetShoppingList,
  onGenerateShoppingList,
  onSetShoppingItemPurchased,
  onSetRecipeFavorite,
  onSetRecipeServings,
  onSetRecipeFinalWeight,
  onSetRecipeFeedback,
  onSetFoodFavorite
}) => {
  const [activeTab, setActiveTab] = useState<'meals' | 'catalog200' | 'pantry' | 'what_to_eat' | 'foods' | 'history'>('meals');
  const { preferences: unitPreferences, loading: unitsLoading, saving: unitsSaving, error: unitsError, updatePreferences } = useMeasurementUnits();
  const foodMassInputStep = unitPreferences.foodMassUnit === 'kg' ? 0.005 : 5;
  const displayFoodMass = (grams: number) => gramsToDisplayMass(grams, unitPreferences.foodMassUnit);
  const formatMass = (grams: number) => formatFoodMass(grams, unitPreferences.foodMassUnit);
  const saveUnitPreference = (change: Partial<typeof unitPreferences>) => { void updatePreferences(change).catch(() => undefined); };

  // Filtros do Catálogo de 200 Receitas
  const [selectedTurn, setSelectedTurn] = useState<MealTurn | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [maxCostFilter, setMaxCostFilter] = useState<number>(15);
  const [recipePage, setRecipePage] = useState<number>(0);
  const recipesPerPage = 24;

  // Modal de Substituição Inteligente
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(false);
  const [missingFoodName, setMissingFoodName] = useState<string>('');
  const [missingAmountG, setMissingAmountG] = useState<number>(100);
  const [substitutionOptions, setSubstitutionOptions] = useState<SubstitutionOption[]>([]);
  const [substitutionSlotId, setSubstitutionSlotId] = useState<string | null>(null);
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<Record<string, SubstitutionOption>>({});
  const [subLoading, setSubLoading] = useState<boolean>(false);
  const [appliedSubMsg, setAppliedSubMsg] = useState<string | null>(null);

  // "O que posso comer com o que tenho"
  const [pantryMatchedRecipes, setPantryMatchedRecipes] = useState<Array<Recipe & { matchRate: number }>>([]);
  const [findingPantryLoading, setFindingPantryLoading] = useState<boolean>(false);
  const [pantryRequiresFullStock, setPantryRequiresFullStock] = useState(false);
  const [pantryAnalysisRun, setPantryAnalysisRun] = useState(false);
  const [pantrySearchError, setPantrySearchError] = useState<string | null>(null);
  const [draftAmounts, setDraftAmounts] = useState<Record<string, number>>({});
  const [draftPlannedAmounts, setDraftPlannedAmounts] = useState<Record<string, number>>({});
  const [ingredientSelections, setIngredientSelections] = useState<Record<string, string>>({});
  const [nutritionDistribution, setNutritionDistribution] = useState<NutritionMealDistributionEntry[]>([]);
  const [nutritionDistributionLoading, setNutritionDistributionLoading] = useState(true);
  const [nutritionDistributionError, setNutritionDistributionError] = useState<string | null>(null);
  const [savingMealSlot, setSavingMealSlot] = useState<string | null>(null);
  const [mealListFilter, setMealListFilter] = useState<'all' | 'eaten' | 'remaining'>('all');
  const [mealSaveError, setMealSaveError] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [recipeActionError, setRecipeActionError] = useState<string | null>(null);
  const [recipeServingDrafts, setRecipeServingDrafts] = useState<Record<string, string>>({});
  const [recipeFinalWeightDrafts, setRecipeFinalWeightDrafts] = useState<Record<string, string>>({});
  const [recipeFeedbackOpenId, setRecipeFeedbackOpenId] = useState<string | null>(null);
  const [recipeFeedbackDrafts, setRecipeFeedbackDrafts] = useState<Record<string, { rating: number | null; personalNotes: string }>>({});
  const [savingRecipeFeedbackId, setSavingRecipeFeedbackId] = useState<string | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentlyUsedFood[]>([]);
  const [recentFoodsError, setRecentFoodsError] = useState<string | null>(null);
  const [foodPortionPreferences, setFoodPortionPreferences] = useState<FoodPortionPreference[]>([]);
  const [foodPortionDrafts, setFoodPortionDrafts] = useState<Record<string, string>>({});
  const [foodPortionSaving, setFoodPortionSaving] = useState<string | null>(null);
  const [foodPortionError, setFoodPortionError] = useState<string | null>(null);
  const [naturalMealDescription, setNaturalMealDescription] = useState('');
  const [naturalMealParse, setNaturalMealParse] = useState<NaturalMealParseResult | null>(null);
  const [naturalMealSlotId, setNaturalMealSlotId] = useState('');
  const [naturalMealTurn, setNaturalMealTurn] = useState<MealTurn | null>(null);
  const [naturalMealError, setNaturalMealError] = useState<string | null>(null);
  const [naturalMealStatus, setNaturalMealStatus] = useState<string | null>(null);
  const [historyFromDate, setHistoryFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return formatDateInput(date);
  });
  const [historyToDate, setHistoryToDate] = useState(() => formatDateInput(new Date()));
  const [historySearch, setHistorySearch] = useState('');
  const [historyEntries, setHistoryEntries] = useState<DailyMealEntry[]>([]);
  const [mealPhotos, setMealPhotos] = useState<Record<string, MealPhotoRecord>>({});
  const [mealPhotoBusy, setMealPhotoBusy] = useState<string | null>(null);
  const [mealPhotoError, setMealPhotoError] = useState<string | null>(null);
  const [expandedMealPhoto, setExpandedMealPhoto] = useState<MealPhotoRecord | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [mealDeleteTarget, setMealDeleteTarget] = useState<DailyMealEntry | null>(null);
  const [mealDeleteBusy, setMealDeleteBusy] = useState(false);
  const [mealMutationError, setMealMutationError] = useState<string | null>(null);
  const [deletedMealForUndo, setDeletedMealForUndo] = useState<DailyMealEntry | null>(null);
  const [copySourceDate, setCopySourceDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return formatDateInput(date);
  });
  const [copyTargetDate, setCopyTargetDate] = useState(() => formatDateInput(new Date()));
  const [copyResultMessage, setCopyResultMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateSourceDate, setTemplateSourceDate] = useState(() => formatDateInput(new Date()));
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateTargetDate, setTemplateTargetDate] = useState(() => formatDateInput(new Date()));
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  const today = new Date();
  const todayString = formatDateInput(today);
  const nutritionBalance = calculateNutritionBalance(targets, summary);
  const mealPhotoKey = (mealEntryId: string) => mealEntryId;

  useEffect(() => {
    let active = true;
    void onGetMealPhotos(todayString).then(photos => {
      if (!active) return;
      setMealPhotos(current => ({
        ...Object.fromEntries(Object.entries(current).filter(([, photo]) => photo.date !== todayString)),
        ...Object.fromEntries(photos.map(photo => [mealPhotoKey(photo.mealEntryId), photo]))
      }));
      setMealPhotoError(null);
    }).catch(error => {
      if (active) setMealPhotoError(error instanceof Error ? error.message : 'Não foi possível carregar as fotos das refeições.');
    });
    return () => { active = false; };
  }, [todayString, onGetMealPhotos]);

  useEffect(() => {
    const dates = [...new Set(historyEntries.map(entry => entry.date))];
    if (!dates.length) return;
    let active = true;
    void Promise.all(dates.map(date => onGetMealPhotos(date))).then(groups => {
      if (!active) return;
      setMealPhotos(current => {
        const next = { ...current };
        dates.forEach(date => Object.entries(next).filter(([, photo]) => photo.date === date).forEach(([key]) => delete next[key]));
        groups.flat().forEach(photo => { next[mealPhotoKey(photo.mealEntryId)] = photo; });
        return next;
      });
    }).catch(error => {
      if (active) setMealPhotoError(error instanceof Error ? error.message : 'Não foi possível carregar as fotos do histórico.');
    });
    return () => { active = false; };
  }, [historyEntries, onGetMealPhotos]);

  const attachMealPhoto = async (mealEntryId: string | undefined, date: string, slotId: string, file?: File) => {
    if (!mealEntryId || !file) return;
    const key = mealPhotoKey(mealEntryId);
    setMealPhotoBusy(key);
    setMealPhotoError(null);
    try {
      const photo = await onAddMealPhoto({
        mealEntryId,
        date,
        slotId,
        imageBytes: new Uint8Array(await file.arrayBuffer()),
        mimeType: file.type as MealPhotoInput['mimeType']
      });
      setMealPhotos(current => ({ ...current, [key]: photo }));
    } catch (error) {
      setMealPhotoError(error instanceof Error ? error.message : 'Não foi possível salvar a foto da refeição.');
    } finally {
      setMealPhotoBusy(null);
    }
  };

  const removeMealPhoto = async (mealEntryId: string) => {
    if (!window.confirm('Remover a foto desta refeição?')) return;
    const key = mealPhotoKey(mealEntryId);
    setMealPhotoBusy(key);
    setMealPhotoError(null);
    try {
      await onDeleteMealPhoto({ mealEntryId });
      setMealPhotos(current => { const next = { ...current }; delete next[key]; return next; });
    } catch (error) {
      setMealPhotoError(error instanceof Error ? error.message : 'Não foi possível remover a foto da refeição.');
    } finally {
      setMealPhotoBusy(null);
    }
  };

  const renderMealPhotoAttachment = (date: string, slotId: string, mealName: string, mealEntryId?: string) => {
    const key = mealEntryId ? mealPhotoKey(mealEntryId) : `${date}/${slotId}`;
    const photo = mealEntryId ? mealPhotos[key] : undefined;
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/35 p-3" aria-label={`Foto de ${mealName}`}>
        <label className={`inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 ${mealEntryId ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
          <ImagePlus className="h-4 w-4" />
          {mealPhotoBusy === key ? 'Salvando foto…' : photo ? 'Trocar foto' : 'Anexar foto'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!mealEntryId || mealPhotoBusy === key}
            aria-label={`Anexar foto de ${mealName}`} onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              void attachMealPhoto(mealEntryId, date, slotId, file);
            }} />
        </label>
        {!mealEntryId && <p className="text-[10px] text-muted-foreground">Salve o registro da refeição para anexar uma foto.</p>}
        {photo && <>
          <button type="button" aria-label={`Ampliar foto de ${mealName}`} onClick={() => setExpandedMealPhoto(photo)} className="overflow-hidden rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary">
            <img src={photo.filePath} alt={`Foto anexada a ${mealName} em ${new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')}`} className="h-14 w-20 object-cover" />
          </button>
          <button type="button" disabled={mealPhotoBusy === key || !mealEntryId} onClick={() => mealEntryId && void removeMealPhoto(mealEntryId)} className="rounded-lg border border-border px-2.5 py-2 text-[10px] text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50">Remover foto</button>
        </>}
      </div>
    );
  };

  const refreshRecentFoods = async () => {
    try {
      setRecentFoods(await onGetRecentlyUsedFoods());
      setRecentFoodsError(null);
    } catch (error) {
      setRecentFoodsError(error instanceof Error ? error.message : 'Não foi possível consultar alimentos recentes.');
    }
  };

  useEffect(() => { void refreshRecentFoods(); }, [onGetRecentlyUsedFoods]);

  const refreshFoodPortionPreferences = async () => {
    try {
      setFoodPortionPreferences(await onGetFoodPortionPreferences());
      setFoodPortionError(null);
    } catch (error) {
      setFoodPortionError(error instanceof Error ? error.message : 'Não foi possível carregar as porções habituais.');
    }
  };

  useEffect(() => { void refreshFoodPortionPreferences(); }, [onGetFoodPortionPreferences]);

  const saveFoodPortion = async (foodId: string, amountG: number | null) => {
    setFoodPortionSaving(foodId);
    setFoodPortionError(null);
    try {
      const saved = await onSaveFoodPortionPreference({ foodId, amountG });
      setFoodPortionPreferences(current => [
        ...current.filter(item => item.foodId !== foodId),
        ...(saved ? [saved] : [])
      ]);
      setFoodPortionDrafts(current => { const next = { ...current }; delete next[foodId]; return next; });
    } catch (error) {
      setFoodPortionError(error instanceof Error ? error.message : 'Não foi possível salvar a porção habitual.');
    } finally {
      setFoodPortionSaving(null);
    }
  };

  const saveRecentFoodPortion = async (item: RecentlyUsedFood) => {
    const rawValue = foodPortionDrafts[item.foodId]
      ?? displayFoodMass(foodPortionPreferences.find(preference => preference.foodId === item.foodId)?.amountG ?? item.lastAmountG);
    const amountG = displayMassToGrams(Number(rawValue), unitPreferences.foodMassUnit);
    if (!Number.isFinite(amountG) || amountG < 1 || amountG > 5000) {
      setFoodPortionError('A porção habitual deve ficar entre 1 e 5.000 g.');
      return;
    }
    await saveFoodPortion(item.foodId, amountG);
  };

  const portionByFoodId = useMemo(
    () => new Map(foodPortionPreferences.map(preference => [preference.foodId, preference.amountG])),
    [foodPortionPreferences]
  );

  useEffect(() => {
    let active = true;
    setNutritionDistributionLoading(true);
    setNutritionDistributionError(null);
    onGetNutritionDistribution(todayString)
      .then(entries => { if (active) setNutritionDistribution(entries); })
      .catch(error => {
        if (active) setNutritionDistributionError(error instanceof Error ? error.message : 'Não foi possível consultar a distribuição alimentar.');
      })
      .finally(() => { if (active) setNutritionDistributionLoading(false); });
    return () => { active = false; };
  }, [onGetNutritionDistribution, todayString, dailyMealEntries, summary]);

  const itemsForMeal = (recipe: Recipe | null, substitution?: SubstitutionOption): DailyMealItemLog[] => {
    const ingredients = substitution?.items ?? recipe?.ingredients ?? [];
    return ingredients.map((item, index) => {
      const portion = recipe && !substitution ? getIngredientPerServing(item, recipe.servings ?? 1) : item;
      const food = foods.find(candidate => candidate.id === item.foodId);
      return {
        itemId: `${portion.foodId}-${index}`,
        foodId: portion.foodId,
        foodName: portion.foodName,
        plannedAmountG: portion.amountG,
        consumedAmountG: 0,
        calories: portion.calories,
        proteinG: portion.proteinG,
        carbsG: portion.carbsG,
        fatsG: portion.fatsG,
        dataQuality: portion.dataQuality ?? food?.dataQuality ?? 'unverified',
        dataSource: portion.dataSource ?? food?.source ?? 'Origem não registrada',
        sourceReference: portion.sourceReference ?? food?.sourceReference,
        confidenceLevel: portion.confidenceLevel ?? food?.confidenceLevel ?? 'unknown'
      };
    });
  };

  const saveRecipeServings = async (recipe: Recipe, rawValue: string) => {
    const servings = Number(rawValue);
    if (!Number.isInteger(servings) || servings < 1 || servings > 50) {
      setRecipeActionError('Informe um rendimento inteiro entre 1 e 50 porções.');
      setRecipeServingDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
      return;
    }
    setRecipeActionError(null);
    try {
      await onSetRecipeServings(recipe.id, servings);
      setRecipeServingDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
    } catch (error) {
      setRecipeActionError(error instanceof Error ? error.message : 'Não foi possível salvar o rendimento da receita.');
      setRecipeServingDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
    }
  };

  const saveRecipeFinalWeight = async (recipe: Recipe, rawValue: string) => {
    const finalWeightG = rawValue.trim() === '' ? null : Number(rawValue);
    if (finalWeightG !== null && (!Number.isFinite(finalWeightG) || finalWeightG < 1 || finalWeightG > 50000)) {
      setRecipeActionError('Informe o peso final preparado entre 1 g e 50.000 g.');
      setRecipeFinalWeightDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
      return;
    }
    setRecipeActionError(null);
    try {
      await onSetRecipeFinalWeight(recipe.id, finalWeightG);
      setRecipeFinalWeightDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
    } catch (error) {
      setRecipeActionError(error instanceof Error ? error.message : 'Não foi possível salvar o peso final da receita.');
      setRecipeFinalWeightDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
    }
  };

  const saveRecipeFeedback = async (recipe: Recipe) => {
    const feedback = recipeFeedbackDrafts[recipe.id] ?? {
      rating: recipe.userRating ?? null,
      personalNotes: recipe.personalNotes ?? ''
    };
    setRecipeActionError(null);
    setSavingRecipeFeedbackId(recipe.id);
    try {
      await onSetRecipeFeedback({ id: recipe.id, ...feedback });
      setRecipeFeedbackDrafts(current => { const next = { ...current }; delete next[recipe.id]; return next; });
      setRecipeFeedbackOpenId(null);
    } catch (error) {
      setRecipeActionError(error instanceof Error ? error.message : 'Não foi possível salvar a avaliação da receita.');
    } finally {
      setSavingRecipeFeedbackId(null);
    }
  };

  const searchMealHistory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const entries = await onGetMealHistory({
        fromDate: historyFromDate,
        toDate: historyToDate,
        search: historySearch.trim()
      });
      setHistoryEntries(entries);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Não foi possível pesquisar o histórico.');
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const confirmDeleteMeal = async () => {
    if (!mealDeleteTarget) return;
    setMealDeleteBusy(true);
    setMealMutationError(null);
    try {
      const deleted = await onDeleteDailyMeal({ date: mealDeleteTarget.date, slotId: mealDeleteTarget.slotId });
      setHistoryEntries(current => current.filter(entry => entry.id !== deleted.id));
      setDeletedMealForUndo(deleted);
      setMealDeleteTarget(null);
    } catch (error) {
      setMealMutationError(error instanceof Error ? error.message : 'Não foi possível excluir a refeição.');
    } finally {
      setMealDeleteBusy(false);
    }
  };

  const undoDeleteMeal = async () => {
    if (!deletedMealForUndo) return;
    setMealDeleteBusy(true);
    setMealMutationError(null);
    try {
      await onRestoreDailyMeal(deletedMealForUndo);
      setHistoryEntries(await onGetMealHistory({
        fromDate: historyFromDate,
        toDate: historyToDate,
        search: historySearch.trim()
      }));
      setDeletedMealForUndo(null);
    } catch (error) {
      setMealMutationError(error instanceof Error ? error.message : 'Não foi possível desfazer a exclusão.');
    } finally {
      setMealDeleteBusy(false);
    }
  };

  const copyMealsFromDay = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopyError(null);
    setCopyResultMessage(null);
    try {
      const result = await onCopyDailyMeals({ sourceDate: copySourceDate, targetDate: copyTargetDate });
      setCopyResultMessage(`${result.copiedCount} refeição(ões) copiada(s); ${result.skippedCount} slot(s) existente(s) preservado(s).`);
      setHistoryFromDate(copyTargetDate);
      setHistoryToDate(copyTargetDate);
      setHistoryEntries(await onGetMealHistory({ fromDate: copyTargetDate, toDate: copyTargetDate }));
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : 'Não foi possível copiar as refeições.');
    }
  };

  const refreshMealTemplates = async () => {
    try {
      const templates = await onGetMealTemplates();
      setMealTemplates(templates);
      setSelectedTemplateId(current => current && templates.some(template => template.id === current) ? current : templates[0]?.id || '');
      setTemplateError(null);
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Não foi possível carregar os modelos.');
    }
  };

  useEffect(() => {
    void refreshMealTemplates();
  }, []);

  const saveMealTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTemplateSaving(true);
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      const template = await onSaveMealTemplate({ name: templateName, sourceDate: templateSourceDate });
      setMealTemplates(current => [template, ...current.filter(item => item.id !== template.id)]);
      setSelectedTemplateId(template.id);
      setTemplateName('');
      setTemplateMessage(`Modelo “${template.name}” salvo com ${template.meals.length} refeições.`);
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Não foi possível salvar o modelo.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const applyMealTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTemplateError(null);
    setTemplateMessage(null);
    try {
      const result = await onApplyMealTemplate({ templateId: selectedTemplateId, targetDate: templateTargetDate });
      setTemplateMessage(`${result.copiedCount} refeição(ões) adicionada(s); ${result.skippedCount} horário(s) preenchido(s) preservado(s).`);
      setHistoryFromDate(templateTargetDate);
      setHistoryToDate(templateTargetDate);
      setHistoryEntries(await onGetMealHistory({ fromDate: templateTargetDate, toDate: templateTargetDate }));
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Não foi possível aplicar o modelo.');
    }
  };

  const getCurrentAmounts = (slotId: string, items: DailyMealItemLog[]) => {
    const entry = dailyMealEntries.find(item => item.date === todayString && item.slotId === slotId);
    return Object.fromEntries(items.map(item => {
      const draftKey = `${slotId}:${item.itemId}`;
      const saved = entry?.items.find(savedItem => savedItem.itemId === item.itemId);
      return [item.itemId, draftAmounts[draftKey] ?? saved?.consumedAmountG ?? 0];
    })) as Record<string, number>;
  };

  const saveMealState = async (
    slot: ReturnType<typeof buildMealSchedule>[number],
    recipe: Recipe | null,
    substitution: SubstitutionOption | undefined,
    status: DailyMealStatus,
    amounts: Record<string, number>,
    plannedItems?: DailyMealItemLog[],
    preserveRecipeLink = true
  ) => {
    const sourceItems = plannedItems ?? itemsForMeal(recipe, substitution);
    const existing = dailyMealEntries.find(item => item.date === todayString && item.slotId === slot.id);
    const items = sourceItems.map(item => ({
      ...item,
      consumedAmountG: status === 'pending'
        ? 0
        : Math.max(0, Math.min(5000, Number(amounts[item.itemId] || 0)))
    }));
    setSavingMealSlot(slot.id);
    setMealSaveError(null);
    try {
      await onSaveDailyMeal({
        date: todayString,
        slotId: slot.id,
        mealName: slot.title,
        mealTurn: slot.category,
        scheduledTime: slot.time,
        recipeId: preserveRecipeLink ? recipe?.id : undefined,
        status,
        items,
        note: existing?.note
      });
      setDraftPlannedAmounts(current => {
        const next = { ...current };
        sourceItems.forEach(item => { delete next[`${slot.id}:${item.itemId}`]; });
        return next;
      });
      await refreshRecentFoods();
    } catch (error) {
      setMealSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o registro da refeição.');
    } finally {
      setSavingMealSlot(null);
    }
  };

  const addIngredientToMeal = async (
    slot: ReturnType<typeof buildMealSchedule>[number],
    recipe: Recipe | null,
    substitution: SubstitutionOption | undefined,
    currentItems: DailyMealItemLog[]
  ) => {
    const foodId = ingredientSelections[slot.id];
    const food = foods.find(candidate => candidate.id === foodId);
    if (!food) {
      setMealSaveError('Selecione um alimento do catálogo para adicionar.');
      return;
    }
    const item = createPlannedMealFoodItem(food, 100, `added-${food.id}-${Date.now()}`);
    const amounts = getCurrentAmounts(slot.id, currentItems);
    await saveMealState(slot, recipe, substitution, 'pending', amounts, [...currentItems, item], false);
    setIngredientSelections(current => ({ ...current, [slot.id]: '' }));
    setDraftPlannedAmounts(current => {
      const next = { ...current };
      currentItems.forEach(existing => delete next[`${slot.id}:${existing.itemId}`]);
      return next;
    });
  };

  const removeIngredientFromMeal = async (
    slot: ReturnType<typeof buildMealSchedule>[number],
    recipe: Recipe | null,
    substitution: SubstitutionOption | undefined,
    currentItems: DailyMealItemLog[],
    itemId: string
  ) => {
    const nextItems = removePlannedMealFoodItem(currentItems, itemId);
    const amounts = getCurrentAmounts(slot.id, currentItems);
    delete amounts[itemId];
    await saveMealState(slot, recipe, substitution, 'pending', amounts, nextItems, false);
    setDraftAmounts(current => { const next = { ...current }; delete next[`${slot.id}:${itemId}`]; return next; });
    setDraftPlannedAmounts(current => { const next = { ...current }; delete next[`${slot.id}:${itemId}`]; return next; });
  };

  const toggleMealIngredient = async (
    slot: ReturnType<typeof buildMealSchedule>[number],
    recipe: Recipe | null,
    substitution: SubstitutionOption | undefined,
    item: DailyMealItemLog,
    checked: boolean,
    plannedItems?: DailyMealItemLog[]
  ) => {
    const sourceItems = plannedItems ?? itemsForMeal(recipe, substitution);
    const amounts = getCurrentAmounts(slot.id, sourceItems);
    amounts[item.itemId] = checked ? item.plannedAmountG : 0;
    const consumed = sourceItems.map(source => amounts[source.itemId] || 0);
    const any = consumed.some(amount => amount > 0);
    const all = sourceItems.length > 0 && consumed.every((amount, index) => amount >= sourceItems[index].plannedAmountG);
    const status: DailyMealStatus = all ? 'consumed' : any ? 'partial' : 'pending';
    setDraftAmounts(current => ({ ...current, [`${slot.id}:${item.itemId}`]: amounts[item.itemId] }));
    await saveMealState(slot, recipe, substitution, status, amounts);
  };

  // Filtragem das 200 Receitas
  const compatibleRecipes = useMemo(
    () => filterRecipesForProfile(recipes, { allergies, dietaryRestrictions }),
    [recipes, allergies, dietaryRestrictions]
  );
  const compatiblePantryRecipes = useMemo(
    () => filterRecipesForProfile(pantryMatchedRecipes, { allergies, dietaryRestrictions }),
    [pantryMatchedRecipes, allergies, dietaryRestrictions]
  );
  const preferredRecipes = useMemo(
    () => rankRecipesByPreferences(compatibleRecipes, dietaryPreferences),
    [compatibleRecipes, dietaryPreferences]
  );
  const preferredPantryRecipes = useMemo(
    () => rankRecipesByPreferences(compatiblePantryRecipes, dietaryPreferences, recipe => recipe.matchRate * 100),
    [compatiblePantryRecipes, dietaryPreferences]
  );
  const filteredRecipes = useMemo(() => {
    const matchingRecipeIds = new Set(searchRecipes(preferredRecipes, searchTerm).map(recipe => recipe.id));
    return preferredRecipes.filter(r => {
      const matchTurn = selectedTurn === 'all' || r.category === selectedTurn;
      const matchSearch = matchingRecipeIds.has(r.id);
      const matchCost = !r.estimatedCost || r.estimatedCost <= maxCostFilter;
      const matchFavorite = !favoritesOnly || Boolean(r.isFavorite);
      return matchTurn && matchSearch && matchCost && matchFavorite;
    });
  }, [preferredRecipes, selectedTurn, searchTerm, maxCostFilter, favoritesOnly]);

  useEffect(() => {
    setRecipePage(0);
  }, [preferredRecipes, selectedTurn, searchTerm, maxCostFilter, favoritesOnly]);

  const visibleRecipes = useMemo(
    () => filteredRecipes.slice(recipePage * recipesPerPage, (recipePage + 1) * recipesPerPage),
    [filteredRecipes, recipePage]
  );
  const recipePageCount = Math.max(1, Math.ceil(filteredRecipes.length / recipesPerPage));

  const mealPlan = useMemo(() => {
    const slots = buildMealSchedule(mealsPerDay, targets, { wakeTime, sleepTime });
    const usedRecipeIds = new Set<string>();
    return slots.map(slot => {
      const candidates = compatibleRecipes
        .filter(recipe => recipe.category === slot.category)
        .sort((a, b) => {
          const target = slot.target;
          if (!target) return a.prepTimeMinutes - b.prepTimeMinutes;
          const score = (recipe: Recipe) =>
            Math.abs(getRecipeNutritionPerServing(recipe).calories - target.calories) +
            Math.abs(getRecipeNutritionPerServing(recipe).proteinG - target.proteinG) * 3 +
            Math.abs(getRecipeNutritionPerServing(recipe).carbsG - target.carbsG) * 0.35;
          return score(a) - score(b) - getRecipePreferenceScore(a, dietaryPreferences) * 2
            + getRecipePreferenceScore(b, dietaryPreferences) * 2;
        });
      const recipe = candidates.find(candidate => !usedRecipeIds.has(candidate.id)) || candidates[0] || null;
      if (recipe) usedRecipeIds.add(recipe.id);
      return { slot, recipe, substitution: selectedSubstitutions[slot.id] };
    });
  }, [mealsPerDay, compatibleRecipes, dietaryPreferences, selectedSubstitutions, targets, wakeTime, sleepTime]);

  const naturalMealSlots = mealPlan.filter(({ slot }) => {
    const existing = dailyMealEntries.find(entry => entry.date === todayString && entry.slotId === slot.id);
    return existing?.status !== 'consumed' && existing?.status !== 'partial';
  });
  const naturalMealSlot = naturalMealSlots.find(({ slot }) => slot.id === naturalMealSlotId) ?? naturalMealSlots[0] ?? null;

  const interpretNaturalMeal = () => {
    setNaturalMealError(null);
    setNaturalMealStatus(null);
    try {
      setNaturalMealParse(parseNaturalMealDescription(naturalMealDescription, foods));
    } catch (error) {
      setNaturalMealParse(null);
      setNaturalMealError(error instanceof Error ? error.message : 'Não foi possível interpretar a refeição.');
    }
  };

  const saveNaturalMeal = async () => {
    if (!naturalMealParse || !naturalMealSlot) return;
    setSavingMealSlot(naturalMealSlot.slot.id);
    setNaturalMealError(null);
    setNaturalMealStatus(null);
    try {
      await onSaveDailyMeal({
        date: todayString,
        slotId: naturalMealSlot.slot.id,
        mealName: naturalMealSlot.slot.title,
        mealTurn: naturalMealTurn ?? naturalMealSlot.slot.category,
        scheduledTime: naturalMealSlot.slot.time,
        status: 'consumed',
        items: naturalMealParse.items
      });
      setNaturalMealDescription('');
      setNaturalMealParse(null);
      setNaturalMealStatus(`Refeição registrada como consumida em ${naturalMealSlot.slot.title}.`);
      await refreshRecentFoods();
    } catch (error) {
      setNaturalMealError(error instanceof Error ? error.message : 'Não foi possível salvar a refeição.');
    } finally {
      setSavingMealSlot(null);
    }
  };

  const visibleMealPlan = mealPlan.filter(({ slot }) => {
    if (mealListFilter === 'all') return true;
    const entry = dailyMealEntries.find(item => item.date === todayString && item.slotId === slot.id);
    const eaten = entry?.status === 'consumed' || entry?.status === 'partial';
    return mealListFilter === 'eaten' ? eaten : !eaten && entry?.status !== 'skipped' && entry?.status !== 'cancelled';
  });
  const mealStatusCounts = useMemo(() => summarizeDailyMealStatuses(
    mealPlan.map(({ slot }) => slot.id),
    dailyMealEntries.filter(entry => entry.date === todayString)
  ), [mealPlan, dailyMealEntries, todayString]);
  const mealStatusLabels: Record<DailyMealStatus, string> = {
    pending: 'Pendente', preparing: 'Em preparo', consumed: 'Consumida', partial: 'Parcial',
    deferred: 'Adiada', skipped: 'Não consumida', cancelled: 'Cancelada'
  };

  // Handler para acionar substituição de ingrediente
  const handleTriggerSubstitution = async (foodId: string, foodName: string, amountG: number, slotId: string) => {
    setMissingFoodName(foodName);
    setMissingAmountG(amountG);
    setSubstitutionSlotId(slotId);
    setIsSubModalOpen(true);
    setSubLoading(true);
    setAppliedSubMsg(null);

    try {
      const options = await onGetSubstitutions(foodId, amountG);
      setSubstitutionOptions(options);
    } finally {
      setSubLoading(false);
    }
  };

  // Handler para executar "O que comer com o que tenho"
  const handleRunPantryMatch = async (requireAllIngredients = pantryRequiresFullStock) => {
    setFindingPantryLoading(true);
    setPantrySearchError(null);
    try {
      const matched = await onFindRecipesFromPantry({ maxPrepTime: 30, requireAllIngredients });
      setPantryMatchedRecipes(matched);
      setPantryAnalysisRun(true);
      setActiveTab('what_to_eat');
    } catch (error) {
      setPantrySearchError(error instanceof Error ? error.message : 'Não foi possível analisar a despensa.');
    } finally {
      setFindingPantryLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* View Header com Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Nutrição Inteligente & Planejamento Adaptativo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Refeições personalizadas, substituição alimentar infinita em 4 níveis e catálogo de 200 variedades
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/50 p-1">
          {[
            { id: 'meals', label: 'Plano do Dia', icon: Utensils },
            { id: 'catalog200', label: '200 Variedades de Refeições', icon: ChefHat },
            { id: 'foods', label: 'Meus Alimentos', icon: Plus },
            { id: 'history', label: 'Histórico', icon: Clock },
            { id: 'what_to_eat', label: 'O Que Comer Agora?', icon: Sparkles },
            { id: 'pantry', label: 'Minha Despensa', icon: ShoppingBag }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section aria-label="Preferências de unidades" className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xs font-bold text-foreground">Unidades de porções e hidratação</h3>
          <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-muted-foreground">O app converte para gramas e mililitros antes de calcular ou salvar. Seus totais nutricionais permanecem iguais ao trocar a unidade.</p>
          {unitsError && <p role="alert" className="mt-1 text-[10px] text-destructive">{unitsError}</p>}
          {!unitsError && <p role="status" className="mt-1 text-[10px] text-muted-foreground">{unitsLoading ? 'Carregando preferências…' : unitsSaving ? 'Salvando unidades…' : 'Preferências salvas neste dispositivo.'}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">Porções de alimentos
            <select aria-label="Unidade das porções de alimentos" value={unitPreferences.foodMassUnit} disabled={unitsLoading || unitsSaving}
              onChange={event => saveUnitPreference({ foodMassUnit: event.target.value as 'g' | 'kg' })}
              className="block w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground">
              <option value="g">Gramas (g)</option><option value="kg">Quilogramas (kg)</option>
            </select>
          </label>
          <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">Água
            <select aria-label="Unidade de volume de água" value={unitPreferences.waterVolumeUnit} disabled={unitsLoading || unitsSaving}
              onChange={event => saveUnitPreference({ waterVolumeUnit: event.target.value as 'ml' | 'l' })}
              className="block w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground">
              <option value="ml">Mililitros (mL)</option><option value="l">Litros (L)</option>
            </select>
          </label>
        </div>
      </section>

      {/* 1. ABA PLANO DE REFEIÇÕES DO DIA */}
      {activeTab === 'meals' && (
        <div className="space-y-6">
          {/* Barra de Progresso de Metas */}
          {targets && (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">{summary?.caloriesLogged == null ? 'Ainda sem consumo registrado hoje' : `Consumido: ${Math.round(summary.caloriesLogged)} / ${targets.targetCalories} kcal`}</span>
                <span className="text-muted-foreground">
                  Proteína: {summary?.proteinLoggedG == null ? '—' : `${Math.round(summary.proteinLoggedG)}g`} / {targets.proteinGrams}g • Carboidratos: {summary?.carbsLoggedG == null ? '—' : `${Math.round(summary.carbsLoggedG)}g`} / {targets.carbGrams}g • Gorduras: {summary?.fatsLoggedG == null ? '—' : `${Math.round(summary.fatsLoggedG)}g`} / {targets.fatGrams}g
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, ((summary?.caloriesLogged || 0) / targets.targetCalories) * 100))}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Saldo de calorias e macronutrientes">
                {([
                  { label: 'Saldo calórico', value: nutritionBalance.calories, unit: 'kcal' },
                  { label: 'Saldo de proteína', value: nutritionBalance.proteinG, unit: 'g' },
                  { label: 'Saldo de carboidratos', value: nutritionBalance.carbsG, unit: 'g' },
                  { label: 'Saldo de gorduras', value: nutritionBalance.fatsG, unit: 'g' }
                ]).map(item => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-background/35 px-3 py-2">
                    <span className="block text-[10px] text-muted-foreground">{item.label}</span>
                    <strong className={`mt-1 block text-xs ${!item.value ? 'text-muted-foreground' : item.value.remaining < 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {formatNutritionBalance(item.value, item.unit)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section className="rounded-3xl border border-primary/20 bg-card p-5 shadow-sm space-y-4" aria-label="Registrar refeição escrevendo em português">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Registrar refeição em texto</h3>
                <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">Escreva os alimentos e o peso de cada um. O app interpreta localmente usando o catálogo, mostra os macros e só inclui no consumo depois da sua confirmação.</p>
              </div>
            </div>
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              Descrição da refeição
              <textarea
                value={naturalMealDescription}
                maxLength={2000}
                rows={2}
                placeholder="Ex.: 150 g de peito de frango grelhado e 100 g de arroz branco cozido"
                onChange={event => { setNaturalMealDescription(event.target.value); setNaturalMealParse(null); setNaturalMealError(null); setNaturalMealStatus(null); }}
                className="block w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-48 flex-1 space-y-1.5 text-xs font-medium text-muted-foreground">
                Registrar em um horário livre
                <select value={naturalMealSlot?.slot.id ?? ''} onChange={event => {
                  const selected = naturalMealSlots.find(({ slot }) => slot.id === event.target.value);
                  setNaturalMealSlotId(event.target.value);
                  if (selected) setNaturalMealTurn(selected.slot.category);
                }} disabled={!naturalMealSlots.length} className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground disabled:opacity-50">
                  {naturalMealSlots.length === 0 ? <option value="">Todos os horários já têm consumo registrado</option> : naturalMealSlots.map(({ slot }) => <option key={slot.id} value={slot.id}>{slot.title} · {slot.time}</option>)}
                </select>
              </label>
              <label className="min-w-40 flex-1 space-y-1.5 text-xs font-medium text-muted-foreground">
                Categoria da refeição
                <select aria-label="Categoria da refeição" value={naturalMealTurn ?? naturalMealSlot?.slot.category ?? 'snack'} onChange={event => setNaturalMealTurn(event.target.value as MealTurn)} className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                  {MEAL_TURN_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={interpretNaturalMeal} disabled={!naturalMealDescription.trim()} className="min-h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50">Interpretar</button>
            </div>
            {naturalMealSlot && dailyMealEntries.some(entry => entry.date === todayString && entry.slotId === naturalMealSlot.slot.id) && (
              <p className="text-[10px] text-amber-200">Este horário tem um plano pendente. Ao confirmar, o registro planejado será substituído pelo alimento realmente consumido.</p>
            )}
            {naturalMealParse && (
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Itens reconhecidos e porções</h4>
                <ul className="space-y-2">
                  {naturalMealParse.items.map(item => (
                    <li key={item.itemId} className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <span className="text-foreground">{formatMass(item.plannedAmountG)} · {item.foodName}</span>
                      <span className="text-muted-foreground">{item.calories} kcal · {item.proteinG} g proteína · {item.dataSource || 'origem não informada'}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/70 pt-2 text-[10px] font-medium text-muted-foreground">
                  <span>{naturalMealParse.calories} kcal</span><span>{naturalMealParse.proteinG} g proteína</span><span>{naturalMealParse.carbsG} g carboidratos</span><span>{naturalMealParse.fatsG} g gorduras</span>
                </div>
                <button type="button" onClick={() => void saveNaturalMeal()} disabled={!naturalMealSlot || savingMealSlot === naturalMealSlot?.slot.id} className="min-h-10 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                  {savingMealSlot === naturalMealSlot?.slot.id ? 'Salvando…' : 'Confirmar e registrar como consumida'}
                </button>
              </div>
            )}
            {naturalMealStatus && <p role="status" className="text-xs text-emerald-300">{naturalMealStatus}</p>}
            {naturalMealError && <p role="alert" className="text-xs text-red-300">{naturalMealError}</p>}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 p-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar refeições do dia">
              {([
                ['all', 'Plano do dia'],
                ['eaten', 'Já comi'],
                ['remaining', 'Ainda falta comer']
              ] as const).map(([filter, label]) => (
                <button key={filter} type="button" onClick={() => setMealListFilter(filter)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mealListFilter === filter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {dailyMealEntries.filter(entry => entry.date === todayString && (entry.status === 'consumed' || entry.status === 'partial')).length} de {mealPlan.length} refeições registradas
            </span>
            <div className="flex basis-full flex-wrap gap-1.5" aria-label="Contagem por estado das refeições">
              {DAILY_MEAL_STATUSES.map(status => (
                <span key={status} className="rounded-lg border border-border/70 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
                  {mealStatusLabels[status]} <strong className="text-foreground">{mealStatusCounts[status]}</strong>
                </span>
              ))}
            </div>
          </div>
          <section className="rounded-2xl border border-border bg-card/70 p-4" aria-label="Distribuição real de nutrientes por refeição">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Consumo real por refeição</h3>
              <span className="text-[10px] text-muted-foreground">Inclui lançamentos rápidos e refeições consumidas ou parciais do checklist</span>
            </div>
            {nutritionDistributionLoading ? (
              <p className="text-xs text-muted-foreground">Consultando registros de hoje…</p>
            ) : nutritionDistributionError ? (
              <p role="alert" className="text-xs text-red-300">{nutritionDistributionError}</p>
            ) : nutritionDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ainda não há consumo registrado por refeição hoje.</p>
            ) : (
              <div className="space-y-2">
                {nutritionDistribution.map(meal => {
                  const parsedTime = meal.loggedAt ? new Date(meal.loggedAt) : null;
                  const timeLabel = parsedTime && Number.isFinite(parsedTime.getTime())
                    ? parsedTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : 'horário não registrado';
                  return (
                    <article key={`${meal.source}:${meal.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-background/35 px-3 py-2.5">
                      <div className="min-w-[150px]">
                        <p className="text-xs font-medium text-foreground">{meal.mealName}</p>
                        <p className="text-[10px] text-muted-foreground">{getMealTurnLabel(meal.mealTurn)} · {meal.source === 'quick_log' ? 'Registro rápido' : 'Checklist'} · {timeLabel}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground" aria-label={`Macros consumidos em ${meal.mealName}`}>
                        <span>{Math.round(meal.calories)} kcal</span>
                        <span>{meal.proteinG.toFixed(1)} g proteína</span>
                        <span>{meal.carbsG.toFixed(1)} g carboidratos</span>
                        <span>{meal.fatsG.toFixed(1)} g gorduras</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          {mealSaveError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{mealSaveError}</p>}
          {mealPhotoError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{mealPhotoError}</p>}

          {/* Blocos calculados na hora a partir do perfil e das metas atuais */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visibleMealPlan.map(({ slot, recipe, substitution }, index) => {
              const entry = dailyMealEntries.find(item => item.date === todayString && item.slotId === slot.id);
              const baseChecklistItems = entry?.items?.length ? entry.items : itemsForMeal(recipe, substitution);
              const checklistItems = baseChecklistItems.map(item => {
                const plannedDraft = draftPlannedAmounts[`${slot.id}:${item.itemId}`];
                return plannedDraft === undefined ? item : scalePlannedMealItem(item, plannedDraft);
              });
              const hasPlannedChanges = baseChecklistItems.some(item => draftPlannedAmounts[`${slot.id}:${item.itemId}`] !== undefined);
              const recipePortion = recipe ? getRecipeNutritionPerServing(recipe) : null;
              const amounts = getCurrentAmounts(slot.id, checklistItems);
              const nutritionComparison = compareMealNutrition(checklistItems, entry);
              const canEditIngredients = !entry || entry.status === 'pending';
              const statusLabels: Record<DailyMealStatus, string> = {
                pending: 'Pendente', preparing: 'Em preparo', consumed: 'Consumida', partial: 'Parcial',
                deferred: 'Adiada', skipped: 'Não consumida', cancelled: 'Cancelada'
              };
              const saveCurrentQuantities = () => {
                const currentAmounts = getCurrentAmounts(slot.id, checklistItems);
                const values = checklistItems.map(item => currentAmounts[item.itemId] || 0);
                const anyConsumed = values.some(value => value > 0);
                const allConsumed = checklistItems.length > 0 && values.every((value, itemIndex) => value >= checklistItems[itemIndex].plannedAmountG);
                void saveMealState(slot, recipe, substitution, allConsumed ? 'consumed' : anyConsumed ? 'partial' : 'pending', currentAmounts, checklistItems);
              };
              return (
              <article key={slot.id} className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl hover:shadow-black/10">
                <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">{slot.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {slot.time}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    {Math.round(slot.share * 100)}% {slot.target ? 'da meta' : 'da divisão sugerida'}
                  </span>
                </div>

                {slot.target || recipe || substitution ? (
                  <div className="mt-4 space-y-4">
                    {slot.target && <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: 'kcal', value: slot.target.calories },
                        { label: 'proteína', value: `${slot.target.proteinG}g` },
                        { label: 'carbo', value: `${slot.target.carbsG}g` },
                        { label: 'gordura', value: `${slot.target.fatsG}g` }
                      ].map(macro => (
                        <div key={macro.label} className="rounded-xl border border-border/70 bg-secondary/45 px-2 py-2.5">
                          <span className="block text-[10px] text-muted-foreground">{macro.label}</span>
                          <strong className="mt-1 block text-sm font-semibold text-foreground">{macro.value}</strong>
                        </div>
                      ))}
                    </div>}

                    {!slot.target && <p className="rounded-xl border border-border/70 bg-secondary/35 p-3 text-xs leading-relaxed text-muted-foreground">Esta é uma sugestão de receita do catálogo. As porções não foram ajustadas a uma meta pessoal porque ainda faltam dados do perfil e do peso.</p>}

                    {checklistItems.length > 0 && checklistItems.some(item => item.dataQuality !== 'verified') && (
                      <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/85">
                        Os valores incluem dados estimados ou ainda não verificados. Confira a origem declarada antes de tratar os macros como medição confirmada.
                      </p>
                    )}

                    {substitution ? (
                      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">Troca escolhida: {substitution.levelTitle}</span>
                          <button type="button" onClick={() => setSelectedSubstitutions(current => {
                            const next = { ...current };
                            delete next[slot.id];
                            return next;
                          })} className="text-[11px] text-muted-foreground hover:text-foreground">Desfazer</button>
                        </div>
                        <p className="text-xs text-muted-foreground">{substitution.description}</p>
                        <p className="text-[11px] text-muted-foreground">{substitution.items.map(item => `${formatMass(item.amountG)} ${item.foodName}`).join(' · ')}</p>
                        <p className="text-[11px] font-medium text-primary">{substitution.totalCalories} kcal · {substitution.totalProteinG}g proteína</p>
                      </div>
                    ) : recipe ? (
                      <div className="space-y-3">
                        {recipe.imageUrl && (
                          <img
                            src={recipe.imageUrl}
                            alt={`Imagem ilustrativa: ${recipe.name}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="aspect-[16/9] w-full rounded-xl border border-border object-cover"
                            onError={event => {
                              const image = event.currentTarget;
                              if (!image.src.includes('/catalog-assets/')) image.src = './catalog-assets/food-bowl.jpg';
                              else image.style.visibility = 'hidden';
                            }}
                          />
                        )}
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Sugestão do catálogo</p>
                          <h4 className="mt-1 font-display text-sm font-semibold text-foreground">{recipe.name}</h4>
                          <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">{recipe.instructions}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.ingredients.map(ingredient => {
                            const portion = getIngredientPerServing(ingredient, recipe.servings ?? 1);
                            return <button key={ingredient.foodId} type="button" onClick={() => handleTriggerSubstitution(portion.foodId, portion.foodName, portion.amountG, slot.id)} className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                              {formatMass(portion.amountG)} {portion.foodName} · trocar
                            </button>
                          })}
                        </div>
                        {recipe.budgetSwaps?.length ? (
                          <p className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-200/80">
                            <strong className="font-semibold text-emerald-300">Trocas acessíveis:</strong> {recipe.budgetSwaps.join(' · ')}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground">Porção sugerida: {recipePortion?.calories} kcal · {recipePortion?.proteinG}g proteína · {recipe.prepTimeMinutes} min · receita para {recipe.servings ?? 1} porção(ões)</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{compatibleRecipes.length === 0
                        ? 'Nenhuma receita cadastrada corresponde às alergias e restrições atuais do perfil.'
                        : 'Ainda não há receita cadastrada para este horário.'}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-border/70 bg-secondary/35 p-3 text-xs leading-relaxed text-muted-foreground">
                    Registre seu peso e complete o perfil para calcular a meta deste horário. Nenhuma quantidade foi estimada sem esses dados.
                  </p>
                )}

                <section className="mt-5 rounded-xl border border-border/70 bg-secondary/25 p-4" aria-label={`Checklist de ${slot.title}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Meu dia</h4>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Só o que você confirmar entra nos totais consumidos.</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${entry?.status === 'consumed' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : entry?.status === 'partial' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-border text-muted-foreground'}`}>
                      {statusLabels[entry?.status || 'pending']}
                    </span>
                  </div>

                  <div className="mb-3 rounded-lg border border-border/60 bg-background/35 p-3" aria-label={`Macros planejados e consumidos de ${slot.title}`}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <h5 className="text-[11px] font-semibold text-foreground">Planejado x consumido</h5>
                      <span className="text-[9px] text-muted-foreground">consumo considera somente registros salvos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: 'Calorias', planned: `${Math.round(nutritionComparison.planned.calories)} kcal`, actual: nutritionComparison.consumed ? `${Math.round(nutritionComparison.consumed.calories)} kcal` : 'Sem registro' },
                        { label: 'Proteína', planned: `${nutritionComparison.planned.proteinG.toFixed(1)} g`, actual: nutritionComparison.consumed ? `${nutritionComparison.consumed.proteinG.toFixed(1)} g` : 'Sem registro' },
                        { label: 'Carboidratos', planned: `${nutritionComparison.planned.carbsG.toFixed(1)} g`, actual: nutritionComparison.consumed ? `${nutritionComparison.consumed.carbsG.toFixed(1)} g` : 'Sem registro' },
                        { label: 'Gorduras', planned: `${nutritionComparison.planned.fatsG.toFixed(1)} g`, actual: nutritionComparison.consumed ? `${nutritionComparison.consumed.fatsG.toFixed(1)} g` : 'Sem registro' }
                      ].map(metric => (
                        <div key={metric.label} className="rounded-lg bg-secondary/30 px-2.5 py-2">
                          <span className="block text-[9px] text-muted-foreground">{metric.label}</span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">Plano: <strong className="text-foreground">{metric.planned}</strong></span>
                          <span className="block text-[10px] text-muted-foreground">Real salvo: <strong className={nutritionComparison.consumed ? 'text-emerald-300' : 'text-muted-foreground'}>{metric.actual}</strong></span>
                        </div>
                      ))}
                    </div>
                    {nutritionComparison.difference && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Variação de calorias: <strong className="text-foreground">{nutritionComparison.difference.calories > 0 ? '+' : ''}{Math.round(nutritionComparison.difference.calories)} kcal</strong> em relação ao plano.
                      </p>
                    )}
                  </div>

                  {checklistItems.length > 0 ? (
                    <div className="space-y-2">
                      {checklistItems.map(item => {
                        const amount = amounts[item.itemId] || 0;
                        const draftKey = `${slot.id}:${item.itemId}`;
                        const sourceItem = baseChecklistItems.find(source => source.itemId === item.itemId) ?? item;
                        const maxPlannedAmountG = getMaxPlannedAmountG(sourceItem);
                        const preferredPortionG = portionByFoodId.get(item.foodId);
                        return (
                    <div key={item.itemId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={amount >= item.plannedAmountG}
                              aria-label={`Marcar ${item.foodName} consumido`}
                              onChange={event => void toggleMealIngredient(slot, recipe, substitution, item, event.target.checked, checklistItems)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="min-w-0 flex-1 text-xs text-foreground">{item.foodName} <span className="text-muted-foreground">({formatMass(item.plannedAmountG)} no plano atual)</span></span>
                            {canEditIngredients && (
                              <button type="button" disabled={savingMealSlot === slot.id || checklistItems.length <= 1}
                                aria-label={`Remover ${item.foodName} do plano de ${slot.title}`}
                                title={checklistItems.length <= 1 ? 'Mantenha pelo menos um ingrediente' : 'Remover do plano'}
                                onClick={() => void removeIngredientFromMeal(slot, recipe, substitution, checklistItems, item.itemId)}
                                className="rounded-md border border-border px-2 py-1 text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              Plano
                              <input
                                type="number"
                                min={displayFoodMass(1)}
                              max={displayFoodMass(maxPlannedAmountG)}
                              disabled={maxPlannedAmountG === 0}
                                step={foodMassInputStep}
                                value={displayFoodMass(item.plannedAmountG)}
                                aria-label={`Quantidade planejada de ${item.foodName} em ${unitPreferences.foodMassUnit}`}
                                onChange={event => {
                                  const rawAmountG = displayMassToGrams(Number(event.target.value), unitPreferences.foodMassUnit);
                                  const nextAmount = Number.isFinite(rawAmountG)
                                    ? Math.max(1, Math.min(maxPlannedAmountG, rawAmountG))
                                    : item.plannedAmountG;
                                  const originalAmount = sourceItem.plannedAmountG;
                                  setDraftPlannedAmounts(current => {
                                    const next = { ...current };
                                    const draftKey = `${slot.id}:${item.itemId}`;
                                    if (nextAmount === originalAmount) delete next[draftKey];
                                    else next[draftKey] = nextAmount;
                                    return next;
                                  });
                                }}
                                className="w-16 rounded-md border border-border bg-card px-1.5 py-1 text-right text-xs text-foreground"
                              />{unitPreferences.foodMassUnit}
                            </label>
                            {preferredPortionG !== undefined && (
                              <button
                                type="button"
                                disabled={preferredPortionG > maxPlannedAmountG || preferredPortionG === item.plannedAmountG}
                                aria-label={`Usar porção habitual de ${item.foodName}: ${formatMass(preferredPortionG)}`}
                                onClick={() => setDraftPlannedAmounts(current => ({ ...current, [draftKey]: preferredPortionG }))}
                                className="rounded-md border border-primary/25 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Usar usual · {formatMass(preferredPortionG)}
                              </button>
                            )}
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              Consumidos
                              <input
                                type="number"
                                min="0"
                                max={displayFoodMass(5000)}
                                step={foodMassInputStep}
                                value={displayFoodMass(draftAmounts[draftKey] ?? amount)}
                                aria-label={`Quantidade consumida de ${item.foodName} em ${unitPreferences.foodMassUnit}`}
                                onChange={event => setDraftAmounts(current => ({ ...current, [draftKey]: Math.max(0, displayMassToGrams(Number(event.target.value) || 0, unitPreferences.foodMassUnit)) }))}
                                className="w-16 rounded-md border border-border bg-card px-1.5 py-1 text-right text-xs text-foreground"
                              />{unitPreferences.foodMassUnit}
                            </label>
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              Sobras
                              <input
                                type="number"
                                min="0"
                                max={displayFoodMass(item.plannedAmountG)}
                                step={foodMassInputStep}
                                value={displayFoodMass(calculateLeftoverAmount(item.plannedAmountG, amount))}
                                aria-label={`Sobras de ${item.foodName} em ${unitPreferences.foodMassUnit}`}
                                onChange={event => {
                                  const leftoverG = Math.min(item.plannedAmountG, Math.max(0, displayMassToGrams(Number(event.target.value) || 0, unitPreferences.foodMassUnit)));
                                  setDraftAmounts(current => ({ ...current, [draftKey]: calculateConsumedFromLeftovers(item.plannedAmountG, leftoverG) }));
                                }}
                                className="w-16 rounded-md border border-border bg-card px-1.5 py-1 text-right text-xs text-foreground"
                              />{unitPreferences.foodMassUnit}
                            </label>
                          </div>
                        );
                      })}
                      {hasPlannedChanges && (
                        <button
                          type="button"
                          onClick={() => void saveMealState(slot, recipe, substitution, entry?.status ?? 'pending', getCurrentAmounts(slot.id, checklistItems), checklistItems)}
                          disabled={savingMealSlot === slot.id}
                          className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-50"
                        >
                          {savingMealSlot === slot.id ? 'Salvando…' : 'Salvar porções planejadas'}
                        </button>
                      )}
                      {canEditIngredients && (
                        <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-background/30 p-2.5">
                          <label className="min-w-48 flex-1 space-y-1 text-[10px] text-muted-foreground">
                            Adicionar alimento ao plano
                            <select aria-label={`Adicionar alimento em ${slot.title}`} value={ingredientSelections[slot.id] ?? ''}
                              onChange={event => setIngredientSelections(current => ({ ...current, [slot.id]: event.target.value }))}
                              className="block w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground">
                              <option value="">Selecione no catálogo</option>
                              {[...foods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(food => <option key={food.id} value={food.id}>{food.name}</option>)}
                            </select>
                          </label>
                          <button type="button" disabled={!ingredientSelections[slot.id] || savingMealSlot === slot.id}
                            onClick={() => void addIngredientToMeal(slot, recipe, substitution, checklistItems)}
                            className="self-end rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-45">
                            Adicionar ingrediente · 100 g
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={saveCurrentQuantities} disabled={savingMealSlot === slot.id} className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-50">
                        {savingMealSlot === slot.id ? 'Salvando…' : 'Salvar quantidades consumidas'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Esta refeição não tem ingredientes cadastrados para contabilizar.</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'consumed', Object.fromEntries(checklistItems.map(item => [item.itemId, item.plannedAmountG])), checklistItems)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Comi tudo
                    </button>
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'preparing', getCurrentAmounts(slot.id, checklistItems), checklistItems)} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">Preparar agora</button>
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'deferred', getCurrentAmounts(slot.id, checklistItems), checklistItems)} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">Adiar</button>
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'skipped', getCurrentAmounts(slot.id, checklistItems), checklistItems)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">
                      <SkipForward className="h-3.5 w-3.5" /> Pular refeição
                    </button>
                    {entry && entry.status !== 'pending' && (
                      <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'pending', {}, checklistItems)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">
                        <Circle className="h-3.5 w-3.5" /> Desfazer
                      </button>
                    )}
                  </div>
                  {entry && (entry.status === 'consumed' || entry.status === 'partial') && (
                    <p className="mt-3 text-[11px] text-emerald-300">Registrado às {new Date(entry.completedAt || entry.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {Math.round(entry.calories)} kcal · {entry.proteinG.toFixed(1)}g proteína consumida.</p>
                  )}
                  {renderMealPhotoAttachment(todayString, slot.id, slot.title, entry?.id)}
                </section>
              </article>
              );
            })}
          </div>
          {visibleMealPlan.length === 0 && <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma refeição nesta lista ainda.</p>}
          {/* Quick Action: O que comer com o que tenho */}
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-card to-primary/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Faltando quase tudo na despensa?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nosso motor analisa o que você tem em casa e gera a melhor combinação possível.
              </p>
            </div>
            <button
              onClick={() => void handleRunPantryMatch()}
              disabled={findingPantryLoading}
              className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all"
            >
              {findingPantryLoading ? 'Analisando...' : 'O Que Consigo Comer Agora?'}
            </button>
          </div>
        </div>
      )}

      {/* 2. ABA CATÁLOGO DE 200 VARIEDADES DE REFEIÇÕES */}
      {activeTab === 'catalog200' && (
        <div className="space-y-6">
          {/* Filtros e Busca */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Buscar entre as 200 receitas..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
                <span>Custo máx: R${maxCostFilter}</span>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={maxCostFilter}
                  onChange={e => setMaxCostFilter(Number(e.target.value))}
                  className="accent-primary w-28"
                />
              </div>
            </div>

            <button type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(value => !value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${favoritesOnly ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              <Star className="h-3.5 w-3.5" />{favoritesOnly ? 'Exibindo favoritas' : 'Filtrar favoritas'}
            </button>
            {recipeActionError && <p role="alert" className="text-xs text-red-300">{recipeActionError}</p>}

            {/* Turnos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
              {[
                { id: 'all', label: 'Todas as 200' },
                { id: 'breakfast', label: 'Café da Manhã (35)' },
                { id: 'lunch', label: 'Almoço (45)' },
                { id: 'snack', label: 'Lanches (30)' },
                { id: 'pre_workout', label: 'Pré-Treino (25)' },
                { id: 'post_workout', label: 'Pós-Treino (25)' },
                { id: 'dinner', label: 'Jantar (25)' },
                { id: 'supper', label: 'Ceia (15)' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTurn(t.id as any)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedTurn === t.id
                      ? 'border border-primary bg-primary/10 text-primary'
                      : 'border border-border bg-secondary/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Receitas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleRecipes.map(recipe => {
              const servings = recipe.servings ?? 1;
              const portion = getRecipeNutritionPerServing(recipe);
              const per100g = getRecipeNutritionPer100g(recipe);
              const feedback = recipeFeedbackDrafts[recipe.id] ?? {
                rating: recipe.userRating ?? null,
                personalNotes: recipe.personalNotes ?? ''
              };
              const feedbackIsOpen = recipeFeedbackOpenId === recipe.id;
              return (
              <div
                key={recipe.id}
                className="rounded-3xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all"
              >
                <div className="space-y-3">
                  {recipe.imageUrl && (
                    <img
                      src={recipe.imageUrl}
                      alt={`Imagem ilustrativa: ${recipe.name}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
                      onError={event => {
                        const image = event.currentTarget;
                        if (!image.src.includes('/catalog-assets/')) image.src = './catalog-assets/food-bowl.jpg';
                        else image.style.visibility = 'hidden';
                      }}
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-sm font-bold text-foreground">
                      {recipe.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" aria-label={recipe.isFavorite ? `Remover ${recipe.name} das favoritas` : `Favoritar ${recipe.name}`}
                        aria-pressed={Boolean(recipe.isFavorite)} onClick={async () => {
                          setRecipeActionError(null);
                          try { await onSetRecipeFavorite(recipe.id, !recipe.isFavorite); }
                          catch (error) { setRecipeActionError(error instanceof Error ? error.message : 'Não foi possível salvar o favorito.'); }
                        }} className={`rounded-lg border p-1.5 transition-colors ${recipe.isFavorite ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-border text-muted-foreground hover:text-amber-200'}`}>
                        <Star className="h-3.5 w-3.5" fill={recipe.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <span className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                        {recipe.category}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      aria-expanded={feedbackIsOpen}
                      aria-label={`${feedbackIsOpen ? 'Fechar' : 'Editar'} avaliação e observação de ${recipe.name}`}
                      onClick={() => {
                        setRecipeFeedbackDrafts(current => ({
                          ...current,
                          [recipe.id]: current[recipe.id] ?? { rating: recipe.userRating ?? null, personalNotes: recipe.personalNotes ?? '' }
                        }));
                        setRecipeFeedbackOpenId(current => current === recipe.id ? null : recipe.id);
                      }}
                      className="rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {recipe.userRating ? `Sua nota: ${recipe.userRating}/5 · editar` : 'Avaliar receita e anotar'}
                    </button>
                    {feedbackIsOpen && (
                      <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Sua avaliação para ${recipe.name}`}>
                          {[1, 2, 3, 4, 5].map(rating => (
                            <button
                              key={rating}
                              type="button"
                              aria-label={`${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`}
                              aria-pressed={feedback.rating === rating}
                              onClick={() => setRecipeFeedbackDrafts(current => ({
                                ...current,
                                [recipe.id]: { ...feedback, rating }
                              }))}
                              className="rounded-md p-1 text-amber-300 transition hover:bg-amber-300/10"
                            >
                              <Star className="h-4 w-4" fill={feedback.rating !== null && rating <= feedback.rating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setRecipeFeedbackDrafts(current => ({ ...current, [recipe.id]: { ...feedback, rating: null } }))}
                            className="ml-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Limpar nota
                          </button>
                        </div>
                        <label className="block text-[10px] font-medium text-muted-foreground" htmlFor={`recipe-note-${recipe.id}`}>
                          Observação pessoal
                        </label>
                        <textarea
                          id={`recipe-note-${recipe.id}`}
                          maxLength={2000}
                          rows={2}
                          value={feedback.personalNotes}
                          onChange={event => setRecipeFeedbackDrafts(current => ({
                            ...current,
                            [recipe.id]: { ...feedback, personalNotes: event.target.value }
                          }))}
                          placeholder="Ex.: reduzir o sal ou usar banana mais madura"
                          className="w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">{feedback.personalNotes.length}/2.000</span>
                          <button
                            type="button"
                            disabled={savingRecipeFeedbackId === recipe.id}
                            onClick={() => void saveRecipeFeedback(recipe)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                          >
                            {savingRecipeFeedbackId === recipe.id ? 'Salvando…' : 'Salvar avaliação'}
                          </button>
                        </div>
                      </div>
                    )}
                    {!feedbackIsOpen && recipe.personalNotes && (
                      <p className="line-clamp-2 text-[10px] text-muted-foreground">Sua observação: {recipe.personalNotes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{recipe.prepTimeMinutes} min</span>
                    </div>
                    {recipe.estimatedCost && (
                      <div className="flex items-center gap-0.5 text-emerald-400 font-bold">
                        <span>R$ {(recipe.estimatedCost / servings).toFixed(2)} / porção (estimado)</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/70 bg-secondary/25 p-3">
                    <label className="flex items-center justify-between gap-3 text-xs text-foreground">
                      <span>Rendimento da receita</span>
                      <span className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          step={1}
                          aria-label={`Rendimento em porções para ${recipe.name}`}
                          value={recipeServingDrafts[recipe.id] ?? String(servings)}
                          onChange={event => setRecipeServingDrafts(current => ({ ...current, [recipe.id]: event.target.value }))}
                          onBlur={event => void saveRecipeServings(recipe, event.currentTarget.value)}
                          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                          className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center tabular-nums text-foreground outline-none focus:border-primary"
                        />
                        <span className="text-muted-foreground">porções</span>
                      </span>
                    </label>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                      Nutrientes por porção são o total dos ingredientes dividido pelo rendimento informado.
                    </p>
                    <label className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs text-foreground">
                      <span>Peso final preparado</span>
                      <span className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={50000}
                          step={0.1}
                          aria-label={`Peso final preparado em gramas para ${recipe.name}`}
                          value={recipeFinalWeightDrafts[recipe.id] ?? (recipe.finalWeightG == null ? '' : String(recipe.finalWeightG))}
                          onChange={event => setRecipeFinalWeightDrafts(current => ({ ...current, [recipe.id]: event.target.value }))}
                          onBlur={event => void saveRecipeFinalWeight(recipe, event.currentTarget.value)}
                          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                          className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-center tabular-nums text-foreground outline-none focus:border-primary"
                        />
                        <span className="text-muted-foreground">g</span>
                      </span>
                    </label>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                      Pese a receita pronta. Isso considera a perda ou absorção de água no preparo.
                    </p>
                  </div>

                  {/* Macros */}
                  <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">kcal / porção</span>
                      <strong className="text-foreground">{portion.calories}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Proteína / porção</span>
                      <strong className="text-primary">{portion.proteinG}g</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Carbos / porção</span>
                      <strong className="text-foreground">{portion.carbsG}g</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Lote completo: {recipe.totalCalories} kcal · {recipe.totalProteinG}g proteína · {recipe.totalCarbsG}g carboidratos · {servings} porção(ões).
                  </p>
                  {per100g && (
                    <p className="rounded-xl border border-primary/20 bg-primary/[0.05] px-3 py-2 text-[11px] text-foreground">
                      Por 100 g preparados: {per100g.calories} kcal · {per100g.proteinG}g proteína · {per100g.carbsG}g carboidratos · {per100g.fatsG}g gorduras.
                    </p>
                  )}
                  {recipe.ingredients.some(ingredient => ingredient.dataQuality !== 'verified') && (
                    <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/85">
                      Macros calculados com dados estimados ou não verificados. A origem declarada de cada ingrediente está disponível no cadastro quando informada.
                    </p>
                  )}

                  {/* Ingredientes */}
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Ingredientes do lote completo:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {recipe.ingredients.map((ing, iIdx) => (
                        <li key={iIdx}>
                          {formatMass(ing.amountG)} de {ing.foodName}
                          <span className="ml-1 text-[10px] text-amber-200/70">
                            ({nutritionQualityLabel(ing.dataQuality)} · {ing.dataSource || 'origem não registrada'}{ing.sourceReference ? ` · ${ing.sourceReference}` : ''} · confiança {ing.confidenceLevel === 'unknown' || !ing.confidenceLevel ? 'desconhecida' : ing.confidenceLevel})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {recipe.budgetSwaps?.length ? (
                    <div className="rounded-xl border border-primary/15 bg-primary/[0.05] p-3 text-[11px] leading-relaxed text-muted-foreground">
                      <span className="mb-1 block font-semibold text-primary">Trocas econômicas</span>
                      {recipe.budgetSwaps.join(' · ')}
                    </div>
                  ) : null}
                </div>

                <div className="whitespace-pre-line pt-3 border-t border-border/50 text-[11px] leading-relaxed text-muted-foreground mt-3">
                  {recipe.instructions}
                </div>
              </div>
              );
            })}
          </div>
          {filteredRecipes.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => setRecipePage(page => Math.max(0, page - 1))}
                disabled={recipePage === 0}
                className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Página {recipePage + 1} de {recipePageCount} · {filteredRecipes.length} receitas
              </span>
              <button
                type="button"
                onClick={() => setRecipePage(page => Math.min(recipePageCount - 1, page + 1))}
                disabled={recipePage >= recipePageCount - 1}
                className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
          {filteredRecipes.length === 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
              {compatibleRecipes.length === 0
                ? 'Nenhuma receita do catálogo corresponde às alergias e restrições do perfil. Revise as informações salvas no Perfil & Metas.'
                : 'Nenhuma receita encontrada com esses filtros. Aumente o limite de custo ou ajuste a busca.'}
            </div>
          )}
        </div>
      )}

      {activeTab === 'foods' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Alimentos consumidos recentemente">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Usados recentemente</h3>
            </div>
            {recentFoodsError ? <p role="alert" className="text-xs text-red-300">{recentFoodsError}</p>
              : recentFoods.length === 0 ? <p className="text-xs text-muted-foreground">Alimentos consumidos aparecerão aqui depois de registrar uma refeição no checklist.</p>
                : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {recentFoods.map(item => (
                    <li key={item.foodId} className="rounded-xl border border-border/70 bg-secondary/25 px-3.5 py-3">
                      <strong className="block text-xs font-medium text-foreground">{item.foodName}</strong>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {formatMass(item.lastAmountG)} em {new Date(`${item.lastUsedDate}T12:00:00`).toLocaleDateString('pt-BR')} · {item.useCount} registro(s)
                      </span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {nutritionQualityLabel(item.dataQuality)}{item.dataSource ? ` · ${item.dataSource}` : ''}
                      </span>
                      <label className="mt-3 block text-[10px] text-muted-foreground">
                        Porção habitual ({unitPreferences.foodMassUnit})
                        <span className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min={displayFoodMass(1)}
                            max={displayFoodMass(5000)}
                            step={foodMassInputStep}
                            value={foodPortionDrafts[item.foodId] ?? displayFoodMass(portionByFoodId.get(item.foodId) ?? item.lastAmountG)}
                            aria-label={`Porção habitual de ${item.foodName} em ${unitPreferences.foodMassUnit}`}
                            onChange={event => setFoodPortionDrafts(current => ({ ...current, [item.foodId]: event.target.value }))}
                            className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                          />
                          <button
                            type="button"
                            disabled={foodPortionSaving === item.foodId}
                            onClick={() => void saveRecentFoodPortion(item)}
                            className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary disabled:opacity-50"
                          >
                            {foodPortionSaving === item.foodId ? 'Salvando…' : portionByFoodId.has(item.foodId) ? 'Atualizar' : 'Salvar padrão'}
                          </button>
                          {portionByFoodId.has(item.foodId) && (
                            <button
                              type="button"
                              disabled={foodPortionSaving === item.foodId}
                              onClick={() => void saveFoodPortion(item.foodId, null)}
                              className="rounded-lg border border-border px-2 py-1.5 text-[10px] text-muted-foreground disabled:opacity-50"
                            >
                              Limpar
                            </button>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>}
            {foodPortionError && <p role="alert" className="mt-3 text-xs text-red-300">{foodPortionError}</p>}
            <p className="mt-3 text-[10px] text-muted-foreground">A porção fica salva neste dispositivo. Ao aplicá-la ao plano, os macros são recalculados pela quantidade em gramas.</p>
          </section>
          <CustomFoodLibrary foods={foods} onSave={onSaveCustomFood} onSetFavorite={onSetFoodFavorite} />
        </div>
      )}

      {activeTab === 'history' && (
        <section className="space-y-5" aria-label="Histórico alimentar">
          <WeeklyMealPlanner
            templates={mealTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
            onGetMealHistory={onGetMealHistory}
            onApplyTemplate={onApplyWeeklyMealTemplate}
            onReorderMeals={onReorderDailyMeals}
            onGetShoppingList={onGetShoppingList}
            onGenerateShoppingList={onGenerateShoppingList}
            onSetShoppingItemPurchased={onSetShoppingItemPurchased}
          />
          {mealPhotoError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{mealPhotoError}</p>}
          <form onSubmit={copyMealsFromDay} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">
              Copiar refeições de
              <input type="date" value={copySourceDate} onChange={event => setCopySourceDate(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Para o dia
              <input type="date" value={copyTargetDate} onChange={event => setCopyTargetDate(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </label>
            <button type="submit" className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/15">
              Copiar para horários vazios
            </button>
            {copyResultMessage && <p role="status" className="sm:col-span-3 text-xs text-emerald-300">{copyResultMessage}</p>}
            {copyError && <p role="alert" className="sm:col-span-3 text-xs text-red-300">{copyError}</p>}
            <p className="sm:col-span-3 text-[10px] text-muted-foreground">O registro do dia de destino permanece intacto; quantidades consumidas e estados não são copiados.</p>
          </form>
          <div className="grid gap-4 rounded-2xl border border-border bg-card/70 p-4 lg:grid-cols-2">
            <form onSubmit={saveMealTemplate} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Salvar dia como modelo</h3>
                <p className="mt-1 text-xs text-muted-foreground">Guarde as refeições planejadas dessa data para reutilizar depois.</p>
              </div>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Nome do modelo
                <input required minLength={1} maxLength={80} value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="Ex.: Dia de treino" className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/60" />
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 space-y-1 text-xs text-muted-foreground">
                  Refeições de
                  <input type="date" required value={templateSourceDate} onChange={event => setTemplateSourceDate(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
                </label>
                <button type="submit" disabled={templateSaving} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-50">
                  {templateSaving ? 'Salvando…' : 'Salvar modelo'}
                </button>
              </div>
            </form>
            <form onSubmit={applyMealTemplate} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Aplicar modelo a uma data</h3>
                <p className="mt-1 text-xs text-muted-foreground">Horários já preenchidos são mantidos. As novas refeições entram como planejadas.</p>
              </div>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Modelo salvo
                <select required value={selectedTemplateId} onChange={event => setSelectedTemplateId(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" disabled={!mealTemplates.length}>
                  {mealTemplates.length === 0 && <option value="">Nenhum modelo salvo</option>}
                  {mealTemplates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.meals.length} refeições</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 space-y-1 text-xs text-muted-foreground">
                  Aplicar em
                  <input type="date" required value={templateTargetDate} onChange={event => setTemplateTargetDate(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
                </label>
                <button type="submit" disabled={!selectedTemplateId} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">Aplicar modelo</button>
              </div>
            </form>
            {templateMessage && <p role="status" className="lg:col-span-2 text-xs text-emerald-300">{templateMessage}</p>}
            {templateError && <p role="alert" className="lg:col-span-2 text-xs text-red-300">{templateError}</p>}
          </div>
          <form onSubmit={searchMealHistory} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
            <label className="space-y-1 text-xs text-muted-foreground">
              De
              <input type="date" value={historyFromDate} max={historyToDate} onChange={event => setHistoryFromDate(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Até
              <input type="date" value={historyToDate} min={historyFromDate} onChange={event => setHistoryToDate(event.target.value)} className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2 lg:col-span-1">
              Buscar refeição, alimento ou anotação
              <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} maxLength={100} placeholder="Ex.: arroz, almoço, observação" className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/60" />
            </label>
            <button type="submit" disabled={historyLoading} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
              {historyLoading ? 'Pesquisando…' : 'Pesquisar'}
            </button>
          </form>
          {historyError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{historyError}</p>}
          {mealMutationError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{mealMutationError}</p>}
          {deletedMealForUndo && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-xs text-emerald-100">
              <span>“{deletedMealForUndo.mealName}” foi excluída do histórico.</span>
              <button type="button" onClick={() => void undoDeleteMeal()} disabled={mealDeleteBusy}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-1.5 font-semibold text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-50">
                <RefreshCw className="h-3.5 w-3.5" /> Desfazer
              </button>
            </div>
          )}
          {historyEntries.length === 0 && !historyLoading ? (
            <div className="rounded-2xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento encontrado nesse período. Registros futuros aparecerão aqui depois que forem salvos no checklist.
            </div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map(entry => (
                <article key={entry.id} className="rounded-2xl border border-border bg-card p-4">
                  <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{entry.mealName}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">{getMealTurnLabel(entry.mealTurn)} · {new Date(`${entry.date}T12:00:00`).toLocaleDateString('pt-BR')} · {entry.scheduledTime}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                        {{ pending: 'Pendente', preparing: 'Em preparo', consumed: 'Consumida', partial: 'Parcial', deferred: 'Adiada', skipped: 'Não consumida', cancelled: 'Cancelada' }[entry.status]}
                      </span>
                      <button type="button" aria-label={`Excluir ${entry.mealName} de ${new Date(`${entry.date}T12:00:00`).toLocaleDateString('pt-BR')}`}
                        onClick={() => { setMealMutationError(null); setMealDeleteTarget(entry); }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground transition hover:border-destructive/40 hover:text-destructive">
                        <Trash2 className="h-3 w-3" /> Excluir
                      </button>
                    </div>
                  </header>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {entry.items.map(item => (
                      <li key={item.itemId} className="rounded-xl bg-secondary/30 px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">{item.foodName}</span>
                        <span className="ml-2 text-muted-foreground">{formatMass(item.consumedAmountG)} / {formatMass(item.plannedAmountG)} · sobrou {formatMass(calculateLeftoverAmount(item.plannedAmountG, item.consumedAmountG))}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{Math.round(entry.calories)} kcal</span>
                    <span>{entry.proteinG.toFixed(1)} g proteína</span>
                    <span>{entry.carbsG.toFixed(1)} g carboidrato</span>
                    <span>{entry.fatsG.toFixed(1)} g gordura</span>
                  </div>
                  {entry.note && <p className="mt-2 text-xs text-muted-foreground">{entry.note}</p>}
                  {renderMealPhotoAttachment(entry.date, entry.slotId, entry.mealName, entry.id)}
                </article>
              ))}
            </div>
          )}
          {mealDeleteTarget && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4" role="presentation">
              <div role="dialog" aria-modal="true" aria-labelledby="delete-meal-title" className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <h3 id="delete-meal-title" className="text-base font-semibold text-foreground">Excluir refeição do histórico?</h3>
                <p className="mt-2 text-sm text-muted-foreground">“{mealDeleteTarget.mealName}” será removida do dia {new Date(`${mealDeleteTarget.date}T12:00:00`).toLocaleDateString('pt-BR')}. Você poderá desfazer logo depois.</p>
                {mealMutationError && <p role="alert" className="mt-3 text-xs text-red-300">{mealMutationError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setMealDeleteTarget(null)} disabled={mealDeleteBusy} className="min-h-10 rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground disabled:opacity-50">Cancelar</button>
                  <button type="button" onClick={() => void confirmDeleteMeal()} disabled={mealDeleteBusy} className="min-h-10 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{mealDeleteBusy ? 'Excluindo…' : 'Confirmar exclusão'}</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. ABA O QUE POSSO COMER COM O QUE TENHO */}
      {activeTab === 'what_to_eat' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões Baseadas na Sua Despensa Cadastrada
            </h3>
            <p className="text-xs text-muted-foreground">
              A disponibilidade considera a quantidade registrada para preparar a receita inteira.
            </p>
            <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-foreground">
              <input
                type="checkbox"
                checked={pantryRequiresFullStock}
                disabled={findingPantryLoading}
                onChange={event => {
                  const requireAll = event.target.checked;
                  setPantryRequiresFullStock(requireAll);
                  void handleRunPantryMatch(requireAll);
                }}
                className="mt-0.5 accent-primary"
              />
              Mostrar somente receitas com todos os ingredientes e quantidades disponíveis
            </label>
            {pantrySearchError && <p role="alert" className="text-xs text-red-300">{pantrySearchError}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {preferredPantryRecipes.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                <ChefHat className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p>{pantryAnalysisRun
                  ? pantryRequiresFullStock
                    ? 'Nenhuma receita de até 30 minutos tem todos os ingredientes nas quantidades registradas.'
                    : 'Nenhuma receita de até 30 minutos usa alimentos com estoque disponível.'
                  : 'Nenhuma análise executada ainda. Clique abaixo para consultar sua despensa.'}</p>
                <button
                  disabled={findingPantryLoading}
                  onClick={() => void handleRunPantryMatch()}
                  className="mt-3 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
                >
                  {findingPantryLoading ? 'Analisando…' : 'Analisar Ingredientes Disponíveis'}
                </button>
              </div>
            ) : (
              preferredPantryRecipes.slice(0, 15).map(recipe => (
                <div key={recipe.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  {recipe.imageUrl && (
                    <img
                      src={recipe.imageUrl}
                      alt={`Imagem ilustrativa: ${recipe.name}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
                      onError={event => {
                        const image = event.currentTarget;
                        if (!image.src.includes('/catalog-assets/')) image.src = './catalog-assets/food-bowl.jpg';
                        else image.style.visibility = 'hidden';
                      }}
                    />
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {recipe.matchRate}% Disponível em Casa
                      </span>
                      <span className="text-xs text-muted-foreground">{recipe.prepTimeMinutes} min</span>
                    </div>

                    <h4 className="font-display text-sm font-bold text-foreground">{recipe.name}</h4>

                    <div className="rounded-xl border border-border bg-secondary/30 p-2 text-xs flex justify-between">
                      <span>{getRecipeNutritionPerServing(recipe).calories} kcal/porção</span>
                      <span className="font-bold text-primary">{getRecipeNutritionPerServing(recipe).proteinG}g Proteína</span>
                      <span>R$ {((recipe.estimatedCost || 0) / (recipe.servings || 1)).toFixed(2)}/porção</span>
                    </div>

                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      {recipe.ingredients.map((ing, iIdx) => (
                        <li key={iIdx} className="flex items-center justify-between gap-2">
                          <span>{formatMass(ing.amountG)} {ing.foodName}</span>
                          {(() => {
                            const availableG = pantry.find(item => item.foodId === ing.foodId)?.amountAvailableG || 0;
                            const enough = availableG >= ing.amountG;
                            return <span className={enough ? 'shrink-0 font-bold text-emerald-400' : 'shrink-0 text-amber-400'}>
                              {enough ? '✓ Quantidade suficiente' : availableG > 0 ? `Faltam ${formatMass(ing.amountG - availableG)}` : 'Falta'}
                            </span>;
                          })()}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="whitespace-pre-line text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
                    {recipe.instructions}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. ABA MINHA DESPENSA */}
      {activeTab === 'pantry' && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Despensa e Alimentos Disponíveis em Casa
              </h3>
              <p className="text-xs text-muted-foreground">
                Atualize as quantidades em estoque para orientar as substituições automáticas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {foods.map(f => {
              const inPantry = pantry.find(p => p.foodId === f.id);
              const amountG = inPantry ? inPantry.amountAvailableG : 0;

              return (
                <div key={f.id} className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
                  {f.imageUrl && (
                    <img
                      src={f.imageUrl}
                      alt={`Imagem ilustrativa: ${f.name}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="aspect-[16/9] w-full rounded-xl object-cover"
                      onError={event => {
                        const image = event.currentTarget;
                        if (!image.src.includes('/catalog-assets/')) image.src = './catalog-assets/food-bowl.jpg';
                        else image.style.visibility = 'hidden';
                      }}
                    />
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{f.category}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <span className="text-xs text-muted-foreground">Disponível:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step={unitPreferences.foodMassUnit === 'kg' ? 0.05 : 50}
                        value={displayFoodMass(amountG)}
                        aria-label={`Quantidade de ${f.name} na despensa em ${unitPreferences.foodMassUnit}`}
                        onChange={e => onUpdatePantry(f.id, displayMassToGrams(Number(e.target.value) || 0, unitPreferences.foodMassUnit))}
                        className="w-20 rounded-lg border border-border bg-background p-1 text-xs font-bold text-foreground text-center focus:border-primary focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">{unitPreferences.foodMassUnit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DO MOTOR DE SUBSTITUIÇÃO INTELIGENTE (4 NÍVEIS) */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Substituição Inteligente: {missingFoodName} ({formatMass(missingAmountG)})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Alternativas calculadas para manter o aporte de proteínas e calorias sem gastar além da conta.
                </p>
              </div>
              <button onClick={() => setIsSubModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {appliedSubMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {appliedSubMsg}
              </div>
            )}

            {subLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Calculando substituições equivalentes...
              </div>
            ) : (
              <div className="space-y-4">
                {substitutionOptions.map(opt => (
                  <div
                    key={opt.id}
                    className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold text-primary">
                        {opt.levelTitle}
                      </span>
                      {opt.totalCost && (
                        <span className="text-xs font-semibold text-emerald-400">
                          Custo estimado: R$ {opt.totalCost.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-foreground">{opt.description}</p>
                    {opt.items.length > 0 && <div className="space-y-1 text-[10px] text-muted-foreground">
                      {opt.items.map((item, index) => (
                        <p key={`${opt.id}-${item.foodId}-${index}`}>
                          {formatMass(item.amountG)} de {item.foodName} · {item.dataQuality === 'user_reported'
                            ? 'valores informados pelo usuário'
                            : item.dataQuality === 'verified' ? 'fonte verificada' : 'fonte não verificada'}
                          {item.dataSource ? ` · ${item.dataSource}` : ''}
                        </p>
                      ))}
                    </div>}

                    {/* Comparativo Nutricional */}
                    <div className="rounded-xl border border-border/60 bg-background/50 p-2.5 grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Calorias</span>
                        <strong className="text-foreground">{opt.totalCalories}</strong>
                        <span className={`text-[10px] block ${opt.deltaCalories > 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {opt.deltaCalories > 0 ? `+${opt.deltaCalories}` : opt.deltaCalories}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Proteína</span>
                        <strong className="text-primary">{opt.totalProteinG}g</strong>
                        <span className={`text-[10px] block ${opt.deltaProteinG >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {opt.deltaProteinG > 0 ? `+${opt.deltaProteinG}` : opt.deltaProteinG}g
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Carbos</span>
                        <strong className="text-foreground">{opt.totalCarbsG}g</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Gorduras</span>
                        <strong className="text-foreground">{opt.totalFatsG}g</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">
                      • {opt.rationale}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (substitutionSlotId) {
                          setSelectedSubstitutions(current => ({ ...current, [substitutionSlotId]: opt }));
                        }
                        setAppliedSubMsg(`Substituição aplicada com sucesso para ${missingFoodName}!`);
                        setTimeout(() => {
                          setIsSubModalOpen(false);
                          setSubstitutionSlotId(null);
                        }, 700);
                      }}
                      className="w-full rounded-xl bg-primary/10 border border-primary/30 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      Escolher Esta Substituição
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {expandedMealPhoto && (
        <div role="presentation" onClick={() => setExpandedMealPhoto(null)} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
          <div role="dialog" aria-modal="true" aria-label="Foto da refeição ampliada" onClick={event => event.stopPropagation()} className="relative max-h-[92vh] max-w-5xl rounded-2xl border border-border bg-card p-3 shadow-2xl">
            <button type="button" aria-label="Fechar foto ampliada" onClick={() => setExpandedMealPhoto(null)} className="absolute right-5 top-5 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black"><X className="h-4 w-4" /></button>
            <img src={expandedMealPhoto.filePath} alt={`Foto da refeição de ${new Date(`${expandedMealPhoto.date}T12:00:00`).toLocaleDateString('pt-BR')}`} className="max-h-[84vh] max-w-full rounded-xl object-contain" />
            <p className="px-1 pt-2 text-xs text-muted-foreground">{new Date(`${expandedMealPhoto.date}T12:00:00`).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
