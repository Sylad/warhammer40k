import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L231 : la page À propos annonce la version d'Angular et de TypeScript du frontend ;
 * elle doit suivre ce qui est réellement installé (montée Angular 19 → 20).
 * Lecture du source (ce vitest ne démarre pas Angular).
 */
describe('page À propos — versions Angular et TypeScript (L231)', () => {
  const frontend = resolve(__dirname, '../../../..');
  const src = readFileSync(resolve(frontend, 'src/app/features/about/about.component.ts'), 'utf8');
  const installed = (pkg: string) =>
    JSON.parse(readFileSync(resolve(frontend, 'node_modules', pkg, 'package.json'), 'utf8')).version as string;
  const line = src.match(/'Angular (\d+) \+ TypeScript (\d+\.\d+)'/);

  it('la ligne Frontend cite la majeure d’Angular installée', () => {
    expect(line).not.toBeNull();
    expect(line![1]).toBe(installed('@angular/core').split('.')[0]);
  });

  it('la ligne Frontend cite la version majeure.mineure de TypeScript installée', () => {
    expect(line![2]).toBe(installed('typescript').split('.').slice(0, 2).join('.'));
  });
});
