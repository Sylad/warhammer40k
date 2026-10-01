import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L27 : le module backend `events` (flux SSE /api/events) a été supprimé en
 * L24 ; la page À propos ne doit plus le citer dans sa liste Backend.
 * La liste doit refléter exactement les dossiers de backend/src/modules.
 * Lecture du source (ce vitest ne démarre pas Angular).
 */
describe('page À propos — liste Backend sans le module events/SSE (L27)', () => {
  const frontend = resolve(__dirname, '../../../..');
  const src = readFileSync(resolve(frontend, 'src/app/features/about/about.component.ts'), 'utf8');
  const modulesLine = src.match(/'Modules NestJS : ([^']*)'/);

  it('le module events n’existe plus côté backend', () => {
    expect(existsSync(resolve(frontend, '../backend/src/modules/events'))).toBe(false);
  });

  it('la liste des modules NestJS ne cite plus events', () => {
    expect(modulesLine).not.toBeNull();
    const modules = modulesLine![1].split(',').map((m) => m.trim());
    expect(modules).not.toContain('events');
  });

  it('la liste des modules NestJS reflète exactement backend/src/modules', () => {
    const real = readdirSync(resolve(frontend, '../backend/src/modules'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const listed = modulesLine![1].split(',').map((m) => m.trim()).sort();
    expect(listed).toEqual(real);
  });

  it('la page ne mentionne SSE nulle part', () => {
    expect(src).not.toMatch(/\bSSE\b|EventSource|api\/events/i);
  });
});
