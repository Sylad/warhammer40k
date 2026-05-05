import { Component, computed, inject, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Equipment, EquipmentType, Faction } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';

const TYPE_LABEL: Record<EquipmentType, string> = {
  ranged: 'Armes à distance',
  melee: 'Armes de mêlée',
  armor: 'Armures',
  relic: 'Reliques',
};

const TYPE_SIGIL: Record<EquipmentType, string> = {
  ranged: '⌖',
  melee: '⚔',
  armor: '⛨',
  relic: '✠',
};

const TYPE_COLOR: Record<EquipmentType, string> = {
  ranged: '#c9a24a',
  melee: '#a85a3a',
  armor: '#6f86b3',
  relic: '#9b7d4a',
};

@Component({
  selector: 'app-lore-equipment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FigureLightboxComponent],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-bg" [style.background-image]="heroImg()"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">⚒ Codex de l'arsenal</div>
        <h1>Armement &amp; Reliques</h1>
        <p class="lede">
          Du bolter sacré au marteau-tonnerre, du wraithbone Aeldari à la lame démone d'Abaddon —
          voici les armes, armures et reliques qui forgent et défont les destins du 41<sup>e</sup> millénaire.
          Chaque entrée porte le poids d'une histoire, d'une foi ou d'une damnation.
        </p>
        <div class="counters">
          <div class="counter"><strong>{{ items().length }}</strong><span>Pièces archivées</span></div>
          <div class="counter"><strong>{{ countByType('ranged') }}</strong><span>Armes à distance</span></div>
          <div class="counter"><strong>{{ countByType('melee') }}</strong><span>Armes de mêlée</span></div>
          <div class="counter"><strong>{{ countByType('armor') }}</strong><span>Armures</span></div>
          <div class="counter"><strong>{{ countByType('relic') }}</strong><span>Reliques</span></div>
        </div>
      </div>
    </section>

    <section class="filters">
      <div class="filter-row">
        <button class="filter" [class.active]="filterType() === 'all'" (click)="filterType.set('all')">
          Tous · {{ items().length }}
        </button>
        @for (t of typeKeys; track t) {
          <button class="filter" [class.active]="filterType() === t" [style.--t-color]="typeColor(t)" (click)="filterType.set(t)">
            <span class="filter-sigil">{{ typeSigil(t) }}</span>{{ typeLabel(t) }} · {{ countByType(t) }}
          </button>
        }
      </div>
      <div class="filter-row second">
        <select class="faction-select" [ngModel]="filterFaction()" (ngModelChange)="filterFaction.set($event)">
          <option value="all">Toutes les factions</option>
          @for (f of factionList(); track f.id) {
            <option [value]="f.id">{{ f.nom }} · {{ countByFaction(f.id) }}</option>
          }
        </select>
        <input class="search" type="text" placeholder="Rechercher : bolter, plasma, mjalnar…"
               [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
      </div>
    </section>

    <section class="grid">
      @for (item of filtered(); track item.id) {
        <article class="card" [class.expanded]="expandedId() === item.id" [style.--t-color]="typeColor(item.type)" (click)="toggle(item.id)">
          <div class="card-bg" [style.background-image]="itemImg(item.id)"></div>
          <div class="card-overlay"></div>
          <button class="card-zoom" type="button" (click)="$event.stopPropagation(); openLightbox(item)" aria-label="Voir en grand">⛶</button>
          <div class="card-head">
            <span class="card-sigil" [style.color]="typeColor(item.type)">{{ item.sigil || typeSigil(item.type) }}</span>
            <span class="card-type">{{ subCategoryLabel(item) }}</span>
          </div>
          <div class="card-body">
            <h3>{{ item.name }}</h3>
            @if (item.nameVO && item.nameVO !== item.name) {
              <div class="card-vo">{{ item.nameVO }}</div>
            }
            <p class="card-desc">{{ item.description }}</p>
            <div class="card-factions">
              @for (fid of item.factionIds; track fid) {
                <span class="faction-pill">{{ factionName(fid) }}</span>
              }
            </div>

            @if (expandedId() === item.id) {
              <div class="card-detail" (click)="$event.stopPropagation()">
                <p class="lore-long">{{ item.loreLong }}</p>
                @if (item.specs) {
                  <div class="detail-block">
                    <div class="detail-label">Spécifications</div>
                    <div class="detail-value mono">{{ item.specs }}</div>
                  </div>
                }
                @if (item.notable && item.notable.length > 0) {
                  <div class="detail-block">
                    <div class="detail-label">Porteurs / variantes notables</div>
                    <ul class="notable-list">
                      @for (n of item.notable; track n) {
                        <li>{{ n }}</li>
                      }
                    </ul>
                  </div>
                }
                @if (item.citation) {
                  <blockquote class="citation">
                    <span class="quote">«</span> {{ item.citation }} <span class="quote">»</span>
                  </blockquote>
                }
              </div>
            }
          </div>
          <div class="card-arrow" [class.flipped]="expandedId() === item.id">›</div>
        </article>
      }
      @if (filtered().length === 0) {
        <div class="empty">Aucune pièce ne correspond aux filtres sélectionnés.</div>
      }
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
  `,
  styleUrls: ['./lore-equipment.component.scss'],
})
export class LoreEquipmentComponent {
  private readonly service = inject(WarhammerService);

  readonly typeKeys: EquipmentType[] = ['ranged', 'melee', 'armor', 'relic'];

  readonly items = toSignal(this.service.equipment$, { initialValue: [] as Equipment[] });
  readonly factions = toSignal(this.service.factions$, { initialValue: [] as Faction[] });

  readonly filterType = signal<'all' | EquipmentType>('all');
  readonly filterFaction = signal<string>('all');
  readonly searchQuery = signal('');
  readonly expandedId = signal<string | null>(null);
  readonly lightbox = signal<LightboxState | null>(null);

  readonly heroImage = signal<string | null>(null);
  private readonly imgCache = signal<Record<string, string>>({});
  private readonly imgInflight = new Set<string>();

  readonly filtered = computed<Equipment[]>(() => {
    const t = this.filterType();
    const f = this.filterFaction();
    const q = this.searchQuery().trim().toLowerCase();
    let list = this.items().slice();
    if (t !== 'all') list = list.filter(i => i.type === t);
    if (f !== 'all') list = list.filter(i => i.factionIds.includes(f));
    if (q) {
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.nameVO ?? '').toLowerCase().includes(q) ||
        i.subCategory.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
      );
    }
    return list;
  });

  readonly factionList = computed(() => {
    const ids = new Set<string>();
    for (const i of this.items()) {
      for (const f of i.factionIds) ids.add(f);
    }
    return this.factions().filter(f => ids.has(f.id)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  });

  countByType(t: EquipmentType): number {
    return this.items().filter(i => i.type === t).length;
  }

  countByFaction(fid: string): number {
    return this.items().filter(i => i.factionIds.includes(fid)).length;
  }

  typeLabel(t: EquipmentType): string { return TYPE_LABEL[t]; }
  typeSigil(t: EquipmentType): string { return TYPE_SIGIL[t]; }
  typeColor(t: EquipmentType): string { return TYPE_COLOR[t]; }

  subCategoryLabel(item: Equipment): string {
    const sub = item.subCategory.replace(/-/g, ' ');
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  }

  factionName(fid: string): string {
    return this.factions().find(f => f.id === fid)?.nom ?? fid;
  }

  toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  openLightbox(item: Equipment): void {
    const baseUrl = this.imgCache()[`eq:${item.id}`];
    if (!baseUrl) return;
    const subtitle = `${this.subCategoryLabel(item)} — ${TYPE_LABEL[item.type]}`;
    this.lightbox.set({
      title: item.name,
      subtitle,
      description: item.description,
      contextName: 'Codex de l\'Arsenal',
      contextColor: TYPE_COLOR[item.type],
      contextSigil: item.sigil || TYPE_SIGIL[item.type],
      searchQuery: item.nameVO || item.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const baseQuery = item.wikiQuery;
    const variants = [
      `${baseQuery} art`,
      `${baseQuery} concept art`,
      `${item.nameVO || item.name} warhammer 40k`,
      `${baseQuery} miniature`,
    ];
    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const cur = this.lightbox();
          if (!cur || cur.title !== item.name) return;
          if (cur.thumbUrls.includes(r.imageUrl)) return;
          this.lightbox.set({ ...cur, thumbUrls: [...cur.thumbUrls, r.imageUrl] });
        },
        error: () => {},
      });
    }
  }

  selectThumb(idx: number): void {
    const cur = this.lightbox();
    if (!cur) return;
    const url = cur.thumbUrls[idx];
    if (!url) return;
    this.lightbox.set({ ...cur, mainUrl: url, selectedIdx: idx });
  }

  closeLightbox(): void { this.lightbox.set(null); }

  itemImg(id: string): string {
    const url = this.imgCache()[`eq:${id}`];
    return url ? `url('${url}')` : 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'linear-gradient(135deg, #2a1c10 0%, #050403 100%)';
  }

  constructor() {
    this.service.getWikiImage('Warhammer 40k armoury weapons forge').subscribe({
      next: r => { if (r.imageUrl) this.heroImage.set(r.imageUrl); },
      error: () => {},
    });

    effect(() => {
      const list = this.items();
      const cache = this.imgCache();
      for (const item of list) {
        const key = `eq:${item.id}`;
        if (cache[key] || this.imgInflight.has(key)) continue;
        this.imgInflight.add(key);
        this.service.getWikiImage(item.wikiQuery).subscribe({
          next: r => {
            if (r.imageUrl) this.imgCache.update(c => ({ ...c, [key]: r.imageUrl! }));
            this.imgInflight.delete(key);
          },
          error: () => { this.imgInflight.delete(key); },
        });
      }
    });
  }
}
