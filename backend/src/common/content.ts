import * as fs from 'fs';
import * as path from 'path';

/**
 * L74 — deux dossiers, deux natures de données.
 *
 * - **Contenu éditorial** (factions, unités, lore, galerie d'œuvres…) : aucun endpoint
 *   ne l'écrit. Il vit dans `seed/`, embarqué dans l'image : un déploiement le met à jour,
 *   sans toucher au volume. `CONTENT_DIR` le déplace (tests, image).
 * - **Données utilisateur** (image-meta, imported/, vidéos et chaînes ajoutées…) : tout ce
 *   qu'un POST/DELETE écrit. Elles vivent dans `data/` (volume persistant).
 *
 * Les chemins sont résolus à l'appel, pas à l'import (les tests changent de cwd).
 */
export function contentPath(file: string): string {
  const dir = process.env['CONTENT_DIR'] ?? path.resolve(process.cwd(), 'seed');
  return path.join(dir, file);
}

export function userDataPath(file: string): string {
  return path.resolve(process.cwd(), 'data', file);
}

export function readContent<T>(file: string, fallback: T): T {
  const filePath = contentPath(file);
  return fs.existsSync(filePath) ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T) : fallback;
}
