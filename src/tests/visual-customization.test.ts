import { describe, expect, it } from 'vitest';
import { colorToHex, colorToHslTriplet, parseColorToRgb, DEFAULT_VISUAL_CUSTOMIZATION } from '../domain/visual-customization';
import { VisualCustomizationSchema } from '../shared/schema';

describe('Editor de cores e temas', () => {
  it('converte HEX, RGB e HSL para o mesmo preview e preserva contraste por token', () => {
    expect(parseColorToRgb('#57a77b')).toEqual([87, 167, 123]);
    expect(parseColorToRgb('rgb(87, 167, 123)')).toEqual([87, 167, 123]);
    expect(colorToHex('hsl(145, 32%, 50%)')).toBe('#57a879');
    expect(colorToHslTriplet('#57a77b')).toMatch(/^\d+(?:\.\d+)? \d+% \d+%$/);
  });

  it('aceita valores visuais livres compatíveis e rejeita CSS que possa injetar URL', () => {
    const config = {
      ...DEFAULT_VISUAL_CUSTOMIZATION,
      theme: { ...DEFAULT_VISUAL_CUSTOMIZATION.theme, textColor: 'rgb(230 230 235)', buttonColor: 'hsl(145 42% 52%)' }
    };
    expect(VisualCustomizationSchema.parse(config)).toEqual(config);
    expect(() => VisualCustomizationSchema.parse({
      ...config,
      theme: { ...config.theme, cardColor: 'url(https://example.com/image)' }
    })).toThrow();
  });
});
