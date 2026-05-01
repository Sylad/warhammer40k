import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { LoreEvent, Emperor, Primarch, ChaosGod, ImperialOrganization, LoreConcept } from './lore-feed.model.js';

function loadJson<T>(file: string, fallback: T): T {
  const filePath = path.resolve(process.cwd(), 'data', file);
  return fs.existsSync(filePath)
    ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T)
    : fallback;
}

@Injectable()
export class LoreFeedService {
  private readonly events: LoreEvent[];
  private readonly emperor: Emperor | null;
  private readonly primarchs: Primarch[];
  private readonly chaosGods: ChaosGod[];
  private readonly imperialOrgs: ImperialOrganization[];
  private readonly concepts: LoreConcept[];

  constructor() {
    this.events = loadJson<LoreEvent[]>('lore-feed.json', []);
    this.emperor = loadJson<Emperor | null>('emperor.json', null);
    this.primarchs = loadJson<Primarch[]>('primarchs.json', []);
    this.chaosGods = loadJson<ChaosGod[]>('chaos-gods.json', []);
    this.imperialOrgs = loadJson<ImperialOrganization[]>('imperial-orgs.json', []);
    this.concepts = loadJson<LoreConcept[]>('lore-concepts.json', []);
  }

  findAll(): LoreEvent[] { return this.events; }

  random(count = 3): LoreEvent[] {
    if (this.events.length <= count) return this.events;
    const shuffled = [...this.events].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  getEmperor(): Emperor | null { return this.emperor; }

  getPrimarchs(): Primarch[] { return this.primarchs; }

  getPrimarch(id: string): Primarch | undefined {
    return this.primarchs.find(p => p.id === id);
  }

  getChaosGods(): ChaosGod[] { return this.chaosGods; }

  getChaosGod(id: string): ChaosGod | undefined {
    return this.chaosGods.find(g => g.id === id);
  }

  getImperialOrgs(): ImperialOrganization[] { return this.imperialOrgs; }

  getImperialOrg(id: string): ImperialOrganization | undefined {
    return this.imperialOrgs.find(o => o.id === id);
  }

  getLoreConcepts(): LoreConcept[] { return this.concepts; }

  getLoreConcept(id: string): LoreConcept | undefined {
    return this.concepts.find(c => c.id === id);
  }
}
