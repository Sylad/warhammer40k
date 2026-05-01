import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Serie } from './series.model.js';

@Injectable()
export class SeriesService {
  private readonly series: Serie[];
  private readonly descriptionCache = new Map<string, string>();

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'series.json');
    this.series = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Serie[];
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
