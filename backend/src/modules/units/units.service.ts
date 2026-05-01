import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Unit } from './unit.model.js';

@Injectable()
export class UnitsService {
  private readonly units: Unit[];
  private readonly descriptionCache = new Map<string, string>();

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'units.json');
    this.units = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Unit[];
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
