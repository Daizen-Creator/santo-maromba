import { IDatabase } from '../driver';
import { Exercise } from '../../shared/types';
import { INITIAL_EXERCISES } from './exercise-seeds';
import { INITIAL_FOODS, INITIAL_RECIPES } from './nutrition-seeds';
import { NutritionRepository } from '../repositories/nutrition-repository';
import { WorkoutRepository } from '../repositories/workout-repository';

function assertHttpsUrl(value: string | undefined, label: string): void {
  if (!value) throw new Error(`${label}: URL de mídia ausente.`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label}: URL inválida (${value}).`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${label}: somente links HTTPS são aceitos.`);
}

/** Valida os dados locais antes de qualquer sincronização com o SQLite. */
export function validateSeedCatalogs(): void {
  if (INITIAL_EXERCISES.length < 100) {
    throw new Error(`O catálogo precisa conter pelo menos 100 exercícios; encontrou ${INITIAL_EXERCISES.length}.`);
  }
  if (INITIAL_FOODS.length + INITIAL_RECIPES.length < 200) {
    throw new Error('O catálogo combinado precisa conter ao menos 200 alimentos e receitas.');
  }

  const exerciseIds = new Set<string>();
  const requiredMuscles: Exercise['primaryMuscle'][] = [
    'peitoral', 'costas', 'ombros', 'biceps', 'triceps', 'quadriceps', 'posteriores', 'panturrilhas', 'abdomen'
  ];
  const includedMuscles = new Set(INITIAL_EXERCISES.map(exercise => exercise.primaryMuscle));
  const missingMuscles = requiredMuscles.filter(muscle => !includedMuscles.has(muscle));
  if (missingMuscles.length) throw new Error(`Faltam grupos musculares no catálogo: ${missingMuscles.join(', ')}.`);

  for (const exercise of INITIAL_EXERCISES) {
    if (exerciseIds.has(exercise.id)) throw new Error(`ID de exercício duplicado: ${exercise.id}.`);
    exerciseIds.add(exercise.id);
    if (!exercise.name.trim() || exercise.instructions.trim().length < 20) {
      throw new Error(`Exercício incompleto: ${exercise.id}.`);
    }
    assertHttpsUrl(exercise.imageUrl, `Imagem do exercício ${exercise.name}`);
    assertHttpsUrl(exercise.youtubeUrl, `Vídeo do exercício ${exercise.name}`);
    const youtube = new URL(exercise.youtubeUrl!);
    if (youtube.hostname !== 'www.youtube.com' || !['/watch', '/results'].includes(youtube.pathname)) {
      throw new Error(`O link do YouTube para ${exercise.name} precisa apontar para um vídeo ou busca válida.`);
    }
    if (!exercise.executionTips?.trim()) throw new Error(`Dica de execução ausente: ${exercise.name}.`);
  }

  const foodIds = new Set<string>();
  for (const food of INITIAL_FOODS) {
    if (foodIds.has(food.id)) throw new Error(`ID de alimento duplicado: ${food.id}.`);
    foodIds.add(food.id);
    if (food.servingSizeG !== 100) throw new Error(`${food.name}: os valores nutricionais precisam ser por 100g.`);
    if ([food.calories, food.proteinG, food.carbsG, food.fatsG].some(value => !Number.isFinite(value) || value < 0)) {
      throw new Error(`Valores nutricionais inválidos: ${food.name}.`);
    }
    if (!food.substituteGroupId) throw new Error(`Grupo de substituição ausente: ${food.name}.`);
    assertHttpsUrl(food.imageUrl, `Imagem do alimento ${food.name}`);
  }

  const recipeIds = new Set<string>();
  for (const recipe of INITIAL_RECIPES) {
    if (recipeIds.has(recipe.id)) throw new Error(`ID de receita duplicado: ${recipe.id}.`);
    recipeIds.add(recipe.id);
    if (!recipe.ingredients.length || !recipe.instructions.includes('\n')) {
      throw new Error(`Receita sem ingredientes ou etapas: ${recipe.name}.`);
    }
    assertHttpsUrl(recipe.imageUrl, `Imagem da receita ${recipe.name}`);
    for (const ingredient of recipe.ingredients) {
      if (!foodIds.has(ingredient.foodId)) throw new Error(`${recipe.name}: alimento ausente (${ingredient.foodId}).`);
    }
  }
}

/** Semeia os catálogos na primeira inicialização; os repositórios versionam a carga e preservam dados do usuário. */
export function seedDatabase(db: IDatabase): {
  nutritionRepository: NutritionRepository;
  workoutRepository: WorkoutRepository;
} {
  validateSeedCatalogs();
  return {
    nutritionRepository: new NutritionRepository(db),
    workoutRepository: new WorkoutRepository(db)
  };
}
