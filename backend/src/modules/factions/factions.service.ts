import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Faction } from './faction.model.js';

@Injectable()
export class FactionsService {
  private readonly factions: Faction[];

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'factions.json');
    this.factions = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Faction[];
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
