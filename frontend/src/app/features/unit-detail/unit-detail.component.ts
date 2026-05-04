import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { Faction, Unit, UnitType } from '../../core/models/models';

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

const DEFAULT_LIENS = [
  { ico: '⚜', key: 'faction',     label: 'Voir la faction' },
  { ico: '⚔', key: 'all-units',   label: 'Voir toutes les unités' },
  { ico: '▤', key: 'lore',        label: 'Histoire & contexte' },
  { ico: '☖', key: 'codex',       label: 'Codex de référence' },
];

const DEFAULT_RESOURCES = [
  { ico: '▤', label: 'Lexique Warhammer 40,000' },
  { ico: '⊛', label: 'Carte galactique' },
  { ico: '☖', label: 'Bibliothèque des archives' },
  { ico: '✎', label: 'Voir les romans liés' },
];

const KEY_ICONS = ['⚜', '✠', '⚔'];

const DEFAULT_CAPACITIES = [
  'Polyvalent dans toutes les situations de combat.',
  'Équilibré entre offensive et défense.',
  'Idéal pour tenir des objectifs stratégiques.',
  'Efficace à moyenne portée.',
];

const DEFAULT_EQUIPMENT_ICONS = ['⌖', '⚔', '◈', '※'];

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (unit(); as u) {
      @if (faction(); as f) {
        <div class="topbar">
          <a class="back-btn" [routerLink]="['/factions', f.id]">← RETOUR AUX UNITÉS</a>
          <div class="topbar-actions">
            <button class="iconbtn" type="button" title="Bookmark"><span>☖</span></button>
            <button class="iconbtn" type="button" title="Partager"><span>↗</span></button>
          </div>
        </div>

        <section class="hero" [style.--hero-img]="unitImg()">
          <div class="hero-text">
            <h1>{{ u.nom }}</h1>
            <div class="hero-badges">
              @for (b of badges(u, f); track b.label) {
                <span class="ub" [class]="b.cls">{{ b.label }}</span>
              }
              @if (f.symbole || f.iconUrl) {
                <span class="hero-sigil">
                  @if (f.iconUrl) {
                    <img [src]="f.iconUrl" [alt]="f.nom" />
                  } @else {
                    {{ f.symbole }}
                  }
                </span>
              }
            </div>
            @if (u.role) {
              <p class="hero-role">{{ u.role }}.</p>
            }
            <p class="hero-desc">{{ u.description || u.loreCourt || f.description }}</p>
            <div class="hero-cta">
              <a class="cta cta-solid" routerLink="/gallery">
                <span class="cta-ico">▦</span>VOIR DANS LA GALERIE
              </a>
              <a class="cta cta-outline" routerLink="/videos">
                <span class="cta-ico">▶</span>VOIR LA VIDÉO
              </a>
            </div>
          </div>
        </section>

        <nav class="tabs">
          @for (t of tabs; track t.key) {
            <button class="tab" [class.active]="activeTab() === t.key" (click)="activeTab.set(t.key)">
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
                    <p class="panel-text">{{ u.loreLong || u.description || u.loreCourt || fallbackDesc(u, f) }}</p>
                  </article>

                  <article class="panel">
                    <h2 class="panel-title">Capacités principales</h2>
                    <ul class="cap-list">
                      @for (c of capacities(u); track c) {
                        <li>
                          <span class="cap-ico">⚜</span>
                          <span>{{ c }}</span>
                        </li>
                      }
                    </ul>
                  </article>
                }

                <article class="panel panel-equip">
                  <h2 class="panel-title">Équipement standard</h2>
                  <div class="equip-grid">
                    <div class="equip-figure" [style.--fig-img]="unitImg()"></div>
                    <ul class="equip-list">
                      @for (e of equipment(u); track e.name; let i = $index) {
                        <li>
                          <span class="eq-ico">{{ e.icon || equipIcon(i) }}</span>
                          <div>
                            <strong>{{ e.name }}</strong>
                            <span>{{ e.description || '—' }}</span>
                          </div>
                        </li>
                      }
                    </ul>
                  </div>
                </article>

                @if (activeTab() === 'apercu') {
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
                  <p class="panel-text">{{ u.loreLong || u.description || fallbackLore(u, f) }}</p>
                  <div class="lore-img" [style.--lore-img]="loreImg()"></div>
                </div>
                @if (u.citation) {
                  <blockquote class="inline-quote">« {{ u.citation }} »</blockquote>
                }
              </article>
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
              <a class="row-link" routerLink="/romans">
                <span class="rl-ico">▤</span>
                <span class="rl-label">Histoire de l'unité</span>
                <span class="rl-arrow">›</span>
              </a>
              <a class="row-link" routerLink="/romans">
                <span class="rl-ico">☖</span>
                <span class="rl-label">Codex {{ f.nom }}</span>
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

            <section class="sp">
              <h3>Ressources</h3>
              @for (r of resources; track r.label) {
                <div class="row-link">
                  <span class="rl-ico">{{ r.ico }}</span>
                  <span class="rl-label">{{ r.label }}</span>
                </div>
              }
            </section>

            <button class="report-btn" type="button">
              <span>⚠</span>SIGNALER UNE ERREUR
            </button>
          </aside>
        </section>
      } @else {
        <div class="loading"><p>Chargement de la faction...</p></div>
      }
    } @else {
      <div class="loading"><p>Chargement de l'unité...</p></div>
    }
  `,
  styleUrls: ['./unit-detail.component.scss'],
})
export class UnitDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs = TABS;
  readonly resources = DEFAULT_RESOURCES;
  readonly KEY_ICONS = KEY_ICONS;
  readonly activeTab = signal<TabKey>('apercu');

  readonly heroImage = signal<string | null>(null);
  readonly loreImage = signal<string | null>(null);
  readonly relatedImages = signal(new Map<string, string>());
  readonly variantImages = signal(new Map<string, string>());

  readonly unit = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getUnit(p.get('id')!))),
  );

  readonly faction = toSignal<Faction | undefined>(
    this.route.paramMap.pipe(
      switchMap(p => this.service.getUnit(p.get('id')!)),
      switchMap(u => u ? this.service.getFaction(u.factionId) : of(undefined)),
    ),
  );

  readonly relatedUnits = toSignal(
    this.route.paramMap.pipe(
      switchMap(p => this.service.getUnit(p.get('id')!)),
      switchMap(u => {
        if (!u) return of([] as Unit[]);
        if (u.relatedUnitIds?.length) {
          return forkJoin(u.relatedUnitIds.slice(0, 4).map(id => this.service.getUnit(id)));
        }
        return this.service.getUnits(u.factionId).pipe(
          switchMap(list => of(list.filter(x => x.id !== u.id).slice(0, 4))),
        );
      }),
    ),
    { initialValue: [] as Unit[] },
  );

  constructor() {
    effect(() => {
      const u = this.unit();
      const f = this.faction();
      if (!u || !f) return;
      this.heroImage.set(null);
      this.loreImage.set(null);

      const datasheetUrl = `/api/images/datasheets/${u.id}`;
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

      const loreQ = `${f.nom} battle warhammer`;
      this.service.getWikiImage(loreQ).subscribe({
        next: r => { if (r.imageUrl) this.loreImage.set(r.imageUrl); },
        error: () => {},
      });
    });

    effect(() => {
      const list = this.relatedUnits();
      list.forEach(r => {
        if (this.relatedImages().has(r.id)) return;
        const datasheetUrl = `/api/images/datasheets/${r.id}`;
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

  badges(u: Unit, f: Faction): { label: string; cls: string }[] {
    const arr: { label: string; cls: string }[] = [];
    arr.push({ label: u.type, cls: 'ub ' + this.typeBadgeClass(u.type) });
    if (u.badges?.length) {
      u.badges.forEach(b => arr.push({ label: b, cls: 'ub ' + this.simpleBadgeClass(b) }));
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

  capacities(u: Unit): string[] {
    if (u.capacities?.length) return u.capacities;
    return DEFAULT_CAPACITIES;
  }

  equipment(u: Unit): { name: string; description?: string; icon?: string }[] {
    if (u.equipment?.length) return u.equipment;
    return [
      { name: 'Arme principale', description: 'Équipement standard du modèle.', icon: '⌖' },
      { name: 'Arme de mêlée',   description: 'Couteau, épée, ou équivalent selon la doctrine.', icon: '⚔' },
      { name: 'Armure',          description: 'Protection adaptée au rôle de combat.', icon: '◈' },
      { name: 'Équipement supplémentaire', description: 'Grenades, équipement tactique, vox.', icon: '※' },
    ];
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

  fallbackDesc(u: Unit, f: Faction): string {
    return `${u.nom} est une unité au service des ${f.nom}. ${f.description}`;
  }

  fallbackLore(u: Unit, f: Faction): string {
    return `Au sein des ${f.nom}, les ${u.nom} jouent un rôle déterminant. Leur histoire se confond avec celle de leur faction et de la guerre éternelle qui ravage la galaxie.`;
  }
}
