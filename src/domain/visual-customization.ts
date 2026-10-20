import { VisualCustomization } from '../shared/types';

export const DEFAULT_VISUAL_CUSTOMIZATION: VisualCustomization = {
  version: 1,
  theme: {
    backgroundColor: '#090b10',
    textColor: '#e4e4e7',
    cardColor: '#181a20',
    borderColor: '#2b2e36',
    buttonColor: '#57a77b',
    barColor: '#8fc6a4',
    gradientStart: '#101a17',
    gradientEnd: '#090b10',
    gradientEnabled: false,
    gradientAngle: 135
  },
  background: { mediaId: null, fit: 'cover', opacity: 0.32 },
  canvasImages: []
};

export const VISUAL_PALETTES: Array<{ id: string; label: string; theme: VisualCustomization['theme'] }> = [
  { id: 'graphite', label: 'Grafite', theme: DEFAULT_VISUAL_CUSTOMIZATION.theme },
  { id: 'forest', label: 'Floresta', theme: { ...DEFAULT_VISUAL_CUSTOMIZATION.theme, backgroundColor: '#07120e', cardColor: '#102019', borderColor: '#244333', buttonColor: '#59b884', barColor: '#a6e0be', gradientStart: '#163e2b', gradientEnd: '#07120e', gradientEnabled: true } },
  { id: 'ocean', label: 'Oceano', theme: { ...DEFAULT_VISUAL_CUSTOMIZATION.theme, backgroundColor: '#08111b', cardColor: '#111e2b', borderColor: '#263b50', buttonColor: '#62a9cf', barColor: '#9bd1ea', gradientStart: '#16354a', gradientEnd: '#08111b', gradientEnabled: true } },
  { id: 'sand', label: 'Areia', theme: { ...DEFAULT_VISUAL_CUSTOMIZATION.theme, backgroundColor: '#17130e', textColor: '#f3e8d5', cardColor: '#242018', borderColor: '#403727', buttonColor: '#c89552', barColor: '#e5bd83', gradientStart: '#493522', gradientEnd: '#17130e', gradientEnabled: true } },
  { id: 'mono', label: 'Monocromático', theme: { ...DEFAULT_VISUAL_CUSTOMIZATION.theme, backgroundColor: '#0b0b0d', cardColor: '#1a1a1d', borderColor: '#343438', buttonColor: '#b4b4bc', barColor: '#e4e4e7', gradientStart: '#29292f', gradientEnd: '#0b0b0d', gradientEnabled: true } }
];

export type RGB = [number, number, number];

export function parseColorToRgb(color: string): RGB | null {
  const value = color.trim();
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const normalized = hex[1].length === 3 ? [...hex[1]].map(char => char + char).join('') : hex[1];
    return [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16)) as RGB;
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].trim().split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    if (parts.length !== 3) return null;
    const channels = parts.map(part => {
      const numeric = Number.parseFloat(part);
      return part.endsWith('%') ? Math.round(numeric * 2.55) : Math.round(numeric);
    });
    if (channels.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 255)) return null;
    return channels as RGB;
  }

  const hsl = value.match(/^hsla?\(([^)]+)\)$/i);
  if (hsl) {
    const parts = hsl[1].trim().split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    if (parts.length !== 3 || !parts[1].endsWith('%') || !parts[2].endsWith('%')) return null;
    const hue = ((Number.parseFloat(parts[0]) % 360) + 360) % 360 / 360;
    const saturation = Number.parseFloat(parts[1]) / 100;
    const lightness = Number.parseFloat(parts[2]) / 100;
    if (![hue, saturation, lightness].every(Number.isFinite) || saturation < 0 || saturation > 1 || lightness < 0 || lightness > 1) return null;
    if (saturation === 0) {
      const channel = Math.round(lightness * 255);
      return [channel, channel, channel];
    }
    const hueToRgb = (p: number, q: number, tInput: number): number => {
      let t = tInput;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    return [hueToRgb(p, q, hue + 1 / 3), hueToRgb(p, q, hue), hueToRgb(p, q, hue - 1 / 3)].map(value => Math.round(value * 255)) as RGB;
  }
  return null;
}

export function colorToHex(color: string): string | null {
  const rgb = parseColorToRgb(color);
  return rgb ? '#' + rgb.map(channel => channel.toString(16).padStart(2, '0')).join('') : null;
}

export function colorToHslTriplet(color: string): string | null {
  const rgb = parseColorToRgb(color);
  if (!rgb) return null;
  const [r8, g8, b8] = rgb;
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return `${hue.toFixed(1)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function applyVisualTheme(customization: VisualCustomization): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { theme } = customization;
  const properties: Array<[string, string]> = [
    ['--background', theme.backgroundColor], ['--foreground', theme.textColor],
    ['--card', theme.cardColor], ['--card-foreground', theme.textColor],
    ['--popover', theme.cardColor], ['--popover-foreground', theme.textColor],
    ['--border', theme.borderColor], ['--input', theme.borderColor],
    ['--primary', theme.buttonColor], ['--ring', theme.buttonColor],
    ['--primary-hover', theme.buttonColor], ['--accent', theme.buttonColor],
    ['--chart-1', theme.barColor], ['--success', theme.barColor]
  ];
  for (const [property, value] of properties) {
    const hsl = colorToHslTriplet(value);
    if (hsl) root.style.setProperty(property, hsl);
  }
  const foreground = colorToHslTriplet(theme.backgroundColor);
  const background = colorToHslTriplet(theme.textColor);
  if (foreground) root.style.setProperty('--primary-foreground', foreground);
  if (background) root.style.setProperty('--secondary-foreground', background);
  root.style.setProperty('--secondary', colorToHslTriplet(theme.cardColor) || '220 5% 12%');
  root.style.setProperty('--muted', colorToHslTriplet(theme.cardColor) || '220 5% 12%');
  root.style.setProperty('--muted-foreground', colorToHslTriplet(theme.textColor) || '220 7% 61%');
}
