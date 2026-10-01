import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L27 : le module backend `events` (flux SSE /api/events) a été supprimé en
 * L24 ; la page À propos ne doit plus le citer dans sa liste Backend.
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

  it('la page ne mentionne SSE nulle part', () => {
    expect(src).not.toMatch(/\bSSE\b|EventSource|api\/events/i);
  });
});
