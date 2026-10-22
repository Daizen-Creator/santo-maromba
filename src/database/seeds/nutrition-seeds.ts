import { FoodItem, MealTurn, Recipe } from '../../shared/types';

const BASE_FOODS: FoodItem[] = [
  {
    id: 'food-frango',
    name: 'Peito de Frango Grelhado',
    category: 'protein',
    servingSizeG: 100,
    calories: 165,
    proteinG: 31.0,
    carbsG: 0.0,
    fatsG: 3.6,
    isCooked: true,
    priceEstimated: 2.20,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-ovo',
    name: 'Ovo de Galinha Cozido/Poché (Unidade ~50g)',
    category: 'protein',
    servingSizeG: 100,
    calories: 155,
    proteinG: 13.0,
    carbsG: 1.1,
    fatsG: 11.0,
    isCooked: true,
    priceEstimated: 1.80,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-patinho',
    name: 'Patinho Bovino Moído Grelhado',
    category: 'protein',
    servingSizeG: 100,
    calories: 219,
    proteinG: 35.9,
    carbsG: 0.0,
    fatsG: 7.3,
    isCooked: true,
    priceEstimated: 4.20,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-tilapia',
    name: 'Filé de Tilápia Grelhado',
    category: 'protein',
    servingSizeG: 100,
    calories: 96,
    proteinG: 20.0,
    carbsG: 0.0,
    fatsG: 1.7,
    isCooked: true,
    priceEstimated: 3.90,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-atum',
    name: 'Atum Sólido em Água',
    category: 'protein',
    servingSizeG: 100,
    calories: 116,
    proteinG: 26.0,
    carbsG: 0.0,
    fatsG: 0.8,
    isCooked: true,
    priceEstimated: 4.50,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-whey',
    name: 'Whey Protein Concentrado 80%',
    category: 'supplement',
    servingSizeG: 100,
    calories: 400,
    proteinG: 80.0,
    carbsG: 8.0,
    fatsG: 6.0,
    isCooked: false,
    priceEstimated: 10.00,
    source: 'Rótulo Nutricional'
  },
  {
    id: 'food-arroz',
    name: 'Arroz Branco Cozido',
    category: 'carb',
    servingSizeG: 100,
    calories: 128,
    proteinG: 2.5,
    carbsG: 28.1,
    fatsG: 0.2,
    isCooked: true,
    priceEstimated: 0.60,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-feijao',
    name: 'Feijão Carioca Cozido com Caldo',
    category: 'legume',
    servingSizeG: 100,
    calories: 76,
    proteinG: 4.8,
    carbsG: 13.6,
    fatsG: 0.5,
    fiberG: 8.5,
    isCooked: true,
    priceEstimated: 0.90,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-aveia',
    name: 'Aveia em Flocos Finos',
    category: 'carb',
    servingSizeG: 100,
    calories: 394,
    proteinG: 13.9,
    carbsG: 66.6,
    fatsG: 8.5,
    fiberG: 9.1,
    isCooked: false,
    priceEstimated: 1.20,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-pao-frances',
    name: 'Pão Francês Tradicional (1 unid = 50g)',
    category: 'carb',
    servingSizeG: 100,
    calories: 300,
    proteinG: 8.0,
    carbsG: 58.7,
    fatsG: 3.1,
    isCooked: true,
    priceEstimated: 1.10,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-batata-doce',
    name: 'Batata Doce Cozida',
    category: 'carb',
    servingSizeG: 100,
    calories: 77,
    proteinG: 1.4,
    carbsG: 18.4,
    fatsG: 0.1,
    isCooked: true,
    priceEstimated: 0.70,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-banana',
    name: 'Banana Prata/Nanica',
    category: 'fruit',
    servingSizeG: 100,
    calories: 89,
    proteinG: 1.1,
    carbsG: 22.8,
    fatsG: 0.3,
    isCooked: false,
    priceEstimated: 0.80,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-maca',
    name: 'Maçã Nacional com Casca',
    category: 'fruit',
    servingSizeG: 100,
    calories: 52,
    proteinG: 0.3,
    carbsG: 13.8,
    fatsG: 0.2,
    isCooked: false,
    priceEstimated: 1.10,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-leite-desnatado',
    name: 'Leite UHT Desnatado',
    category: 'dairy',
    servingSizeG: 100,
    calories: 35,
    proteinG: 3.4,
    carbsG: 5.0,
    fatsG: 0.1,
    isCooked: false,
    priceEstimated: 0.55,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-leite-integral',
    name: 'Leite UHT Integral',
    category: 'dairy',
    servingSizeG: 100,
    calories: 61,
    proteinG: 3.2,
    carbsG: 4.8,
    fatsG: 3.2,
    isCooked: false,
    priceEstimated: 0.55,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-iogurte-desnatado',
    name: 'Iogurte Natural Desnatado',
    category: 'dairy',
    servingSizeG: 100,
    calories: 41,
    proteinG: 3.8,
    carbsG: 5.8,
    fatsG: 0.3,
    isCooked: false,
    priceEstimated: 1.40,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-queijo-minas',
    name: 'Queijo Minas Frescal',
    category: 'dairy',
    servingSizeG: 100,
    calories: 227,
    proteinG: 17.4,
    carbsG: 3.2,
    fatsG: 16.0,
    isCooked: false,
    priceEstimated: 3.50,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-pasta-amendoim',
    name: 'Pasta de Amendoim Integral',
    category: 'fat',
    servingSizeG: 100,
    calories: 588,
    proteinG: 25.0,
    carbsG: 20.0,
    fatsG: 50.0,
    isCooked: false,
    priceEstimated: 2.80,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-azeite',
    name: 'Azeite de Oliva Extra Virgem',
    category: 'fat',
    servingSizeG: 100,
    calories: 884,
    proteinG: 0.0,
    carbsG: 0.0,
    fatsG: 100.0,
    isCooked: false,
    priceEstimated: 6.00,
    source: 'TACO/TBCA'
  },
  {
    id: 'food-brocolis',
    name: 'Brócolis Cozido no Vapor',
    category: 'vegetable',
    servingSizeG: 100,
    calories: 35,
    proteinG: 2.4,
    carbsG: 7.2,
    fatsG: 0.4,
    isCooked: true,
    priceEstimated: 1.50,
    source: 'TACO/TBCA'
  },
  { id: 'food-sardinha', name: 'Sardinha em lata escorrida', category: 'protein', servingSizeG: 100, calories: 208, proteinG: 24.6, carbsG: 0, fatsG: 11.5, isCooked: true, priceEstimated: 2.5, source: 'Estimativa local' },
  { id: 'food-soja', name: 'Proteína de soja hidratada', category: 'protein', servingSizeG: 100, calories: 120, proteinG: 18, carbsG: 9, fatsG: 0.5, isCooked: true, priceEstimated: 1.3, source: 'Estimativa local' },
  { id: 'food-lentilha', name: 'Lentilha cozida', category: 'legume', servingSizeG: 100, calories: 93, proteinG: 6.3, carbsG: 16.3, fatsG: 0.5, fiberG: 7.9, isCooked: true, priceEstimated: 0.65, source: 'Estimativa local' },
  { id: 'food-grao-de-bico', name: 'Grão-de-bico cozido', category: 'legume', servingSizeG: 100, calories: 164, proteinG: 8.9, carbsG: 27.4, fatsG: 2.6, fiberG: 7.6, isCooked: true, priceEstimated: 1.2, source: 'Estimativa local' },
  { id: 'food-mandioca', name: 'Mandioca cozida', category: 'carb', servingSizeG: 100, calories: 125, proteinG: 0.6, carbsG: 30, fatsG: 0.3, isCooked: true, priceEstimated: 0.7, source: 'Estimativa local' },
  { id: 'food-cuscuz', name: 'Cuscuz de milho cozido', category: 'carb', servingSizeG: 100, calories: 112, proteinG: 2, carbsG: 25, fatsG: 0.7, isCooked: true, priceEstimated: 0.55, source: 'Estimativa local' },
  { id: 'food-tapioca', name: 'Goma de tapioca hidratada', category: 'carb', servingSizeG: 100, calories: 240, proteinG: 0.2, carbsG: 60, fatsG: 0, isCooked: false, priceEstimated: 1, source: 'Estimativa local' },
  { id: 'food-abobora', name: 'Abóbora cabotiá cozida', category: 'vegetable', servingSizeG: 100, calories: 48, proteinG: 1.4, carbsG: 10.8, fatsG: 0.7, isCooked: true, priceEstimated: 0.5, source: 'Estimativa local' },
  { id: 'food-repolho', name: 'Repolho refogado', category: 'vegetable', servingSizeG: 100, calories: 25, proteinG: 1.3, carbsG: 5.8, fatsG: 0.1, isCooked: true, priceEstimated: 0.3, source: 'Estimativa local' },
  { id: 'food-tomate', name: 'Tomate fresco', category: 'vegetable', servingSizeG: 100, calories: 18, proteinG: 0.9, carbsG: 3.9, fatsG: 0.2, isCooked: false, priceEstimated: 0.65, source: 'Estimativa local' },
  { id: 'food-cenoura', name: 'Cenoura cozida', category: 'vegetable', servingSizeG: 100, calories: 35, proteinG: 0.8, carbsG: 8.2, fatsG: 0.2, isCooked: true, priceEstimated: 0.4, source: 'Estimativa local' },
  { id: 'food-lombo-suino', name: 'Lombo suíno grelhado', category: 'protein', servingSizeG: 100, calories: 143, proteinG: 27, carbsG: 0, fatsG: 3.5, isCooked: true, priceEstimated: 3, source: 'Estimativa local' },
  { id: 'food-macarrao', name: 'Macarrão cozido', category: 'carb', servingSizeG: 100, calories: 124, proteinG: 5, carbsG: 25, fatsG: 1.1, isCooked: true, priceEstimated: 0.55, source: 'Estimativa local' },
  { id: 'food-batata', name: 'Batata inglesa cozida', category: 'carb', servingSizeG: 100, calories: 87, proteinG: 1.9, carbsG: 20.1, fatsG: 0.1, isCooked: true, priceEstimated: 0.45, source: 'Estimativa local' },
  { id: 'food-ricota', name: 'Ricota fresca', category: 'dairy', servingSizeG: 100, calories: 140, proteinG: 12.6, carbsG: 3.8, fatsG: 8.1, isCooked: false, priceEstimated: 2.4, source: 'Estimativa local' },
  { id: 'food-mamao', name: 'Mamão formosa', category: 'fruit', servingSizeG: 100, calories: 43, proteinG: 0.5, carbsG: 10.8, fatsG: 0.3, isCooked: false, priceEstimated: 0.5, source: 'Estimativa local' },
  { id: 'food-laranja', name: 'Laranja pera', category: 'fruit', servingSizeG: 100, calories: 37, proteinG: 0.7, carbsG: 8.9, fatsG: 0.1, isCooked: false, priceEstimated: 0.45, source: 'Estimativa local' },
  { id: 'food-goiaba', name: 'Goiaba vermelha', category: 'fruit', servingSizeG: 100, calories: 54, proteinG: 0.6, carbsG: 13, fatsG: 0.4, isCooked: false, priceEstimated: 0.5, source: 'Estimativa local' },
  { id: 'food-ervilha', name: 'Ervilha cozida', category: 'legume', servingSizeG: 100, calories: 81, proteinG: 5.4, carbsG: 14.5, fatsG: 0.4, fiberG: 5.1, isCooked: true, priceEstimated: 0.7, source: 'Estimativa local' }
];

