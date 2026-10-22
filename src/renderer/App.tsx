import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WindowTitleBar } from './components/WindowTitleBar';
import { DashboardView } from './views/DashboardView';
import { WeightHistoryView } from './views/WeightHistoryView';
import { ProfileView } from './views/ProfileView';
import { CalculatorView } from './views/CalculatorView';
import { ShapeCalendarView } from './views/ShapeCalendarView';
import { NutritionView } from './views/NutritionView';
import { WorkoutView } from './views/WorkoutView';
import { ProjectionView } from './views/ProjectionView';
import { VisualCustomizationView } from './views/VisualCustomizationView';
import { WeightModal } from './components/WeightModal';
import { InitialHistoryModal } from './components/InitialHistoryModal';
import { api } from './services/api';
import {
  BodyMeasurementRecord,
  CustomFoodInput,
  DashboardSummary,
  Exercise,
  FoodItem,
  PantryItem,
  PhotoCreateInput,
  PhotoRecord,
  Recipe,
  UserProfile,
  WeightAnalyticsPoint,
  WeightRecord,
  WorkoutSession,
  ExerciseMediaInput,
  LoggedMealInput,
  DailyMealEntry,
  DailyMealEntryInput,
  VisualCustomization,
  CustomizationMediaInput,
  CustomizationMediaRecord
} from '../shared/types';
import { DailyWorkoutPlan, getNextScheduledWorkout } from '../domain/workout-engine';
import { applyVisualTheme, DEFAULT_VISUAL_CUSTOMIZATION } from '../domain/visual-customization';
import { Loader2 } from 'lucide-react';
import { MobileNavigation } from './components/MobileNavigation';

