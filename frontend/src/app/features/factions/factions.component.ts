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
  styleUrls: ['./factions.component.scss'],
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

}
