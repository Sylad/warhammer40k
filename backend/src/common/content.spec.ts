import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { contentPath, readContent, userDataPath } from './content.js';

/**
 * L74 : le contenu éditorial se lit dans `seed/` (embarqué dans l'image), jamais dans le
 * volume `data/` — qui ne garde que ce qu'écrivent les utilisateurs.
 */
describe('content (L74)', () => {
  const cwd = process.cwd();
  const dossiers: string[] = [];
  afterEach(() => {
    process.chdir(cwd);
    delete process.env['CONTENT_DIR'];
    for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  function projet(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-content-'));
    dossiers.push(dir);
    fs.mkdirSync(path.join(dir, 'seed'));
    fs.mkdirSync(path.join(dir, 'data'));
    process.chdir(dir);
    return dir;
  }

  it('lit le contenu dans seed/, pas dans data/', () => {
    const dir = projet();
    fs.writeFileSync(path.join(dir, 'seed', 'x.json'), JSON.stringify(['seed']));
    fs.writeFileSync(path.join(dir, 'data', 'x.json'), JSON.stringify(['volume périmé']));
    expect(readContent<string[]>('x.json', [])).toEqual(['seed']);
  });

  it('renvoie le repli quand le fichier manque', () => {
    projet();
    expect(readContent('absent.json', ['repli'])).toEqual(['repli']);
  });

  it('CONTENT_DIR déplace le dossier de contenu', () => {
    const dir = projet();
    fs.mkdirSync(path.join(dir, 'ailleurs'));
    process.env['CONTENT_DIR'] = path.join(dir, 'ailleurs');
    expect(contentPath('a.json')).toBe(path.join(dir, 'ailleurs', 'a.json'));
  });

  it('les données utilisateur restent dans data/', () => {
    const dir = projet();
    expect(fs.realpathSync(path.dirname(userDataPath('image-meta.json')))).toBe(fs.realpathSync(path.join(dir, 'data')));
  });
});

describe('image Docker (L74)', () => {
  it('embarque seed/ : sans lui le backend démarre à vide', () => {
    const dockerfile = fs.readFileSync(path.resolve(__dirname, '../../Dockerfile'), 'utf-8');
    expect(dockerfile).toMatch(/^COPY --from=builder \/app\/seed \.\/seed$/m);
    expect(fs.readFileSync(path.resolve(__dirname, '../../.dockerignore'), 'utf-8')).not.toMatch(/^seed$/m);
  });
});
