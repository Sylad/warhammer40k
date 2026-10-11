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

const isAutre = (x: Faction): boolean => !['imperium', 'chaos', 'xenos'].includes(x.alignement.toLowerCase());

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
        @if (hasAutres()) {
          <button class="filter" [class.active]="filterKey() === 'autres'" (click)="filterKey.set('autres')">Autres</button>
        }
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
          <a class="card" [routerLink]="['/factions', f.id]"
                   [style.--card-img]="cardImageUrl(f)">
            <div class="card-sigil">
              @if (f.iconUrl && !brokenIcons().has(f.id)) {
                <img [src]="f.iconUrl" [alt]="f.nom" (error)="iconFailed(f.id)" />
              } @else {
                <span aria-hidden="true">{{ f.symbole }}</span>
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
          </a>
        }
        <div class="empty" role="status">@if (!displayedFactions().length) {<p class="empty-msg">Aucune faction ne correspond à ce filtre. <button type="button" class="filter" (click)="reset()">Toutes les factions</button></p>}</div>
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
          <a class="resource-row" routerLink="/lore/timeline">
            <div class="resource-ico">⌚</div>
            <div>
              <strong>Chronologie</strong>
              <span>Voir les grands événements</span>
            </div>
          </a>
          <a class="resource-row" routerLink="/lore/galaxy">
            <div class="resource-ico">⊛</div>
            <div>
              <strong>Carte galactique</strong>
              <span>Explorer la galaxie</span>
            </div>
          </a>
          <a class="resource-row" routerLink="/lore/concepts">
            <div class="resource-ico">▤</div>
            <div>
              <strong>Concepts</strong>
              <span>Termes et notions clés</span>
            </div>
          </a>
        </section>
      </aside>
    </section>
  `,
  styleUrls: ['./factions.component.scss'],
})
export class FactionsComponent {
  private readonly service = inject(WarhammerService);

  readonly factions = toSignal(this.service.factions$, { initialValue: [] });
  /** L39 : icônes du wiki introuvables (404) → symbole de la faction à la place. */
  readonly brokenIcons = signal(new Set<string>());
  iconFailed(id: string): void {
    this.brokenIcons.update(s => new Set(s).add(id));
  }
  readonly units = toSignal(this.service.getUnits(), { initialValue: [] });
  readonly wikiImages = signal(new Map<string, string>());

  readonly filterKey = signal<FilterKey>('all');
  readonly searchQuery = signal('');
  readonly sortKey = signal<SortKey>('az');


  readonly unitCountByFaction = computed(() => {
    const map = new Map<string, number>();
    for (const u of this.units()) map.set(u.factionId, (map.get(u.factionId) ?? 0) + 1);
    return map;
  });

  /** L102 : « Autres » n'est proposé que si au moins une faction y entre. */
  readonly hasAutres = computed(() => this.factions().some(x => isAutre(x)));

  reset(): void {
    this.filterKey.set('all');
    this.searchQuery.set('');
  }

  readonly displayedFactions = computed(() => {
    const f = this.factions();
    const filter = this.filterKey();
    const q = this.searchQuery().toLowerCase().trim();
    const sort = this.sortKey();
    let out = f;
    if (filter === 'autres') {
      // « Autres » = tout ce qui n'est pas un des 3 alignements principaux (L92 : comparaison en
      // minuscules des deux côtés, 'Imperium' n'égalait pas 'imperium' et les 17 factions passaient).
      out = out.filter(isAutre);
    } else if (filter !== 'all') {
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
