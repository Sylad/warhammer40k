import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ImageMeta {
  categories?: string[];
  title?: string;
  faction?: string;
  artist?: string;
}

const META_FILE = path.resolve(process.cwd(), 'data', 'image-meta.json');

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
    } catch {
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
}