const FOOD_IMAGE_BY_CATEGORY: Record<FoodItem['category'], string> = {
  protein: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  carb: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80',
  fat: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  fruit: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80',
  vegetable: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  dairy: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80',
  legume: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  supplement: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'
};

const FOOD_SUBSTITUTE_GROUP_BY_ID: Record<string, string> = {
  'food-frango': 'protein-lean', 'food-patinho': 'protein-lean', 'food-tilapia': 'protein-lean',
  'food-atum': 'protein-lean', 'food-sardinha': 'protein-lean', 'food-lombo-suino': 'protein-lean',
  'food-ovo': 'protein-egg', 'food-soja': 'protein-plant', 'food-whey': 'protein-supplement',
  'food-leite-desnatado': 'protein-dairy', 'food-leite-integral': 'protein-dairy',
  'food-iogurte-desnatado': 'protein-dairy', 'food-ricota': 'protein-dairy',
  'food-queijo-minas': 'protein-dairy', 'food-cottage': 'protein-dairy',
  'food-arroz': 'carb-starch', 'food-batata': 'carb-starch', 'food-mandioca': 'carb-starch',
  'food-macarrao': 'carb-starch', 'food-cuscuz': 'carb-starch', 'food-tapioca': 'carb-starch',
  'food-aveia': 'carb-grain', 'food-pao-frances': 'carb-grain',
  'food-feijao': 'plant-protein', 'food-lentilha': 'plant-protein',
  'food-grao-de-bico': 'plant-protein', 'food-ervilha': 'plant-protein',
  'food-azeite': 'fat-added', 'food-pasta-amendoim': 'fat-added',
  'food-banana': 'fruit', 'food-maca': 'fruit', 'food-mamao': 'fruit',
  'food-laranja': 'fruit', 'food-goiaba': 'fruit'
};

