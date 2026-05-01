import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { Alignment, Faction } from '../../core/models/models';

const WIKI_SEARCH: Record<string, string> = {
  'space-marines':       'Space Marines Adeptus Astartes',
  'chaos-space-marines': 'Chaos Space Marines Traitor Legion',
  'aeldari':             'Eldrad Ulthran',
  'orks':                'Warboss Ork',
  'tyranides':           'Tyranid Warrior hive',
  'necrons':             'Szarekh Silent King Necron',
  'tau':                 'Fire Warriors T au',
  'astra-militarum':     'Cadian Shock Troops',
  'adeptus-mechanicus':  'Tech-Priest Adeptus Mechanicus',
  'soeurs-de-bataille':  'Adepta Sororitas warrior',
  'inquisition':         'Inquisitor Torquemada Coteaz',
};

type SortKey = 'az' | 'units' | 'alignement';
type FilterKey = 'all' | 'Imperium' | 'Chaos' | 'Xenos' | 'autres';

const RESOURCES = [
  { ico: '⌚', label: 'Timeline du 41e millénaire', sub: 'Voir les grands événements' },
  { ico: '⊛', label: 'Carte galactique', sub: 'Explorer la galaxie' },
  { ico: '⚠', label: 'Relations entre factions', sub: 'Alliances, guerres et rivalités' },
  { ico: '▤', label: 'Lexique Warhammer 40,000', sub: 'Termes et définitions clés' },
];

