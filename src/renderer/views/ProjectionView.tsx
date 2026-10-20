import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Save,
  TrendingUp
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { calculatePhysiqueProjection } from '../../domain/physique-projection';
import {
  BodyMeasurementRecord,
  FitnessGoal,
  PhysiqueProjectionInput,
  PhysiqueProjectionResult,
  PhysiqueProjectionSnapshot,
  ProjectionGoal,
  UserProfile
} from '../../shared/types';

interface ProjectionViewProps {
  profile: UserProfile | null;
  currentWeightKg: number | null;
  measurements: BodyMeasurementRecord[];
  onSaveProjection: (input: PhysiqueProjectionInput) => Promise<PhysiqueProjectionSnapshot>;
  onLoadProjections: () => Promise<PhysiqueProjectionSnapshot[]>;
  onNavigateToShape: () => void;
}

const goalFromProfile = (goal?: FitnessGoal): ProjectionGoal => {
  if (goal === 'fat_loss' || goal === 'weight_reduction') return 'fat_loss';
  if (goal === 'body_recomposition') return 'recomposition';
  return 'muscle_gain';
};

const todayLocal = (): string => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

const formatDate = (date: string): string => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
}).format(new Date(date + 'T12:00:00.000Z'));

const metric = (value?: number, suffix = 'cm'): string => value === undefined
  ? 'Adicione a medida no Calendário do Shape'
  : value.toFixed(1) + ' ' + suffix;

