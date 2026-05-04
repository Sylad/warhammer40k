import { describe, it, expect } from 'vitest';
import { ImportVideoBodySchema } from './videos.schemas.js';

describe('ImportVideoBodySchema', () => {
  it('accepts a minimal valid body', () => {
    const r = ImportVideoBodySchema.parse({ url: 'https://youtu.be/abc' });
    expect(r.url).toBe('https://youtu.be/abc');
  });

  it('rejects empty url', () => {
    expect(() => ImportVideoBodySchema.parse({ url: '' })).toThrow(/url required/i);
  });

  it('rejects missing url', () => {
    expect(() => ImportVideoBodySchema.parse({})).toThrow();
  });

  it('rejects unknown video type enum', () => {
    expect(() => ImportVideoBodySchema.parse({ url: 'x', type: 'Documentaire' })).toThrow();
  });

  it('accepts valid video type enum', () => {
    const r = ImportVideoBodySchema.parse({ url: 'x', type: 'Animation fan' });
    expect(r.type).toBe('Animation fan');
  });

  it('rejects unknown category enum', () => {
    expect(() => ImportVideoBodySchema.parse({ url: 'x', category: 'lifestyle' })).toThrow();
  });

  it('accepts optional channel block with language enum', () => {
    const r = ImportVideoBodySchema.parse({
      url: 'x',
      channel: { name: 'Adeptus Lore', language: 'EN' },
    });
    expect(r.channel?.language).toBe('EN');
  });

  it('rejects channel.language outside FR/EN', () => {
    expect(() =>
      ImportVideoBodySchema.parse({ url: 'x', channel: { language: 'IT' } }),
    ).toThrow();
  });
});
