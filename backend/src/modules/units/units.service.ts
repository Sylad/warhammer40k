import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Unit } from './unit.model.js';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);
  private readonly units: Unit[];
  private readonly descriptionCache = new Map<string, string>();

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'units.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`units.json missing at ${filePath} — démarrage à vide. Copier le seed pour peupler.`);
      this.units = [];
      return;
    }
    try {
      this.units = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Unit[];
    } catch (err) {
      this.logger.error(`Failed to parse units.json: ${(err as Error).message}`);
      this.units = [];
    }
  }

  findAll(factionId?: string): Unit[] {
    if (factionId) return this.units.filter(u => u.factionId === factionId);
    return this.units;
  }

  findOne(id: string): Unit {
    const unit = this.units.find(u => u.id === id);
    if (!unit) throw new NotFoundException(`Unité ${id} introuvable`);
    return unit;
  }

  getCachedDescription(unitId: string): string | undefined {
    return this.descriptionCache.get(unitId);
  }

  setCachedDescription(unitId: string, description: string): void {
    this.descriptionCache.set(unitId, description);
  }
}
