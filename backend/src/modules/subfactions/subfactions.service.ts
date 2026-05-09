import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type SubFactionType =
  | 'chapter'
  | 'regiment'
  | 'klan'
  | 'craftworld'
  | 'hivefleet'
  | 'dynasty'
  | 'sept'
  | 'forgeworld'
  | 'order'
  | 'legion'
  | 'shield_host'
  | 'temple'
  | 'kabal'
  | 'wych_cult'
  | 'haemonculus_coven'
  | 'brotherhood'
  | 'kindred'
  | 'cult'
  | 'other';

export interface NotableUnit {
  id?: string;
  name: string;
  role?: string;
  description?: string;
  wikiQuery?: string;
}

export interface SubFactionBattle {
  name: string;
  date?: string;
  summary: string;
}

export interface SubFaction {
  id: string;
  factionId: string;
  parentSubFactionId?: string;
  name: string;
  type: SubFactionType;
  description: string;
  loreShort?: string;
  loreLong?: string;
  motto?: string;
  primarch?: string;
  primarchId?: string;
  primarchWikiQuery?: string;
  currentLeader?: string;
  currentLeaderRole?: string;
  homeworld?: string;
  founding?: string;
  colors?: string[];
  symbol?: string;
  imageHero?: string;
  wikiQuery?: string;
  unitIds?: string[];
  notableUnits?: NotableUnit[];
  citation?: string;
  epithet?: string;
  currentState?: string;
  notableBattles?: SubFactionBattle[];
  galleryQueries?: string[];
}

const SEED_FILE = path.resolve(process.cwd(), 'data', 'subfactions.json');

@Injectable()
export class SubFactionsService {
  private readonly logger = new Logger(SubFactionsService.name);
  private cached: SubFaction[] | null = null;

  list(factionId?: string): SubFaction[] {
    const all = this.load();
    return factionId ? all.filter(s => s.factionId === factionId) : all;
  }

  get(id: string): SubFaction {
    const found = this.load().find(s => s.id === id);
    if (!found) throw new NotFoundException(`SubFaction ${id} not found`);
    return found;
  }

  successors(id: string): SubFaction[] {
    return this.load().filter(s => s.parentSubFactionId === id);
  }

  private load(): SubFaction[] {
    if (this.cached) return this.cached;
    if (!fs.existsSync(SEED_FILE)) {
      this.logger.warn(`subfactions.json missing at ${SEED_FILE}`);
      this.cached = [];
      return [];
    }
    try {
      this.cached = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8')) as SubFaction[];
      return this.cached;
    } catch (err) {
      this.logger.error(`Failed to parse subfactions.json: ${(err as Error).message}`);
      this.cached = [];
      return [];
    }
  }
}
