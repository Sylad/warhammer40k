import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ImageMeta {
  categories?: string[];
  title?: string;
  faction?: string;
  artist?: string;
}

/**
 * Réponse structurée du endpoint /api/image-meta/suggested-categories.
 * Sections fournies au frontend pour alimenter un combobox sectionné
 * (au lieu d'une liste plate énorme et désordonnée).
 */
export interface SuggestedCategories {
  /** Noms des factions canoniques (depuis factions.json). */
  factions: string[];
  /** Noms des sous-factions (chapitres, légions, dynasties, etc.). */
  subfactions: string[];
  /** Noms des primarques. */
  primarchs: string[];
  /** Catégories saisies manuellement par l'utilisateur, non couvertes ailleurs. */
  custom: string[];
}

const META_FILE = path.resolve(process.cwd(), 'data', 'image-meta.json');
const FACTIONS_FILE = path.resolve(process.cwd(), 'data', 'factions.json');
const SUBFACTIONS_FILE = path.resolve(process.cwd(), 'data', 'subfactions.json');
const PRIMARCHS_FILE = path.resolve(process.cwd(), 'data', 'primarchs.json');

@Injectable()
export class ImageMetaService {
  private readonly logger = new Logger(ImageMetaService.name);

  getAll(): Record<string, ImageMeta> {
    if (!fs.existsSync(META_FILE)) return {};
    try {
      const raw = JSON.parse(fs.readFileSync(META_FILE, 'utf-8')) as Record<string, any>;
      const migrated: Record<string, ImageMeta> = {};
      for (const [k, v] of Object.entries(raw)) {
        migrated[k] = this.migrate(v);
      }
      return migrated;
    } catch (err: unknown) {
      this.logger.warn(`Failed to read ${META_FILE}: ${(err as Error)?.message ?? err}`);
      return {};
    }
  }

  private migrate(v: any): ImageMeta {
    const out: ImageMeta = {};
    if (Array.isArray(v?.categories)) {
      out.categories = v.categories
        .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s: string) => s.length > 0);
    } else if (typeof v?.category === 'string' && v.category.trim()) {
      out.categories = [v.category.trim()];
    }
    if (typeof v?.title === 'string' && v.title.trim()) out.title = v.title.trim();
    if (typeof v?.faction === 'string' && v.faction.trim()) out.faction = v.faction.trim();
    if (typeof v?.artist === 'string' && v.artist.trim()) out.artist = v.artist.trim();
    return out;
  }

  set(filename: string, meta: any): Record<string, ImageMeta> {
    const all = this.getAll();
    const cleaned = this.migrate(meta);
    if (!cleaned.categories?.length && !cleaned.title && !cleaned.faction && !cleaned.artist) {
      delete all[filename];
    } else {
      all[filename] = cleaned;
    }
    fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
    fs.writeFileSync(META_FILE, JSON.stringify(all, null, 2));
    this.logger.log(`Updated meta for ${filename}: ${JSON.stringify(cleaned)}`);
    return all;
  }

  getCustomCategories(builtIn: string[] = []): string[] {
    const all = this.getAll();
    const set = new Set<string>();
    const builtInSet = new Set(builtIn);
    for (const m of Object.values(all)) {
      for (const c of m.categories ?? []) {
        if (!builtInSet.has(c)) set.add(c);
      }
    }
    return Array.from(set).sort();
  }

  /**
   * Pré-remplit le combobox de catégorisation avec les noms canoniques
   * issus des seeds (factions, sous-factions, primarques) + les catégories
   * custom déjà créées par l'user. Sections distinctes pour permettre un
   * dropdown sectionné côté frontend (pattern combobox > liste plate).
   */
  getSuggestedCategories(): SuggestedCategories {
    const factions = this.readNamesFromJson(FACTIONS_FILE, ['nom', 'name']);
    const subfactions = this.readNamesFromJson(SUBFACTIONS_FILE, ['name']);
    const primarchs = this.readNamesFromJson(PRIMARCHS_FILE, ['name', 'nom']);

    // Custom = ce qui ne matche aucune source canonique
    const known = new Set<string>([...factions, ...subfactions, ...primarchs]);
    const custom = this.getCustomCategories(Array.from(known));

    return {
      factions: factions.sort((a, b) => a.localeCompare(b, 'fr')),
      subfactions: subfactions.sort((a, b) => a.localeCompare(b, 'fr')),
      primarchs: primarchs.sort((a, b) => a.localeCompare(b, 'fr')),
      custom,
    };
  }

  /**
   * Lit un JSON-array depuis disk et extrait le premier champ trouvé
   * parmi `nameFields` (essai séquentiel — supporte les seeds avec `nom`
   * en français vs `name` en anglais). Retourne [] si fichier absent.
   */
  private readNamesFromJson(filepath: string, nameFields: string[]): string[] {
    if (!fs.existsSync(filepath)) {
      this.logger.warn(`Seed missing for category suggestions: ${filepath}`);
      return [];
    }
    try {
      const arr = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      if (!Array.isArray(arr)) return [];
      const out = new Set<string>();
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue;
        for (const f of nameFields) {
          const v = (item as Record<string, unknown>)[f];
          if (typeof v === 'string' && v.trim().length > 0) {
            out.add(v.trim());
            break;
          }
        }
      }
      return Array.from(out);
    } catch (err: unknown) {
      this.logger.warn(`Failed to read ${filepath}: ${(err as Error)?.message ?? err}`);
      return [];
    }
  }
}
