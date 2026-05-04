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

  listImages(): string[] {
    if (this.cached) return this.cached;
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