export const INITIAL_FOODS: FoodItem[] = BASE_FOODS.map(food => ({
  ...food,
  // Seed values have no row-level reference or collection date, so do not present them as verified.
  dataQuality: food.source === 'Estimativa local' ? 'estimated' : 'unverified',
  confidenceLevel: 'unknown',
  substituteGroupId: FOOD_SUBSTITUTE_GROUP_BY_ID[food.id] || `category-${food.category}`,
  imageUrl: food.imageUrl || FOOD_IMAGE_BY_CATEGORY[food.category],
  imageCredit: food.imageCredit || 'Imagem ilustrativa · Unsplash'
}));

// Catálogo de preparações práticas: 40 pratos-base × 5 opções de ingrediente = 200 receitas distintas.
type VariantKey = 'protein' | 'fruit' | 'carb' | 'legume';
interface RecipeBlueprint {
  category: MealTurn;
  title: string;
  variant: VariantKey;
  prepTimeMinutes: number;
  ingredients: Array<{ foodId: string; amountG: number }>;
  instructions: string;
  budgetSwaps: string[];
}

const RECIPE_IMAGE_BY_CATEGORY: Record<MealTurn, string> = {
  breakfast: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  snack: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80',
  pre_workout: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80',
  post_workout: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  dinner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  supper: 'https://images.unsplash.com/photo-1636479649370-fa89fbe0a1ec?auto=format&fit=crop&w=900&q=80'
};

const VARIANT_FOODS: Record<VariantKey, Array<{ foodId: string; label: string }>> = {
  protein: [
    { foodId: 'food-ovo', label: 'ovo' },
    { foodId: 'food-frango', label: 'frango' },
    { foodId: 'food-sardinha', label: 'sardinha' },
    { foodId: 'food-soja', label: 'soja' },
    { foodId: 'food-lombo-suino', label: 'lombo suíno' }
  ],
  fruit: [
    { foodId: 'food-banana', label: 'banana' },
    { foodId: 'food-maca', label: 'maçã' },
    { foodId: 'food-mamao', label: 'mamão' },
    { foodId: 'food-laranja', label: 'laranja' },
    { foodId: 'food-goiaba', label: 'goiaba' }
  ],
  carb: [
    { foodId: 'food-arroz', label: 'arroz' },
    { foodId: 'food-batata', label: 'batata' },
    { foodId: 'food-mandioca', label: 'mandioca' },
    { foodId: 'food-cuscuz', label: 'cuscuz' },
    { foodId: 'food-macarrao', label: 'macarrão' }
  ],
  legume: [
    { foodId: 'food-feijao', label: 'feijão' },
    { foodId: 'food-lentilha', label: 'lentilha' },
    { foodId: 'food-grao-de-bico', label: 'grão-de-bico' },
    { foodId: 'food-soja', label: 'soja' },
    { foodId: 'food-ervilha', label: 'ervilha' }
  ]
};

