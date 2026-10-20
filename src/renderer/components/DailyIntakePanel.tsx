import React, { useState } from 'react';
import { Droplets, Plus, Utensils } from 'lucide-react';
import { DashboardSummary, LoggedMealInput } from '../../shared/types';

interface DailyIntakePanelProps {
  summary: DashboardSummary | null;
  onAddMeal: (meal: LoggedMealInput) => Promise<void>;
  onAddWater: (amountMl: number) => Promise<void>;
}

const localDate = (): string => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

export const DailyIntakePanel: React.FC<DailyIntakePanelProps> = ({ summary, onAddMeal, onAddWater }) => {
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [water, setWater] = useState('250');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = [
    { label: 'Calorias', value: summary?.caloriesLogged, goal: summary?.nutritionTargets?.targetCalories, suffix: 'kcal', color: 'bg-primary' },
    { label: 'Proteínas', value: summary?.proteinLoggedG, goal: summary?.nutritionTargets?.proteinGrams, suffix: 'g', color: 'bg-emerald-400' },
    { label: 'Carboidratos', value: summary?.carbsLoggedG, goal: summary?.nutritionTargets?.carbGrams, suffix: 'g', color: 'bg-sky-400' },
    { label: 'Gorduras', value: summary?.fatsLoggedG, goal: summary?.nutritionTargets?.fatGrams, suffix: 'g', color: 'bg-amber-400' }
  ];

  const submitMeal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mealName.trim() || [calories, protein, carbs, fats].some(value => value === '' || Number(value) < 0)) {
      setError('Informe o nome e os macros consumidos.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAddMeal({
        date: localDate(), mealName: mealName.trim(), calories: Number(calories),
        proteinG: Number(protein), carbsG: Number(carbs), fatsG: Number(fats)
      });
      setMealName(''); setCalories(''); setProtein(''); setCarbs(''); setFats('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar a refeição.');
    } finally {
      setSaving(false);
    }
  };

  const addWater = async () => {
    const amount = Number(water);
    if (!Number.isInteger(amount) || amount < 1 || amount > 5000) {
      setError('Informe água entre 1 e 5000 ml.');
      return;
    }
    setSaving(true);
    setError(null);
    try { await onAddWater(amount); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível registrar a água.'); }
    finally { setSaving(false); }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Consumo de hoje</h2>
          <p className="mt-1 text-xs text-muted-foreground">Valores abaixo vêm dos registros que você adicionar no app.</p>
        </div>
        <span className="text-[11px] text-muted-foreground">{summary?.completedMeals || 0} refeição(ões) registradas</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {values.map(item => {
          const percent = item.value !== null && item.value !== undefined && item.goal
            ? Math.min(100, item.value / item.goal * 100) : 0;
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{item.label}</span>
                <span className="text-muted-foreground">{item.value === null || item.value === undefined ? 'Sem registro' : `${Math.round(percent)}%`}</span>
              </div>
              <strong className="mt-2 block text-xl font-bold text-foreground">
                {item.value === null || item.value === undefined ? '—' : Math.round(item.value)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">{item.suffix}</span>
              </strong>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full transition-[width] duration-500 ${item.color}`} style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">Meta: {item.goal ? `${item.goal} ${item.suffix}` : 'indisponível'}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <form onSubmit={event => void submitMeal(event)} className="rounded-2xl border border-border bg-secondary/25 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-foreground"><Utensils className="h-4 w-4 text-primary" /> Registrar refeição</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input value={mealName} onChange={event => setMealName(event.target.value)} placeholder="Nome" aria-label="Nome da refeição" className="col-span-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground sm:col-span-1" />
            <NumberField label="kcal" value={calories} onChange={setCalories} />
            <NumberField label="Proteína g" value={protein} onChange={setProtein} />
            <NumberField label="Carbo g" value={carbs} onChange={setCarbs} />
            <NumberField label="Gordura g" value={fats} onChange={setFats} />
          </div>
          <button disabled={saving} className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Salvar consumo</button>
        </form>

        <div className="rounded-2xl border border-border bg-secondary/25 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-foreground"><Droplets className="h-4 w-4 text-sky-400" /> Hidratação registrada</h3>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl text-foreground">{summary?.waterLoggedMl === null || summary?.waterLoggedMl === undefined ? '—' : (summary.waterLoggedMl / 1000).toFixed(2)}</strong>
            <span className="text-xs text-muted-foreground">L / {summary?.waterGoalMl ? `${(summary.waterGoalMl / 1000).toFixed(1)} L de meta` : 'meta indisponível'}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="number" min="1" max="5000" step="50" value={water} onChange={event => setWater(event.target.value)} className="w-24 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" aria-label="Quantidade de água em ml" />
            <span className="text-xs text-muted-foreground">ml</span>
            <button type="button" disabled={saving} onClick={() => void addWater()} className="ml-auto rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[11px] font-bold text-sky-300 disabled:opacity-50">Adicionar água</button>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</p>}
    </section>
  );
};

const NumberField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <input type="number" min="0" step="0.1" value={value} onChange={event => onChange(event.target.value)} placeholder={label} aria-label={label} className="min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
);
