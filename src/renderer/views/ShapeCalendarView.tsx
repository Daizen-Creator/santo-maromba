import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Camera,
  Scale,
  Ruler,
  Trash2,
  Plus,
  Clock,
  Columns
} from 'lucide-react';
import { BodyMeasurementRecord, SaveBodyMeasurementInput, CustomBodyMeasurements, CustomMeasurementDefinition, CustomMeasurementRecord, PhotoCreateInput, PhotoPose, PhotoRecord, SaveCustomMeasurementDefinitionInput, SaveCustomMeasurementInput, ShapeMilestone, ShapeMilestoneInput, WeightRecord, WorkoutSession } from '../../shared/types';
import { buildMeasurementTrend, MEASUREMENT_METRICS, MeasurementMetric } from '../../domain/measurement-trend';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ShapeMilestonesPanel } from '../components/ShapeMilestonesPanel';

const localDateString = (date = new Date()): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const poseLabel = (photo: PhotoRecord): string => {
  if (photo.pose === 'custom') return photo.customPoseName || 'Pose personalizada';
  const labels: Record<Exclude<PhotoPose, 'custom'>, string> = {
    front_relaxed: 'Frente relaxada',
    front_flexed: 'Frente contraída',
    back: 'Costas',
    side_left: 'Perfil esquerdo',
    side_right: 'Perfil direito'
  };
  return labels[photo.pose];
};

interface ShapeCalendarViewProps {
  photos: PhotoRecord[];
  weights: WeightRecord[];
  measurements: BodyMeasurementRecord[];
  workoutSessions: WorkoutSession[];
  onAddPhoto: (data: PhotoCreateInput) => Promise<void>;
  onUpdatePhotoNotes: (id: string, notes: string) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
  onSaveMeasurement: (data: SaveBodyMeasurementInput) => Promise<void>;
  onGetCustomMeasurements: () => Promise<CustomBodyMeasurements>;
  onSaveCustomMeasurementDefinition: (input: SaveCustomMeasurementDefinitionInput) => Promise<CustomMeasurementDefinition>;
  onSaveCustomMeasurement: (input: SaveCustomMeasurementInput) => Promise<CustomMeasurementRecord>;
  onGetShapeMilestones: () => Promise<ShapeMilestone[]>;
  onSaveShapeMilestone: (input: ShapeMilestoneInput) => Promise<ShapeMilestone>;
  onDeleteShapeMilestone: (id: string) => Promise<void>;
  initialTab?: 'calendar' | 'compare';
}

