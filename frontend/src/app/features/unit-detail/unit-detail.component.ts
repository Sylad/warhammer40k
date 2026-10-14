import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, of, switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { namedPage, PageTitleService } from '../../core/services/page-title.service';
import { Faction, Unit, UnitType, Artwork, Video } from '../../core/models/models';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { retryAll, toSafeSignal } from '../../shared/safe-signal';

type TabKey = 'apercu' | 'equipement' | 'lore' | 'variantes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'apercu',     label: 'Aperçu' },
  { key: 'equipement', label: 'Équipement' },
  { key: 'lore',       label: 'Histoire & Lore' },
  { key: 'variantes',  label: 'Variantes' },
];

const STAT_ROWS: { key: keyof NonNullable<Unit['stats']>; label: string }[] = [
  { key: 'endurance',    label: 'Endurance' },
  { key: 'resistance',   label: 'Résistance' },
  { key: 'puissanceFeu', label: 'Puissance de feu' },
  { key: 'mobilite',     label: 'Mobilité' },
  { key: 'portee',       label: 'Portée' },
  { key: 'soutien',      label: 'Soutien' },
];

const KEY_ICONS = ['⚜', '✠', '⚔'];

const DEFAULT_EQUIPMENT_ICONS = ['⌖', '⚔', '◈', '※'];

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [LoadErrorComponent, CommonModule, FormsModule, RouterLink],
  template: `
    @if (unit(); as u) {
      @if (faction() && (relatedUnits.failed() || allArtworks.failed())) {
        <app-load-error message="Une partie de cette fiche n’a pas pu être chargée." (retry)="retryAll(unit, faction, relatedUnits, allArtworks)" />
      }
      @if (faction(); as f) {
        <div class="topbar">
          <a class="back-btn" [routerLink]="['/factions', f.id]" fragment="units">← RETOUR AUX UNITÉS</a>
          <div class="topbar-actions">
            <button class="iconbtn" type="button" [title]="shareCopied() ? 'Lien copié' : 'Partager'" (click)="shareUnit(u)">
              <span>{{ shareCopied() ? '✓' : '↗' }}</span>
            </button>
          </div>
        </div>

        <section class="hero hero-flicker" [style.--hero-img]="unitImg()">
          <div class="dust-motes" aria-hidden="true"></div>
          <div class="hero-text">
            <h1>{{ u.nom }}</h1>
            <div class="hero-badges">
              @for (b of badges(u, f); track b.label) {
                <span class="ub" [class]="b.cls">{{ b.label }}</span>
              }
              @if (f.symbole || f.iconUrl) {
                <span class="hero-sigil">
                  @if (f.iconUrl && !brokenIcons().has(f.id)) {
                    <img [src]="f.iconUrl" [alt]="f.nom" (error)="iconFailed(f.id)" />
                  } @else {
                    <span aria-hidden="true">{{ f.symbole }}</span>
                  }
                </span>
              }
            </div>
            @if (u.role) {
              <p class="hero-role">{{ u.role }}.</p>
            }
            <p class="hero-desc">{{ u.description || u.loreCourt || f.description }}</p>
            <div class="hero-cta">
              <a class="cta cta-solid" routerLink="/gallery" [queryParams]="{ faction: f.id }">
                <span class="cta-ico" aria-hidden="true">▦</span>VOIR DANS LA GALERIE
              </a>
              @if (linkedVideo(); as v) {
                <a class="cta cta-outline" routerLink="/videos" [queryParams]="{ video: v.id }"
                   [attr.aria-label]="'Voir la vidéo : ' + v.titre">
                  <span class="cta-ico" aria-hidden="true">▶</span>VOIR LA VIDÉO
                </a>
              }
            </div>
          </div>
        </section>

        <nav class="tabs" aria-label="Sections de la fiche">
          @for (t of tabs; track t.key) {
            <button class="tab" [class.active]="activeTab() === t.key" [attr.aria-current]="activeTab() === t.key ? 'true' : null" (click)="activeTab.set(t.key)">
              {{ t.label }}
            </button>
          }
        </nav>

        <section class="layout">
          <div class="main">
            <!-- APERÇU -->
            @if (activeTab() === 'apercu' || activeTab() === 'equipement') {
              <div class="grid-2">
                @if (activeTab() === 'apercu') {
                  <article class="panel">
                    <h2 class="panel-title">Description</h2>
                    <p class="panel-text">{{ descriptionPanel(u, f) }}</p>
                  </article>

                  @if (u.capacities?.length) {
                    <article class="panel">
                      <h2 class="panel-title">Capacités principales</h2>
                      <ul class="cap-list">
                        @for (c of u.capacities; track c) {
                          <li>
                            <span class="cap-ico">⚜</span>
                            <span>{{ c }}</span>
                          </li>
                        }
                      </ul>
                    </article>
                  }
                }

                @if (u.equipment?.length) {
                  <article class="panel panel-equip">
                    <h2 class="panel-title">Équipement standard</h2>
                    <div class="equip-grid">
                      <div class="equip-figure" [style.--fig-img]="unitImg()"></div>
                      <ul class="equip-list">
                        @for (e of u.equipment; track e.name; let i = $index) {
                          <li class="equip-item" [class.equip-item-with-image]="!!e.image">
                            @if (e.image) {
                              <span class="eq-thumb" [style.background-image]="'url(' + e.image + ')'" aria-hidden="true"></span>
                            } @else {
                              <span class="eq-ico">{{ e.icon || equipIcon(i) }}</span>
                            }
                            <div>
                              <strong>{{ e.name }}</strong>
                              <span>{{ e.description || '—' }}</span>
                            </div>
                          </li>
                        }
                      </ul>
                    </div>
                  </article>
                } @else if (activeTab() === 'equipement') {
                  <article class="panel panel-empty">
                    <h2 class="panel-title">Équipement</h2>
                    <p class="panel-text">L'arsenal détaillé de cette unité n'est pas encore consigné dans nos archives. Consulte la fiche faction ou la galerie pour le contexte visuel.</p>
                  </article>
                }

                @if (activeTab() === 'apercu' && u.stats) {
                  <article class="panel panel-stats">
                    <h2 class="panel-title">Stats (approx.)</h2>
                    <div class="stats-list">
                      @for (s of statsRows(u); track s.label) {
                        <div class="stat-row">
                          <span class="stat-lbl">{{ s.label }}</span>
                          <span class="stat-val">{{ s.value }}</span>
                          <div class="stat-bar"><div class="stat-fill" [style.width.%]="s.value * 10"></div></div>
                          <span class="stat-val">{{ s.value }}</span>
                        </div>
                      }
                    </div>
                    <h3 class="panel-sub">Icônes clés</h3>
                    <div class="key-icons">
                      @for (k of keyIcons(u, f); track k.label; let i = $index) {
                        <div class="ki">
                          <span class="ki-glyph">{{ KEY_ICONS[i % KEY_ICONS.length] }}</span>
                          <span class="ki-lbl">{{ k.label }}</span>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            }

            <!-- HISTOIRE & LORE -->
            @if (activeTab() === 'apercu' || activeTab() === 'lore') {
              <article class="panel panel-lore">
                <h2 class="panel-title">Histoire & Lore</h2>
                <div class="lore-grid">
                  <p class="panel-text">{{ u.loreLong || fallbackLore(u, f) }}</p>
                  <div class="lore-img" [style.--lore-img]="loreImg()"></div>
                </div>
              </article>

              @if (galleryImages().length > 0) {
                <article class="panel panel-iconography">
                  <h2 class="panel-title">Iconographie</h2>
                  <p class="panel-sub-text">Le personnage à travers les illustrations canoniques.</p>
                  <div class="iconography-grid">
                    @for (g of galleryImages(); track g) {
                      <a class="iconography-card" routerLink="/gallery" [queryParams]="{ faction: f.id }"
                         [style.--g-img]="'url(' + g + ')'"
                         aria-label="Voir dans la galerie"></a>
                    }
                  </div>
                </article>
              }
            }

            <!-- VARIANTES -->
            @if (activeTab() === 'apercu' || activeTab() === 'variantes') {
              @if (u.variants?.length) {
                <article class="panel">
                  <h2 class="panel-title">Variantes &amp; options</h2>
                  <div class="variants-grid">
                    @for (v of u.variants; track v.id) {
                      <div class="variant-card" [style.--v-img]="variantImg(v.image)">
                        <strong>{{ v.name }}</strong>
                        @if (v.description) {
                          <span>{{ v.description }}</span>
                        }
                      </div>
                    }
                  </div>
                </article>
              }
            }

          </div>

          <aside class="sidebar">
            <section class="sp">
              <h3>Informations clés</h3>
              @for (info of infoRows(u, f); track info.label) {
                <div class="info-row">
                  <span class="info-ico">{{ info.ico }}</span>
                  <div>
                    <strong>{{ info.label }}</strong>
                    <span>{{ info.value }}</span>
                  </div>
                </div>
              }
            </section>

            <section class="sp">
              <h3>Liens rapides</h3>
              <a class="row-link" [routerLink]="['/factions', f.id]">
                <span class="rl-ico">⚜</span>
                <span class="rl-label">{{ f.nom }}</span>
                <span class="rl-arrow">›</span>
              </a>
              <a class="row-link" [routerLink]="['/factions', f.id]" fragment="units">
                <span class="rl-ico">⚔</span>
                <span class="rl-label">Voir toutes les unités</span>
                <span class="rl-arrow">›</span>
              </a>
            </section>

            @if (relatedUnits().length) {
              <section class="sp">
                <h3>Unités associées</h3>
                @for (r of relatedUnits(); track r.id) {
                  <a class="related" [routerLink]="['/units', r.id]" [style.--r-img]="relatedImg(r)">
                    <div class="related-thumb"></div>
                    <div class="related-info">
                      <strong>{{ r.nom }}</strong>
                      <span>{{ r.type }}</span>
                    </div>
                  </a>
                }
                <a class="cta cta-outline cta-block" [routerLink]="['/factions', f.id]" fragment="units">
                  VOIR TOUTES LES UNITÉS
                </a>
              </section>
            }

            @if (factionArtworks().length) {
              <section class="sp">
                <h3>Galerie liée</h3>
                <div class="art-grid">
                  @for (a of factionArtworks(); track a.id) {
                    <a class="art-thumb"
                       routerLink="/gallery"
                       [queryParams]="{ q: a.title }"
                       [style.background-image]="artworkBg(a)"
                       [attr.aria-label]="a.title">
                      <span class="art-thumb-title">{{ a.title }}</span>
                    </a>
                  }
                </div>
                <a class="cta cta-outline cta-block" routerLink="/gallery">
                  VOIR LA GALERIE
                </a>
              </section>
            }

            @if (u.citation) {
              <section class="sp sp-quote">
                <h3>Citation</h3>
                <blockquote>
                  <span class="q-mark">“</span>
                  <span class="q-text">{{ u.citation }}</span>
                  <span class="q-mark q-end">”</span>
                </blockquote>
                <span class="q-source">— Litanies de Bataille</span>
              </section>
            }

          </aside>
        </section>
      } @else {
        @if (faction.failed()) {
          <app-load-error [notFound]="faction.notFound()" [heading]="faction.notFound() ? 'Faction introuvable' : 'Faction indisponible'" backLink="/factions" backLabel="Toutes les factions" (retry)="retryAll(unit, faction, relatedUnits, allArtworks)" />
        } @else {
          <div class="loading"><p>Chargement de la faction...</p></div>
        }
      }
    } @else if (unit.failed()) {
      <app-load-error [notFound]="unit.notFound()" [heading]="unit.notFound() ? 'Unité introuvable' : 'Unité indisponible'" backLink="/factions" backLabel="Toutes les factions" (retry)="retryAll(unit, faction, relatedUnits, allArtworks)" />
    } @else {
      <div class="loading"><p>Chargement de l'unité...</p></div>
    }
  `,
  styleUrls: ['./unit-detail.component.scss'],
})
export class UnitDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly pages = inject(PageTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** L39 : icône de faction introuvable (404 sur le wiki) → symbole de la faction à la place. */
  readonly brokenIcons = signal(new Set<string>());
  iconFailed(id: string): void {
    this.brokenIcons.update(s => new Set(s).add(id));
  }

  readonly tabs = TABS;
  readonly KEY_ICONS = KEY_ICONS;
  readonly activeTab = signal<TabKey>('apercu');
  readonly shareCopied = signal(false);

  readonly heroImage = signal<string | null>(null);
  readonly loreImage = signal<string | null>(null);
  readonly relatedImages = signal(new Map<string, string>());
  readonly variantImages = signal(new Map<string, string>());
  readonly galleryImages = signal<string[]>([]);

  // Catalog artworks (shared replay) — utilisé par la sidebar "Galerie liée"
  // pour proposer les œuvres de la même faction que l'unit courant.
  protected readonly allArtworks = toSafeSignal(this.service.artworks$, [] as Artwork[]);
  // Cache des URLs résolues via wiki pour les artworks de la sidebar.
  readonly artworkImageCache = signal(new Map<string, string>());

  protected readonly retryAll = retryAll;
  // Vidéos du codex : aucune n'est rattachée à une unité, seul un tag (nom de l'unité ou de la
  // faction) fait le lien. Sans correspondance, le CTA « Voir la vidéo » n'est pas proposé.
  // Plusieurs vidéos peuvent correspondre (« Space Marines » : une parodie, un court-métrage, une
  // série officielle) : la meilleure gagne, à rang égal la première de la liste.
  //   0 = tag égal au nom de l'unité · 1 = tag faction + Officiel / Chef-d'œuvre / Film / Série
  //   2 = tag faction simple · 3 = Parodie / Humour (en dernier, même si le tag faction y est)
  private readonly videos = toSafeSignal(this.service.videos$, [] as Video[]);
  readonly linkedVideo = computed<Video | null>(() => {
    const u = this.unit();
    const f = this.faction();
    if (!u || !f) return null;
    const fold = (t: string) => t.trim().toLowerCase().replace(/[’‘]/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const unitName = fold(u.nom);
    const factionNames = new Set([f.nom, f.id].map(fold));
    const GOOD = new Set(['officiel', "chef-d'œuvre", 'film', 'série', 'serie'].map(fold));
    const JOKE = new Set(['parodie', 'humour'].map(fold));
    let best: Video | null = null;
    let bestRank = Infinity;
    for (const v of this.videos()) {
      const tags = (v.tags ?? []).map(fold);
      let rank: number;
      if (tags.includes(unitName)) rank = 0;
      else if (!tags.some(t => factionNames.has(t))) continue;
      else if (tags.some(t => JOKE.has(t))) rank = 3;
      else rank = tags.some(t => GOOD.has(t)) ? 1 : 2;
      if (rank < bestRank) { best = v; bestRank = rank; }
    }
    return best;
  });

  readonly unit = toSafeSignal(
    this.route.paramMap, p => this.service.getUnit(p.get('id')!).pipe(namedPage(this.pages, u => u.nom)), undefined);

  // L97 : faction et unités liées se déduisent de l'unité déjà chargée (un seul getUnit par affichage).
  private readonly unit$ = toObservable(this.unit);

  readonly faction = toSafeSignal<Unit | undefined, Faction | undefined, undefined>(
    this.unit$,
    u => u ? this.service.getFaction(u.factionId) : of(undefined),
    undefined,
  );

  readonly relatedUnits = toSafeSignal(
    this.unit$,
    u => {
      if (!u) return of([] as Unit[]);
      if (u.relatedUnitIds?.length) {
        return forkJoin(u.relatedUnitIds.slice(0, 4).map(id => this.service.getUnit(id)));
      }
      return this.service.getUnits(u.factionId).pipe(
        switchMap(list => of(list.filter(x => x.id !== u.id).slice(0, 4))),
      );
    }, [] as Unit[]);

  /** Œuvres du catalog de la faction courante — sidebar "Galerie liée". */
  readonly factionArtworks = computed<Artwork[]>(() => {
    const f = this.faction();
    if (!f) return [];
    const all = this.allArtworks();
    return all.filter(a => a.faction === f.id).slice(0, 4);
  });

  constructor() {
    effect(() => {
      const u = this.unit();
      const f = this.faction();
      if (!u || !f) return;
      this.heroImage.set(null);
      this.loreImage.set(null);

      const datasheetUrl = this.service.datasheetUrl(u.id);
      fetch(datasheetUrl, { method: 'HEAD' }).then(r => {
        if (r.ok) {
          this.heroImage.set(datasheetUrl);
        } else {
          this.service.getWikiImage(u.wikiQuery ?? u.nom).subscribe({
            next: res => { if (res.imageUrl) this.heroImage.set(res.imageUrl); },
            error: () => {},
          });
        }
      }).catch(() => {
        this.service.getWikiImage(u.wikiQuery ?? u.nom).subscribe({
          next: res => { if (res.imageUrl) this.heroImage.set(res.imageUrl); },
          error: () => {},
        });
      });

      const loreQ = u.loreImageQuery ?? `${f.nom} battle warhammer`;
      this.service.getWikiImage(loreQ).subscribe({
        next: r => { if (r.imageUrl) this.loreImage.set(r.imageUrl); },
        error: () => {},
      });

      // Galerie liée — résout galleryQueries (max 6) en parallèle
      const queries = (u.galleryQueries ?? []).slice(0, 6);
      this.galleryImages.set([]);
      queries.forEach(q => {
        this.service.getWikiImage(q).subscribe({
          next: r => {
            if (r.imageUrl) {
              this.galleryImages.update(arr => [...arr, r.imageUrl!]);
            }
          },
          error: () => {},
        });
      });
    });


    effect(() => {
      const list = this.relatedUnits();
      list.forEach(r => {
        if (this.relatedImages().has(r.id)) return;
        const datasheetUrl = this.service.datasheetUrl(r.id);
        fetch(datasheetUrl, { method: 'HEAD' }).then(head => {
          if (head.ok) {
            this.relatedImages.update(m => new Map(m).set(r.id, datasheetUrl));
          } else {
            this.service.getWikiImage(r.wikiQuery ?? r.nom).subscribe({
              next: res => {
                if (res.imageUrl) {
                  this.relatedImages.update(m => new Map(m).set(r.id, res.imageUrl!));
                }
              },
              error: () => {},
            });
          }
        }).catch(() => {});
      });
    });

    // Sidebar "Galerie liée" : lazy-résolution des wikiQuery du catalog
    effect(() => {
      const arts = this.factionArtworks();
      arts.forEach(a => {
        if (!a.wikiQuery || this.artworkImageCache().has(a.id)) return;
        this.service.getWikiImage(a.wikiQuery).subscribe({
          next: r => {
            if (r.imageUrl) {
              this.artworkImageCache.update(m => new Map(m).set(a.id, r.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });

    effect(() => {
      const u = this.unit();
      if (!u?.variants?.length) return;
      u.variants.forEach(v => {
        if (this.variantImages().has(v.id)) return;
        const q = v.image || `${u.nom} ${v.name}`;
        this.service.getWikiImage(q).subscribe({
          next: res => {
            if (res.imageUrl) {
              this.variantImages.update(m => new Map(m).set(v.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  unitImg(): string {
    const url = this.heroImage();
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}cc, #050403)`;
  }

  loreImg(): string {
    const url = this.loreImage();
    if (url) return `url('${url}')`;
    return 'linear-gradient(135deg, #2a1c10, #050403)';
  }

  variantImg(image?: string): string {
    if (!image) return 'none';
    if (image.startsWith('http')) return `url('${image}')`;
    const u = this.unit();
    if (!u) return 'none';
    const found = u.variants?.find(v => v.image === image);
    if (found) {
      const url = this.variantImages().get(found.id);
      if (url) return `url('${url}')`;
    }
    return `url('${image}')`;
  }

  relatedImg(r: Unit): string {
    const url = this.relatedImages().get(r.id);
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}aa, #050403)`;
  }

  artworkBg(a: Artwork): string {
    const url = this.artworkImageCache().get(a.id);
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}aa, #050403)`;
  }

  badges(u: Unit, f: Faction): { label: string; cls: string }[] {
    const arr: { label: string; cls: string }[] = [];
    arr.push({ label: u.type, cls: 'ub ' + this.typeBadgeClass(u.type) });
    // Le type et l'alignement ont leur pastille stylée : un badge de données qui les répète est ignoré.
    // L130 : équivalence sans casse, sans accent et entre français et anglais (« Héros » = « Hero »).
    const EN_FR: Record<string, string> = { hero: 'heros', vehicle: 'vehicule', monster: 'monstre', infantry: 'infanterie' };
    const canon = (s: string) => {
      const k = s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
      return EN_FR[k] ?? k;
    };
    const same = (a: string, b: string) => canon(a) === canon(b);
    if (u.badges?.length) {
      u.badges.filter(b => !same(b, u.type) && !same(b, f.alignement)).forEach(b => arr.push({ label: b, cls: 'ub ' + this.simpleBadgeClass(b) }));
    } else {
      if (u.type === 'Infanterie') arr.push({ label: 'Ligne', cls: 'ub ub-ligne' });
    }
    arr.push({ label: f.alignement, cls: 'ub ' + this.alignBadgeClass(f.alignement) });
    return arr;
  }

  typeBadgeClass(t: UnitType): string {
    switch (t) {
      case 'Infanterie': return 'ub-infanterie';
      case 'Véhicule':   return 'ub-vehicule';
      case 'Héros':      return 'ub-heros';
      case 'Psyker':     return 'ub-psyker';
      case 'Monstre':    return 'ub-monstre';
      default: return '';
    }
  }
  simpleBadgeClass(b: string): string {
    const v = b.toLowerCase();
    if (v.includes('ligne')) return 'ub-ligne';
    if (v.includes('imperium')) return 'ub-imperium';
    if (v.includes('chaos')) return 'ub-chaos';
    return '';
  }
  alignBadgeClass(a: string): string {
    const v = a.toLowerCase();
    if (v === 'imperium') return 'ub-imperium';
    if (v === 'chaos') return 'ub-chaos';
    return 'ub-xenos';
  }


  equipIcon(i: number): string {
    return DEFAULT_EQUIPMENT_ICONS[i % DEFAULT_EQUIPMENT_ICONS.length];
  }

  statsRows(u: Unit): { label: string; value: number }[] {
    return STAT_ROWS.map(s => ({ label: s.label, value: u.stats?.[s.key] ?? 3 }));
  }

  keyIcons(u: Unit, f: Faction): { label: string }[] {
    const arr: { label: string }[] = [];
    arr.push({ label: f.alignement });
    arr.push({ label: f.nom });
    if (u.badges?.[0]) arr.push({ label: u.badges[0] }); else arr.push({ label: u.type });
    return arr;
  }

  infoRows(u: Unit, f: Faction): { ico: string; label: string; value: string }[] {
    return [
      { ico: '☗', label: 'Rôle',              value: u.role || u.type },
      { ico: '⚜', label: 'Allégeance',         value: f.alignement },
      { ico: '✠', label: 'Faction d\'origine', value: f.nom },
      { ico: '☖', label: 'Taille d\'unité',    value: u.tailleUnite || '—' },
      { ico: '◈', label: 'Points (approx.)',   value: u.pointsCost ? `${u.pointsCost} pts` : '—' },
      { ico: '⌚', label: 'Apparition',         value: u.apparition || '—' },
    ];
  }

  /** Texte du panneau Description : jamais `loreLong` (réservé à Histoire & Lore, L125) ; évite aussi de répéter le texte du hero. */
  descriptionPanel(u: Unit, f: Faction): string {
    const hero = u.description || u.loreCourt || f.description;
    if (u.loreCourt && u.loreCourt !== hero) return u.loreCourt;
    return u.description || u.loreCourt || this.fallbackDesc(u, f);
  }

  fallbackDesc(u: Unit, f: Faction): string {
    return `${u.nom} est une unité au service des ${f.nom}. ${f.description}`;
  }

  fallbackLore(u: Unit, f: Faction): string {
    return `Au sein des ${f.nom}, les ${u.nom} jouent un rôle déterminant. Leur histoire se confond avec celle de leur faction et de la guerre éternelle qui ravage la galaxie.`;
  }

  async shareUnit(unit: Unit): Promise<void> {
    const url = window.location.href;
    const title = `${unit.nom} — Codex Warhammer 40,000`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.shareCopied.set(true);
      window.setTimeout(() => this.shareCopied.set(false), 1600);
    } catch {
      this.shareCopied.set(false);
    }
  }
}
