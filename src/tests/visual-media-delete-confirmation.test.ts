import { describe, expect, it, vi } from 'vitest';
import { confirmVisualMediaDeletion } from '../domain/visual-media-delete-confirmation';

describe('confirmação de exclusão de mídia visual', () => {
  it('permite cancelar a exclusão sem continuar', () => {
    const cancel = vi.fn(() => false);

    expect(confirmVisualMediaDeletion('fundo.png', cancel)).toBe(false);
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining('referências deste arquivo no layout salvo'));
  });

  it('autoriza a exclusão somente quando a confirmação do usuário é positiva', () => {
    const accept = vi.fn(() => true);

    expect(confirmVisualMediaDeletion('camada.webp', accept)).toBe(true);
    expect(accept).toHaveBeenCalledOnce();
  });
});
