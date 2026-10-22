import { FoodCategory, ShoppingListItem } from '../shared/types';

export interface ShoppingListSection {
  category: FoodCategory | null;
  label: string;
  items: ShoppingListItem[];
}

const CATEGORY_ORDER: FoodCategory[] = ['protein', 'carb', 'vegetable', 'fruit', 'dairy', 'legume', 'fat', 'supplement'];
const CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Proteínas',
  carb: 'Carboidratos',
  vegetable: 'Verduras e legumes',
  fruit: 'Frutas',
  dairy: 'Laticínios',
  legume: 'Leguminosas',
  fat: 'Gorduras',
  supplement: 'Suplementos'
};

export function groupShoppingListItems(items: ShoppingListItem[]): ShoppingListSection[] {
  const grouped = new Map<FoodCategory | null, ShoppingListItem[]>();
  for (const item of items) {
    const category = item.category || null;
    grouped.set(category, [...(grouped.get(category) || []), item]);
  }
  const orderedCategories = CATEGORY_ORDER.filter(category => grouped.has(category));
  const sections: ShoppingListSection[] = orderedCategories.map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    items: (grouped.get(category) || []).slice().sort((left, right) => left.foodName.localeCompare(right.foodName, 'pt-BR'))
  }));
  const uncategorized = grouped.get(null);
  if (uncategorized?.length) {
    sections.push({
      category: null,
      label: 'Outros',
      items: uncategorized.slice().sort((left, right) => left.foodName.localeCompare(right.foodName, 'pt-BR'))
    });
  }
  return sections;
}
