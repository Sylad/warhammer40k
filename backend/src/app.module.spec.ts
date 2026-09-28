import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { AppModule } from './app.module.js';

/**
 * L22 (2026-09-28, décision de Sylvain) : le suivi d'usage / solde Claude
 * (claude-shared.json, /api/claude/usage, /api/claude/balance) est retiré.
 * Aucun contrôleur ne doit plus être monté sous /api/claude.
 */
function controllerPaths(mod: unknown, seen = new Set<unknown>()): string[] {
  if (!mod || seen.has(mod)) return [];
  seen.add(mod);
  const target = (mod as { module?: unknown }).module ?? mod;
  const controllers: unknown[] = Reflect.getMetadata('controllers', target as object) ?? [];
  const imports: unknown[] = Reflect.getMetadata('imports', target as object) ?? [];
  const own = controllers.map((c) => String(Reflect.getMetadata(PATH_METADATA, c as object) ?? ''));
  return [...own, ...imports.flatMap((m) => controllerPaths(m, seen))];
}

describe('AppModule — suivi d’usage Claude retiré (L22)', () => {
  it('monte bien des contrôleurs (garde-fou du test lui-même)', () => {
    expect(controllerPaths(AppModule)).toContain('units');
  });

  it("ne monte plus aucun contrôleur sous /api/claude (usage, balance…)", () => {
    const paths = controllerPaths(AppModule).map((p) => p.replace(/^\/+/, ''));
    expect(paths.filter((p) => p === 'claude' || p.startsWith('claude/'))).toEqual([]);
  });
});
