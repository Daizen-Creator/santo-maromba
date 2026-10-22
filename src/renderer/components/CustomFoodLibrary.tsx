import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Save, Search, Star, X } from 'lucide-react';
import { CustomFoodInput, FoodCategory, FoodItem } from '../../shared/types';
import { searchFoods } from '../../domain/nutrition-catalog';

interface CustomFoodLibraryProps {
  foods: FoodItem[];
  onSave: (input: CustomFoodInput, id?: string) => Promise<FoodItem>;
  onSetFavorite: (id: string, isFavorite: boolean) => Promise<void>;
}

type FoodForm = {
  name: string;
  category: FoodCategory;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatsG: string;
  fiberG: string;
  isCooked: boolean;
  substituteGroupId: string;
};

const EMPTY_FORM: FoodForm = {
  name: '', category: 'protein', calories: '', proteinG: '', carbsG: '', fatsG: '',
  fiberG: '', isCooked: false, substituteGroupId: ''
};

const CATEGORIES: Array<[FoodCategory, string]> = [
  ['protein', 'Proteína'], ['carb', 'Carboidrato'], ['fat', 'Gordura'], ['fruit', 'Fruta'],
  ['vegetable', 'Vegetal'], ['dairy', 'Laticínio'], ['legume', 'Leguminosa'], ['supplement', 'Suplemento']
];

export const CustomFoodLibrary: React.FC<CustomFoodLibraryProps> = ({ foods, onSave, onSetFavorite }) => {
  const [form, setForm] = useState<FoodForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [updatingFavoriteId, setUpdatingFavoriteId] = useState<string | null>(null);
  const visibleFoods = useMemo(
    () => searchFoods(foods, searchTerm).filter(food => !favoritesOnly || food.isFavorite),
    [foods, searchTerm, favoritesOnly]
  );

  const editFood = (food: FoodItem) => {
    setEditingId(food.id);
    setForm({
      name: food.name, category: food.category, calories: String(food.calories),
      proteinG: String(food.proteinG), carbsG: String(food.carbsG), fatsG: String(food.fatsG),
      fiberG: food.fiberG == null ? '' : String(food.fiberG), isCooked: food.isCooked,
      substituteGroupId: food.substituteGroupId || ''
    });
    setError(null);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const input: CustomFoodInput = {
      name: form.name.trim(), category: form.category,
      calories: Number(form.calories), proteinG: Number(form.proteinG),
      carbsG: Number(form.carbsG), fatsG: Number(form.fatsG),
      fiberG: form.fiberG.trim() ? Number(form.fiberG) : undefined,
      isCooked: form.isCooked,
      substituteGroupId: form.substituteGroupId.trim() || undefined
    };

    if (!input.name || [input.calories, input.proteinG, input.carbsG, input.fatsG].some(value => !Number.isFinite(value))) {
      setError('Preencha o nome e os valores nutricionais por 100 g.');
      return;
    }
    if (input.fiberG != null && !Number.isFinite(input.fiberG)) {
      setError('Informe um valor válido para fibras ou deixe o campo vazio.');
      return;
    }

    setSaving(true);
    try {
      await onSave(input, editingId || undefined);
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o alimento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" aria-labelledby="custom-food-title">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h3 id="custom-food-title" className="font-display text-base font-bold text-foreground">
            {editingId ? 'Editar alimento' : 'Cadastrar alimento'}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Informe os dados do rótulo ou da sua própria receita. Eles serão identificados como informados por você.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Nome do alimento</span>
            <input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Grupo</span>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as FoodCategory })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary">
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Calorias por 100 g</span>
            <input required type="number" min="0" max="1000" step="0.1" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          {([
            ['proteinG', 'Proteína (g)'], ['carbsG', 'Carboidratos (g)'], ['fatsG', 'Gorduras (g)'], ['fiberG', 'Fibras (g, opcional)']
          ] as const).map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">{label} por 100 g</span>
              <input required={key !== 'fiberG'} type="number" min="0" max="100" step="0.1" value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
            </label>
          ))}
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Grupo para substituições (opcional)</span>
            <input maxLength={80} value={form.substituteGroupId} onChange={e => setForm({ ...form, substituteGroupId: e.target.value })}
              placeholder="Ex.: proteina-magra" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
            <input type="checkbox" checked={form.isCooked} onChange={e => setForm({ ...form, isCooked: e.target.checked })} />
            Valores referentes ao alimento preparado/cozido
          </label>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
        <div className="flex gap-2">
          <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar alimento'}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><X className="h-4 w-4" />Cancelar</button>}
        </div>
      </form>

      <div className="space-y-3">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Catálogo de alimentos</h3>
          <p className="mt-1 text-xs text-muted-foreground">{foods.length} itens disponíveis neste dispositivo; favoritos também podem ser usados na busca.</p>
        </div>
        <button type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(value => !value)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${favoritesOnly ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-border text-muted-foreground hover:text-foreground'}`}>
          <Star className="h-3.5 w-3.5" fill={favoritesOnly ? 'currentColor' : 'none'} />{favoritesOnly ? 'Exibindo favoritos' : 'Filtrar favoritos'}
        </button>
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input aria-label="Buscar alimentos" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar alimento ou origem…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" />
        </label>
        {favoriteError && <p role="alert" className="text-xs text-red-300">{favoriteError}</p>}
        {visibleFoods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">Nenhum alimento corresponde à busca.</div>
        ) : visibleFoods.map(food => (
          <article key={food.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-semibold text-foreground">{food.name}</h4>
              <p className="mt-1 text-[11px] text-muted-foreground">{food.calories} kcal · P {food.proteinG} g · C {food.carbsG} g · G {food.fatsG} g por 100 g</p>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${food.dataQuality === 'user_reported' ? 'border-amber-500/25 bg-amber-500/10 text-amber-200' : 'border-border text-muted-foreground'}`}>
                {food.dataQuality === 'user_reported' ? 'Informado pelo usuário' : `${food.dataQuality || 'unverified'} · ${food.source}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" disabled={updatingFavoriteId === food.id} aria-label={food.isFavorite ? `Remover ${food.name} dos favoritos` : `Favoritar ${food.name}`}
                aria-pressed={Boolean(food.isFavorite)} onClick={async () => {
                  setFavoriteError(null); setUpdatingFavoriteId(food.id);
                  try { await onSetFavorite(food.id, !food.isFavorite); }
                  catch (favoriteActionError) { setFavoriteError(favoriteActionError instanceof Error ? favoriteActionError.message : 'Não foi possível salvar o favorito.'); }
                  finally { setUpdatingFavoriteId(null); }
                }} className={`rounded-lg border p-2 transition-colors ${food.isFavorite ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-border text-muted-foreground hover:text-amber-200'}`}>
                <Star className="h-3.5 w-3.5" fill={food.isFavorite ? 'currentColor' : 'none'} />
              </button>
              {food.isCustom && <button type="button" onClick={() => editFood(food)} aria-label={`Editar ${food.name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"><Pencil className="h-3.5 w-3.5" />Editar</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
