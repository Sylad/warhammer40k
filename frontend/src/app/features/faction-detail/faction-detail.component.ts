import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { Faction, Unit, UnitType, SubFaction, SubFactionType } from '../../core/models/models';

const FACTION_WIKI: Record<string, string> = {
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

const FACTION_LORE_IMG: Record<string, string> = {
  'space-marines':       'Ultramarines battle',
  'chaos-space-marines': 'Chaos Space Marines battle',
  'aeldari':             'Aeldari Craftworld',
  'orks':                'Ork Waaagh battle',
  'tyranides':           'Tyranid swarm',
  'necrons':             'Necron tomb world',
  'tau':                 'Tau battle suit',
  'astra-militarum':     'Imperial Guard battle',
  'adeptus-mechanicus':  'Skitarii battle',
  'soeurs-de-bataille':  'Sisters of Battle',
  'inquisition':         'Inquisition agents',
};

const TYPE_FILTERS: { key: UnitType | 'Tous'; label: string }[] = [
  { key: 'Tous',       label: 'Tous' },
  { key: 'Infanterie', label: 'Infanterie' },
  { key: 'Véhicule',   label: 'Véhicule' },
  { key: 'Héros',      label: 'Héros' },
  { key: 'Psyker',     label: 'Psyker' },
];

const DEFAULT_LIENS = [
  { ico: '⌚', label: 'Chronologie' },
  { ico: '☗', label: 'Personnages célèbres' },
  { ico: '⊛', label: 'Monde d\'origine' },
  { ico: '⚜', label: 'Héraldique et symboles' },
  { ico: '⚔', label: 'Relations et alliances' },
];

const DEFAULT_RESOURCES = [
  { ico: '▤', label: 'Lexique Warhammer 40,000' },
  { ico: '⊛', label: 'Carte galactique' },
  { ico: '☖', label: 'Bibliothèque des archives' },
  { ico: '✎', label: 'Voir les romans liés' },
];

@Component({
  selector: 'app-faction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (faction(); as f) {
      <a class="back-btn" routerLink="/factions">← RETOUR AUX FACTIONS</a>

      <section class="hero hero-flicker" [style.--hero-img]="heroImg()">
        <div class="dust-motes" aria-hidden="true"></div>
        <div class="hero-text">
          <span class="badge-type" [class]="'b-' + f.alignement.toLowerCase()">{{ f.alignement }}</span>
          <h1>{{ f.nom }}</h1>
          @if (f.sousTitre) {
            <div class="hero-sub">
              {{ f.sousTitre }}<span class="sub-line"></span>
            </div>
          }
          <p class="hero-desc">{{ f.description }}</p>
          <button class="cta" (click)="scrollToUnits()">
            <span class="cta-ico">⚔</span>EXPLORER LES UNITÉS
          </button>
          @if (f.citation) {
            <blockquote class="hero-quote">
              <span class="quote-sigil">{{ f.symbole }}</span>
              <span class="quote-text">« {{ f.citation }} »</span>
            </blockquote>
          }
        </div>
      </section>

      <section class="layout">
        <div class="main">
          <section class="lore" [style.--lore-img]="loreImg()">
            <h2 class="section-title"><span class="t-flourish">✠</span>Histoire & Lore</h2>
            <div class="lore-grid">
              <div class="lore-cols">
                <article class="lore-col">
                  <div class="lc-head"><span class="lc-ico">⊛</span><strong>Origine</strong></div>
                  <p>{{ f.lore?.origine || loreFallback(f, 'origine') }}</p>
                </article>
                <article class="lore-col">
                  <div class="lc-head"><span class="lc-ico">⚜</span><strong>Organisation</strong></div>
                  <p>{{ f.lore?.organisation || loreFallback(f, 'organisation') }}</p>
                </article>
                <article class="lore-col">
                  <div class="lc-head"><span class="lc-ico">⚔</span><strong>Doctrine</strong></div>
                  <p>{{ f.lore?.doctrine || loreFallback(f, 'doctrine') }}</p>
                </article>
              </div>
              <div class="lore-image"></div>
            </div>
          </section>

          @if (subFactions().length > 0) {
            <section class="subfactions" id="subfactions">
              <div class="units-head">
                <h2 class="section-title">
                  <span class="t-flourish">✠</span>{{ subFactionLabel() }}
                </h2>
                <span class="sf-count">{{ subFactions().length }} {{ subFactionLabelLower() }}</span>
              </div>
              <div class="sf-grid">
                @for (sf of subFactions(); track sf.id) {
                  <a class="sf-card" [routerLink]="['/subfactions', sf.id]"
                     [style.--sf-img]="subFactionImg(sf.id)">
                    @if (primarchImgUrl(sf.id); as pImg) {
                      <div class="sf-primarch" [title]="sf.primarch">
                        <img [src]="pImg" [alt]="sf.primarch || ''" loading="lazy" />
                      </div>
                    }
                    <div class="sf-content">
                      <span class="sf-type">{{ subFactionTypeLabel(sf.type) }}</span>
                      <h3>{{ sf.name }}</h3>
                      <p>{{ sf.loreShort || sf.description }}</p>
                      @if (sf.primarch) { <span class="sf-meta">Primarque · {{ sf.primarch }}</span> }
                      @else if (sf.homeworld) { <span class="sf-meta">{{ sf.homeworld }}</span> }
                      <span class="u-arrow">→</span>
                    </div>
                  </a>
                }
              </div>
            </section>
          }

          <section class="units" id="units">
            <div class="units-head">
              <h2 class="section-title"><span class="t-flourish">✠</span>Explorer les unités</h2>
            </div>

            <div class="toolbar">
              <div class="filters">
                @for (t of typeFilters; track t.key) {
                  <button class="filter" [class.active]="typeFilter() === t.key" (click)="typeFilter.set(t.key)">
                    {{ t.label }}
                  </button>
                }
              </div>
              <input class="search" type="text" placeholder="Rechercher une unité..."
                     [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
            </div>

            @if (visibleUnits().length === 0) {
              <div class="empty">
                <p>Aucune unité ne correspond pour cette faction.</p>
              </div>
            } @else {
              <div class="units-grid">
                @for (u of displayedUnits(); track u.id) {
                  <article class="unit-card" [routerLink]="['/units', u.id]"
                           [style.--unit-img]="unitImg(u)">
                    <span class="u-badge" [class]="unitBadgeClass(u.type)">{{ u.type }}</span>
                    <div class="unit-content">
                      <h3>{{ u.nom }}</h3>
                      <p>{{ u.loreCourt || u.description || u.role || '—' }}</p>
                      <span class="u-arrow">→</span>
                    </div>
                  </article>
                }
                @if (extraUnitCount() > 0) {
                  <article class="unit-extra" (click)="resetUnitFilters()">
                    <div class="ue-sigil">⚜</div>
                    <h3>Voir toutes les unités</h3>
                    <p>+{{ extraUnitCount() }} autres unités disponibles</p>
                    <span class="u-arrow">→</span>
                  </article>
                }
              </div>
            }
          </section>
        </div>

        <aside class="sidebar">
          <section class="sp">
            <h3>À propos des {{ f.nom }}</h3>
            <p>{{ f.description }}</p>
          </section>

          <section class="sp">
            <h3>Liens rapides</h3>
            @for (l of liensRapides(); track l.label) {
              <div class="row-link">
                <span class="rl-ico">{{ l.ico }}</span>
                <span class="rl-label">{{ l.label }}</span>
              </div>
            }
          </section>

          @if (hasStats()) {
            <section class="sp">
              <h3>Statistiques</h3>
              @if (f.stats?.chapitresConnus) {
                <div class="row-stat"><span>Chapitres connus</span><strong>{{ f.stats!.chapitresConnus }}</strong></div>
              }
              @if (f.stats?.effectifs) {
                <div class="row-stat"><span>Effectifs estimés</span><strong>{{ f.stats!.effectifs }}</strong></div>
              }
              @if (f.stats?.mondeOrigine) {
                <div class="row-stat"><span>Monde d'origine</span><strong>{{ f.stats!.mondeOrigine }}</strong></div>
              }
              @if (f.stats?.allegiance) {
                <div class="row-stat"><span>Allégeance</span><strong>{{ f.stats!.allegiance }}</strong></div>
              }
            </section>
          }

          <section class="sp">
            <h3>Médias</h3>
            @if (featuredVideo(); as v) {
              <a class="media-card" [routerLink]="'/videos'">
                <div class="media-thumb" [style.--m-img]="videoThumb(v)">
                  <span class="play">▶</span>
                  @if (v.duration) { <span class="dur">{{ v.duration }}</span> }
                </div>
                <strong>Vidéo à la une</strong>
                <span>{{ v.titre }}</span>
              </a>
            }
            <a class="media-card" routerLink="/gallery">
              <div class="media-thumb" [style.--m-img]="galleryThumb()">
                <span class="play">▦</span>
              </div>
              <strong>Galerie</strong>
              <span>Illustrations et artworks</span>
            </a>
          </section>

          <section class="sp">
            <h3>Ressources</h3>
            @for (r of ressources(); track r.label) {
              <div class="row-link">
                <span class="rl-ico">{{ r.ico }}</span>
                <span class="rl-label">{{ r.label }}</span>
              </div>
            }
          </section>

          @if (f.citation) {
            <blockquote class="side-quote">
              « {{ f.citation }} »
            </blockquote>
          }
        </aside>
      </section>
    } @else {
      <div class="loading">
        <p>Chargement de la faction...</p>
      </div>
    }
  `,
  styleUrls: ['./faction-detail.component.scss'],
})
export class FactionDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly typeFilters = TYPE_FILTERS;
  readonly typeFilter = signal<UnitType | 'Tous'>('Tous');
  readonly searchQuery = signal('');
  readonly showAllUnits = signal(false);
  readonly heroImage = signal<string | null>(null);
  readonly loreImage = signal<string | null>(null);
  readonly unitImages = signal(new Map<string, string>());

  readonly faction = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getFaction(p.get('id')!)))
  );
  readonly units = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getUnits(p.get('id')!))),
    { initialValue: [] as Unit[] }
  );
  readonly subFactions = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getSubFactions(p.get('id')!))),
    { initialValue: [] as SubFaction[] }
  );
  readonly subFactionImages = signal(new Map<string, string>());
  readonly primarchImages = signal(new Map<string, string>());

  readonly subFactionLabel = computed(() => {
    const list = this.subFactions();
    if (!list.length) return 'Sous-factions';
    const types = new Set(list.map(s => s.type));
    if (types.size === 1) {
      const t = list[0].type;
      const map: Record<string, string> = {
        chapter: 'Chapitres', regiment: 'Régiments', klan: 'Klans',
        craftworld: 'Vaisseaux-Mondes', hivefleet: 'Flottes-Ruches',
        dynasty: 'Dynasties', sept: 'Septs', forgeworld: 'Mondes-Forges',
        order: 'Ordres', legion: 'Légions',
        shield_host: 'Shield Hosts', temple: 'Temples',
        kabal: 'Kabales', wych_cult: 'Cultes Wych',
        haemonculus_coven: 'Covens Haemonculus', brotherhood: 'Brotherhoods',
        kindred: 'Kindreds', cult: 'Cultes',
        other: 'Sous-factions',
      };
      return map[t] ?? 'Sous-factions';
    }
    return 'Sous-factions';
  });

  readonly subFactionLabelLower = computed(() => this.subFactionLabel().toLowerCase());

  subFactionTypeLabel(type: SubFactionType): string {
    const map: Record<SubFactionType, string> = {
      chapter: 'Chapitre', regiment: 'Régiment', klan: 'Klan',
      craftworld: 'Vaisseau-Monde', hivefleet: 'Flotte-Ruche',
      dynasty: 'Dynastie', sept: 'Sept', forgeworld: 'Monde-Forge',
      order: 'Ordre', legion: 'Légion',
      shield_host: 'Shield Host', temple: 'Temple',
      kabal: 'Kabale', wych_cult: 'Culte Wych',
      haemonculus_coven: 'Coven Haemonculus', brotherhood: 'Brotherhood',
      kindred: 'Kindred', cult: 'Culte',
      other: 'Sous-faction',
    };
    return map[type] ?? type;
  }

  primarchImgUrl(id: string): string | null {
    return this.primarchImages().get(id) ?? null;
  }

  subFactionImg(id: string): string | null {
    const url = this.subFactionImages().get(id);
    return url ? `url('${url}')` : null;
  }
  readonly videos = toSignal(this.service.videos$, { initialValue: [] });
  readonly artworks = toSignal(this.service.artworks$, { initialValue: [] });

  readonly visibleUnits = computed(() => {
    const t = this.typeFilter();
    const q = this.searchQuery().toLowerCase().trim();
    let out = this.units();
    if (t !== 'Tous') out = out.filter(u => u.type === t);
    if (q) {
      out = out.filter(u =>
        u.nom.toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q) ||
        (u.description ?? '').toLowerCase().includes(q)
      );
    }
    return out;
  });

  readonly displayedUnits = computed(() =>
    this.showAllUnits() ? this.visibleUnits() : this.visibleUnits().slice(0, 7),
  );
  readonly extraUnitCount = computed(() =>
    this.showAllUnits() ? 0 : Math.max(0, this.visibleUnits().length - 7),
  );

  readonly featuredVideo = computed(() => {
    const vids = this.videos();
    return vids.find(v => v.featured) ?? vids.find(v => v.incontournable) ?? vids[0] ?? null;
  });

  constructor() {
    effect(() => {
      const f = this.faction();
      if (!f) return;
      this.heroImage.set(null);
      this.loreImage.set(null);
      this.showAllUnits.set(false);

      const heroQ = FACTION_WIKI[f.id] ?? f.nom;
      this.service.getWikiImage(heroQ).subscribe({
        next: r => { if (r.imageUrl) this.heroImage.set(r.imageUrl); },
        error: () => {},
      });

      const loreQ = FACTION_LORE_IMG[f.id] ?? f.nom + ' battle';
      this.service.getWikiImage(loreQ).subscribe({
        next: r => { if (r.imageUrl) this.loreImage.set(r.imageUrl); },
        error: () => {},
      });
    });

    effect(() => {
      const list = this.units();
      if (!list.length) return;
      list.forEach(u => {
        if (this.unitImages().has(u.id)) return;
        const datasheetUrl = `/api/images/datasheets/${u.id}`;
        fetch(datasheetUrl, { method: 'HEAD' }).then(head => {
          if (head.ok) {
            this.unitImages.update(m => new Map(m).set(u.id, datasheetUrl));
          } else {
            this.service.getWikiImage(u.wikiQuery ?? u.nom).subscribe({
              next: r => {
                if (r.imageUrl) {
                  this.unitImages.update(m => new Map(m).set(u.id, r.imageUrl!));
                }
              },
              error: () => {},
            });
          }
        }).catch(() => {});
      });
    });

    effect(() => {
      const list = this.subFactions();
      if (!list.length) return;
      list.forEach(s => {
        if (this.subFactionImages().has(s.id)) return;
        const q = s.wikiQuery ?? `${s.name} warhammer`;
        this.service.getWikiImage(q).subscribe({
          next: r => {
            if (r.imageUrl) {
              this.subFactionImages.update(m => new Map(m).set(s.id, r.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });

    // Charge images primarques pour mini-portrait dans sous-faction card
    effect(() => {
      const list = this.subFactions();
      if (!list.length) return;
      list.forEach(s => {
        if (!s.primarchWikiQuery || this.primarchImages().has(s.id)) return;
        this.service.getWikiImage(s.primarchWikiQuery).subscribe({
          next: r => {
            if (r.imageUrl) {
              this.primarchImages.update(m => new Map(m).set(s.id, r.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  scrollToUnits() {
    document.getElementById('units')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  resetUnitFilters() {
    this.typeFilter.set('Tous');
    this.searchQuery.set('');
    this.showAllUnits.set(true);
  }

  heroImg(): string {
    const url = this.heroImage();
    if (url) return `url('${url}')`;
    const f = this.faction();
    if (f) return `linear-gradient(135deg, ${f.couleurThematique}cc 0%, #050403 80%)`;
    return 'none';
  }

  loreImg(): string {
    const url = this.loreImage();
    if (url) return `url('${url}')`;
    return 'linear-gradient(135deg, #2a1c10 0%, #050403 100%)';
  }

  unitImg(u: Unit): string {
    const url = this.unitImages().get(u.id);
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}aa 0%, #050403 100%)`;
  }

  unitBadgeClass(t: UnitType): string {
    switch (t) {
      case 'Infanterie': return 'u-badge ub-infanterie';
      case 'Véhicule':   return 'u-badge ub-vehicule';
      case 'Héros':      return 'u-badge ub-heros';
      case 'Psyker':     return 'u-badge ub-psyker';
      case 'Monstre':    return 'u-badge ub-monstre';
      default: return 'u-badge';
    }
  }

  liensRapides() {
    const f = this.faction();
    if (f?.liensRapides?.length) {
      return f.liensRapides.map((label, i) => ({
        ico: DEFAULT_LIENS[i % DEFAULT_LIENS.length].ico,
        label,
      }));
    }
    return DEFAULT_LIENS;
  }

  ressources() {
    const f = this.faction();
    if (f?.resources?.length) {
      return f.resources.map((label, i) => ({
        ico: DEFAULT_RESOURCES[i % DEFAULT_RESOURCES.length].ico,
        label,
      }));
    }
    return DEFAULT_RESOURCES;
  }

  hasStats(): boolean {
    const s = this.faction()?.stats;
    return !!(s?.chapitresConnus || s?.effectifs || s?.mondeOrigine || s?.allegiance);
  }

  loreFallback(f: Faction, key: 'origine' | 'organisation' | 'doctrine'): string {
    const fallbacks = {
      origine: `Les ${f.nom} trouvent leurs racines dans les profondeurs du 41e millénaire. Leur histoire est marquée par la guerre éternelle qui ravage la galaxie.`,
      organisation: `Structurés selon leurs propres traditions et doctrines, les ${f.nom} forment une force redoutable au sein de leur faction.`,
      doctrine: `${f.description} Leur doctrine guide chacun de leurs actes dans la sombre éternité de l'Imperium et au-delà.`,
    };
    return fallbacks[key];
  }

  videoThumb(v: { thumbnail?: string; embedId: string | null }): string {
    if (v.thumbnail) return `url('${v.thumbnail}')`;
    if (v.embedId) return `url('https://i.ytimg.com/vi/${v.embedId}/hqdefault.jpg')`;
    return 'linear-gradient(135deg, #1a1612, #050403)';
  }

  galleryThumb(): string {
    const arts = this.artworks();
    const first = arts[0];
    if (first?.image) return `url('${first.image}')`;
    return 'linear-gradient(135deg, #2a1c10, #050403)';
  }
}
