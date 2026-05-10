import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Faction } from './faction.model.js';

@Injectable()
export class FactionsService {
  private readonly logger = new Logger(FactionsService.name);
  private readonly factions: Faction[];

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'factions.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`factions.json missing at ${filePath} — démarrage à vide. Copier le seed pour peupler.`);
      this.factions = [];
      return;
    }
    try {
      this.factions = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Faction[];
    } catch (err) {
      this.logger.error(`Failed to parse factions.json: ${(err as Error).message}`);
      this.factions = [];
    }
  }

  findAll(): Faction[] {
    return this.factions;
  }

  findOne(id: string): Faction {
    const faction = this.factions.find(f => f.id === id);
    if (!faction) throw new NotFoundException(`Faction ${id} introuvable`);
    return faction;
  }
}