export const App: React.FC = () => {
  const isDesktopApp = api.isElectron();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [shapeInitialTab, setShapeInitialTab] = useState<'calendar' | 'compare'>('calendar');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Estados principais
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [analytics, setAnalytics] = useState<WeightAnalyticsPoint[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dailyMealEntries, setDailyMealEntries] = useState<DailyMealEntry[]>([]);

  // Estados dos novos módulos
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurementRecord[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [workoutSplit, setWorkoutSplit] = useState<DailyWorkoutPlan[]>([]);
  const [mealCount, setMealCount] = useState<number>(4);
  const [visualCustomization, setVisualCustomization] = useState<VisualCustomization>(DEFAULT_VISUAL_CUSTOMIZATION);
  const [customizationMedia, setCustomizationMedia] = useState<CustomizationMediaRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const getTodayDate = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  };

  // Modais
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Carrega todos os dados da aplicação
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        profData,
        weightData,
        analyticsData,
        summaryData,
        photoData,
        measData,
        foodData,
        recipeData,
        pantryData,
        exerciseData,
        sessionData,
        splitData,
        dailyMealData
      ] = await Promise.all([
        api.getProfile(),
        api.getWeightHistory(),
        api.getWeightAnalytics(),
        api.getDashboardSummary(),
        api.getPhotos(),
        api.getMeasurements(),
        api.getFoods(),
        api.getRecipes(),
        api.getPantry(),
        api.getExercises(),
        api.getWorkoutSessions(),
        api.generateWorkoutSplit(),
        api.getDailyMeals(getTodayDate())
      ]);

      setProfile(profData);
      setMealCount(profData?.mealsPerDay ?? 4);
      setWeights(weightData);
      setAnalytics(analyticsData);
      setSummary(summaryData);
      setPhotos(photoData);
      setMeasurements(measData);
      setFoods(foodData);
      setRecipes(recipeData);
      setPantry(pantryData);
      setExercises(exerciseData);
      setSessions(sessionData);
      setWorkoutSplit(splitData);
      setDailyMealEntries(dailyMealData);

      if (profData && !profData.initialHistoryConfirmed) {
        setIsHistoryModalOpen(true);
      }
    } catch (err) {
      console.error('[App] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    Promise.all([api.getVisualCustomization(), api.getCustomizationMedia()])
      .then(([config, media]) => {
        if (!active) return;
        setVisualCustomization(config);
        setCustomizationMedia(media);
      })
      .catch(error => console.error('[App] Erro ao carregar a personalização:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    applyVisualTheme(visualCustomization);
  }, [visualCustomization]);

  // Handlers
  const handleSaveWeight = async (record: {
    date: string;
    weightKg: number;
    notes?: string;
    source: 'verified' | 'self_reported';
  }) => {
    await api.addWeightRecord(record);
    await loadData();
  };

  const handleDeleteWeight = async (id: string) => {
    await api.deleteWeightRecord(id);
    await loadData();
  };

  const handleSaveProfile = async (profileData: any) => {
    const saved = await api.saveProfile(profileData);
    setProfile(saved);
    setMealCount(saved.mealsPerDay);
    await loadData();
  };

  const handleMealCountChange = (count: number) => {
    setMealCount(count);
  };

  const handleConfirmInitialHistory = async (data: any) => {
    const updated = await api.confirmInitialHistory(data);
    setProfile(updated);
    await loadData();
  };

  const handleAddPhoto = async (photoData: PhotoCreateInput) => {
    await api.addPhoto(photoData);
    const updated = await api.getPhotos();
    setPhotos(updated);
  };

  const handleUpdatePhotoNotes = async (id: string, notes: string) => {
    await api.updatePhotoNotes(id, notes);
    const updated = await api.getPhotos();
    setPhotos(updated);
  };

  const handleDeletePhoto = async (id: string) => {
    await api.deletePhoto(id);
    const updated = await api.getPhotos();
    setPhotos(updated);
  };

  const handleSaveMeasurement = async (data: any) => {
    await api.saveMeasurement(data);
    const updated = await api.getMeasurements();
    setMeasurements(updated);
  };

  const handleUpdatePantry = async (foodId: string, amountG: number) => {
    await api.updatePantry(foodId, amountG);
    const updated = await api.getPantry();
    setPantry(updated);
  };

  const handleLogWorkoutSession = async (sessionData: any) => {
    await api.logWorkoutSession(sessionData);
    const updated = await api.getWorkoutSessions();
    setSessions(updated);
  };

  const handleAddExerciseMedia = async (input: ExerciseMediaInput) => {
    await api.addExerciseMedia(input);
    setExercises(await api.getExercises());
  };

  const handleDeleteExerciseMedia = async (id: string) => {
    await api.deleteExerciseMedia(id);
    setExercises(await api.getExercises());
  };

  const handleAddDailyMeal = async (input: LoggedMealInput) => {
    setSummary(await api.addLoggedMeal(input));
  };

  const handleSaveDailyMeal = async (input: DailyMealEntryInput) => {
    await api.saveDailyMeal(input);
    const [entries, updatedSummary] = await Promise.all([
      api.getDailyMeals(input.date),
      api.getDashboardSummary()
    ]);
    setDailyMealEntries(entries);
    setSummary(updatedSummary);
  };

  const refreshTodayMealsAfterPlanChange = async (targetDate: string) => {
    if (targetDate !== getTodayDate()) return;
    const [entries, updatedSummary] = await Promise.all([api.getDailyMeals(targetDate), api.getDashboardSummary()]);
    setDailyMealEntries(entries);
    setSummary(updatedSummary);
  };

  const handleCopyDailyMeals = async (input: { sourceDate: string; targetDate: string }) => {
    const result = await api.copyDailyMeals(input);
    await refreshTodayMealsAfterPlanChange(input.targetDate);
    return result;
  };

  const handleApplyMealTemplate = async (input: { templateId: string; targetDate: string }) => {
    const result = await api.applyMealTemplate(input);
    await refreshTodayMealsAfterPlanChange(input.targetDate);
    return result;
  };

  const handleSaveCustomFood = async (input: CustomFoodInput, id?: string): Promise<FoodItem> => {
    const saved = await api.saveCustomFood(input, id);
    setFoods(await api.getFoods());
    return saved;
  };

  const handleSetRecipeFavorite = async (id: string, isFavorite: boolean) => {
    await api.setRecipeFavorite(id, isFavorite);
    setRecipes(await api.getRecipes());
  };

  const handleSetRecipeServings = async (id: string, servings: number) => {
    await api.setRecipeServings(id, servings);
    setRecipes(await api.getRecipes());
  };

  const handleSetFoodFavorite = async (id: string, isFavorite: boolean) => {
    await api.setFoodFavorite(id, isFavorite);
    setFoods(await api.getFoods());
  };

  const handleAddWater = async (amountMl: number) => {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    setSummary(await api.addHydrationLog({ date, amountMl }));
  };

  const handleSaveVisualCustomization = async (config: VisualCustomization) => {
    const saved = await api.saveVisualCustomization(config);
    setVisualCustomization(saved);
    return saved;
  };

  const handleAddCustomizationMedia = async (input: CustomizationMediaInput) => {
    const record = await api.addCustomizationMedia(input);
    setCustomizationMedia(items => [record, ...items.filter(item => item.id !== record.id)]);
    return record;
  };

  const handleDeleteCustomizationMedia = async (id: string) => {
    await api.deleteCustomizationMedia(id);
    setCustomizationMedia(items => items.filter(item => item.id !== id));
  };

  const backgroundMedia = customizationMedia.find(item => item.id === visualCustomization.background.mediaId);
  const backgroundLayers: string[] = [];
  const backgroundSizes: string[] = [];
  const backgroundPositions: string[] = [];
  for (const layer of [...visualCustomization.canvasImages].sort((a, b) => b.zIndex - a.zIndex)) {
    const image = customizationMedia.find(item => item.id === layer.mediaId);
    if (!image || image.mimeType === 'video/mp4') continue;
    backgroundLayers.push(`url("${image.mediaUrl}")`);
    backgroundSizes.push(`${layer.widthPct}% ${layer.heightPct}%`);
    const xPosition = layer.widthPct >= 100 ? 0 : layer.xPct / (100 - layer.widthPct) * 100;
    const yPosition = layer.heightPct >= 100 ? 0 : layer.yPct / (100 - layer.heightPct) * 100;
    backgroundPositions.push(`${xPosition}% ${yPosition}%`);
  }
  if (visualCustomization.theme.gradientEnabled) {
    backgroundLayers.push(`linear-gradient(${visualCustomization.theme.gradientAngle}deg, ${visualCustomization.theme.gradientStart}, ${visualCustomization.theme.gradientEnd})`);
    backgroundSizes.push('cover');
    backgroundPositions.push('center');
  }
  if (backgroundMedia && backgroundMedia.mimeType !== 'video/mp4') {
    const veil = 1 - visualCustomization.background.opacity;
    backgroundLayers.push(`linear-gradient(color-mix(in srgb, ${visualCustomization.theme.backgroundColor} ${veil * 100}%, transparent), color-mix(in srgb, ${visualCustomization.theme.backgroundColor} ${veil * 100}%, transparent))`, `url("${backgroundMedia.mediaUrl}")`);
    backgroundSizes.push('cover', visualCustomization.background.fit);
    backgroundPositions.push('center', 'center');
  }
  const applicationStyle: React.CSSProperties = {
    backgroundColor: visualCustomization.theme.backgroundColor,
    backgroundImage: backgroundLayers.length ? backgroundLayers.join(', ') : undefined,
    backgroundSize: backgroundSizes.length ? backgroundSizes.join(', ') : undefined,
    backgroundPosition: backgroundPositions.length ? backgroundPositions.join(', ') : undefined,
    backgroundRepeat: 'no-repeat'
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Painel Geral de Evolução',
          subtitle: 'Visão consolidada do seu peso, média móvel e metas calóricas'
        };
      case 'shape':
        return {
          title: 'Calendário do Shape & Fotos',
          subtitle: 'Anexe fotos em qualquer mês, compare o antes e depois e acompanhe suas medidas'
        };
      case 'nutrition':
        return {
          title: 'Nutrição & 200 Receitas',
          subtitle: 'Planejamento de refeições por turno e motor de substituição inteligente em 4 níveis'
        };
      case 'workouts':
        return {
          title: 'Treinamento & Exercícios',
          subtitle: 'Sessão diária em tempo real, sobrecarga progressiva e guia de execução anatômico'
        };
      case 'weight':
        return {
          title: 'Histórico de Pesagens',
          subtitle: 'Registros cronológicos e rastreamento de flutuações'
        };
      case 'profile':
        return {
          title: 'Perfil & Metas Corporais',
          subtitle: 'Biometria, restrições e configuração de treino'
        };
      case 'calculator':
        return {
          title: 'Calculadora Metabólica',
          subtitle: 'Fórmula de Mifflin-St Jeor e distribuição de macronutrientes'
        };
      case 'projection':
        return {
          title: 'Projeção Física',
          subtitle: 'Cenários estimados de composição corporal e medidas ao longo do tempo'
        };
      case 'customization':
        return {
          title: 'Personalização visual',
          subtitle: 'Crie paletas, fundos animados e composições arrastáveis para o aplicativo'
        };
      default:
        return { title: 'Santo Maromba', subtitle: '' };
    }
  };

  const { title, subtitle } = getTabTitle();

  if (loading && !profile) {
    return (
      <div className="app-shell relative isolate flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground" style={applicationStyle}>
      {backgroundMedia?.mimeType === 'video/mp4' && <video src={backgroundMedia.mediaUrl} autoPlay muted loop playsInline className="pointer-events-none absolute inset-0 -z-10 h-full w-full" style={{ objectFit: visualCustomization.background.fit, opacity: visualCustomization.background.opacity }} />}
        {isDesktopApp && <WindowTitleBar />}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="font-display text-sm font-semibold text-muted-foreground">
              Iniciando Santo Maromba...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell relative isolate flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground" style={applicationStyle}>
      {backgroundMedia?.mimeType === 'video/mp4' && <video src={backgroundMedia.mediaUrl} autoPlay muted loop playsInline className="pointer-events-none absolute inset-0 -z-10 h-full w-full" style={{ objectFit: visualCustomization.background.fit, opacity: visualCustomization.background.opacity }} />}
      {isDesktopApp && <WindowTitleBar />}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        {isDesktopApp && <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => {
            if (tab === 'shape') setShapeInitialTab('calendar');
            setCurrentTab(tab);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          profileName={profile?.name || 'Atleta'}
        />}

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isDesktopApp && (
            <div className="border-b border-border/70 bg-card/60 px-4 py-2 text-center text-[11px] text-muted-foreground">
              Seus dados estão salvos neste aparelho. A sincronização entre dispositivos ainda não foi configurada.
            </div>
          )}
          <Header
            title={title}
            subtitle={subtitle}
            onOpenWeightModal={() => setIsWeightModalOpen(true)}
            onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
            initialHistoryConfirmed={profile?.initialHistoryConfirmed ?? true}
            currentWeightKg={summary?.currentWeightKg}
          />

          <main key={currentTab} className={`view-enter min-h-0 flex-1 overflow-y-auto ${isDesktopApp ? '' : 'mobile-main'}`}>
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              analytics={analytics}
              onOpenWeightModal={() => setIsWeightModalOpen(true)}
              onNavigateToTab={setCurrentTab}
              onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
              initialHistoryConfirmed={profile?.initialHistoryConfirmed ?? true}
              sessions={sessions}
              exercises={exercises}
              workoutOfDay={getNextScheduledWorkout(workoutSplit)}
              onAddMeal={handleAddDailyMeal}
              onAddWater={handleAddWater}
              onNavigateToShapeCompare={() => { setShapeInitialTab('compare'); setCurrentTab('shape'); }}
            />
          )}

          {currentTab === 'shape' && (
            <ShapeCalendarView
              photos={photos}
              weights={weights}
              measurements={measurements}
              workoutSessions={sessions}
              onAddPhoto={handleAddPhoto}
              onUpdatePhotoNotes={handleUpdatePhotoNotes}
              onDeletePhoto={handleDeletePhoto}
              onSaveMeasurement={handleSaveMeasurement}
              initialTab={shapeInitialTab}
            />
          )}

          {currentTab === 'nutrition' && (
            <NutritionView
              targets={summary?.nutritionTargets || null}
              summary={summary}
              mealsPerDay={mealCount}
              foods={foods}
              recipes={recipes}
              dailyMealEntries={dailyMealEntries}
              pantry={pantry}
              onGetSubstitutions={api.getSubstitutions}
              onUpdatePantry={handleUpdatePantry}
              onFindRecipesFromPantry={api.findRecipesFromPantry}
              onSaveDailyMeal={handleSaveDailyMeal}
              onSaveCustomFood={handleSaveCustomFood}
              onGetRecentlyUsedFoods={api.getRecentlyUsedFoods}
              onGetMealHistory={api.getMealHistory}
              onCopyDailyMeals={handleCopyDailyMeals}
              onGetMealTemplates={api.getMealTemplates}
              onSaveMealTemplate={api.saveMealTemplate}
              onApplyMealTemplate={handleApplyMealTemplate}
              onSetRecipeFavorite={handleSetRecipeFavorite}
              onSetRecipeServings={handleSetRecipeServings}
              onSetFoodFavorite={handleSetFoodFavorite}
            />
          )}

          {currentTab === 'workouts' && (
            <WorkoutView
              exercises={exercises}
              sessions={sessions}
              workoutSplit={workoutSplit}
              onLogSession={handleLogWorkoutSession}
              onAddExerciseMedia={handleAddExerciseMedia}
              onDeleteExerciseMedia={handleDeleteExerciseMedia}
            />
          )}

          {currentTab === 'weight' && (
            <WeightHistoryView
              records={weights}
              analytics={analytics}
              onOpenWeightModal={() => setIsWeightModalOpen(true)}
              onDeleteRecord={handleDeleteWeight}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              profile={profile}
              mealsPerDay={mealCount}
              onMealsPerDayChange={handleMealCountChange}
              onSaveProfile={handleSaveProfile}
              onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
            />
          )}

          {currentTab === 'calculator' && (
            <CalculatorView
              profile={profile}
              currentWeightKg={summary?.currentWeightKg ?? null}
              onNavigateToProfile={() => setCurrentTab('profile')}
              onOpenWeightModal={() => setIsWeightModalOpen(true)}
            />
          )}

          {currentTab === 'projection' && (
            <ProjectionView
              profile={profile}
              currentWeightKg={summary?.currentWeightKg ?? null}
              measurements={measurements}
              onSaveProjection={api.savePhysiqueProjection}
              onLoadProjections={api.getPhysiqueProjections}
              onNavigateToShape={() => setCurrentTab('shape')}
            />
          )}
          {currentTab === 'customization' && (
            <VisualCustomizationView
              config={visualCustomization}
              media={customizationMedia}
              onPreview={setVisualCustomization}
              onSave={handleSaveVisualCustomization}
              onAddMedia={handleAddCustomizationMedia}
              onDeleteMedia={handleDeleteCustomizationMedia}
            />
          )}
          </main>
        </div>
      </div>

      {!isDesktopApp && (
        <MobileNavigation
          currentTab={currentTab}
          onSelectTab={tab => {
            if (tab === 'shape') setShapeInitialTab('calendar');
            setCurrentTab(tab);
          }}
        />
      )}

      {/* Weight Modal */}
      <WeightModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSave={handleSaveWeight}
        initialWeight={summary?.currentWeightKg ?? undefined}
      />

      {/* Initial History Confirmation Modal */}
      <InitialHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onConfirm={handleConfirmInitialHistory}
        defaultHeightCm={profile?.heightCm}
        defaultBirthDate={profile?.birthDate}
        defaultTargetWeightKg={profile?.targetWeightKg}
      />
    </div>
  );
};
