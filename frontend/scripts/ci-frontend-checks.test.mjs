// @vitest-environment node
// L30 — la CI doit rendre ROUGE le run d'un commit dont le plan publié est périmé
// (commit qui ne touche que .cadence, ex. `raf done`), dont un test Vitest échoue,
// ou dont l'application construite contient un texte privé du plan. Sans toucher
// aux images : deploy.sh ne lit que les runs de build.yml.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import e2eConfig from '../vitest.e2e.config.ts';
import { dureesMesurees, partager } from './e2e-parties.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const WORKFLOW = `${root}/.github/workflows/frontend-checks.yml`;

describe('workflow frontend-checks.yml', () => {
  const wf = parse(readFileSync(WORKFLOW, 'utf8'));
  const steps = Object.values(wf.jobs).flatMap((j) => j.steps ?? []);
  const commands = steps.map((s) => String(s.run ?? '')).join('\n');
  const jobDe = (step) => Object.values(wf.jobs).find((j) => (j.steps ?? []).includes(step));

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

  // L188 — « Chromium pour l'acceptation de bout en bout » se bloquait (timeout du job à 10 min).
  describe('Chromium (L188)', () => {
    const idx = (pred) => steps.findIndex(pred);
    const cache = steps.find((s) => String(s.uses ?? '').startsWith('actions/cache/restore@'));
    const installs = steps.filter((s) => /playwright-core install/.test(String(s.run ?? '')));

    it('R1 — ~/.cache/ms-playwright est mis en cache, clé sur la version de playwright-core, AVANT l’installation', () => {
      expect(cache).toBeDefined();
      expect(cache.with.path).toBe('~/.cache/ms-playwright');
      expect(cache.id).toBeTruthy();
      expect(cache.with.key).toMatch(/playwright-core/);
      expect(cache.with.key).toMatch(/steps\.[\w-]+\.outputs\.\w+|hashFiles\(/);
      const versionStep = steps.find((s) => /playwright-core/.test(String(s.run ?? '')) && /GITHUB_OUTPUT/.test(String(s.run ?? '')));
      expect(versionStep, 'la version vient de node_modules, pas d’une valeur écrite en dur').toBeDefined();
      expect(idx((s) => s === versionStep)).toBeLessThan(idx((s) => s === cache));
      expect(idx((s) => s === cache)).toBeLessThan(idx((s) => installs.includes(s)));
    });

    it('R2 — cache trouvé : seules les dépendances système sont installées (install-deps) ; sinon install --with-deps', () => {
      const hit = installs.find((s) => /install-deps/.test(s.run));
      const miss = installs.find((s) => /install --with-deps/.test(s.run));
      expect(hit).toBeDefined();
      expect(miss).toBeDefined();
      expect(hit.if).toContain(`steps.${cache.id}.outputs.cache-hit == 'true'`);
      expect(miss.if).toContain(`steps.${cache.id}.outputs.cache-hit != 'true'`);
    });

    it('R5 — le cache est enregistré juste après l’installation (actions/cache/save), pas en fin de job : un e2e rouge ne l’empêche pas', () => {
      expect(steps.some((s) => String(s.uses ?? '').startsWith('actions/cache@')), 'actions/cache@ n’enregistre qu’en fin de job réussi').toBe(false);
      const save = steps.find((s) => String(s.uses ?? '').startsWith('actions/cache/save@'));
      expect(save).toBeDefined();
      expect(save.with.path).toBe(cache.with.path);
      expect(save.with.key).toBe(cache.with.key);
      expect(save.if).toContain(`steps.${cache.id}.outputs.cache-hit != 'true'`);
      const miss = installs.find((s) => /install --with-deps/.test(s.run));
      const e2e = idx((s) => /test:e2e/.test(String(s.run ?? '')));
      expect(idx((s) => s === save)).toBeGreaterThan(idx((s) => s === miss));
      expect(idx((s) => s === save)).toBeLessThan(e2e);
    });

    it('R3 — chaque étape d’installation a son propre timeout, plus court que celui du job', () => {
      expect(installs.length).toBeGreaterThan(0);
      for (const s of installs) {
        expect(s['timeout-minutes']).toBeGreaterThan(0);
        expect(s['timeout-minutes']).toBeLessThan(jobDe(s)['timeout-minutes']);
      }
    });

    it('R4 — la durée de l’étape est écrite dans le journal (mesure avant/après)', () => {
      for (const s of installs) expect(String(s.run)).toMatch(/SECONDS|date \+%s/);
    });
  });

  // L245 — le job (10 min) était annulé pendant les e2e (~7 min observées, 428 s en local le 22-11).
  // L256 — e2e sortis dans un job matriciel ; le délai de leur étape se mesure sur la table des durées (bloc L256).
  describe('timeouts (L245)', () => {
    const step = (re) => steps.find((s) => re.test(String(s.run ?? '')));

    it('R2 — Vitest et le build ont chacun leur timeout (une étape trop longue échoue sur son nom)', () => {
      expect(step(/npx vitest run/)['timeout-minutes']).toBeGreaterThan(0);
      for (const s of steps.filter((s) => /npm run build/.test(String(s.run ?? '')))) expect(s['timeout-minutes']).toBeGreaterThan(0);
    });

    it('R3 — chaque job vaut au moins la somme des timeouts d’étape d’un même passage (installations de Chromium : l’une ou l’autre)', () => {
      for (const job of Object.values(wf.jobs)) {
        const js = job.steps ?? [];
        const installs = js.filter((s) => /playwright-core install/.test(String(s.run ?? '')));
        const autres = js.filter((s) => !installs.includes(s));
        const somme = autres.reduce((t, s) => t + (s['timeout-minutes'] ?? 0), 0) + Math.max(0, ...installs.map((s) => s['timeout-minutes']));
        expect(job['timeout-minutes']).toBeGreaterThanOrEqual(somme);
        for (const s of js) if (s['timeout-minutes'] !== undefined) expect(s['timeout-minutes']).toBeLessThan(job['timeout-minutes']);
      }
    });
  });

  // L256 — l'étape e2e a dépassé ses 12 min sur 05480b1 : les e2e sont partagés entre les jobs d'une matrice.
  describe('e2e en parties parallèles (L256)', () => {
    const e2e = steps.find((s) => /test:e2e/.test(String(s.run ?? '')));
    const job = jobDe(e2e);
    const parties = job.strategy?.matrix?.partie ?? [];

    it('R1 — un job matriciel par partie (1..n), sans fail-fast, chaque partie dit laquelle elle joue (E2E_PARTIE=k/n)', () => {
      expect(parties.length).toBeGreaterThanOrEqual(2);
      expect(parties).toEqual(parties.map((_, i) => i + 1));
      expect(job.strategy['fail-fast']).toBe(false);
      expect(e2e.env.E2E_PARTIE).toBe(`\${{ matrix.partie }}/${parties.length}`);
      expect(job.if).toBeUndefined();
    });

    it('R2 — le job e2e construit lui-même l’application avant les e2e (il ne dépend pas de l’autre job)', () => {
      const js = job.steps;
      const build = js.findIndex((s) => /npm run build/.test(String(s.run ?? '')));
      expect(js.findIndex((s) => /npm ci/.test(String(s.run ?? '')))).toBeLessThan(build);
      expect(build).toBeGreaterThan(-1);
      expect(build).toBeLessThan(js.indexOf(e2e));
      expect(job.needs).toBeUndefined();
    });

    it('R3 — chaque partie garde ses artefacts sous un nom à elle (sinon le second envoi échoue)', () => {
      const art = job.steps.find((s) => String(s.uses ?? '').startsWith('actions/upload-artifact@'));
      expect(art.if).toBe('always()');
      expect(art.with.name).toMatch(/\$\{\{ matrix\.partie \}\}/);
    });

    it('R4 — le timeout de l’étape e2e vaut au moins ×1,5 la partie la plus longue d’après les durées mesurées', () => {
      const plusLongue = Math.max(...partager(e2eConfig.test.include, parties.length, dureesMesurees(), fileURLToPath(new URL('..', import.meta.url))).map((p) => p.secondes));
      expect(e2e['timeout-minutes'] * 60).toBeGreaterThanOrEqual(plusLongue * 1.5);
    });
  });

  // L52 — la preuve de nginx.conf sur un vrai nginx n'était jouée qu'à la main.
  it('L52 — scripts/test-nginx-cache.sh est joué APRÈS le build (il sert dist) et à la racine du dépôt', () => {
    const at = steps.findIndex((s) => /scripts\/test-nginx-cache\.sh/.test(String(s.run ?? '')));
    const build = steps.findIndex((s) => /npm run build/.test(String(s.run ?? '')));
    expect(at, 'étape manquante').toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(build);
    expect(steps[at]['working-directory']).toBe('.');
    expect(steps[at]['continue-on-error']).toBeUndefined();
    expect(steps[at]['timeout-minutes']).toBeGreaterThan(0);
  });
});
