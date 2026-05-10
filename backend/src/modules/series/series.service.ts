import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Serie } from './series.model.js';

@Injectable()
export class SeriesService {
  private readonly logger = new Logger(SeriesService.name);
  private readonly series: Serie[];
  private readonly descriptionCache = new Map<string, string>();

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'series.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`series.json missing at ${filePath} — démarrage à vide. Copier le seed pour peupler.`);
      this.series = [];
      return;
    }
    try {
      this.series = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Serie[];
    } catch (err) {
      this.logger.error(`Failed to parse series.json: ${(err as Error).message}`);
      this.series = [];
    }
  }

  findAll(): Serie[] { return this.series; }

  findOne(id: string): Serie {
    const serie = this.series.find(s => s.id === id);
    if (!serie) throw new NotFoundException(`Série ${id} introuvable`);
    return serie;
  }

  getCachedDescription(id: string): string | undefined {
    return this.descriptionCache.get(id);
  }

  setCachedDescription(id: string, description: string): void {
    this.descriptionCache.set(id, description);
  }
}