export const ProjectionView: React.FC<ProjectionViewProps> = ({
  profile,
  currentWeightKg,
  measurements,
  onSaveProjection,
  onLoadProjections,
  onNavigateToShape
}) => {
  const latestMeasurement = measurements[0];
  const [bodyFat, setBodyFat] = useState(latestMeasurement?.bodyFatPct?.toString() || '');
  const [adherence, setAdherence] = useState(100);
  const [goal, setGoal] = useState<ProjectionGoal>(goalFromProfile(profile?.fitnessGoal));
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [history, setHistory] = useState<PhysiqueProjectionSnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (bodyFat === '' && latestMeasurement?.bodyFatPct !== undefined) {
      setBodyFat(String(latestMeasurement.bodyFatPct));
    }
  }, [latestMeasurement?.bodyFatPct, bodyFat]);

  useEffect(() => {
    setGoal(goalFromProfile(profile?.fitnessGoal));
  }, [profile?.fitnessGoal]);

  useEffect(() => {
    let active = true;
    onLoadProjections()
      .then(items => { if (active) setHistory(items); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.'); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [onLoadProjections]);

  const input = useMemo<PhysiqueProjectionInput | null>(() => {
    if (!profile || !profile.age || !currentWeightKg || !bodyFat) return null;
    return {
      asOfDate: todayLocal(),
      age: profile.age,
      heightCm: profile.heightCm,
      currentWeightKg,
      bodyFatPct: Number(bodyFat),
      trainingExperience: profile.trainingExperience,
      adherencePercent: adherence,
      goal,
      measurements: {
        shouldersCm: latestMeasurement?.shoulderCircCm,
        chestCm: latestMeasurement?.chestCm,
        armCm: latestMeasurement?.armFlexedCm ?? latestMeasurement?.armRelaxedCm,
        waistCm: latestMeasurement?.waistCircCm,
        thighCm: latestMeasurement?.thighCm
      }
    };
  }, [profile, currentWeightKg, bodyFat, adherence, goal, latestMeasurement]);

  const projectionState = useMemo<{ result: PhysiqueProjectionResult | null; error: string | null }>(() => {
    if (!input) return { result: null, error: null };
    try {
      return { result: calculatePhysiqueProjection(input), error: null };
    } catch (reason) {
      return { result: null, error: reason instanceof Error ? reason.message : 'Confira os dados informados.' };
    }
  }, [input]);

  const result = projectionState.result;
  const selected = result?.points[timelineIndex];
  const current = result?.points[0];
  const latestSaved = history[0];
  const chartData = result?.points.map(point => ({
    ...point,
    timeline: point.months === 0 ? 'Hoje' : point.months + ' meses'
  })) || [];

  const saveProjection = async () => {
    if (!input || !result) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await onSaveProjection(input);
      setHistory(items => [saved, ...items.filter(item => item.id !== saved.id)]);
      setNotice('Projeção salva localmente. As comparações serão preenchidas quando houver pesagens próximas às datas previstas.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a projeção.');
    } finally {
      setSaving(false);
    }
  };

  const weightDelta = selected && current ? selected.weightKg - current.weightKg : 0;
  const waistDelta = selected?.waistCm !== undefined && current?.waistCm !== undefined
    ? selected.waistCm - current.waistCm : undefined;
  const shoulderDelta = selected?.shouldersCm !== undefined && current?.shouldersCm !== undefined
    ? selected.shouldersCm - current.shouldersCm : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Previsão Física</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Explore cenários de composição corporal usando seus dados atuais e medidas que você registrou.
              Os valores futuros são estimativas, não medições nem promessa de resultado.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
              <span className="block text-muted-foreground">Altura do perfil</span>
              <strong className="mt-1 block text-sm text-foreground">{profile?.heightCm ? profile.heightCm + ' cm' : 'Sem perfil'}</strong>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3">
              <span className="block text-muted-foreground">Peso registrado</span>
              <strong className="mt-1 block text-sm text-foreground">{currentWeightKg ? currentWeightKg.toFixed(1) + ' kg' : 'Sem pesagem'}</strong>
            </div>
            <div className="col-span-2 rounded-2xl border border-border bg-secondary/35 px-4 py-3 sm:col-span-1">
              <span className="block text-muted-foreground">Experiência do perfil</span>
              <strong className="mt-1 block text-sm capitalize text-foreground">{profile?.trainingExperience || 'Sem perfil'}</strong>
            </div>
          </div>
        </div>
      </section>

      {!profile && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 text-sm text-muted-foreground">
          Complete o Perfil & Metas para calcular uma projeção baseada nos seus dados.
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Parâmetros do cenário</h3>
              <p className="mt-1 text-xs text-muted-foreground">Peso, altura, idade e experiência vêm do seu perfil e histórico.</p>
            </div>
            <Activity className="h-4 w-4 text-primary" />
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="projection-bf" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Gordura corporal estimada (%)</label>
              <input
                id="projection-bf"
                type="number"
                min="3"
                max="60"
                step="0.1"
                value={bodyFat}
                onChange={event => setBodyFat(event.target.value)}
                placeholder="Ex.: 20"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">Estimativa manual sua ou da última avaliação; não é medida automática.</span>
            </div>

            <div>
              <label htmlFor="projection-goal" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Objetivo deste cenário</label>
              <select
                id="projection-goal"
                value={goal}
                onChange={event => setGoal(event.target.value as ProjectionGoal)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="muscle_gain">Ganho de massa</option>
                <option value="recomposition">Recomposição corporal</option>
                <option value="fat_loss">Perda de gordura</option>
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <label htmlFor="projection-adherence" className="font-semibold text-muted-foreground">Constância estimada</label>
                <strong className="text-primary">{adherence}%</strong>
              </div>
              <input
                id="projection-adherence"
                type="range"
                min="0"
                max="100"
                step="5"
                value={adherence}
                onChange={event => setAdherence(Number(event.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>0%</span><span>100%</span></div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Medidas-base registradas</span>
                <button type="button" onClick={onNavigateToShape} className="text-[11px] font-semibold text-primary hover:underline">Atualizar medidas</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span>Ombros: {metric(latestMeasurement?.shoulderCircCm)}</span>
                <span>Peitoral: {metric(latestMeasurement?.chestCm)}</span>
                <span>Braço: {metric(latestMeasurement?.armFlexedCm ?? latestMeasurement?.armRelaxedCm)}</span>
                <span>Cintura: {metric(latestMeasurement?.waistCircCm)}</span>
                <span>Coxa: {metric(latestMeasurement?.thighCm)}</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Circunferências futuras só aparecem quando há uma medida-base salva.</p>
            </div>

            {projectionState.error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{projectionState.error}</p>}
            {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</p>}
            {notice && <p className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-primary">{notice}</p>}

            <button
              type="button"
              onClick={() => void saveProjection()}
              disabled={!result || saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/15 transition hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />{saving ? 'Salvando no SQLite...' : 'Salvar projeção atual'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {result && selected ? (
            <>
              <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Simulador de linha do tempo</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Arraste o controle para explorar cada marco estimado.</p>
                  </div>
                  <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {selected.months === 0 ? 'Hoje' : selected.months + ' meses'} · {formatDate(selected.targetDate)}
                  </span>
                </div>
                <input
                  aria-label="Linha do tempo da projeção"
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={timelineIndex}
                  onChange={event => setTimelineIndex(Number(event.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-2 grid grid-cols-5 text-center text-[10px] font-medium text-muted-foreground">
                  {['Hoje', '3 meses', '6 meses', '9 meses', '1 ano'].map(label => <span key={label}>{label}</span>)}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Peso estimado" value={selected.weightKg.toFixed(1) + ' kg'} delta={weightDelta} suffix="kg" />
                <MetricCard label="Massa magra" value={selected.leanMassKg.toFixed(1) + ' kg'} />
                <MetricCard label="Gordura corporal" value={selected.bodyFatPct.toFixed(1) + '%'} />
                <MetricCard label="FFMI" value={selected.ffmi.toFixed(1)} />
              </div>

              <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">Tendência projetada</h3>
                    <p className="mt-1 text-xs text-muted-foreground">As curvas são cenários estimados de composição corporal.</p>
                  </div>
                  <span className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">kg</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="timeline" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="weightKg" name="Peso" stroke="#8aa89a" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="leanMassKg" name="Massa magra" stroke="#76d0a0" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="fatMassKg" name="Massa de gordura" stroke="#c59a76" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <HighlightCard title="Cintura" delta={waistDelta} current={selected.waistCm} icon={<ArrowDownRight className="h-4 w-4" />} />
                <HighlightCard title="Ombros" delta={shoulderDelta} current={selected.shouldersCm} icon={<ArrowUpRight className="h-4 w-4" />} />
              </section>

              <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <h3 className="font-display text-sm font-bold text-foreground">Proporções descritivas</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <span className="text-[11px] text-muted-foreground">Ombros ÷ cintura</span>
                    <strong className="mt-1 block text-xl text-foreground">{selected.shoulderWaistRatio?.toFixed(2) ?? '—'}</strong>
                    <span className="mt-1 block text-[10px] text-muted-foreground">Índice visual descritivo; sem ideal universal.</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <span className="text-[11px] text-muted-foreground">Referência matemática φ</span>
                    <strong className="mt-1 block text-xl text-foreground">1,618</strong>
                    <span className="mt-1 block text-[10px] text-muted-foreground">A proporção áurea não é meta fisiológica nem clínica.</span>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
              <Info className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-display text-base font-bold text-foreground">Dados atuais necessários</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Registre uma pesagem, complete a idade e altura no perfil e informe sua estimativa de gordura corporal para visualizar as curvas.
              </p>
            </section>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-warning/25 bg-warning/5 p-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <h3 className="text-xs font-bold text-foreground">Como interpretar esta previsão</h3>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              {(result?.assumptions || [
                'As curvas dependem de constância aproximada no treino, alimentação e descanso.',
                'Os resultados reais variam e a tela não substitui avaliação profissional.'
              ]).map(item => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Esperado × realizado</h3>
            <p className="mt-1 text-xs text-muted-foreground">Comparação com pesagens salvas a até 14 dias de cada data prevista.</p>
          </div>
          <span className="text-[11px] text-muted-foreground">{loadingHistory ? 'Carregando...' : history.length + ' projeção(ões)'}</span>
        </div>
        {!latestSaved ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">Salve uma projeção para iniciar o acompanhamento mensal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3 font-semibold">Marco</th><th className="pb-3 font-semibold">Data-alvo</th><th className="pb-3 font-semibold">Esperado</th><th className="pb-3 font-semibold">Real</th><th className="pb-3 font-semibold">Diferença</th></tr></thead>
              <tbody>{latestSaved.comparisons.map(comparison => (
                <tr key={comparison.months} className="border-b border-border/60 last:border-0">
                  <td className="py-3 font-semibold text-foreground">{comparison.months} meses</td>
                  <td className="py-3 text-muted-foreground">{formatDate(comparison.targetDate)}</td>
                  <td className="py-3 text-foreground">{comparison.expectedWeightKg.toFixed(1)} kg</td>
                  <td className="py-3 text-foreground">{comparison.actualWeightKg === null ? 'Aguardando pesagem' : comparison.actualWeightKg.toFixed(1) + ' kg'}</td>
                  <td className="py-3 text-muted-foreground">{comparison.differenceKg === undefined ? '—' : (comparison.differenceKg > 0 ? '+' : '') + comparison.differenceKg.toFixed(1) + ' kg'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; delta?: number; suffix?: string }> = ({ label, value, delta, suffix }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <strong className="mt-1 block text-lg font-bold text-foreground">{value}</strong>
    {delta !== undefined && <span className="mt-1 block text-[10px] text-muted-foreground">{delta > 0 ? '+' : ''}{delta.toFixed(1)} {suffix || 'kg'} desde hoje</span>}
  </div>
);

const HighlightCard: React.FC<{ title: string; delta?: number; current?: number; icon: React.ReactNode }> = ({ title, delta, current, icon }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold text-foreground">{title}</span></div>
    {current === undefined || delta === undefined ? (
      <p className="mt-2 text-xs text-muted-foreground">Registre esta circunferência no Calendário do Shape para estimar mudanças.</p>
    ) : (
      <><strong className="mt-2 block text-xl text-foreground">{current.toFixed(1)} cm</strong><span className="text-[11px] text-muted-foreground">{delta > 0 ? '+' : ''}{delta.toFixed(1)} cm frente à medida atual</span></>
    )}
  </div>
);
