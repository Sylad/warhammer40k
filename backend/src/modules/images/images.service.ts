import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const IMAGES_DIR = process.env['IMAGES_DIR'] ?? path.resolve(process.cwd(), 'data', 'images');
const IMPORTED_DIR = path.resolve(process.cwd(), 'data', 'imported');

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  readonly imagesDir = IMAGES_DIR;
  readonly importedDir = IMPORTED_DIR;

  private cached: string[] | null = null;
  private cachedStamp = '';

  private dirStamp(): string {
    const m = (d: string) => { try { return String(fs.statSync(d).mtimeMs); } catch { return '0'; } };
    return `${m(IMAGES_DIR)}|${m(IMPORTED_DIR)}`;
  }

  listImages(): string[] {
    // Invalidation par mtime des dossiers : la façon documentée d'ajouter des
    // images est de les déposer dans le montage NAS — le cache process-lifetime
    // ne les voyait jamais (review 2026-08-14).
    const stamp = this.dirStamp();
    if (this.cached && stamp === this.cachedStamp) return this.cached;
    this.cachedStamp = stamp;
    try {
      const main = fs.existsSync(IMAGES_DIR)
        ? fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        : [];
      const imported = fs.existsSync(IMPORTED_DIR)
        ? fs.readdirSync(IMPORTED_DIR)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
            .map(f => `imported/${f}`)
        : [];
      this.cached = [...imported, ...main];
    } catch (err: unknown) {
      this.logger.warn(`Failed to scan images dirs (${IMAGES_DIR} / ${IMPORTED_DIR}): ${(err as Error)?.message ?? err}`);
      this.cached = [];
    }
    return this.cached;
  }

  invalidateCache(): void {
    this.cachedStamp = '';
    this.cached = null;
  }

  resolveFile(filename: string): string | null {
    const safe = filename.replace(/\.\./g, '').replace(/^\/+/, '');
    if (safe.startsWith('imported/')) {
      const inner = path.basename(safe.slice('imported/'.length));
      const full = path.join(IMPORTED_DIR, inner);
      return fs.existsSync(full) ? full : null;
    }
    const inner = path.basename(safe);
    const full = path.join(IMAGES_DIR, inner);
    return fs.existsSync(full) ? full : null;
  }
}