export const ShapeCalendarView: React.FC<ShapeCalendarViewProps> = ({
  photos,
  weights,
  measurements,
  workoutSessions,
  onAddPhoto,
  onUpdatePhotoNotes,
  onDeletePhoto,
  onSaveMeasurement,
  onGetCustomMeasurements,
  onSaveCustomMeasurementDefinition,
  onSaveCustomMeasurement,
  onGetShapeMilestones,
  onSaveShapeMilestone,
  onDeleteShapeMilestone,
  initialTab = 'calendar'
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'compare' | 'timeline' | 'measurements' | 'milestones'>(initialTab);
  const [measurementMetric, setMeasurementMetric] = useState<MeasurementMetric>('waistCircCm');
  const measurementTrend = useMemo(() => buildMeasurementTrend(measurements, measurementMetric), [measurements, measurementMetric]);
  const [customMeasurements, setCustomMeasurements] = useState<CustomBodyMeasurements>({ definitions: [], records: [] });
  const [customMeasureName, setCustomMeasureName] = useState('');
  const [customMeasureUnit, setCustomMeasureUnit] = useState('cm');
  const [customMeasureDate, setCustomMeasureDate] = useState(localDateString());
  const [customMeasureValues, setCustomMeasureValues] = useState<Record<string, string>>({});
  const [customMeasureNotes, setCustomMeasureNotes] = useState<Record<string, string>>({});
  const [customMeasureSaving, setCustomMeasureSaving] = useState<string | null>(null);
  const [customMeasureMessage, setCustomMeasureMessage] = useState<string | null>(null);
  const [customMeasureError, setCustomMeasureError] = useState<string | null>(null);

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  useEffect(() => {
    let active = true;
    onGetCustomMeasurements()
      .then(data => { if (active) setCustomMeasurements(data); })
      .catch(error => { if (active) setCustomMeasureError(error instanceof Error ? error.message : 'Não foi possível carregar medidas personalizadas.'); });
    return () => { active = false; };
  }, [onGetCustomMeasurements]);

  const handleSaveCustomDefinition = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCustomMeasureError(null);
    setCustomMeasureMessage(null);
    try {
      const definition = await onSaveCustomMeasurementDefinition({ name: customMeasureName, unit: customMeasureUnit });
      setCustomMeasurements(current => ({ ...current, definitions: [...current.definitions, definition].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }));
      setCustomMeasureName('');
      setCustomMeasureMessage(`Medida “${definition.name}” criada. Agora registre valores por data.`);
    } catch (error) {
      setCustomMeasureError(error instanceof Error ? error.message : 'Não foi possível criar a medida personalizada.');
    }
  };

  const handleSaveCustomValue = async (event: React.FormEvent<HTMLFormElement>, definition: CustomMeasurementDefinition, valueKey: string) => {
    event.preventDefault();
    setCustomMeasureError(null);
    setCustomMeasureMessage(null);
    setCustomMeasureSaving(valueKey);
    try {
      const saved = await onSaveCustomMeasurement({
        definitionId: definition.id,
        date: customMeasureDate,
        value: Number(customMeasureValues[valueKey]),
        notes: customMeasureNotes[valueKey] || undefined
      });
      setCustomMeasurements(current => ({
        ...current,
        records: [saved, ...current.records.filter(item => !(item.definitionId === saved.definitionId && item.date === saved.date))]
      }));
      setCustomMeasureMessage(`${definition.name} salva para ${saved.date}.`);
    } catch (error) {
      setCustomMeasureError(error instanceof Error ? error.message : 'Não foi possível salvar o valor da medida.');
    } finally {
      setCustomMeasureSaving(null);
    }
  };

  // Navegação do Calendário
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(localDateString());

  // Modais
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState<boolean>(false);

  // Estados do Comparador Antes e Depois
  const [comparePhotoAId, setComparePhotoAId] = useState<string>('');
  const [comparePhotoBId, setComparePhotoBId] = useState<string>('');
  const [compareMode, setCompareMode] = useState<'side_by_side' | 'overlay'>('side_by_side');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(50);

  // Dados do formulário de foto
  const [photoDate, setPhotoDate] = useState<string>(selectedDayStr);
  const [photoPose, setPhotoPose] = useState<PhotoPose>('front_relaxed');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [customPoseName, setCustomPoseName] = useState<string>('');
  const [photoNotes, setPhotoNotes] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewedPhotoId, setViewedPhotoId] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  // Formulário de medidas
  const [measHeight, setMeasHeight] = useState<string>('');
  const [measWaist, setMeasWaist] = useState<string>('');
  const [measArmRelaxed, setMeasArmRelaxed] = useState<string>('');
  const [measArmFlexed, setMeasArmFlexed] = useState<string>('');
  const [measChest, setMeasChest] = useState<string>('');
  const [measShoulders, setMeasShoulders] = useState<string>('');
  const [measThigh, setMeasThigh] = useState<string>('');
  const [measBodyFat, setMeasBodyFat] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Mapa de atividades por data (YYYY-MM-DD)
  const activityMap = useMemo(() => {
    const map = new Map<string, { photos: PhotoRecord[]; weight?: WeightRecord; measurement?: BodyMeasurementRecord; workout?: WorkoutSession }>();

    for (const p of photos) {
      const entry = map.get(p.date) || { photos: [] };
      entry.photos.push(p);
      map.set(p.date, entry);
    }
    for (const w of weights) {
      const entry = map.get(w.date) || { photos: [] };
      entry.weight = w;
      map.set(w.date, entry);
    }
    for (const m of measurements) {
      const entry = map.get(m.date) || { photos: [] };
      entry.measurement = m;
      map.set(m.date, entry);
    }
    for (const ws of workoutSessions) {
      const entry = map.get(ws.date) || { photos: [] };
      entry.workout = ws;
      map.set(ws.date, entry);
    }

    return map;
  }, [photos, weights, measurements, workoutSessions]);

  // Dados do dia selecionado
  const selectedDayData = activityMap.get(selectedDayStr);

  // Comparador fotos
  const photoA = useMemo(
    () => photos.find(photo => photo.id === comparePhotoAId) || photos[photos.length - 1],
    [photos, comparePhotoAId]
  );
  const photoB = useMemo(
    () => photos.find(photo => photo.id === comparePhotoBId) || photos[0],
    [photos, comparePhotoBId]
  );
  const measA = useMemo(() => measurements.find(m => m.date === photoA?.date), [measurements, photoA]);
  const measB = useMemo(() => measurements.find(m => m.date === photoB?.date), [measurements, photoB]);
  const weightA = useMemo(() => weights.find(w => w.date === photoA?.date), [weights, photoA]);
  const weightB = useMemo(() => weights.find(w => w.date === photoB?.date), [weights, photoB]);
  const photoWeightA = photoA?.weightKgAtPhoto ?? weightA?.weightKg;
  const photoWeightB = photoB?.weightKgAtPhoto ?? weightB?.weightKg;
  const photoDateWeight = useMemo(() => weights.filter(weight => weight.date === photoDate).slice(-1)[0], [photoDate, weights]);
  const viewedPhoto = photos.find(photo => photo.id === viewedPhotoId);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoFile(null);
      setPhotoError('Escolha uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setPhotoFile(null);
      setPhotoError('A imagem precisa ter até 15 MB.');
      return;
    }
    setPhotoFile(file);
  };

  const handleSavePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      await onAddPhoto({
        date: photoDate,
        pose: photoPose,
        customPoseName: photoPose === 'custom' ? customPoseName.trim() : undefined,
        imageBytes: new Uint8Array(await photoFile.arrayBuffer()),
        mimeType: photoFile.type,
        notes: photoNotes,
        isPrimary: !photos.some(photo => photo.date === photoDate && photo.isPrimary)
      });
      setIsPhotoModalOpen(false);
      setPhotoFile(null);
      setPhotoNotes('');
      setCustomPoseName('');
    } catch (error: any) {
      setPhotoError(error.message || 'Não foi possível salvar a foto.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeletePhoto = async (photo: PhotoRecord) => {
    if (!window.confirm(`Excluir a foto de ${photo.date} (${poseLabel(photo)})? Esta ação não pode ser desfeita.`)) return;
    setActionError(null);
    try {
      await onDeletePhoto(photo.id);
      if (viewedPhotoId === photo.id) setViewedPhotoId(null);
    } catch (error: any) {
      setActionError(error.message || 'Não foi possível excluir a foto.');
    }
  };

  const handleSavePhotoNotes = async () => {
    if (!viewedPhoto) return;
    setSavingNotes(true);
    setActionError(null);
    try {
      await onUpdatePhotoNotes(viewedPhoto.id, editedNotes);
    } catch (error: any) {
      setActionError(error.message || 'Não foi possível salvar as observações.');
    } finally {
      setSavingNotes(false);
    }
  };

  const openPhotoModal = (date: string) => {
    setPhotoDate(date);
    setPhotoFile(null);
    setPhotoError(null);
    setCustomPoseName('');
    setIsPhotoModalOpen(true);
  };

  const openMeasurementModal = () => {
    const existing = measurements.find(measurement => measurement.date === selectedDayStr);
    setMeasHeight(existing?.heightCm == null ? '' : String(existing.heightCm));
    setMeasWaist(existing?.waistCircCm == null ? '' : String(existing.waistCircCm));
    setMeasArmRelaxed(existing?.armRelaxedCm == null ? '' : String(existing.armRelaxedCm));
    setMeasArmFlexed(existing?.armFlexedCm == null ? '' : String(existing.armFlexedCm));
    setMeasChest(existing?.chestCm == null ? '' : String(existing.chestCm));
    setMeasShoulders(existing?.shoulderCircCm == null ? '' : String(existing.shoulderCircCm));
    setMeasThigh(existing?.thighCm == null ? '' : String(existing.thighCm));
    setMeasBodyFat(existing?.bodyFatPct == null ? '' : String(existing.bodyFatPct));
    setIsMeasurementModalOpen(true);
  };

  const handleSaveMeasurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveMeasurement({
      date: selectedDayStr,
      heightCm: measHeight ? Number(measHeight) : undefined,
      waistCircCm: measWaist ? Number(measWaist) : undefined,
      armRelaxedCm: measArmRelaxed ? Number(measArmRelaxed) : undefined,
      armFlexedCm: measArmFlexed ? Number(measArmFlexed) : undefined,
      chestCm: measChest ? Number(measChest) : undefined,
      shoulderCircCm: measShoulders ? Number(measShoulders) : undefined,
      thighCm: measThigh ? Number(measThigh) : undefined,
      bodyFatPct: measBodyFat ? Number(measBodyFat) : undefined
    });
    setIsMeasurementModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header com Navegação de Sub-Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Calendário do Shape & Evolução Física
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro cronológico de fotos, medidas corporais e comparador antes/depois com sobreposição
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/50 p-1">
          {[
            { id: 'calendar', label: 'Calendário Mensal', icon: CalendarIcon },
            { id: 'compare', label: 'Comparador Antes & Depois', icon: Columns },
            { id: 'timeline', label: 'Linha do Tempo', icon: Clock },
            { id: 'measurements', label: 'Medidas', icon: Ruler },
            { id: 'milestones', label: 'Marcos', icon: Plus }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive" role="alert">
          {actionError}
        </div>
      )}

      {/* 1. ABA CALENDÁRIO */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendário Mensal */}
          <div className="lg:col-span-8 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-foreground">
                  {monthNames[month]} {year}
                </span>
                <span className="text-xs text-muted-foreground">
                  (Navegação livre para meses anteriores)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Hoje
                </button>
                <button
                  onClick={nextMonth}
                  className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Próximo Mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Grid dos Dias */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="font-bold text-muted-foreground py-1 text-[11px] uppercase">
                  {d}
                </div>
              ))}

              {/* Dias vazios antes do dia 1 */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 rounded-2xl bg-secondary/10 opacity-30" />
              ))}

              {/* Dias do Mês */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDayStr === dayDateStr;
                const activity = activityMap.get(dayDateStr);

                return (
                  <button
                    key={dayDateStr}
                    type="button"
                    onClick={() => setSelectedDayStr(dayDateStr)}
                    className={`h-20 rounded-2xl border p-2 flex flex-col justify-between text-left transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                        : 'border-border/70 bg-secondary/20 hover:border-border hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {dayNum}
                      </span>
                      {activity?.photos && activity.photos.length > 0 && (
                        <Camera className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>

                    {/* Marcadores de Atividades */}
                    <div className="space-y-0.5 w-full">
                      {activity?.weight && (
                        <div className="text-[10px] font-semibold text-blue-400 truncate flex items-center gap-0.5">
                          <Scale className="h-2.5 w-2.5" />
                          <span>{activity.weight.weightKg.toFixed(1)}k</span>
                        </div>
                      )}
                      {activity?.workout && (
                        <div className="text-[9px] font-medium text-emerald-400 truncate">
                          Treino ✓
                        </div>
                      )}
                      {activity?.measurement && (
                        <div className="text-[9px] font-medium text-amber-400 truncate">
                          Medidas ✓
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Painel do Dia Selecionado */}
          <div className="lg:col-span-4 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Registros de {selectedDayStr}
                </h3>
                <p className="text-xs text-muted-foreground">Detalhes e fotos deste dia</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPhotoModal(selectedDayStr)}
                  className="rounded-xl bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors"
                  title="Anexar Foto neste dia"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  onClick={openMeasurementModal}
                  className="rounded-xl bg-secondary p-2 text-foreground hover:bg-secondary/80 transition-colors"
                  title="Salvar Medidas deste dia"
                >
                  <Ruler className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Fotos do Dia */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Fotos do Físico ({selectedDayData?.photos.length || 0})
              </span>

              {!selectedDayData || selectedDayData.photos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground space-y-3">
                  <Camera className="mx-auto h-7 w-7 text-muted-foreground/40" />
                  <p>Nenhuma foto anexada nesta data.</p>
                  <button
                    onClick={() => openPhotoModal(selectedDayStr)}
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    Anexar Foto Agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {selectedDayData.photos.map(p => (
                    <div key={p.id} className="relative group rounded-2xl overflow-hidden border border-border bg-black">
                      <button
                        type="button"
                        onClick={() => { setViewedPhotoId(p.id); setEditedNotes(p.notes || ''); }}
                        className="block w-full cursor-zoom-in"
                        aria-label={`Ampliar foto de ${poseLabel(p)}, ${p.date}`}
                      >
                        <img src={p.filePath} alt={poseLabel(p)} className="h-36 w-full object-cover" />
                      </button>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-between">
                        <button
                          onClick={() => void handleDeletePhoto(p)}
                          className="pointer-events-auto self-end rounded-lg bg-black/60 p-1 text-destructive hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          aria-label={`Excluir foto de ${poseLabel(p)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div>
                          <span className="text-[10px] font-bold text-white block capitalize">
                            {poseLabel(p)}
                          </span>
                          {p.notes && <span className="text-[9px] text-gray-300 truncate block">{p.notes}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medidas e Pesagem do Dia */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5 text-xs">
              <span className="font-bold text-foreground block">Métricas Corporais do Dia:</span>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  Peso: <strong className="text-foreground">{selectedDayData?.weight ? `${selectedDayData.weight.weightKg} kg` : 'Sem registro'}</strong>
                </div>
                <div>
                  Altura: <strong className="text-foreground">{selectedDayData?.measurement?.heightCm ? `${selectedDayData.measurement.heightCm} cm` : '—'}</strong>
                </div>
                <div>
                  Cintura: <strong className="text-foreground">{selectedDayData?.measurement?.waistCircCm ? `${selectedDayData.measurement.waistCircCm} cm` : '—'}</strong>
                </div>
                <div>
                  Braço Contraído: <strong className="text-foreground">{selectedDayData?.measurement?.armFlexedCm ? `${selectedDayData.measurement.armFlexedCm} cm` : '—'}</strong>
                </div>
                <div>
                  Peitoral: <strong className="text-foreground">{selectedDayData?.measurement?.chestCm ? `${selectedDayData.measurement.chestCm} cm` : '—'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ABA COMPARADOR ANTES E DEPOIS */}
      {activeTab === 'compare' && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Comparador Visual Antes & Depois
              </h3>
              <p className="text-xs text-muted-foreground">
                Selecione quaisquer duas datas para comparar lado a lado ou em sobreposição com opacidade ajustável.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompareMode('side_by_side')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                    compareMode === 'side_by_side'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Lado a Lado
                </button>
                <button
                  onClick={() => setCompareMode('overlay')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                    compareMode === 'overlay'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Sobreposição
                </button>
              </div>
            </div>
          </div>

          {/* Seletores de Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Data Anterior (Antes):</label>
              <select
                value={photoA?.id || ''}
                onChange={e => setComparePhotoAId(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                disabled={photos.length === 0}
              >
                {photos.length === 0 && <option value="">Nenhuma foto registrada</option>}
                {photos.map(p => (
                  <option key={`a-${p.id}`} value={p.id}>
                    {p.date} — {poseLabel(p)} {p.notes ? `(${p.notes})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Data Posterior (Depois):</label>
              <select
                value={photoB?.id || ''}
                onChange={e => setComparePhotoBId(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 p-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                disabled={photos.length === 0}
              >
                {photos.length === 0 && <option value="">Nenhuma foto registrada</option>}
                {photos.map(p => (
                  <option key={`b-${p.id}`} value={p.id}>
                    {p.date} — {poseLabel(p)} {p.notes ? `(${p.notes})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Slider de Opacidade no modo Overlay */}
          {compareMode === 'overlay' && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Opacidade da Sobreposição ({overlayOpacity}%)</span>
                <span className="text-muted-foreground text-[11px]">Deslize para ver o contorno dos músculos</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={e => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* Visualizador de Imagens */}
          <div className="relative rounded-2xl overflow-hidden border border-border bg-black/90 p-4 min-h-[400px] flex items-center justify-center">
            {compareMode === 'side_by_side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Lado A */}
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-primary block">
                    Antes: {photoA?.date || '—'} {photoWeightA !== undefined ? `(${photoWeightA.toFixed(1)} kg)` : ''}
                  </span>
                  <div className="rounded-xl overflow-hidden border border-border/70 max-h-[480px] flex items-center justify-center bg-black">
                    {photoA ? (
                      <img src={photoA.filePath} alt="Antes" className="max-h-[480px] w-auto object-contain" />
                    ) : (
                      <div className="py-20 text-muted-foreground text-xs">Sem foto nesta data</div>
                    )}
                  </div>
                </div>

                {/* Lado B */}
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-emerald-400 block">
                    Depois: {photoB?.date || '—'} {photoWeightB !== undefined ? `(${photoWeightB.toFixed(1)} kg)` : ''}
                  </span>
                  <div className="rounded-xl overflow-hidden border border-border/70 max-h-[480px] flex items-center justify-center bg-black">
                    {photoB ? (
                      <img src={photoB.filePath} alt="Depois" className="max-h-[480px] w-auto object-contain" />
                    ) : (
                      <div className="py-20 text-muted-foreground text-xs">Sem foto nesta data</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Modo Sobreposição
              <div className="relative max-h-[500px] w-full flex items-center justify-center">
                {photoA && (
                  <img
                    src={photoA.filePath}
                    alt="Base"
                    className="max-h-[500px] w-auto object-contain rounded-xl"
                  />
                )}
                {photoB && (
                  <img
                    src={photoB.filePath}
                    alt="Sobreposta"
                    style={{ opacity: overlayOpacity / 100 }}
                    className="absolute max-h-[500px] w-auto object-contain rounded-xl transition-opacity"
                  />
                )}
                {!photoA && !photoB && <div className="py-20 text-muted-foreground text-xs">Adicione duas fotos para comparar sua evolução.</div>}
              </div>
            )}
          </div>

          {/* Tabela de Comparação de Medidas e Peso */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Comparação Numérica entre as Datas
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-muted-foreground block text-[11px]">Variação de Peso</span>
                <span className="font-display text-lg font-bold text-foreground">
                  {photoWeightA !== undefined && photoWeightB !== undefined
                    ? `${(photoWeightB - photoWeightA > 0 ? '+' : '')}${(photoWeightB - photoWeightA).toFixed(1)} kg`
                    : 'N/A'}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-muted-foreground block text-[11px]">Variação de Cintura</span>
                <span className="font-display text-lg font-bold text-foreground">
                  {measA?.waistCircCm && measB?.waistCircCm
                    ? `${(measB.waistCircCm - measA.waistCircCm > 0 ? '+' : '')}${(measB.waistCircCm - measA.waistCircCm).toFixed(1)} cm`
                    : '—'}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-muted-foreground block text-[11px]">Variação de Braço</span>
                <span className="font-display text-lg font-bold text-foreground">
                  {measA?.armFlexedCm && measB?.armFlexedCm
                    ? `${(measB.armFlexedCm - measA.armFlexedCm > 0 ? '+' : '')}${(measB.armFlexedCm - measA.armFlexedCm).toFixed(1)} cm`
                    : '—'}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-muted-foreground block text-[11px]">Variação de Peitoral</span>
                <span className="font-display text-lg font-bold text-foreground">
                  {measA?.chestCm && measB?.chestCm
                    ? `${(measB.chestCm - measA.chestCm > 0 ? '+' : '')}${(measB.chestCm - measA.chestCm).toFixed(1)} cm`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ABA LINHA DO TEMPO */}
      {activeTab === 'timeline' && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h3 className="font-display text-base font-bold text-foreground border-b border-border pb-3">
            Linha do Tempo Visual do Shape
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {photos.map(p => {
              const dayWeight = weights.find(w => w.date === p.date);
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-secondary/30 overflow-hidden shadow-sm flex flex-col">
                  <button
                    type="button"
                    onClick={() => { setViewedPhotoId(p.id); setEditedNotes(p.notes || ''); }}
                    className="h-56 bg-black flex items-center justify-center cursor-zoom-in"
                    aria-label={`Ampliar foto de ${poseLabel(p)}, ${p.date}`}
                  >
                    <img src={p.filePath} alt={poseLabel(p)} className="h-full w-full object-cover" />
                  </button>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span>{p.date}</span>
                        {dayWeight && <span className="text-primary">{dayWeight.weightKg} kg</span>}
                      </div>
                      <span className="text-[11px] text-muted-foreground block capitalize mt-0.5">
                         Pose: {poseLabel(p)}
                      </span>
                      {p.notes && <p className="text-xs text-foreground/80 mt-1">{p.notes}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                      <span>{p.lightingNotes || 'Condição de luz não informada'}</span>
                      <button
                        onClick={() => void handleDeletePhoto(p)}
                        className="text-destructive hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ABA MEDIDAS CORPORAIS */}
      {activeTab === 'measurements' && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Histórico de Medidas Antropométricas
              </h3>
              <p className="text-xs text-muted-foreground">Altura e circunferências registradas por data; a altura atual do perfil é editada em Perfil &amp; Metas.</p>
            </div>
            <button
              onClick={openMeasurementModal}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Lançar Nova Medição</span>
            </button>
          </div>

          <section aria-label="Gráfico da evolução das medidas" className="space-y-3 rounded-2xl border border-border/70 bg-background/50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Evolução registrada</h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground">O gráfico usa somente medições salvas, sem estimar pontos faltantes.</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Métrica</span>
                <select aria-label="Métrica do gráfico de medidas" value={measurementMetric}
                  onChange={event => setMeasurementMetric(event.target.value as MeasurementMetric)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-foreground">
                  {Object.entries(MEASUREMENT_METRICS).map(([key, metric]) => (
                    <option key={key} value={key}>{metric.label} ({metric.unit})</option>
                  ))}
                </select>
              </label>
            </div>
            {measurementTrend.length < 2 ? (
              <p role="status" className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
                Registre pelo menos duas medições de {MEASUREMENT_METRICS[measurementMetric].label.toLocaleLowerCase('pt-BR')} para visualizar a tendência.
              </p>
            ) : (
              <div className="h-56 w-full" role="img" aria-label={`Evolução de ${MEASUREMENT_METRICS[measurementMetric].label}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurementTrend} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`))}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis width={44} domain={['auto', 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))}
                      formatter={value => [`${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${MEASUREMENT_METRICS[measurementMetric].unit}`, MEASUREMENT_METRICS[measurementMetric].label]}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
                    <Line type="monotone" dataKey="value" name={MEASUREMENT_METRICS[measurementMetric].label} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Altura</th>
                  <th className="p-3">Cintura</th>
                  <th className="p-3">Braço Rel.</th>
                  <th className="p-3">Braço Flex.</th>
                  <th className="p-3">Peitoral</th>
                  <th className="p-3">Coxa</th>
                  <th className="p-3">Gordura %</th>
                  <th className="p-3">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {measurements.map(m => (
                  <tr key={m.id} className="hover:bg-secondary/20">
                    <td className="p-3 font-semibold text-foreground">{m.date}</td>
                    <td className="p-3">{m.heightCm ? `${m.heightCm} cm` : '—'}</td>
                    <td className="p-3">{m.waistCircCm ? `${m.waistCircCm} cm` : '—'}</td>
                    <td className="p-3">{m.armRelaxedCm ? `${m.armRelaxedCm} cm` : '—'}</td>
                    <td className="p-3 font-bold text-primary">{m.armFlexedCm ? `${m.armFlexedCm} cm` : '—'}</td>
                    <td className="p-3">{m.chestCm ? `${m.chestCm} cm` : '—'}</td>
                    <td className="p-3">{m.thighCm ? `${m.thighCm} cm` : '—'}</td>
                    <td className="p-3">{m.bodyFatPct ? `${m.bodyFatPct}%` : '—'}</td>
                    <td className="p-3 text-muted-foreground">{m.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Medidas personalizadas</h4>
              <p className="mt-1 text-[11px] text-muted-foreground">Crie campos como pescoço ou antebraço e registre cada valor em uma data. Os dados ficam salvos neste aparelho.</p>
            </div>

            <form onSubmit={handleSaveCustomDefinition} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <label className="sr-only" htmlFor="custom-measure-name">Nome da nova medida</label>
              <input id="custom-measure-name" required maxLength={60} value={customMeasureName}
                onChange={event => setCustomMeasureName(event.target.value)} placeholder="Nome da medida (ex.: Pescoço)"
                className="min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70" />
              <label className="sr-only" htmlFor="custom-measure-unit">Unidade da nova medida</label>
              <input id="custom-measure-unit" required maxLength={10} value={customMeasureUnit}
                onChange={event => setCustomMeasureUnit(event.target.value)} placeholder="Unidade"
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70" />
              <button type="submit" className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15">
                Criar medida
              </button>
            </form>

            {customMeasurements.definitions.length > 0 && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:max-w-xs">
                <span>Data do registro personalizado</span>
                <input type="date" value={customMeasureDate} onChange={event => setCustomMeasureDate(event.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-foreground" />
              </label>
            )}

            {customMeasurements.definitions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Nenhuma medida personalizada criada.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {customMeasurements.definitions.map(definition => {
                  const key = `${definition.id}:${customMeasureDate}`;
                  const existing = customMeasurements.records.find(record => record.definitionId === definition.id && record.date === customMeasureDate);
                  const history = customMeasurements.records.filter(record => record.definitionId === definition.id).sort((a, b) => b.date.localeCompare(a.date));
                  return (
                    <article key={definition.id} className="space-y-3 rounded-xl border border-border/70 bg-card p-3">
                      <header className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-foreground">{definition.name}</h5>
                          <p className="text-[10px] text-muted-foreground">Unidade: {definition.unit}</p>
                        </div>
                        {history[0] && <span className="text-right text-[10px] text-muted-foreground">Último: {history[0].value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {definition.unit}<br />{history[0].date}</span>}
                      </header>
                      <form onSubmit={event => void handleSaveCustomValue(event, definition, key)} className="flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor={`custom-value-${key}`}>Valor de {definition.name} para {customMeasureDate}</label>
                        <input id={`custom-value-${key}`} required type="number" min="0.1" max="10000" step="any"
                          value={customMeasureValues[key] ?? (existing ? String(existing.value) : '')}
                          onChange={event => setCustomMeasureValues(current => ({ ...current, [key]: event.target.value }))}
                          placeholder={`Valor (${definition.unit})`}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70" />
                        <input aria-label={`Observação para ${definition.name}`} maxLength={200}
                          value={customMeasureNotes[key] ?? existing?.notes ?? ''}
                          onChange={event => setCustomMeasureNotes(current => ({ ...current, [key]: event.target.value }))}
                          placeholder="Nota opcional"
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70" />
                        <button type="submit" disabled={customMeasureSaving === key}
                          className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50">
                          {customMeasureSaving === key ? 'Salvando…' : existing ? 'Atualizar' : 'Salvar'}
                        </button>
                      </form>
                      {history.length > 1 && (
                        <details className="text-[10px] text-muted-foreground">
                          <summary className="cursor-pointer">Histórico ({history.length})</summary>
                          <ul className="mt-2 space-y-1">
                            {history.slice(0, 8).map(record => <li key={record.id}>{record.date}: {record.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {definition.unit}{record.notes ? ` · ${record.notes}` : ''}</li>)}
                          </ul>
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            {customMeasureMessage && <p role="status" className="text-xs text-emerald-300">{customMeasureMessage}</p>}
            {customMeasureError && <p role="alert" className="text-xs text-destructive">{customMeasureError}</p>}
          </section>
        </div>
      )}

      {activeTab === 'milestones' && (
        <ShapeMilestonesPanel
          measurements={measurements}
          onGet={onGetShapeMilestones}
          onSave={onSaveShapeMilestone}
          onDelete={onDeleteShapeMilestone}
        />
      )}

      {/* MODAL PARA ANEXAR FOTO (Permite colocar foto nos meses anteriores) */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-foreground">
                Anexar Foto do Físico
              </h3>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePhotoSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Data em que a foto foi tirada:</label>
                <input
                  type="date"
                  value={photoDate}
                  onChange={e => setPhotoDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  {photoDateWeight
                    ? `Peso registrado nesta data: ${photoDateWeight.weightKg.toFixed(1)} kg. Ele será salvo junto à foto.`
                    : 'Não há pesagem registrada nesta data; a foto será salva sem peso associado.'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Pose Padronizada:</label>
                <select
                  value={photoPose}
                  onChange={e => setPhotoPose(e.target.value as PhotoPose)}
                  className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="front_relaxed">Frente Relaxada</option>
                  <option value="front_flexed">Frente Contraída (Duplo Bíceps)</option>
                  <option value="back">Costas (Expansão de Dorsal)</option>
                  <option value="side_left">Perfil Esquerdo</option>
                  <option value="side_right">Perfil Direito</option>
                  <option value="custom">Outra Pose Personalizada</option>
                </select>
              </div>

              {photoPose === 'custom' && (
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground" htmlFor="custom-pose-name">Nome da pose:</label>
                  <input
                    id="custom-pose-name"
                    type="text"
                    maxLength={60}
                    value={customPoseName}
                    onChange={e => setCustomPoseName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Carregar Imagem do Computador:</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="w-full text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover"
                  required={!photoFile}
                />
                <span className="text-[10px] text-muted-foreground block mt-1">JPG, PNG ou WEBP • até 15 MB • arquivo salvo somente neste computador.</span>
              </div>

              {photoError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{photoError}</div>}

              {photoPreview && (
                <div className="h-32 rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center">
                  <img src={photoPreview} alt="Pré-visualização da foto" className="h-full object-contain" />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Observações / Condições da Foto:</label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Ex: Em jejum ao acordar, pós-treino, luz de teto, etc."
                  value={photoNotes}
                  onChange={e => setPhotoNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={photoLoading || !photoFile || (photoPose === 'custom' && !customPoseName.trim())}
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50"
                >
                  {photoLoading ? 'Salvando...' : 'Salvar Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewedPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setViewedPhotoId(null)}>
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">{poseLabel(viewedPhoto)}</h3>
                <p className="text-xs text-muted-foreground">Foto tirada em {viewedPhoto.date}</p>
              </div>
              <button type="button" onClick={() => setViewedPhotoId(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Fechar foto ampliada">✕</button>
            </div>
            <div className="my-4 flex max-h-[62vh] items-center justify-center rounded-2xl bg-black p-2">
              <img src={viewedPhoto.filePath} alt={poseLabel(viewedPhoto)} className="max-h-[60vh] max-w-full object-contain" />
            </div>
            <div className="space-y-2">
              <label htmlFor="photo-notes-edit" className="text-xs font-bold text-muted-foreground">Observações</label>
              <textarea
                id="photo-notes-edit"
                rows={3}
                maxLength={300}
                value={editedNotes}
                onChange={event => setEditedNotes(event.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="Adicione uma observação sobre esta foto"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button type="button" onClick={() => void handleDeletePhoto(viewedPhoto)} className="rounded-xl border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">
                  Excluir foto
                </button>
                <button type="button" onClick={() => void handleSavePhotoNotes()} disabled={savingNotes || editedNotes.length > 300} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                  {savingNotes ? 'Salvando...' : 'Salvar observações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MEDIDAS */}
      {isMeasurementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-foreground">
                Registrar Medidas ({selectedDayStr})
              </h3>
              <button onClick={() => setIsMeasurementModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeasurementSubmit} className="space-y-3 text-xs">
              <p className="text-[11px] text-muted-foreground">A altura fica registrada nesta data. Para alterar o valor atual usado no perfil, edite o campo em Perfil &amp; Metas.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Altura (cm):</label>
                  <input type="number" min="100" max="250" step="0.1" placeholder="Ex.: 175"
                    value={measHeight} onChange={event => setMeasHeight(event.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">Cintura (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 78"
                    value={measWaist}
                    onChange={e => setMeasWaist(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">Peitoral (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 102"
                    value={measChest}
                    onChange={e => setMeasChest(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">Ombros (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 118"
                    value={measShoulders}
                    onChange={e => setMeasShoulders(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Braço Relaxado (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 33"
                    value={measArmRelaxed}
                    onChange={e => setMeasArmRelaxed(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">Braço Contraído (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 37"
                    value={measArmFlexed}
                    onChange={e => setMeasArmFlexed(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Coxa (cm):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 58"
                    value={measThigh}
                    onChange={e => setMeasThigh(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">% Gordura (opcional):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 13.5"
                    value={measBodyFat}
                    onChange={e => setMeasBodyFat(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 p-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsMeasurementModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground"
                >
                  Salvar Medidas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