@Component({
  selector: 'app-factions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="hero" [style.--hero-img]="heroBgUrl()">
      <div class="hero-content">
        <div class="eyebrow">Les peuples du 41<sup>e</sup> millénaire</div>
        <h1>Factions <span class="fleur">✠</span></h1>
        <p>
          De l'Imperium à la menace du Chaos, des civilisations anciennes aux races xénos —
          chaque peuple lutte pour sa survie dans une galaxie en guerre éternelle.
        </p>
      </div>
    </section>

    <section class="toolbar">
      <div class="filters">
        <button class="filter" [class.active]="filterKey() === 'all'" (click)="filterKey.set('all')">Toutes les factions</button>
        <button class="filter" [class.active]="filterKey() === 'Imperium'" (click)="filterKey.set('Imperium')">Imperium</button>
        <button class="filter" [class.active]="filterKey() === 'Chaos'" (click)="filterKey.set('Chaos')">Chaos</button>
        <button class="filter" [class.active]="filterKey() === 'Xenos'" (click)="filterKey.set('Xenos')">Xénos</button>
        <button class="filter" [class.active]="filterKey() === 'autres'" (click)="filterKey.set('autres')">Autres</button>
      </div>
      <input class="search" type="text" placeholder="Rechercher une faction..."
             [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
      <select class="sort" [ngModel]="sortKey()" (ngModelChange)="sortKey.set($event)">
        <option value="az">Tri : A-Z</option>
        <option value="units">Tri : nb d'unités</option>
        <option value="alignement">Tri : alignement</option>
      </select>
    </section>

    <section class="layout">
      <div class="grid">
        @for (f of displayedFactions(); track f.id) {
          <article class="card" [routerLink]="['/factions', f.id]"
                   [style.--card-img]="cardImageUrl(f)">
            <div class="card-sigil">
              @if (f.iconUrl) {
                <img [src]="f.iconUrl" [alt]="f.nom" />
              } @else {
                <span>{{ f.symbole }}</span>
              }
            </div>
            <div class="card-content">
              <h2>{{ f.nom }}</h2>
              <span class="badge" [class]="alignClass(f.alignement)">{{ f.alignement }}</span>
              <p>{{ f.description }}</p>
              <div class="card-footer">
                <span class="units-count">UNITÉS <strong>{{ unitCount(f) }}</strong></span>
                <span class="card-arrow">→</span>
              </div>
            </div>
          </article>
        }

        <article class="card card-extra" (click)="resetFilters()">
          <div class="extra-icon">⚜</div>
          <h2>+6 autres<br/>factions</h2>
          <p>Drukhari, Leagues of Votann, Genestealer Cults, Adepta Sororitas, Grey Knights, et autres encore...</p>
          <span class="card-arrow-cta">VOIR TOUTES →</span>
        </article>
      </div>

      <aside class="sidebar">
        <section class="side-panel">
          <h3>À propos des factions</h3>
          <p>
            Les factions sont au cœur du 41<sup>e</sup> millénaire. Chacune possède ses croyances,
            ses objectifs et ses ennemis jurés. Explorez leur histoire, leurs unités, leurs héros
            et leur rôle dans l'éternelle guerre pour la survie.
          </p>
        </section>

        <section class="side-panel">
          <h3>Ressources rapides</h3>
          @for (r of resources; track r.label) {
            <div class="resource-row">
              <div class="resource-ico">{{ r.ico }}</div>
              <div>
                <strong>{{ r.label }}</strong>
                <span>{{ r.sub }}</span>
              </div>
            </div>
          }
        </section>

        <section class="side-panel">
          <h3>Filtres rapides</h3>
          <div class="quick-block">
            <strong>TYPE</strong>
            <div class="quick-types">
              <button class="qt qt-imp" (click)="filterKey.set('Imperium')">Imperium</button>
              <button class="qt qt-chaos" (click)="filterKey.set('Chaos')">Chaos</button>
              <button class="qt qt-xenos" (click)="filterKey.set('Xenos')">Xénos</button>
              <button class="qt qt-other" (click)="filterKey.set('autres')">Autres</button>
            </div>
          </div>
          <div class="quick-block">
            <strong>ALIGNEMENT</strong>
            <div class="align-list">
              <span class="align-item"><span class="dot blue"></span>Loyal</span>
              <span class="align-item"><span class="dot gold"></span>Neutre</span>
              <span class="align-item"><span class="dot red"></span>Hostile</span>
            </div>
          </div>
        </section>
      </aside>
    </section>
  `,
  styles: [`
    :host { display: block; }

    /* HERO */
    .hero {
      position: relative;
      min-height: 200px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow), inset 0 0 110px rgba(201, 162, 74, 0.045);
      margin-bottom: 22px;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,.94) 0%, rgba(0,0,0,.66) 50%, rgba(0,0,0,.32) 100%),
        linear-gradient(0deg, rgba(0,0,0,.94) 0%, transparent 60%),
        var(--hero-img, none);
      background-size: cover;
      background-position: center;
      filter: contrast(1.4) saturate(0.92) brightness(0.55);
      transform: scale(1.03);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 760px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
      padding: 26px 34px;
      min-height: 200px;
    }
    .eyebrow {
      color: var(--gold);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .hero h1 {
      margin: 0;
      font-family: var(--serif);
      color: var(--gold-bright);
      font-size: clamp(36px, 4.2vw, 60px);
      line-height: 0.95;
      letter-spacing: 0.055em;
      text-transform: uppercase;
      text-shadow: 0 0 38px rgba(201, 162, 74, 0.28);
    }
    .fleur { color: var(--gold-soft); font-size: 0.5em; margin-left: 10px; }
    .hero p {
      margin: 4px 0 0;
      color: #cfc3ad;
      font-size: 14px;
      line-height: 1.6;
      max-width: 640px;
    }

    /* TOOLBAR */
    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 380px) 200px;
      gap: 14px;
      align-items: center;
      margin-bottom: 26px;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 9px; }
    .filter {
      height: 40px;
      border: 1px solid rgba(201, 162, 74, 0.28);
      background: rgba(0, 0, 0, 0.42);
      color: var(--text);
      padding: 0 16px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .filter:hover { border-color: rgba(201, 162, 74, 0.5); }
    .filter.active {
      color: var(--gold-bright);
      border-color: rgba(201, 162, 74, 0.68);
      background: rgba(201, 162, 74, 0.1);
    }
    .search, .sort {
      height: 40px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      padding: 0 15px;
      outline: none;
      font-family: inherit;
      font-size: 13px;
      box-shadow: inset 0 0 24px rgba(201, 162, 74, 0.035);
    }
    .search::placeholder { color: var(--muted); }
    .search:focus, .sort:focus { border-color: var(--border-strong); }
    .sort { cursor: pointer; }

    /* LAYOUT GRID + SIDEBAR */
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 24px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 18px;
    }

    /* CARD FACTION */
    .card {
      position: relative;
      min-height: 350px;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: var(--panel);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.5);
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }
    .card:hover {
      transform: translateY(-6px);
      border-color: rgba(201, 162, 74, 0.65);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.72), 0 0 45px rgba(201, 162, 74, 0.08);
    }
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.94) 100%),
        var(--card-img, none);
      background-size: cover;
      background-position: center;
      filter: contrast(1.3) saturate(1.1) brightness(0.72);
      transition: transform 0.35s ease, filter 0.35s ease;
    }
    .card:hover::before {
      transform: scale(1.05);
      filter: contrast(1.45) saturate(1.25) brightness(0.85);
    }
    .card-sigil {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 2;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: white;
      font-size: 22px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.55);
    }
    .card-sigil img {
      width: 28px;
      height: 28px;
      object-fit: contain;
      filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.8));
    }
    .card-content {
      position: relative;
      z-index: 1;
      margin-top: auto;
      padding: 18px 20px 16px;
    }
    .card h2 {
      margin: 0 0 8px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 19px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.045em;
    }
    .card p {
      margin: 8px 0 14px;
      color: #c3baaa;
      line-height: 1.5;
      font-size: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid rgba(201, 162, 74, 0.18);
    }
    .units-count {
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0.12em;
    }
    .units-count strong {
      color: var(--gold);
      font-family: var(--serif);
      font-size: 16px;
      margin-left: 8px;
    }
    .card-arrow {
      color: var(--gold);
      font-size: 18px;
    }

    /* CARD EXTRA "+6 autres factions" */
    .card-extra {
      background: linear-gradient(180deg, rgba(201, 162, 74, 0.06), rgba(0, 0, 0, 0.92));
      border: 1px dashed rgba(201, 162, 74, 0.45);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 28px 20px;
      cursor: pointer;
    }
    .card-extra::before { display: none; }
    .extra-icon {
      font-size: 48px;
      color: var(--gold);
      margin-bottom: 14px;
      text-shadow: 0 0 28px rgba(201, 162, 74, 0.35);
    }
    .card-extra h2 {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 22px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 12px;
      -webkit-line-clamp: unset;
      overflow: visible;
      display: block;
    }
    .card-extra p {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
      max-width: 260px;
      margin: 0 0 18px;
      -webkit-line-clamp: unset;
      overflow: visible;
      display: block;
    }
    .card-arrow-cta {
      border: 1px solid rgba(201, 162, 74, 0.6);
      color: var(--gold);
      padding: 10px 20px;
      letter-spacing: 0.13em;
      font-size: 11px;
      font-weight: 900;
    }

    /* SIDEBAR */
    .sidebar {
      display: grid;
      gap: 18px;
      align-self: start;
      position: sticky;
      top: 96px;
    }
    .side-panel {
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.92), rgba(5, 4, 3, 0.96));
      padding: 22px;
      box-shadow: 0 20px 80px rgba(0, 0, 0, 0.62);
    }
    .side-panel h3 {
      margin: 0 0 14px;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.11em;
      font-size: 15px;
    }
    .side-panel p {
      margin: 0;
      color: #c3baaa;
      font-size: 13px;
      line-height: 1.6;
    }

    .resource-row {
      display: grid;
      grid-template-columns: 36px 1fr;
      gap: 12px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .resource-row:first-of-type { border-top: 0; padding-top: 0; }
    .resource-row:hover { opacity: 0.85; }
    .resource-ico {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.3);
      color: var(--gold);
      font-size: 16px;
      background: rgba(201, 162, 74, 0.05);
    }
    .resource-row strong {
      display: block;
      color: var(--gold-bright);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .resource-row span {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }

    .quick-block { margin-bottom: 18px; }
    .quick-block strong {
      display: block;
      color: var(--gold);
      font-family: var(--serif);
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .quick-types {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .qt {
      height: 30px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 900;
      border: 1px solid;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
    }
    .qt-imp   { border-color: rgba(73,125,190,.5); color: #9dbfff; }
    .qt-chaos { border-color: rgba(170,45,45,.55); color: #ff8a8a; }
    .qt-xenos { border-color: rgba(35,145,90,.5); color: #80e0ad; }
    .qt-other { border-color: rgba(201, 162, 74, 0.45); color: var(--gold); }

    .align-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .align-item {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #c3baaa;
      font-size: 12px;
      letter-spacing: 0.05em;
    }
    .dot {
      width: 10px;
      height: 10px;
      border: 1px solid currentColor;
      display: inline-block;
    }
    .dot.blue  { color: #6fa0ff; background: rgba(73,125,190,.18); }
    .dot.gold  { color: var(--gold); background: rgba(201,162,74,.18); }
    .dot.red   { color: #ff8a8a; background: rgba(170,45,45,.22); }

    /* RESPONSIVE */
    @media (max-width: 1280px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: relative; top: auto; grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 760px) {
      .hero-content { padding: 22px 20px; }
      .toolbar { grid-template-columns: 1fr; }
      .sidebar { grid-template-columns: 1fr; }
    }
  `],
})
export class FactionsComponent {
  private readonly service = inject(WarhammerService);

  readonly factions = toSignal(this.service.factions$, { initialValue: [] });
  readonly units = toSignal(this.service.getUnits(), { initialValue: [] });
  readonly wikiImages = signal(new Map<string, string>());

  readonly filterKey = signal<FilterKey>('all');
  readonly searchQuery = signal('');
  readonly sortKey = signal<SortKey>('az');

  readonly resources = RESOURCES;

  readonly unitCountByFaction = computed(() => {
    const map = new Map<string, number>();
    for (const u of this.units()) map.set(u.factionId, (map.get(u.factionId) ?? 0) + 1);
    return map;
  });

  readonly displayedFactions = computed(() => {
    const f = this.factions();
    const filter = this.filterKey();
    const q = this.searchQuery().toLowerCase().trim();
    const sort = this.sortKey();
    let out = f;
    if (filter !== 'all' && filter !== 'autres') {
      out = out.filter(x => x.alignement === filter);
    }
    if (q) {
      out = out.filter(x =>
        x.nom.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q)
      );
    }
    const counts = this.unitCountByFaction();
    out = [...out].sort((a, b) => {
      if (sort === 'az') return a.nom.localeCompare(b.nom, 'fr');
      if (sort === 'units') return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      return a.alignement.localeCompare(b.alignement);
    });
    return out;
  });

  constructor() {
    effect(() => {
      const factions = this.factions();
      if (!factions.length) return;
      factions.forEach(f => {
        const query = WIKI_SEARCH[f.id] ?? f.nom;
        this.service.getWikiImage(query).subscribe({
          next: (res) => {
            if (res.imageUrl) {
              this.wikiImages.update(m => new Map(m).set(f.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  unitCount(f: Faction): number {
    return f.unitCount ?? this.unitCountByFaction().get(f.id) ?? 0;
  }

  alignClass(alignement: string): string {
    const a = alignement.toLowerCase();
    if (a === 'imperium') return 'blue';
    if (a === 'chaos') return 'red';
    return 'green';
  }

  cardImageUrl(f: Faction): string {
    const url = this.wikiImages().get(f.id);
    if (url) return `url('${url}')`;
    return `linear-gradient(135deg, ${f.couleurThematique}dd 0%, #0a0a0a 100%)`;
  }

  heroBgUrl(): string {
    const sm = this.factions().find(f => f.id === 'space-marines');
    if (sm) {
      const url = this.wikiImages().get(sm.id);
      if (url) return `url('${url}')`;
    }
    return 'linear-gradient(135deg, #1a3a6e 0%, #0a0a0a 100%)';
  }

  resetFilters() {
    this.filterKey.set('all');
    this.searchQuery.set('');
  }
}