const BLUEPRINTS: RecipeBlueprint[] = [
  // Café da manhã (7 × 5)
  { category: 'breakfast', title: 'Cuscuz de frigideira com {main} e tomate', variant: 'protein', prepTimeMinutes: 12, ingredients: [{ foodId: 'food-cuscuz', amountG: 150 }, { foodId: '@main', amountG: 80 }, { foodId: 'food-tomate', amountG: 50 }], instructions: 'Aqueça o cuscuz com um pouco de água. Prepare a proteína em frigideira antiaderente, junte o tomate e sirva por cima.', budgetSwaps: ['Use ovo ou soja no lugar de carnes mais caras.', 'Repolho picado substitui o tomate quando estiver mais barato.'] },
  { category: 'breakfast', title: 'Tapioca recheada com {main} e orégano', variant: 'protein', prepTimeMinutes: 10, ingredients: [{ foodId: 'food-tapioca', amountG: 60 }, { foodId: '@main', amountG: 70 }, { foodId: 'food-queijo-minas', amountG: 20 }], instructions: 'Espalhe a goma em frigideira quente, doure dos dois lados e recheie com a proteína já cozida e o queijo.', budgetSwaps: ['Troque queijo por ovo mexido ou retire o queijo.', 'Cuscuz no lugar da tapioca costuma reduzir o custo.'] },
  { category: 'breakfast', title: 'Pão tostado com {main} e cenoura ralada', variant: 'protein', prepTimeMinutes: 8, ingredients: [{ foodId: 'food-pao-frances', amountG: 50 }, { foodId: '@main', amountG: 75 }, { foodId: 'food-cenoura', amountG: 40 }], instructions: 'Toste o pão, tempere a proteína com alho e limão e monte com a cenoura ralada.', budgetSwaps: ['Pão francês pode ser trocado por cuscuz.', 'Ovo, sardinha e soja são recheios econômicos.'] },
  { category: 'breakfast', title: 'Panqueca de aveia com {main}', variant: 'fruit', prepTimeMinutes: 12, ingredients: [{ foodId: 'food-aveia', amountG: 40 }, { foodId: 'food-ovo', amountG: 50 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-leite-desnatado', amountG: 50 }], instructions: 'Amasse a fruta, misture com ovo, aveia e leite. Doure pequenas porções em frigideira antiaderente.', budgetSwaps: ['Use banana bem madura para adoçar sem mel.', 'Água pode substituir o leite na massa.'] },
  { category: 'breakfast', title: 'Mingau rápido de aveia e {main}', variant: 'fruit', prepTimeMinutes: 7, ingredients: [{ foodId: 'food-aveia', amountG: 45 }, { foodId: 'food-leite-integral', amountG: 200 }, { foodId: '@main', amountG: 100 }], instructions: 'Cozinhe a aveia com o leite em fogo baixo, mexendo até engrossar. Finalize com a fruta picada.', budgetSwaps: ['Prepare com água e acrescente uma colher de leite em pó, se já tiver em casa.', 'Banana madura costuma ser a fruta de menor custo.'] },
  { category: 'breakfast', title: 'Iogurte com aveia, canela e {main}', variant: 'fruit', prepTimeMinutes: 4, ingredients: [{ foodId: 'food-iogurte-desnatado', amountG: 170 }, { foodId: 'food-aveia', amountG: 30 }, { foodId: '@main', amountG: 100 }], instructions: 'Coloque o iogurte em uma tigela, cubra com a aveia e a fruta. Acrescente canela se desejar.', budgetSwaps: ['Iogurte natural pode ser feito em casa a partir de leite.', 'Substitua a fruta por outra da estação.'] },
  { category: 'breakfast', title: 'Vitamina de aveia com {main}', variant: 'fruit', prepTimeMinutes: 5, ingredients: [{ foodId: '@main', amountG: 120 }, { foodId: 'food-leite-desnatado', amountG: 250 }, { foodId: 'food-aveia', amountG: 25 }], instructions: 'Bata tudo no liquidificador. Ajuste a textura com água gelada, sem necessidade de adoçar.', budgetSwaps: ['Use água no lugar do leite se precisar reduzir o custo.', 'Fruta madura dispensa açúcar.'] },
  // Almoço (9 × 5)
  { category: 'lunch', title: 'Prato feito de {main}, arroz e feijão', variant: 'protein', prepTimeMinutes: 25, ingredients: [{ foodId: '@main', amountG: 130 }, { foodId: 'food-arroz', amountG: 150 }, { foodId: 'food-feijao', amountG: 100 }, { foodId: 'food-repolho', amountG: 80 }], instructions: 'Grelhe ou refogue a proteína com alho. Sirva com arroz, feijão e repolho rapidamente refogado.', budgetSwaps: ['Ovo, soja e sardinha são alternativas de menor custo.', 'Repolho costuma custar menos que folhas fora da estação.'] },
  { category: 'lunch', title: 'Panela única de {main} com arroz e legumes', variant: 'protein', prepTimeMinutes: 28, ingredients: [{ foodId: '@main', amountG: 120 }, { foodId: 'food-arroz', amountG: 130 }, { foodId: 'food-cenoura', amountG: 60 }, { foodId: 'food-repolho', amountG: 60 }], instructions: 'Doure a proteína, acrescente arroz e água. Quando estiver quase pronto, junte cenoura e repolho picados.', budgetSwaps: ['Use o legume que estiver em promoção.', 'Soja hidratada substitui carne sem alterar o preparo.'] },
  { category: 'lunch', title: 'Macarrão de panela com {main} e tomate', variant: 'protein', prepTimeMinutes: 22, ingredients: [{ foodId: 'food-macarrao', amountG: 160 }, { foodId: '@main', amountG: 110 }, { foodId: 'food-tomate', amountG: 100 }, { foodId: 'food-azeite', amountG: 4 }], instructions: 'Refogue tomate e proteína picada. Misture ao macarrão cozido e ajuste sal, alho e ervas.', budgetSwaps: ['Use sardinha ou ovo no lugar de carne.', 'Molho de tomate caseiro substitui molho pronto.'] },
  { category: 'lunch', title: 'Escondidinho simples de batata com {main}', variant: 'protein', prepTimeMinutes: 35, ingredients: [{ foodId: 'food-batata', amountG: 200 }, { foodId: '@main', amountG: 120 }, { foodId: 'food-tomate', amountG: 50 }], instructions: 'Amasse a batata cozida. Faça um refogado com a proteína e tomate, cubra com o purê e aqueça até dourar levemente.', budgetSwaps: ['Mandioca ou abóbora também funcionam no purê.', 'Use proteína de soja bem temperada como recheio.'] },
  { category: 'lunch', title: 'Cuscuz salgado com {main} e legumes', variant: 'protein', prepTimeMinutes: 18, ingredients: [{ foodId: 'food-cuscuz', amountG: 180 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-cenoura', amountG: 50 }, { foodId: 'food-tomate', amountG: 50 }], instructions: 'Hidrate e cozinhe o cuscuz. Refogue a proteína com cenoura e tomate e sirva junto.', budgetSwaps: ['Ovo e soja são opções econômicas para o recheio.', 'Troque tomate por repolho ou abóbora.'] },
  { category: 'lunch', title: 'Bowl de mandioca, feijão e {main}', variant: 'protein', prepTimeMinutes: 25, ingredients: [{ foodId: 'food-mandioca', amountG: 160 }, { foodId: 'food-feijao', amountG: 100 }, { foodId: '@main', amountG: 110 }, { foodId: 'food-repolho', amountG: 60 }], instructions: 'Cozinhe a mandioca até ficar macia. Monte com feijão, proteína grelhada e repolho temperado.', budgetSwaps: ['Feijão pode ser trocado por lentilha.', 'Use ovos ou soja no lugar de carnes.'] },
  { category: 'lunch', title: 'Arroz colorido com {main} e abóbora', variant: 'protein', prepTimeMinutes: 25, ingredients: [{ foodId: 'food-arroz', amountG: 140 }, { foodId: '@main', amountG: 120 }, { foodId: 'food-abobora', amountG: 100 }], instructions: 'Cozinhe a abóbora em cubos. Grelhe a proteína em tiras e sirva com arroz e temperos frescos.', budgetSwaps: ['Abóbora é uma troca barata para brócolis.', 'Proteína de soja absorve bem os temperos.'] },
  { category: 'lunch', title: 'Lentilha cozida com {main} e arroz', variant: 'legume', prepTimeMinutes: 30, ingredients: [{ foodId: '@main', amountG: 120 }, { foodId: 'food-arroz', amountG: 130 }, { foodId: 'food-cenoura', amountG: 50 }, { foodId: 'food-tomate', amountG: 50 }], instructions: 'Cozinhe a leguminosa com alho, cebola e cenoura. Sirva com arroz e salada de tomate.', budgetSwaps: ['Feijão ou ervilha podem substituir a leguminosa.', 'Cenoura e repolho são acompanhamentos baratos.'] },
  { category: 'lunch', title: 'Batata assada com recheio de {main}', variant: 'protein', prepTimeMinutes: 35, ingredients: [{ foodId: 'food-batata', amountG: 220 }, { foodId: '@main', amountG: 110 }, { foodId: 'food-ricota', amountG: 20 }], instructions: 'Cozinhe a batata até ficar macia. Abra ao meio e recheie com a proteína refogada e ricota.', budgetSwaps: ['Retire a ricota ou use queijo minas em pequena quantidade.', 'Ovo e soja são recheios acessíveis.'] },
  // Lanches (6 × 5)
  { category: 'snack', title: 'Iogurte com aveia e {main}', variant: 'fruit', prepTimeMinutes: 4, ingredients: [{ foodId: 'food-iogurte-desnatado', amountG: 150 }, { foodId: 'food-aveia', amountG: 25 }, { foodId: '@main', amountG: 100 }], instructions: 'Misture o iogurte com a aveia e finalize com a fruta picada.', budgetSwaps: ['Escolha fruta da estação.', 'Banana madura pode substituir açúcar ou mel.'] },
  { category: 'snack', title: 'Sanduíche caseiro de {main} e tomate', variant: 'protein', prepTimeMinutes: 8, ingredients: [{ foodId: 'food-pao-frances', amountG: 50 }, { foodId: '@main', amountG: 75 }, { foodId: 'food-tomate', amountG: 40 }], instructions: 'Tempere o recheio, coloque no pão com tomate e aqueça na frigideira ou sanduicheira.', budgetSwaps: ['Ovo, sardinha ou soja custam menos que frios industrializados.', 'Use repolho no lugar do tomate se estiver mais barato.'] },
  { category: 'snack', title: 'Tapioca rápida de {main} com queijo', variant: 'protein', prepTimeMinutes: 8, ingredients: [{ foodId: 'food-tapioca', amountG: 50 }, { foodId: '@main', amountG: 60 }, { foodId: 'food-queijo-minas', amountG: 20 }], instructions: 'Doure a goma e recheie com a proteína já pronta e o queijo. Dobre e sirva quente.', budgetSwaps: ['Cuscuz substitui a tapioca com custo menor.', 'Ovo mexido é um recheio barato e rápido.'] },
  { category: 'snack', title: 'Panqueca rápida de aveia com {main}', variant: 'fruit', prepTimeMinutes: 10, ingredients: [{ foodId: 'food-ovo', amountG: 50 }, { foodId: 'food-aveia', amountG: 30 }, { foodId: '@main', amountG: 90 }], instructions: 'Misture ovo, aveia e fruta amassada. Doure em frigideira antiaderente dos dois lados.', budgetSwaps: ['Use banana madura para adoçar naturalmente.', 'Água pode substituir leite se entrar na massa.'] },
  { category: 'snack', title: 'Cuscuz de lanche com {main}', variant: 'protein', prepTimeMinutes: 12, ingredients: [{ foodId: 'food-cuscuz', amountG: 120 }, { foodId: '@main', amountG: 60 }, { foodId: 'food-tomate', amountG: 30 }], instructions: 'Cozinhe o cuscuz e sirva com a proteína preparada e tomate picado.', budgetSwaps: ['Ovo e soja são opções econômicas.', 'Repolho pode substituir o tomate.'] },
  { category: 'snack', title: 'Salada morna de {main} com cenoura', variant: 'legume', prepTimeMinutes: 15, ingredients: [{ foodId: '@main', amountG: 100 }, { foodId: 'food-cenoura', amountG: 60 }, { foodId: 'food-azeite', amountG: 3 }], instructions: 'Cozinhe a leguminosa até ficar macia. Misture com cenoura cozida, alho e um fio de azeite.', budgetSwaps: ['Feijão do dia anterior funciona muito bem.', 'Use limão no lugar de mais azeite.'] },
  // Pré-treino (5 × 5)
  { category: 'pre_workout', title: 'Mingau pré-treino com {main}', variant: 'fruit', prepTimeMinutes: 7, ingredients: [{ foodId: 'food-aveia', amountG: 35 }, { foodId: 'food-leite-desnatado', amountG: 180 }, { foodId: '@main', amountG: 100 }], instructions: 'Cozinhe a aveia com o leite e finalize com a fruta. Consuma com tempo para digerir antes do treino.', budgetSwaps: ['Banana madura é uma opção econômica e prática.', 'Água substitui o leite se necessário.'] },
  { category: 'pre_workout', title: 'Cuscuz com {main} antes do treino', variant: 'protein', prepTimeMinutes: 12, ingredients: [{ foodId: 'food-cuscuz', amountG: 140 }, { foodId: '@main', amountG: 60 }], instructions: 'Cozinhe o cuscuz e acompanhe com a proteína. Prefira uma porção confortável e tempo adequado para digestão.', budgetSwaps: ['Ovo e soja costumam ser mais baratos que carnes.', 'Cuscuz pode ser preparado em lote.'] },
  { category: 'pre_workout', title: 'Batata com {main} e limão', variant: 'protein', prepTimeMinutes: 18, ingredients: [{ foodId: 'food-batata', amountG: 160 }, { foodId: '@main', amountG: 65 }, { foodId: 'food-tomate', amountG: 30 }], instructions: 'Cozinhe a batata, prepare a proteína com alho e limão e sirva com tomate.', budgetSwaps: ['Mandioca ou arroz podem substituir a batata.', 'Use ovo ou soja no recheio.'] },
  { category: 'pre_workout', title: 'Fruta com aveia e iogurte: {main}', variant: 'fruit', prepTimeMinutes: 4, ingredients: [{ foodId: '@main', amountG: 110 }, { foodId: 'food-iogurte-desnatado', amountG: 100 }, { foodId: 'food-aveia', amountG: 20 }], instructions: 'Misture a fruta com iogurte e aveia. Ajuste a porção ao horário e à tolerância antes do exercício.', budgetSwaps: ['Use a fruta da estação.', 'Iogurte natural simples evita produtos mais caros.'] },
  { category: 'pre_workout', title: 'Pão com pasta de amendoim e {main}', variant: 'fruit', prepTimeMinutes: 5, ingredients: [{ foodId: 'food-pao-frances', amountG: 50 }, { foodId: 'food-pasta-amendoim', amountG: 12 }, { foodId: '@main', amountG: 80 }], instructions: 'Espalhe uma camada fina de pasta de amendoim no pão e complete com a fruta em rodelas.', budgetSwaps: ['Amasse amendoim torrado em casa para substituir a pasta pronta.', 'Banana madura dispensa adoçante.'] },
  // Pós-treino (5 × 5)
  { category: 'post_workout', title: 'Arroz e feijão com {main} pós-treino', variant: 'protein', prepTimeMinutes: 20, ingredients: [{ foodId: 'food-arroz', amountG: 130 }, { foodId: 'food-feijao', amountG: 90 }, { foodId: '@main', amountG: 100 }], instructions: 'Monte um prato simples com arroz, feijão e a proteína grelhada ou refogada.', budgetSwaps: ['Ovo, soja e sardinha são alternativas econômicas.', 'Aproveite arroz e feijão já preparados.'] },
  { category: 'post_workout', title: 'Macarrão rápido com {main}', variant: 'protein', prepTimeMinutes: 18, ingredients: [{ foodId: 'food-macarrao', amountG: 150 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-tomate', amountG: 60 }], instructions: 'Misture macarrão cozido com proteína refogada e tomate. Tempere com alho, ervas e limão.', budgetSwaps: ['Sardinha enlatada escorrida é prática e econômica.', 'Use molho feito com tomate fresco.'] },
  { category: 'post_workout', title: 'Cuscuz recheado com {main}', variant: 'protein', prepTimeMinutes: 12, ingredients: [{ foodId: 'food-cuscuz', amountG: 150 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-cenoura', amountG: 35 }], instructions: 'Cozinhe o cuscuz, acrescente a proteína e cenoura. Finalize com temperos e sirva ainda quente.', budgetSwaps: ['Proteína de soja rende várias porções.', 'Use cenoura ou repolho conforme o preço.'] },
  { category: 'post_workout', title: 'Sanduíche reforçado de {main}', variant: 'protein', prepTimeMinutes: 8, ingredients: [{ foodId: 'food-pao-frances', amountG: 75 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-repolho', amountG: 35 }], instructions: 'Recheie o pão com a proteína temperada e repolho finamente cortado. Aqueça se preferir.', budgetSwaps: ['Ovo, soja e sardinha são recheios acessíveis.', 'Pão francês costuma custar menos que pães especiais.'] },
  { category: 'post_workout', title: 'Vitamina com aveia e {main}', variant: 'fruit', prepTimeMinutes: 5, ingredients: [{ foodId: 'food-leite-desnatado', amountG: 230 }, { foodId: '@main', amountG: 120 }, { foodId: 'food-aveia', amountG: 25 }], instructions: 'Bata o leite, a fruta e a aveia. Não é necessário usar suplemento para compor uma refeição.', budgetSwaps: ['Banana madura e leite comum são opções acessíveis.', 'Água pode substituir parte do leite.'] },
  // Jantar (5 × 5)
  { category: 'dinner', title: 'Omelete com {main} e salada de tomate', variant: 'protein', prepTimeMinutes: 14, ingredients: [{ foodId: 'food-ovo', amountG: 100 }, { foodId: '@main', amountG: 70 }, { foodId: 'food-tomate', amountG: 70 }], instructions: 'Bata os ovos e cozinhe em frigideira antiaderente. Acrescente a proteína preparada e sirva com tomate.', budgetSwaps: ['Use repolho no lugar do tomate.', 'A omelete pode ser o próprio prato principal econômico.'] },
  { category: 'dinner', title: 'Sopa caseira de batata e {main}', variant: 'protein', prepTimeMinutes: 30, ingredients: [{ foodId: 'food-batata', amountG: 160 }, { foodId: 'food-abobora', amountG: 100 }, { foodId: '@main', amountG: 90 }, { foodId: 'food-cenoura', amountG: 40 }], instructions: 'Cozinhe os legumes com alho e água. Acrescente a proteína já preparada e ajuste a consistência amassando parte dos legumes.', budgetSwaps: ['Use os legumes mais baratos da semana.', 'Soja hidratada funciona bem como proteína.'] },
  { category: 'dinner', title: 'Arroz de forno simples com {main}', variant: 'protein', prepTimeMinutes: 25, ingredients: [{ foodId: 'food-arroz', amountG: 150 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-cenoura', amountG: 40 }, { foodId: 'food-tomate', amountG: 40 }], instructions: 'Misture arroz cozido, proteína e legumes picados. Aqueça em panela tampada ou forno até ficar uniforme.', budgetSwaps: ['Aproveite sobras bem armazenadas de arroz.', 'Ovo e soja substituem carnes com economia.'] },
  { category: 'dinner', title: 'Purê de abóbora com {main} e feijão', variant: 'protein', prepTimeMinutes: 25, ingredients: [{ foodId: 'food-abobora', amountG: 180 }, { foodId: '@main', amountG: 100 }, { foodId: 'food-feijao', amountG: 80 }], instructions: 'Amasse a abóbora cozida, tempere com alho e sirva com a proteína e uma porção de feijão.', budgetSwaps: ['Abóbora costuma ser econômica e rende bem.', 'Feijão pode ser aproveitado do almoço.'] },
  { category: 'dinner', title: 'Leguminosa refogada com {main} e cuscuz', variant: 'legume', prepTimeMinutes: 20, ingredients: [{ foodId: '@main', amountG: 110 }, { foodId: 'food-cuscuz', amountG: 130 }, { foodId: 'food-tomate', amountG: 50 }], instructions: 'Refogue a leguminosa cozida com alho, tomate e cheiro-verde. Sirva com cuscuz.', budgetSwaps: ['Feijão, lentilha e ervilha podem alternar conforme o preço.', 'Cuscuz é uma base de baixo custo.'] },
  // Ceia (3 × 5)
  { category: 'supper', title: 'Iogurte com aveia e {main}', variant: 'fruit', prepTimeMinutes: 4, ingredients: [{ foodId: 'food-iogurte-desnatado', amountG: 150 }, { foodId: 'food-aveia', amountG: 20 }, { foodId: '@main', amountG: 80 }], instructions: 'Misture iogurte, aveia e fruta em uma tigela. Ajuste o tamanho da porção às suas metas.', budgetSwaps: ['Use a fruta mais barata da estação.', 'Iogurte natural sem açúcar costuma ser mais econômico.'] },
  { category: 'supper', title: 'Leite morno com aveia e {main}', variant: 'fruit', prepTimeMinutes: 6, ingredients: [{ foodId: 'food-leite-integral', amountG: 180 }, { foodId: 'food-aveia', amountG: 20 }, { foodId: '@main', amountG: 70 }], instructions: 'Aqueça o leite com a aveia em fogo baixo e finalize com a fruta picada.', budgetSwaps: ['Prepare com água se o leite estiver em falta.', 'Banana madura adoça sem ingredientes extras.'] },
  { category: 'supper', title: 'Creme de ricota com {main} e tomate', variant: 'protein', prepTimeMinutes: 8, ingredients: [{ foodId: 'food-ricota', amountG: 60 }, { foodId: '@main', amountG: 50 }, { foodId: 'food-tomate', amountG: 40 }], instructions: 'Amasse a ricota com temperos e misture a proteína já cozida. Sirva com tomate ou pão, se couber na meta.', budgetSwaps: ['Queijo minas em pequena porção substitui a ricota.', 'Ovo cozido ou soja são opções de proteína econômica.'] }
];

export function generate200Recipes(): Recipe[] {
  const servingFactors = [0.85, 0.95, 1, 1.05, 1.15];
  const recipes: Recipe[] = [];
  const recipeNameCounts = new Map<string, number>();

  for (const blueprint of BLUEPRINTS) {
    for (let variantIndex = 0; variantIndex < 5; variantIndex += 1) {
      const variant = VARIANT_FOODS[blueprint.variant][variantIndex];
      const factor = servingFactors[variantIndex];
      const ingredients = blueprint.ingredients.map(item => {
        const foodId = item.foodId === '@main' ? variant.foodId : item.foodId;
        const food = INITIAL_FOODS.find(candidate => candidate.id === foodId);
        if (!food) throw new Error(`Alimento ausente no catálogo: ${foodId}`);
        const amountG = Math.max(5, Math.round(item.amountG * factor));
        const portion = amountG / 100;
        return {
          foodId: food.id,
          foodName: food.name,
          amountG,
          calories: Math.round(food.calories * portion),
          proteinG: Number((food.proteinG * portion).toFixed(1)),
          carbsG: Number((food.carbsG * portion).toFixed(1)),
          fatsG: Number((food.fatsG * portion).toFixed(1)),
          dataQuality: food.dataQuality,
          dataSource: food.source,
          sourceReference: food.sourceReference,
          confidenceLevel: food.confidenceLevel
        };
      });

      const baseName = blueprint.title.replace('{main}', variant.label);
      const nameNumber = (recipeNameCounts.get(baseName) || 0) + 1;
      recipeNameCounts.set(baseName, nameNumber);

      const instructionSentences = blueprint.instructions.match(/[^.!?]+[.!?]?/g)?.map(sentence => sentence.trim()).filter(Boolean) || [blueprint.instructions];
      const stepByStepInstructions = [
        'Separe os ingredientes e higienize os alimentos frescos.',
        ...instructionSentences,
        'Confira o ponto, ajuste os temperos e sirva. As quantidades indicadas são para uma porção.'
      ].map((step, index) => `${index + 1}. ${step}`).join('\n');

      recipes.push({
        id: `recipe-${recipes.length + 1}`,
        name: nameNumber === 1 ? baseName : `${baseName} · versão ${nameNumber}`,
        category: blueprint.category,
        prepTimeMinutes: blueprint.prepTimeMinutes,
        instructions: stepByStepInstructions,
        ingredients,
        totalCalories: ingredients.reduce((sum, ingredient) => sum + ingredient.calories, 0),
        totalProteinG: Number(ingredients.reduce((sum, ingredient) => sum + ingredient.proteinG, 0).toFixed(1)),
        totalCarbsG: Number(ingredients.reduce((sum, ingredient) => sum + ingredient.carbsG, 0).toFixed(1)),
        totalFatsG: Number(ingredients.reduce((sum, ingredient) => sum + ingredient.fatsG, 0).toFixed(1)),
        estimatedCost: Number(ingredients.reduce((sum, ingredient) => {
          const food = INITIAL_FOODS.find(candidate => candidate.id === ingredient.foodId)!;
          return sum + (food.priceEstimated || 0) * ingredient.amountG / 100;
        }, 0).toFixed(2)),
        budgetSwaps: blueprint.budgetSwaps,
        imageUrl: RECIPE_IMAGE_BY_CATEGORY[blueprint.category],
        imageCredit: 'Imagem ilustrativa · Unsplash',
        isFavorite: false
      });
    }
  }

  if (recipes.length !== 200) throw new Error(`O catálogo precisa conter 200 receitas, recebeu ${recipes.length}.`);
  return recipes;
}

export const INITIAL_RECIPES = generate200Recipes();
