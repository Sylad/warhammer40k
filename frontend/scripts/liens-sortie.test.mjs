// L252 — `npm run liens:externes` (et `liens:crawl`) plantaient dans un worktree : la sortie par
// défaut `../../../tmp` visait le dossier PARENT du dépôt, absent hors de la copie principale, et
// l'écriture échouait (ENOENT) après tout le parcours réseau. La sortie par défaut est maintenant
// dans le dépôt (`tmp/`, ignoré par git) et le dossier de la sortie est créé au besoin.
import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { FRONTEND, RAPPORTS, ROOT, ecrireRapport, sortieParDefaut } from './liens-lib.mjs';

const TMP = mkdtempSync(join(tmpdir(), 'wh-liens-sortie-'));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

describe('sortie des rapports de liens (L252)', () => {
  it('la sortie par défaut est dans le dépôt, dans un dossier ignoré par git', () => {
    const out = sortieParDefaut('wh-liens-externes.json');
    expect(relative(ROOT, out)).toBe(join('tmp', 'wh-liens-externes.json'));
    // `git check-ignore` rend 0 si le chemin est ignoré (1 sinon : execFileSync lève).
    expect(() => execFileSync('git', ['check-ignore', '-q', out], { cwd: ROOT })).not.toThrow();
  });

  it('écrit le rapport même si son dossier n\'existe pas encore', () => {
    const out = join(TMP, 'absent', 'encore', 'rapport.json');
    expect(existsSync(join(TMP, 'absent'))).toBe(false);
    ecrireRapport(out, { ok: 1 });
    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual({ ok: 1 });
    ecrireRapport(out, { ok: 2 }); // dossier déjà là : pas d'erreur, rapport remplacé
    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual({ ok: 2 });
  });

  it('les deux scripts passent par la sortie par défaut et par ecrireRapport, plus aucun chemin hors du dépôt', () => {
    for (const f of ['liens-externes.mjs', 'liens-crawl.mjs']) {
      const src = readFileSync(join(FRONTEND, 'scripts', f), 'utf8');
      expect(src, f).not.toMatch(/\.\.\/\.\.\/\.\.\//);
      expect(src, f).toMatch(/sortieParDefaut\('wh-liens-[a-z]+\.json'\)/);
      expect(src, f).toMatch(/ecrireRapport\(OUT,/);
      expect(src, f).not.toMatch(/writeFileSync\(/);
    }
    expect(RAPPORTS.startsWith(ROOT)).toBe(true);
  });
});
