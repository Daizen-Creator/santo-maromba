import React, { useEffect, useMemo, useRef, useState } from 'react';
import { confirmVisualMediaDeletion } from '../../domain/visual-media-delete-confirmation';
import { Check, Download, ImagePlus, Layers, Palette, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  CustomizationMediaInput,
  CustomizationMediaRecord,
  VisualCustomization
} from '../../shared/types';
import { colorToHex, DEFAULT_VISUAL_CUSTOMIZATION, VISUAL_PALETTES } from '../../domain/visual-customization';

interface VisualCustomizationViewProps {
  config: VisualCustomization;
  media: CustomizationMediaRecord[];
  onPreview: (config: VisualCustomization) => void;
  onSave: (config: VisualCustomization) => Promise<VisualCustomization>;
  onAddMedia: (input: CustomizationMediaInput) => Promise<CustomizationMediaRecord>;
  onDeleteMedia: (id: string) => Promise<void>;
}

const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4'];

const readFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Não foi possível ler este arquivo.'));
  reader.onload = () => {
    const content = String(reader.result || '');
    const base64 = content.split(',')[1];
    if (!base64) reject(new Error('O arquivo selecionado está vazio.'));
    else resolve(base64);
  };
  reader.readAsDataURL(file);
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const VisualCustomizationView: React.FC<VisualCustomizationViewProps> = ({
  config,
  media,
  onPreview,
  onSave,
  onAddMedia,
  onDeleteMedia
}) => {
  const [draft, setDraft] = useState(config);
  const [uploadKind, setUploadKind] = useState<'background' | 'canvas'>('canvas');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ layerId: string; mode: 'move' | 'resize'; x: number; y: number; width: number; height: number; clientX: number; clientY: number } | null>(null);

  useEffect(() => setDraft(config), [config]);

  const updateDraft = (next: VisualCustomization) => {
    setDraft(next);
    onPreview(next);
    setNotice(null);
  };
  const updateTheme = (key: keyof VisualCustomization['theme'], value: string | boolean | number) => {
    updateDraft({ ...draft, theme: { ...draft.theme, [key]: value } });
  };
  const mediaById = useMemo(() => new Map(media.map(item => [item.id, item])), [media]);
  const selectedLayer = draft.canvasImages.find(layer => layer.id === selectedLayerId) || null;
  const backgroundMedia = draft.background.mediaId ? mediaById.get(draft.background.mediaId) : undefined;

  const upload = async (file?: File) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    const extensionMime: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp4: 'video/mp4' };
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = (file.type || extensionMime[extension]) as CustomizationMediaInput['mimeType'] | undefined;
    if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
      setError('Use uma imagem PNG/JPG/GIF ou vídeo MP4.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('O arquivo deve ter até 25 MB.');
      return;
    }
    try {
      const record = await onAddMedia({ fileName: file.name, mimeType, kind: uploadKind, dataBase64: await readFile(file) });
      if (uploadKind === 'background') {
        updateDraft({ ...draft, background: { ...draft.background, mediaId: record.id } });
      } else {
        const id = `layer-${crypto.randomUUID()}`;
        const newLayer = { id, mediaId: record.id, xPct: 8, yPct: 8, widthPct: 30, heightPct: 36, zIndex: Math.max(1, ...draft.canvasImages.map(layer => layer.zIndex + 1)) };
        updateDraft({ ...draft, canvasImages: [...draft.canvasImages, newLayer] });
        setSelectedLayerId(id);
      }
      setNotice('Arquivo armazenado localmente no aplicativo.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a mídia.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await onSave(draft);
      setDraft(saved);
      onPreview(saved);
      setNotice('Tema e layout salvos no SQLite.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar suas alterações.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    updateDraft(structuredClone(DEFAULT_VISUAL_CUSTOMIZATION));
    setSelectedLayerId(null);
    setSaving(true);
    setError(null);
    try {
      const saved = await onSave(DEFAULT_VISUAL_CUSTOMIZATION);
      setDraft(saved);
      onPreview(saved);
      setNotice('A aparência padrão foi restaurada. Seus arquivos locais continuam disponíveis.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível restaurar o padrão.');
    } finally {
      setSaving(false);
    }
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'santo-maromba-personalizacao.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Configuração exportada. Os arquivos de mídia permanecem na pasta local do aplicativo.');
  };

  const removeLayer = (id: string) => {
    updateDraft({ ...draft, canvasImages: draft.canvasImages.filter(layer => layer.id !== id) });
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const deleteMedia = async (id: string) => {
    const mediaFile = media.find(item => item.id === id);
    if (!mediaFile || !confirmVisualMediaDeletion(mediaFile.fileName)) return;
    setError(null);
    setNotice(null);
    try {
      const next: VisualCustomization = {
        ...draft,
        background: draft.background.mediaId === id ? { ...draft.background, mediaId: null } : draft.background,
        canvasImages: draft.canvasImages.filter(layer => layer.mediaId !== id)
      };
      const saved = await onSave(next);
      setDraft(saved);
      onPreview(saved);
      await onDeleteMedia(id);
      if (selectedLayerId && !saved.canvasImages.some(layer => layer.id === selectedLayerId)) setSelectedLayerId(null);
      setNotice('Arquivo local excluído e referências removidas do layout.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o arquivo.');
    }
  };

  const handleLayerPointerDown = (event: React.PointerEvent, layerId: string, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.stopPropagation();
    const layer = draft.canvasImages.find(item => item.id === layerId);
    if (!layer) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedLayerId(layerId);
    pointerRef.current = {
      layerId, mode, x: layer.xPct, y: layer.yPct,
      width: layer.widthPct, height: layer.heightPct,
      clientX: event.clientX, clientY: event.clientY
    };
  };

  const handleLayerPointerMove = (event: React.PointerEvent) => {
    const drag = pointerRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - drag.clientX) / rect.width * 100;
    const dy = (event.clientY - drag.clientY) / rect.height * 100;
    const canvasImages = draft.canvasImages.map(layer => {
      if (layer.id !== drag.layerId) return layer;
      if (drag.mode === 'resize') {
        return { ...layer, widthPct: clamp(drag.width + dx, 2, 100 - drag.x), heightPct: clamp(drag.height + dy, 2, 100 - drag.y) };
      }
      return { ...layer, xPct: clamp(drag.x + dx, 0, 100 - layer.widthPct), yPct: clamp(drag.y + dy, 0, 100 - layer.heightPct) };
    });
    const next = { ...draft, canvasImages };
    setDraft(next);
    onPreview(next);
  };

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    void upload(event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Palette className="h-5 w-5" /></div>
            <h2 className="font-display text-xl font-bold text-foreground">Personalização visual</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ajuste cores, fundos e camadas com prévia ao vivo. As preferências são locais e podem ser redefinidas ou exportadas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportConfig} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"><Download className="h-4 w-4" /> Exportar</button>
            <button onClick={() => void reset()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"><RotateCcw className="h-4 w-4" /> Restaurar</button>
            <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"><Check className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar aparência'}</button>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-primary/25 bg-primary/5 p-3 text-sm text-primary">{notice}</div>}

      <div className="grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold text-foreground">Paletas</h3></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VISUAL_PALETTES.map(palette => (
                <button key={palette.id} onClick={() => updateDraft({ ...draft, theme: { ...palette.theme } })} className="rounded-xl border border-border bg-secondary/30 p-3 text-left text-xs font-semibold text-foreground transition hover:border-primary/50">
                  <span className="mb-2 flex gap-1">{[palette.theme.backgroundColor, palette.theme.buttonColor, palette.theme.barColor].map(color => <i key={color} className="h-4 w-4 rounded-full border border-white/15" style={{ background: color }} />)}</span>{palette.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-bold text-foreground">Cores por elemento</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Fundo" value={draft.theme.backgroundColor} onChange={value => updateTheme('backgroundColor', value)} />
              <ColorField label="Texto" value={draft.theme.textColor} onChange={value => updateTheme('textColor', value)} />
              <ColorField label="Cards" value={draft.theme.cardColor} onChange={value => updateTheme('cardColor', value)} />
              <ColorField label="Bordas" value={draft.theme.borderColor} onChange={value => updateTheme('borderColor', value)} />
              <ColorField label="Botões e destaque" value={draft.theme.buttonColor} onChange={value => updateTheme('buttonColor', value)} />
              <ColorField label="Barras e gráficos" value={draft.theme.barColor} onChange={value => updateTheme('barColor', value)} />
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">Aceita HEX, RGB e HSL. O seletor nativo oferece ajuste por amostra.</p>
            <div className="mt-5 rounded-2xl border border-border bg-secondary/25 p-4">
              <label className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
                <span>Fundo em gradiente</span><input type="checkbox" checked={draft.theme.gradientEnabled} onChange={event => updateTheme('gradientEnabled', event.target.checked)} className="accent-primary" />
              </label>
              {draft.theme.gradientEnabled && <div className="mt-3 grid grid-cols-2 gap-3">
                <ColorField label="Início" value={draft.theme.gradientStart} onChange={value => updateTheme('gradientStart', value)} />
                <ColorField label="Fim" value={draft.theme.gradientEnd} onChange={value => updateTheme('gradientEnd', value)} />
                <label className="col-span-2 text-[11px] text-muted-foreground">Ângulo · {draft.theme.gradientAngle}°<input type="range" min="0" max="360" value={draft.theme.gradientAngle} onChange={event => updateTheme('gradientAngle', Number(event.target.value))} className="mt-2 w-full accent-primary" /></label>
              </div>}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold text-foreground">Imagens e fundos locais</h3></div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button onClick={() => setUploadKind('background')} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${uploadKind === 'background' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>Fundo do editor</button>
              <button onClick={() => setUploadKind('canvas')} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${uploadKind === 'canvas' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>Camada arrastável</button>
            </div>
            <label
              onDragOver={event => event.preventDefault()}
              onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 px-5 py-7 text-center transition hover:border-primary/50 hover:bg-primary/5"
            >
              <ImagePlus className="mb-2 h-5 w-5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Solte um arquivo ou clique para escolher</span>
              <span className="mt-1 text-[10px] text-muted-foreground">PNG · JPG · GIF · MP4, até 25 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/gif,video/mp4" onChange={selectFile} className="sr-only" />
            </label>
            {backgroundMedia && <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">{backgroundMedia.fileName}</p><p className="text-[10px] text-muted-foreground">Fundo · {backgroundMedia.mimeType}</p></div>
              <button onClick={() => updateDraft({ ...draft, background: { ...draft.background, mediaId: null } })} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive" title="Remover fundo"><Trash2 className="h-4 w-4" /></button>
            </div>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[11px] text-muted-foreground">Ajuste do fundo<select value={draft.background.fit} onChange={event => updateDraft({ ...draft, background: { ...draft.background, fit: event.target.value as 'cover' | 'contain' } })} className="mt-1 w-full rounded-lg border border-border bg-secondary px-2 py-2 text-xs text-foreground"><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
              <label className="text-[11px] text-muted-foreground">Opacidade · {Math.round(draft.background.opacity * 100)}%<input type="range" min="0" max="100" value={Math.round(draft.background.opacity * 100)} onChange={event => updateDraft({ ...draft, background: { ...draft.background, opacity: Number(event.target.value) / 100 } })} className="mt-3 w-full accent-primary" /></label>
            </div>
            <div className="mt-4 space-y-2">
              {media.map(item => <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-secondary/15 px-3 py-2">
                <span className="min-w-0 truncate text-[11px] text-muted-foreground">{item.fileName}</span>
                <div className="flex shrink-0 gap-1">
                  {item.kind === 'background' && <button onClick={() => updateDraft({ ...draft, background: { ...draft.background, mediaId: item.id } })} className="rounded-md px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10">Usar fundo</button>}
                  {item.kind === 'canvas' && !draft.canvasImages.some(layer => layer.mediaId === item.id) && <button onClick={() => {
                    const id = `layer-${crypto.randomUUID()}`;
                    updateDraft({ ...draft, canvasImages: [...draft.canvasImages, { id, mediaId: item.id, xPct: 8, yPct: 8, widthPct: 30, heightPct: 36, zIndex: Math.max(1, ...draft.canvasImages.map(layer => layer.zIndex + 1)) }] });
                    setSelectedLayerId(id);
                  }} className="rounded-md px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10">Adicionar</button>}
                  <button onClick={() => void deleteMedia(item.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Excluir arquivo"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>)}
              {media.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhuma mídia importada ainda.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-foreground">Prévia do layout</h3><p className="mt-1 text-[11px] text-muted-foreground">Arraste camadas para posicionar. Selecione uma camada para ajustar tamanho e profundidade.</p></div>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary"><Layers className="h-3 w-3" /> {draft.canvasImages.length} camada(s)</span>
            </div>
            <div
              ref={canvasRef}
              className="relative isolate aspect-video w-full touch-none overflow-hidden rounded-2xl border border-border"
              style={{ backgroundColor: draft.theme.backgroundColor, backgroundImage: draft.theme.gradientEnabled ? `linear-gradient(${draft.theme.gradientAngle}deg, ${draft.theme.gradientStart}, ${draft.theme.gradientEnd})` : undefined }}
            >
              {backgroundMedia && (backgroundMedia.mimeType === 'video/mp4' ? (
                <video src={backgroundMedia.mediaUrl} autoPlay muted loop playsInline className="pointer-events-none absolute inset-0 h-full w-full" style={{ objectFit: draft.background.fit, opacity: draft.background.opacity }} />
              ) : (
                <img src={backgroundMedia.mediaUrl} alt="Fundo personalizado" className="pointer-events-none absolute inset-0 h-full w-full" style={{ objectFit: draft.background.fit, opacity: draft.background.opacity }} />
              ))}
              {!backgroundMedia && <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 78% 14%, ${draft.theme.buttonColor}, transparent 48%)` }} />}
              <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-lg border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">Santo Maromba</p>
                <p className="mt-0.5 text-sm font-bold" style={{ color: draft.theme.textColor }}>Minha composição</p>
              </div>
              {draft.canvasImages.map(layer => {
                const item = mediaById.get(layer.mediaId);
                if (!item) return null;
                return <div
                  key={layer.id}
                  onPointerDown={event => handleLayerPointerDown(event, layer.id, 'move')}
                  onPointerMove={handleLayerPointerMove}
                  onPointerUp={() => { pointerRef.current = null; }}
                  onPointerCancel={() => { pointerRef.current = null; }}
                  className={`absolute select-none overflow-hidden rounded-xl border-2 shadow-xl ${selectedLayerId === layer.id ? 'border-primary ring-2 ring-primary/35' : 'border-white/35'}`}
                  style={{ left: `${layer.xPct}%`, top: `${layer.yPct}%`, width: `${layer.widthPct}%`, height: `${layer.heightPct}%`, zIndex: layer.zIndex, touchAction: 'none', cursor: 'move' }}
                >
                  {item.mimeType === 'video/mp4' ? <video src={item.mediaUrl} autoPlay loop muted playsInline draggable={false} className="pointer-events-none h-full w-full object-cover" /> : <img src={item.mediaUrl} alt={item.fileName} draggable={false} className="pointer-events-none h-full w-full object-cover" />}
                  <button aria-label="Redimensionar camada" onPointerDown={event => handleLayerPointerDown(event, layer.id, 'resize')} onPointerMove={handleLayerPointerMove} onPointerUp={() => { pointerRef.current = null; }} className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm border border-white/80 bg-primary shadow" />
                </div>;
              })}
              {draft.canvasImages.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/65"><ImagePlus className="mr-2 h-4 w-4" /> Importe uma imagem como camada para posicioná-la aqui.</div>}
            </div>
          </section>

          {selectedLayer && <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-foreground">Camada selecionada</h3><p className="mt-1 text-[10px] text-muted-foreground">Arraste diretamente na prévia; ajuste escala e ordem abaixo.</p></div><button onClick={() => removeLayer(selectedLayer.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Remover da composição"><Trash2 className="h-4 w-4" /></button></div>
            <div className="space-y-4">
              <RangeField label="Largura" value={selectedLayer.widthPct} min={2} max={100 - selectedLayer.xPct} onChange={value => updateDraft({ ...draft, canvasImages: draft.canvasImages.map(layer => layer.id === selectedLayer.id ? { ...layer, widthPct: value } : layer) })} />
              <RangeField label="Altura" value={selectedLayer.heightPct} min={2} max={100 - selectedLayer.yPct} onChange={value => updateDraft({ ...draft, canvasImages: draft.canvasImages.map(layer => layer.id === selectedLayer.id ? { ...layer, heightPct: value } : layer) })} />
              <RangeField label="Profundidade da camada" value={selectedLayer.zIndex} min={1} max={999} onChange={value => updateDraft({ ...draft, canvasImages: draft.canvasImages.map(layer => layer.id === selectedLayer.id ? { ...layer, zIndex: value } : layer) })} />
            </div>
          </section>}

          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 text-[11px] leading-relaxed text-muted-foreground">
            Os fundos e camadas são guardados apenas no computador. Para exportar a configuração, use o botão Exportar; imagens e vídeos permanecem no diretório local do aplicativo.
          </div>
        </div>
      </div>
    </div>
  );
};

const ColorField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <label className="block text-[11px] font-medium text-muted-foreground">
    {label}
    <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
      <input type="color" aria-label={`${label} seletor de cor`} value={colorToHex(value) || '#000000'} onChange={event => onChange(event.target.value)} className="h-7 w-9 cursor-pointer rounded-md border-0 bg-transparent p-0" />
      <input type="text" aria-label={`${label} valor de cor`} value={value} onChange={event => onChange(event.target.value)} placeholder="#57a77b ou hsl(...)" className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none" />
    </span>
  </label>
);

const RangeField: React.FC<{ label: string; value: number; min: number; max: number; onChange: (value: number) => void }> = ({ label, value, min, max, onChange }) => (
  <label className="block text-[11px] text-muted-foreground">{label} · {value}
    <input type="range" min={min} max={Math.max(min, max)} value={value} onChange={event => onChange(Number(event.target.value))} className="mt-2 w-full accent-primary" />
  </label>
);
