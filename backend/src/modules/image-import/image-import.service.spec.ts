import { afterEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayException } from '@nestjs/common';
import { ImageImportService } from './image-import.service.js';

// L145 : un refus de Reddit (403 depuis le cluster) ne doit plus ressembler à « aucun post avec image ».
describe('ImageImportService.searchReddit — erreurs (L145)', () => {
  const service = () => new ImageImportService({} as never);
  afterEach(() => vi.unstubAllGlobals());

  it('Reddit répond 403 → 502 qui nomme le refus et le code HTTP, pas une liste vide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const err = await service().searchReddit('Warhammer40k').catch(e => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(err.message).toContain('403');
    expect(err.message).toMatch(/Reddit/);
  });

  it('Reddit injoignable (réseau, délai) → 502, pas une liste vide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(service().searchReddit('Warhammer40k')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('Reddit répond sans post avec image → liste vide (ce n\'est pas une erreur)', async () => {
    const json = async () => ({ data: { children: [{ data: { id: 'a', url: 'https://example.com/page' } }] } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json }));
    await expect(service().searchReddit('Warhammer40k')).resolves.toEqual([]);
  });
});
