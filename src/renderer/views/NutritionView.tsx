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
  SkipForward
} from 'lucide-react';
import { DailyMealEntry, DailyMealEntryInput, DailyMealItemLog, DailyMealStatus, DashboardSummary, FoodItem, MealTurn, NutritionTargets, PantryItem, Recipe, SubstitutionOption } from '../../shared/types';
import { buildMealSchedule } from '../../domain/meal-schedule';

const nutritionQualityLabel = (quality: DailyMealItemLog['dataQuality']): string => {
  switch (quality) {
    case 'verified': return 'Fonte verificada';
    case 'estimated': return 'Estimativa local';
    case 'user_reported': return 'Informado pelo usuário';
    default: return 'Fonte não verificada';
  }
};

interface NutritionViewProps {
  targets: NutritionTargets | null;
  summary: DashboardSummary | null;
  mealsPerDay: number;
  foods: FoodItem[];
  recipes: Recipe[];
  dailyMealEntries: DailyMealEntry[];
  pantry: PantryItem[];
  onGetSubstitutions: (foodId: string, amountG: number) => Promise<SubstitutionOption[]>;
  onUpdatePantry: (foodId: string, amountG: number) => Promise<void>;
  onFindRecipesFromPantry: (maxPrepTime?: number) => Promise<Array<Recipe & { matchRate: number }>>;
  onSaveDailyMeal: (input: DailyMealEntryInput) => Promise<void>;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  targets,
  summary,
  mealsPerDay,
  foods,
  recipes,
  dailyMealEntries,
  pantry,
  onGetSubstitutions,
  onUpdatePantry,
  onFindRecipesFromPantry,
  onSaveDailyMeal
}) => {
  const [activeTab, setActiveTab] = useState<'meals' | 'catalog200' | 'pantry' | 'what_to_eat'>('meals');

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
  const [draftAmounts, setDraftAmounts] = useState<Record<string, number>>({});
  const [savingMealSlot, setSavingMealSlot] = useState<string | null>(null);
  const [mealListFilter, setMealListFilter] = useState<'all' | 'eaten' | 'remaining'>('all');
  const [mealSaveError, setMealSaveError] = useState<string | null>(null);

  const today = new Date();
  const todayString = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');

  const itemsForMeal = (recipe: Recipe | null, substitution?: SubstitutionOption): DailyMealItemLog[] => {
    const ingredients = substitution?.items ?? recipe?.ingredients ?? [];
    return ingredients.map((item, index) => {
      const food = foods.find(candidate => candidate.id === item.foodId);
      return {
        itemId: `${item.foodId}-${index}`,
        foodId: item.foodId,
        foodName: item.foodName,
        plannedAmountG: item.amountG,
        consumedAmountG: 0,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatsG: item.fatsG,
        dataQuality: item.dataQuality ?? food?.dataQuality ?? 'unverified',
        dataSource: item.dataSource ?? food?.source ?? 'Origem não registrada',
        sourceReference: item.sourceReference ?? food?.sourceReference,
        confidenceLevel: item.confidenceLevel ?? food?.confidenceLevel ?? 'unknown'
      };
    });
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
    amounts: Record<string, number>
  ) => {
    const sourceItems = itemsForMeal(recipe, substitution);
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
        scheduledTime: slot.time,
        recipeId: recipe?.id,
        status,
        items,
        note: existing?.note
      });
    } catch (error) {
      setMealSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o registro da refeição.');
    } finally {
      setSavingMealSlot(null);
    }
  };

  const toggleMealIngredient = async (
    slot: ReturnType<typeof buildMealSchedule>[number],
    recipe: Recipe | null,
    substitution: SubstitutionOption | undefined,
    item: DailyMealItemLog,
    checked: boolean
  ) => {
    const sourceItems = itemsForMeal(recipe, substitution);
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
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchTurn = selectedTurn === 'all' || r.category === selectedTurn;
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.ingredients.some(ing => ing.foodName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCost = !r.estimatedCost || r.estimatedCost <= maxCostFilter;
      return matchTurn && matchSearch && matchCost;
    });
  }, [recipes, selectedTurn, searchTerm, maxCostFilter]);

  useEffect(() => {
    setRecipePage(0);
  }, [selectedTurn, searchTerm, maxCostFilter]);

  const visibleRecipes = useMemo(
    () => filteredRecipes.slice(recipePage * recipesPerPage, (recipePage + 1) * recipesPerPage),
    [filteredRecipes, recipePage]
  );
  const recipePageCount = Math.max(1, Math.ceil(filteredRecipes.length / recipesPerPage));

  const mealPlan = useMemo(() => {
    const slots = buildMealSchedule(mealsPerDay, targets);
    const usedRecipeIds = new Set<string>();
    return slots.map(slot => {
      const candidates = recipes
        .filter(recipe => recipe.category === slot.category)
        .sort((a, b) => {
          const target = slot.target;
          if (!target) return a.prepTimeMinutes - b.prepTimeMinutes;
          const score = (recipe: Recipe) =>
            Math.abs(recipe.totalCalories - target.calories) +
            Math.abs(recipe.totalProteinG - target.proteinG) * 3 +
            Math.abs(recipe.totalCarbsG - target.carbsG) * 0.35;
          return score(a) - score(b);
        });
      const recipe = candidates.find(candidate => !usedRecipeIds.has(candidate.id)) || candidates[0] || null;
      if (recipe) usedRecipeIds.add(recipe.id);
      return { slot, recipe, substitution: selectedSubstitutions[slot.id] };
    });
  }, [mealsPerDay, recipes, selectedSubstitutions, targets]);

  const visibleMealPlan = mealPlan.filter(({ slot }) => {
    if (mealListFilter === 'all') return true;
    const entry = dailyMealEntries.find(item => item.date === todayString && item.slotId === slot.id);
    const eaten = entry?.status === 'consumed' || entry?.status === 'partial';
    return mealListFilter === 'eaten' ? eaten : !eaten && entry?.status !== 'skipped' && entry?.status !== 'cancelled';
  });

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
  const handleRunPantryMatch = async () => {
    setFindingPantryLoading(true);
    try {
      const matched = await onFindRecipesFromPantry(30);
      setPantryMatchedRecipes(matched);
      setActiveTab('what_to_eat');
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
            </div>
          )}

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
          </div>
          {mealSaveError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{mealSaveError}</p>}

          {/* Blocos calculados na hora a partir do perfil e das metas atuais */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visibleMealPlan.map(({ slot, recipe, substitution }, index) => {
              const entry = dailyMealEntries.find(item => item.date === todayString && item.slotId === slot.id);
              const checklistItems = itemsForMeal(recipe, substitution);
              const amounts = getCurrentAmounts(slot.id, checklistItems);
              const statusLabels: Record<DailyMealStatus, string> = {
                pending: 'Pendente', preparing: 'Em preparo', consumed: 'Consumida', partial: 'Parcial',
                deferred: 'Adiada', skipped: 'Não consumida', cancelled: 'Cancelada'
              };
              const saveCurrentQuantities = () => {
                const currentAmounts = getCurrentAmounts(slot.id, checklistItems);
                const values = checklistItems.map(item => currentAmounts[item.itemId] || 0);
                const anyConsumed = values.some(value => value > 0);
                const allConsumed = checklistItems.length > 0 && values.every((value, itemIndex) => value >= checklistItems[itemIndex].plannedAmountG);
                void saveMealState(slot, recipe, substitution, allConsumed ? 'consumed' : anyConsumed ? 'partial' : 'pending', currentAmounts);
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
                        <p className="text-[11px] text-muted-foreground">{substitution.items.map(item => `${item.amountG}g ${item.foodName}`).join(' · ')}</p>
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
                          {recipe.ingredients.map(ingredient => (
                            <button key={ingredient.foodId} type="button" onClick={() => handleTriggerSubstitution(ingredient.foodId, ingredient.foodName, ingredient.amountG, slot.id)} className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                              {ingredient.amountG}g {ingredient.foodName} · trocar
                            </button>
                          ))}
                        </div>
                        {recipe.budgetSwaps?.length ? (
                          <p className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-200/80">
                            <strong className="font-semibold text-emerald-300">Trocas acessíveis:</strong> {recipe.budgetSwaps.join(' · ')}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground">Receita: {recipe.totalCalories} kcal · {recipe.totalProteinG}g proteína · {recipe.prepTimeMinutes} min</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Ainda não há receita cadastrada para este horário.</p>
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

                  {checklistItems.length > 0 ? (
                    <div className="space-y-2">
                      {checklistItems.map(item => {
                        const amount = amounts[item.itemId] || 0;
                        const draftKey = `${slot.id}:${item.itemId}`;
                        return (
                    <div key={item.itemId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={amount >= item.plannedAmountG}
                              aria-label={`Marcar ${item.foodName} consumido`}
                              onChange={event => void toggleMealIngredient(slot, recipe, substitution, item, event.target.checked)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="min-w-0 flex-1 text-xs text-foreground">{item.foodName} <span className="text-muted-foreground">({item.plannedAmountG}g na porção sugerida)</span></span>
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              Consumidos
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                step="5"
                                value={draftAmounts[draftKey] ?? amount}
                                onChange={event => setDraftAmounts(current => ({ ...current, [draftKey]: Math.max(0, Number(event.target.value) || 0) }))}
                                className="w-16 rounded-md border border-border bg-card px-1.5 py-1 text-right text-xs text-foreground"
                              />g
                            </label>
                          </div>
                        );
                      })}
                      <button type="button" onClick={saveCurrentQuantities} disabled={savingMealSlot === slot.id} className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-50">
                        {savingMealSlot === slot.id ? 'Salvando…' : 'Salvar quantidades consumidas'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Esta refeição não tem ingredientes cadastrados para contabilizar.</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'consumed', Object.fromEntries(checklistItems.map(item => [item.itemId, item.plannedAmountG])))} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Comi tudo
                    </button>
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'preparing', getCurrentAmounts(slot.id, checklistItems))} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">Preparar agora</button>
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'deferred', getCurrentAmounts(slot.id, checklistItems))} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">Adiar</button>
                    <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'skipped', getCurrentAmounts(slot.id, checklistItems))} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">
                      <SkipForward className="h-3.5 w-3.5" /> Pular refeição
                    </button>
                    {entry && entry.status !== 'pending' && (
                      <button type="button" disabled={savingMealSlot === slot.id} onClick={() => void saveMealState(slot, recipe, substitution, 'pending', {})} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-50">
                        <Circle className="h-3.5 w-3.5" /> Desfazer
                      </button>
                    )}
                  </div>
                  {entry && (entry.status === 'consumed' || entry.status === 'partial') && (
                    <p className="mt-3 text-[11px] text-emerald-300">Registrado às {new Date(entry.completedAt || entry.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {Math.round(entry.calories)} kcal · {entry.proteinG.toFixed(1)}g proteína consumida.</p>
                  )}
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
              onClick={handleRunPantryMatch}
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
            {visibleRecipes.map(recipe => (
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
                    <span className="shrink-0 rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {recipe.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{recipe.prepTimeMinutes} min</span>
                    </div>
                    {recipe.estimatedCost && (
                      <div className="flex items-center gap-0.5 text-emerald-400 font-bold">
                        <span>R$ {recipe.estimatedCost.toFixed(2)} / porção (estimado)</span>
                      </div>
                    )}
                  </div>

                  {/* Macros */}
                  <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Calorias</span>
                      <strong className="text-foreground">{recipe.totalCalories}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Proteína</span>
                      <strong className="text-primary">{recipe.totalProteinG}g</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Carbos</span>
                      <strong className="text-foreground">{recipe.totalCarbsG}g</strong>
                    </div>
                  </div>
                  {recipe.ingredients.some(ingredient => ingredient.dataQuality !== 'verified') && (
                    <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/85">
                      Macros calculados com dados estimados ou não verificados. A origem declarada de cada ingrediente está disponível no cadastro quando informada.
                    </p>
                  )}

                  {/* Ingredientes */}
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Ingredientes:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {recipe.ingredients.map((ing, iIdx) => (
                        <li key={iIdx}>
                          {ing.amountG}g de {ing.foodName}
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
            ))}
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
              Nenhuma receita encontrada com esses filtros. Aumente o limite de custo ou ajuste a busca.
            </div>
          )}
        </div>
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
              Receitas ranqueadas pelo índice de correspondência dos ingredientes que você possui em casa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pantryMatchedRecipes.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                <ChefHat className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p>Nenhuma análise executada ainda. Clique no botão abaixo para analisar sua despensa.</p>
                <button
                  onClick={handleRunPantryMatch}
                  className="mt-3 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
                >
                  Analisar Ingredientes Disponíveis
                </button>
              </div>
            ) : (
              pantryMatchedRecipes.slice(0, 15).map(recipe => (
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
                      <span>{recipe.totalCalories} kcal</span>
                      <span className="font-bold text-primary">{recipe.totalProteinG}g Proteína</span>
                      <span>R$ {recipe.estimatedCost?.toFixed(2)}</span>
                    </div>

                    <ul className="text-[11px] text-muted-foreground space-y-1">
                      {recipe.ingredients.map((ing, iIdx) => (
                        <li key={iIdx} className="flex items-center justify-between">
                          <span>{ing.amountG}g {ing.foodName}</span>
                          <span className={pantry.some(p => p.foodId === ing.foodId) ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {pantry.some(p => p.foodId === ing.foodId) ? '✓ Tem' : 'Falta'}
                          </span>
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
              const amount = inPantry ? inPantry.amountAvailableG : 0;

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
                        step="50"
                        value={amount}
                        onChange={e => onUpdatePantry(f.id, Number(e.target.value))}
                        className="w-20 rounded-lg border border-border bg-background p-1 text-xs font-bold text-foreground text-center focus:border-primary focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">g</span>
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
                  Substituição Inteligente: {missingFoodName} ({missingAmountG}g)
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
    </div>
  );
};
