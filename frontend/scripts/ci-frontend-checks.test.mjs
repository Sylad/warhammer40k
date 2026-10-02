// @vitest-environment node
// L30 — la CI doit rendre ROUGE le run d'un commit dont le plan publié est périmé
// (commit qui ne touche que docs/plan, ex. `raf done`), dont un test Vitest échoue,
// ou dont l'application construite contient un texte privé du plan. Sans toucher
// aux images : deploy.sh ne lit que les runs de build.yml.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../..', import.meta.url));
const WORKFLOW = `${root}/.github/workflows/frontend-checks.yml`;

describe('workflow frontend-checks.yml', () => {
  const wf = parse(readFileSync(WORKFLOW, 'utf8'));
  const steps = Object.values(wf.jobs).flatMap((j) => j.steps ?? []);
  const commands = steps.map((s) => String(s.run ?? '')).join('\n');

  it('tourne à CHAQUE push sur main, sans filtre de chemins (un commit de plan seul compte)', () => {
    expect(wf.on.push.branches).toEqual(['main']);
    expect(wf.on.push.paths).toBeUndefined();
    expect(wf.on.push['paths-ignore']).toBeUndefined();
  });

  it('vérifie que plan.json est à jour, PUIS lance les tests Vitest, PUIS le build (qui contrôle les fuites)', () => {
    const at = (re) => steps.findIndex((s) => re.test(String(s.run ?? '')));
    const check = at(/node scripts\/plan-data\.mjs --check/);
    const tests = at(/npx vitest run|npm test/);
    const build = at(/npm run build/);
    expect(check).toBeGreaterThan(-1);
    expect(tests).toBeGreaterThan(check);
    expect(build).toBeGreaterThan(tests);
    for (const s of steps) expect(s['continue-on-error']).toBeUndefined();
    for (const j of Object.values(wf.jobs)) {
      expect(j['continue-on-error']).toBeUndefined();
      expect(j.if).toBeUndefined();
    }
    expect(commands).toMatch(/npm ci/);
  });

  it('ne conditionne pas les images : build.yml n’en dépend pas, deploy.sh ne le lit pas', () => {
    const build = readFileSync(`${root}/.github/workflows/build.yml`, 'utf8');
    expect(build).not.toMatch(/frontend-checks|workflow_run/);
    const deploy = readFileSync(`${root}/scripts/deploy.sh`, 'utf8');
    expect(deploy).not.toMatch(/frontend-checks/);
    expect(deploy).toMatch(/--workflow build\.yml/);
  });

  it('npm run build se termine par la vérification de fuite du plan sur l’application construite', () => {
    const pkg = JSON.parse(readFileSync(`${root}/frontend/package.json`, 'utf8'));
    expect(pkg.scripts.build).toMatch(/plan-data\.mjs --leaks dist\/frontend\/browser$/);
    expect(pkg.scripts.plan).toBe('node scripts/plan-data.mjs');
  });
});
