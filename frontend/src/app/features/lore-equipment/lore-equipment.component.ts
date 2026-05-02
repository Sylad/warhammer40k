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
  styles: [`
    :host { display: block; padding-bottom: 60px; }

    .back-link {
      display: inline-block;
      margin: 16px 0 24px;
      color: var(--gold-soft);
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: 700;
      text-decoration: none;
      transition: color 0.15s;
    }
    .back-link:hover { color: var(--gold-bright); }

    .hero {
      position: relative;
      min-height: 320px;
      border: 1px solid var(--border);
      overflow: hidden;
      display: flex;
      align-items: end;
      padding: 50px 50px 44px;
      background: #080706;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }
    .hero-bg {
      position: absolute; inset: 0;
      background-size: cover;
      background-position: center;
      filter: contrast(1.05) saturate(0.85) brightness(0.55);
    }
    .hero-overlay {
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at 80% 30%, rgba(201,162,74,0.22), transparent 55%),
        radial-gradient(circle at 20% 80%, rgba(123,17,19,0.42), transparent 50%),
        linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.92) 80%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 880px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border: 1px solid var(--border);
      color: var(--gold);
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .hero h1 {
      font-size: clamp(36px, 5vw, 60px);
      line-height: 1.05;
      margin: 0 0 16px;
      color: var(--gold-bright);
      font-family: var(--serif);
      letter-spacing: 0.02em;
      text-shadow: 0 2px 14px rgba(0,0,0,0.85);
    }
    .lede { font-size: 16px; color: var(--text); max-width: 700px; line-height: 1.65; margin: 0 0 22px; }

    .counters { display: flex; gap: 20px; flex-wrap: wrap; }
    .counter {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 16px;
      border: 1px solid var(--border);
      background: rgba(8,7,6,0.55);
    }
    .counter strong { color: var(--gold-bright); font-family: var(--serif); font-size: 22px; }
    .counter span { color: var(--muted); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }

    .filters {
      position: sticky;
      top: 70px;
      z-index: 10;
      background: rgba(5,4,3,0.92);
      backdrop-filter: blur(8px);
      padding: 16px 0;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .filter-row.second { margin-top: 12px; }
    .filter {
      padding: 8px 14px;
      border: 1px solid rgba(201,162,74,0.28);
      background: rgba(8,7,6,0.55);
      color: var(--text);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .filter:hover { border-color: var(--gold-soft); color: var(--gold-bright); }
    .filter.active {
      border-color: var(--t-color, var(--gold));
      color: var(--t-color, var(--gold));
      background: rgba(201,162,74,0.08);
      box-shadow: inset 0 0 0 1px var(--t-color, var(--gold));
    }
    .filter-sigil { font-size: 14px; }

    .faction-select, .search {
      height: 36px;
      padding: 0 14px;
      border: 1px solid rgba(201,162,74,0.28);
      background: rgba(8,7,6,0.78);
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    .search { flex: 1; min-width: 200px; max-width: 400px; }
    .faction-select { min-width: 220px; }
    .faction-select:focus, .search:focus { border-color: var(--gold); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .card {
      position: relative;
      min-height: 260px;
      border: 1px solid rgba(201,162,74,0.24);
      background: var(--panel);
      cursor: pointer;
      overflow: hidden;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }
    .card.expanded {
      grid-column: 1 / -1;
      min-height: auto;
      border-color: var(--t-color, var(--gold));
      box-shadow: 0 0 0 1px var(--t-color, var(--gold)), 0 18px 60px rgba(0,0,0,0.6);
    }
    .card:not(.expanded):hover {
      border-color: var(--t-color, var(--gold-soft));
      transform: translateY(-3px);
      box-shadow: 0 22px 50px rgba(0,0,0,0.55);
    }
    .card-bg {
      position: absolute; inset: 0;
      background-size: cover;
      background-position: center;
      filter: contrast(1.1) saturate(0.85) brightness(0.4);
      transition: filter 0.3s;
    }
    .card.expanded .card-bg { filter: contrast(1.08) saturate(0.7) brightness(0.32); }
    .card-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.78) 60%, rgba(0,0,0,0.96) 100%);
    }
    .card-head {
      position: relative; z-index: 1;
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(201,162,74,0.18);
    }
    .card-sigil { font-size: 22px; line-height: 1; text-shadow: 0 0 14px rgba(0,0,0,0.7); }
    .card-type {
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .card-body { position: relative; z-index: 1; padding: 14px 16px 18px; flex: 1; display: flex; flex-direction: column; }
    .card-body h3 {
      margin: 0 0 4px;
      font-family: var(--serif);
      font-size: 18px;
      color: var(--gold-bright);
      letter-spacing: 0.02em;
      line-height: 1.2;
    }
    .card-vo { color: var(--muted); font-size: 11px; font-style: italic; margin-bottom: 8px; letter-spacing: 0.04em; }
    .card-desc { color: var(--text); font-size: 13px; line-height: 1.55; margin: 4px 0 12px; flex: 1; }
    .card-factions { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
    .faction-pill {
      padding: 2px 8px;
      border: 1px solid rgba(201,162,74,0.32);
      color: var(--gold-soft);
      font-size: 9.5px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
      background: rgba(8,7,6,0.55);
    }

    .card-arrow {
      position: absolute;
      top: 14px; right: 16px;
      z-index: 2;
      color: var(--gold-soft);
      font-size: 22px;
      line-height: 1;
      transition: transform 0.25s;
    }
    .card-arrow.flipped { transform: rotate(90deg); color: var(--t-color, var(--gold-bright)); }

    .card-zoom {
      position: absolute;
      top: 14px;
      left: 16px;
      z-index: 2;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(8,7,6,0.78);
      border: 1px solid rgba(201,162,74,0.4);
      color: var(--t-color, var(--gold-soft));
      font-size: 13px;
      cursor: pointer;
      opacity: 0.6;
      font-family: inherit;
      transition: opacity 0.15s, transform 0.15s, border-color 0.15s;
    }
    .card:hover .card-zoom { opacity: 1; }
    .card-zoom:hover { transform: scale(1.1); border-color: var(--t-color, var(--gold)); }

    .card-detail {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(201,162,74,0.18);
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      cursor: default;
    }
    @media (min-width: 900px) {
      .card-detail { grid-template-columns: 2fr 1fr; }
    }
    .lore-long {
      grid-column: 1 / -1;
      color: var(--text);
      font-size: 14px;
      line-height: 1.7;
      margin: 0;
    }
    .detail-block {
      padding: 10px 12px;
      border: 1px solid rgba(201,162,74,0.18);
      background: rgba(8,7,6,0.55);
    }
    .detail-label {
      color: var(--gold);
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .detail-value { color: var(--text); font-size: 12.5px; line-height: 1.6; }
    .detail-value.mono { font-family: ui-monospace, 'Cascadia Mono', Menlo, monospace; font-size: 11.5px; color: var(--gold-soft); }
    .notable-list { margin: 0; padding-left: 18px; color: var(--text); font-size: 12.5px; line-height: 1.55; }
    .notable-list li { margin-bottom: 4px; }
    .citation {
      grid-column: 1 / -1;
      margin: 0;
      padding: 14px 18px;
      border-left: 3px solid var(--t-color, var(--gold));
      background: rgba(8,7,6,0.55);
      font-style: italic;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 15px;
    }
    .quote { color: var(--t-color, var(--gold)); font-size: 24px; font-style: normal; margin: 0 4px; }

    .empty {
      grid-column: 1 / -1;
      padding: 40px 20px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed rgba(201,162,74,0.3);
      font-size: 14px;
    }

    @media (max-width: 600px) {
      .hero { padding: 32px 24px 28px; min-height: 240px; }
      .filters { top: 0; }
      .filter-row.second { flex-direction: column; align-items: stretch; }
      .search, .faction-select { max-width: 100%; }
    }
  `],
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
