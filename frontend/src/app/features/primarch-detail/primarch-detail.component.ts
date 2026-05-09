import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of, switchMap, forkJoin } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Primarch, PrimarchAllegiance, PrimarchStatus } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';

const ALLEGIANCE_LABEL: Record<PrimarchAllegiance, string> = {
  loyalist: 'Loyaliste',
  traitor: 'Traître',
  lost: 'Perdu',
};
const STATUS_LABEL: Record<PrimarchStatus, string> = {
  alive: 'Vivant',
  dead: 'Mort',
  missing: 'Disparu',
  returned: 'Ressuscité',
  'daemon-prince': 'Prince Démon',
  expunged: 'Expurgé',
};
const STATUS_COLOR: Record<PrimarchStatus, string> = {
  alive: '#5cb85c',
  dead: '#888',
  missing: '#a89060',
  returned: '#f0c060',
  'daemon-prince': '#c54040',
  expunged: '#444',
};

@Component({
  selector: 'app-primarch-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FigureLightboxComponent],
  template: `
    @if (primarch(); as p) {
      <a class="back-btn" routerLink="/lore/primarchs">← RETOUR AUX PRIMARQUES</a>

      <!-- HERO : portrait floating + identité -->
      <section class="hero" [class.hero-traitor]="p.allegiance === 'traitor'" [class.hero-lost]="p.allegiance === 'lost'">
        <div class="hero-bg" [style.background-image]="heroImg()"></div>
        <div class="hero-overlay"></div>

        <div class="hero-grid">
          <div class="hero-portrait" [style.background-image]="heroImg()" [style.background-color]="p.primaryColor || '#1a3a6e'"
               (click)="openHeroLightbox(p)" role="button" tabindex="0" aria-label="Agrandir le portrait">
            <div class="hero-portrait-frame"></div>
            <div class="hero-portrait-zoom">↗ AGRANDIR</div>
          </div>

          <div class="hero-text">
            <div class="hero-eyebrow">
              <span class="hero-number">{{ formatNumber(p.number) }}</span>
              @if (p.legion) {
                <span class="hero-legion">{{ p.legion }}</span>
              }
            </div>
            <h1>{{ p.name }}</h1>
            @if (p.epithet) {
              <p class="hero-epithet">{{ p.epithet }}</p>
            }
            <div class="hero-badges">
              <span class="badge" [class]="'a-' + p.allegiance">{{ allegianceLabel(p.allegiance) }}</span>
              <span class="badge status" [style.color]="statusColor(p.status)" [style.borderColor]="statusColor(p.status)">{{ statusLabel(p.status) }}</span>
              @if (p.homeworld) {
                <span class="badge subtle">⊙ {{ p.homeworld }}</span>
              }
              @if (p.notableBattles?.length) {
                <span class="badge subtle">⚔ {{ p.notableBattles!.length }} batailles canon</span>
              }
            </div>
            @if (p.citation) {
              <blockquote class="hero-quote">« {{ p.citation }} »</blockquote>
            }
          </div>
        </div>
      </section>

      <!-- ANCHOR NAV -->
      <nav class="anchor-nav">
        <a href="#description" (click)="scrollTo($event, 'description')">Description</a>
        @if (p.personality) { <a href="#personnalite" (click)="scrollTo($event, 'personnalite')">Personnalité</a> }
        @if (p.earlyLife) { <a href="#origines" (click)="scrollTo($event, 'origines')">Origines</a> }
        @if (p.greatCrusade) { <a href="#croisade" (click)="scrollTo($event, 'croisade')">Grande Croisade</a> }
        @if (p.heresy) { <a href="#heresie" (click)="scrollTo($event, 'heresie')">Hérésie</a> }
        @if (p.finalFate) { <a href="#destin" (click)="scrollTo($event, 'destin')">Destin</a> }
        @if (p.legacy) { <a href="#heritage" (click)="scrollTo($event, 'heritage')">Héritage</a> }
        @if (p.notableBattles?.length) { <a href="#batailles" (click)="scrollTo($event, 'batailles')">Timeline</a> }
        @if (p.quotes?.length) { <a href="#citations" (click)="scrollTo($event, 'citations')">Citations</a> }
        @if (galleryImages().length > 0) { <a href="#iconographie" (click)="scrollTo($event, 'iconographie')">Iconographie</a> }
      </nav>

      <section class="layout">
        <div class="main">

          <!-- DESCRIPTION + LORE LONG (avec image intercalée) -->
          <article class="panel" id="description">
            <h2>Description</h2>
            <p class="lead">{{ p.description }}</p>
            @if (p.statusDetail) {
              <p class="status-detail-panel">{{ p.statusDetail }}</p>
            }
            @if (p.loreLong) {
              @let img1 = interImage(1);
              <div class="lore-flow">
                @if (img1) {
                  <figure class="inline-figure inline-right" (click)="openImageLightbox(p, img1, 1)" role="button" tabindex="0">
                    <div class="inline-figure-img" [style.background-image]="img1"></div>
                    <figcaption>Iconographie · {{ p.legion || p.name }}</figcaption>
                  </figure>
                }
                <p class="lore-block">{{ p.loreLong }}</p>
              </div>
            }
          </article>

          <!-- PERSONNALITÉ + pull-quote -->
          @if (p.personality) {
            @let q1 = pullQuote(p, 1);
            <article class="panel" id="personnalite">
              <h2>Personnalité</h2>
              <div class="two-col">
                <p class="col-text">{{ p.personality }}</p>
                @if (q1) {
                  <aside class="pull-quote">
                    <span class="pq-mark">«</span>
                    <p>{{ q1 }}</p>
                    <span class="pq-attribution">— {{ p.name }}</span>
                  </aside>
                }
              </div>
            </article>
          }

          <!-- ORIGINES + image intercalée -->
          @if (p.earlyLife) {
            @let img2 = interImage(2);
            <article class="panel" id="origines">
              <h2>Origines & Monde Natal</h2>
              <div class="two-col">
                <p class="col-text">{{ p.earlyLife }}</p>
                <aside class="info-card">
                  @if (img2) {
                    <div class="info-card-img" [style.background-image]="img2"
                         (click)="openImageLightbox(p, img2, 2)" role="button" tabindex="0" aria-label="Agrandir"></div>
                  }
                  <div class="info-card-body">
                    @if (p.homeworld) {
                      <div class="info-row"><strong>Monde natal</strong><span>{{ p.homeworld }}</span></div>
                    }
                    @if (p.legion) {
                      <div class="info-row"><strong>Légion</strong><span>{{ p.legion }}</span></div>
                    }
                    <div class="info-row"><strong>Numéro</strong><span>{{ formatNumber(p.number) }}</span></div>
                  </div>
                </aside>
              </div>
            </article>
          }

          <!-- GRANDE CROISADE -->
          @if (p.greatCrusade) {
            @let img3 = interImage(3);
            <article class="panel" id="croisade">
              <h2>Grande Croisade</h2>
              <div class="two-col reverse">
                <p class="col-text">{{ p.greatCrusade }}</p>
                @if (img3) {
                  <figure class="inline-figure" (click)="openImageLightbox(p, img3, 3)" role="button" tabindex="0">
                    <div class="inline-figure-img" [style.background-image]="img3"></div>
                    <figcaption>Grande Croisade · M30</figcaption>
                  </figure>
                }
              </div>
            </article>
          }

          <!-- HÉRÉSIE + timeline visuelle des batailles -->
          @if (p.heresy) {
            @let q2 = pullQuote(p, 2);
            @let img4 = interImage(4);
            <article class="panel" [class.panel-heresy]="p.allegiance === 'traitor'" id="heresie">
              <h2>Hérésie d'Horus</h2>
              <div class="heresy-content">
                <p class="heresy-text">{{ p.heresy }}</p>
                @if (q2) {
                  <blockquote class="pull-quote-inline">
                    <span class="pq-mark">«</span>
                    <p>{{ q2 }}</p>
                  </blockquote>
                }
                @if (img4) {
                  <figure class="inline-figure full" (click)="openImageLightbox(p, img4, 4)" role="button" tabindex="0">
                    <div class="inline-figure-img tall" [style.background-image]="img4"></div>
                    <figcaption>{{ heresyCaption(p) }}</figcaption>
                  </figure>
                }
              </div>
            </article>
          }

          <!-- DESTIN + pull-quote -->
          @if (p.finalFate) {
            @let q3 = pullQuote(p, 3);
            <article class="panel" id="destin">
              <h2>Destin</h2>
              <div class="two-col">
                <p class="col-text">{{ p.finalFate }}</p>
                @if (q3) {
                  <aside class="pull-quote">
                    <span class="pq-mark">«</span>
                    <p>{{ q3 }}</p>
                    <span class="pq-attribution">— {{ p.name }}</span>
                  </aside>
                }
              </div>
            </article>
          }

          <!-- HÉRITAGE -->
          @if (p.legacy) {
            <article class="panel" id="heritage">
              <h2>Héritage</h2>
              <p>{{ p.legacy }}</p>
            </article>
          }

          <!-- TIMELINE VISUELLE — notableBattles -->
          @if (p.notableBattles?.length) {
            <article class="panel" id="batailles">
              <h2>Chronologie · Batailles Notables</h2>
              <div class="timeline">
                @for (b of p.notableBattles; track b.name; let i = $index) {
                  <div class="tl-event" [class.tl-last]="i === (p.notableBattles!.length - 1)">
                    <div class="tl-marker">
                      <span class="tl-dot"></span>
                      @if (b.date) {
                        <span class="tl-date">{{ b.date }}</span>
                      }
                    </div>
                    <div class="tl-content">
                      <h4>{{ b.name }}</h4>
                      <p>{{ b.summary }}</p>
                    </div>
                  </div>
                }
              </div>
            </article>
          }

          <!-- CITATIONS - pull-quotes complètes -->
          @if (p.quotes?.length) {
            <article class="panel" id="citations">
              <h2>Citations Canon</h2>
              <div class="quotes-grid">
                @for (q of p.quotes; track q) {
                  <blockquote class="quote-card">
                    <span class="qm">«</span>
                    <p>{{ q }}</p>
                    <span class="q-by">— {{ p.name }}</span>
                  </blockquote>
                }
              </div>
            </article>
          }

          <!-- ICONOGRAPHIE - galerie lightbox -->
          @if (galleryImages().length > 0) {
            <article class="panel panel-iconography" id="iconographie">
              <h2>Iconographie</h2>
              <p class="ico-intro">{{ galleryImages().length }} portraits canon — cliquez pour agrandir.</p>
              <div class="iconography-grid">
                @for (g of galleryImages(); track g; let i = $index) {
                  <button class="iconography-card" type="button"
                          (click)="openImageLightboxRaw(p, g, i)"
                          [style.background-image]="imgBgUrl(g)"
                          aria-label="Agrandir cette iconographie">
                    <span class="iconography-zoom">↗</span>
                  </button>
                }
              </div>
            </article>
          }
        </div>

        <!-- SIDEBAR -->
        <aside class="sidebar">
          <section class="sp">
            <h3>Données vitales</h3>
            <div class="info-row-vert"><span class="ico">№</span><div><strong>Numéro</strong><span>{{ formatNumber(p.number) }}</span></div></div>
            @if (p.legion) {
              <div class="info-row-vert"><span class="ico">⚔</span><div><strong>Légion</strong><span>{{ p.legion }}</span></div></div>
            }
            @if (p.homeworld) {
              <div class="info-row-vert"><span class="ico">⊙</span><div><strong>Monde natal</strong><span>{{ p.homeworld }}</span></div></div>
            }
            <div class="info-row-vert"><span class="ico">⚜</span><div><strong>Allégeance</strong><span>{{ allegianceLabel(p.allegiance) }}</span></div></div>
            <div class="info-row-vert"><span class="ico">✠</span><div><strong>Statut</strong><span [style.color]="statusColor(p.status)">{{ statusLabel(p.status) }}</span></div></div>
            @if (p.notableBattles?.length) {
              <div class="info-row-vert"><span class="ico">⚒</span><div><strong>Batailles canon</strong><span>{{ p.notableBattles!.length }}</span></div></div>
            }
            @if (p.quotes?.length) {
              <div class="info-row-vert"><span class="ico">❝</span><div><strong>Citations</strong><span>{{ p.quotes!.length }}</span></div></div>
            }
          </section>

          @if (p.legionId) {
            <section class="sp">
              <h3>Légion</h3>
              <a class="row-link" [routerLink]="['/factions', p.legionId]">
                <span class="rl-ico">⚔</span>
                <span class="rl-label">Voir la Légion {{ p.legion }}</span>
                <span class="rl-arrow">›</span>
              </a>
            </section>
          }

          @if (related().length > 0) {
            <section class="sp">
              <h3>Primarques liés</h3>
              @for (r of related(); track r.id) {
                <a class="related" [routerLink]="['/lore/primarchs', r.id]"
                   [style.--r-color]="r.primaryColor || '#3a3a3a'"
                   [style.--r-img]="relatedImg(r.id)">
                  <div class="related-thumb"></div>
                  <div class="related-info">
                    <strong>{{ r.name }}</strong>
                    <span>{{ r.legion || allegianceLabel(r.allegiance) }}</span>
                  </div>
                </a>
              }
            </section>
          }

          <a class="cta cta-outline cta-block" routerLink="/lore/primarchs">RETOUR LISTE PRIMARQUES</a>
          <a class="cta cta-outline cta-block" routerLink="/lore/emperor">LE TRÔNE D'OR →</a>
        </aside>
      </section>

      <!-- LIGHTBOX -->
      <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
    } @else {
      <div class="loading"><p>Chargement du Primarque...</p></div>
    }
  `,
  styleUrls: ['./primarch-detail.component.scss'],
})
export class PrimarchDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);
  readonly galleryImages = signal<string[]>([]);
  readonly relatedImages = signal<Map<string, string>>(new Map());
  readonly lightbox = signal<LightboxState | null>(null);

  readonly primarch = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getPrimarch(p.get('id')!))),
  );

  readonly related = toSignal(
    this.route.paramMap.pipe(
      switchMap(p => this.service.getPrimarch(p.get('id')!)),
      switchMap(prim => {
        if (!prim?.relatedPrimarchIds?.length) return of([] as Primarch[]);
        return forkJoin(
          prim.relatedPrimarchIds.slice(0, 3).map(id => this.service.getPrimarch(id))
        );
      }),
    ),
    { initialValue: [] as Primarch[] },
  );

  constructor() {
    effect(() => {
      const p = this.primarch();
      if (!p) return;
      this.heroImage.set(null);
      this.galleryImages.set([]);

      if (p.wikiQuery) {
        this.service.getWikiImage(p.wikiQuery).subscribe(r => {
          if (r.imageUrl) this.heroImage.set(r.imageUrl);
        });
      }
      const queries = (p.galleryQueries ?? []).slice(0, 6);
      queries.forEach(q => {
        this.service.getWikiImage(q).subscribe({
          next: r => {
            if (r.imageUrl) this.galleryImages.update(arr => [...arr, r.imageUrl!]);
          },
          error: () => {},
        });
      });
    });

    effect(() => {
      const list = this.related();
      list.forEach(r => {
        if (this.relatedImages().has(r.id)) return;
        if (!r.wikiQuery) return;
        this.service.getWikiImage(r.wikiQuery).subscribe({
          next: res => {
            if (res.imageUrl) {
              this.relatedImages.update(m => new Map(m).set(r.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'none';
  }

  relatedImg(id: string): string {
    const url = this.relatedImages().get(id);
    return url ? `url('${url}')` : 'none';
  }

  /** Returns css url() for an intercalated image based on slot index (1..N).
   *  Cycles through galleryImages — each section grabs a different image. */
  interImage(slot: number): string | null {
    const imgs = this.galleryImages();
    if (imgs.length === 0) return null;
    const idx = slot % imgs.length;
    return `url('${imgs[idx]}')`;
  }

  /** Returns a quote at the given slot if available. Slot 0 = hero (citation), slot 1+ = quotes[]. */
  pullQuote(p: Primarch, slot: number): string | null {
    const qs = p.quotes;
    if (!qs?.length) return null;
    // strip surrounding quotes/guillemets if present
    const raw = qs[slot - 1];
    if (!raw) return null;
    return raw.replace(/^[«"\s]+/, '').replace(/[»"\s]+$/, '');
  }

  formatNumber(n: number): string {
    return `№ ${String(n).padStart(2, '0')}`;
  }

  allegianceLabel(a: PrimarchAllegiance): string { return ALLEGIANCE_LABEL[a]; }
  statusLabel(s: PrimarchStatus): string { return STATUS_LABEL[s]; }
  statusColor(s: PrimarchStatus): string { return STATUS_COLOR[s]; }

  scrollTo(e: Event, id: string): void {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openHeroLightbox(p: Primarch): void {
    const url = this.heroImage();
    if (!url) return;
    this.openLightboxAt(p, url, 0);
  }

  openImageLightbox(p: Primarch, cssUrl: string, idx: number): void {
    // cssUrl is `url('...')` — extract raw url
    const m = /url\(['"]?(.*?)['"]?\)/.exec(cssUrl);
    const url = m?.[1];
    if (!url) return;
    this.openLightboxAt(p, url, idx);
  }

  openImageLightboxRaw(p: Primarch, url: string, idx: number): void {
    this.openLightboxAt(p, url, idx);
  }

  imgBgUrl(url: string): string {
    return `url('${url}')`;
  }

  heresyCaption(p: Primarch): string {
    if (p.allegiance === 'traitor') return "L'Hérésie consume Horus et ses frères";
    if (p.allegiance === 'lost') return "Vestiges effacés des registres impériaux";
    return "L'Empereur trahi par ses propres fils";
  }

  private openLightboxAt(p: Primarch, mainUrl: string, idx: number): void {
    const allUrls = [
      ...(this.heroImage() ? [this.heroImage()!] : []),
      ...this.galleryImages(),
    ];
    // dedupe
    const thumbUrls = Array.from(new Set(allUrls));
    const selectedIdx = Math.max(0, thumbUrls.indexOf(mainUrl));
    const subtitle = p.legion ? `${p.legion} · ${ALLEGIANCE_LABEL[p.allegiance]}` : ALLEGIANCE_LABEL[p.allegiance];
    this.lightbox.set({
      title: p.name,
      subtitle,
      description: p.epithet || p.description,
      contextName: 'Les Primarques',
      contextColor: p.primaryColor || '#c9a24a',
      contextSigil: '⚜',
      searchQuery: p.name,
      mainUrl,
      thumbUrls: thumbUrls.length > 0 ? thumbUrls : [mainUrl],
      selectedIdx: selectedIdx >= 0 ? selectedIdx : 0,
    });
  }

  selectThumb(idx: number): void {
    const cur = this.lightbox();
    if (!cur) return;
    const url = cur.thumbUrls[idx];
    if (!url) return;
    this.lightbox.set({ ...cur, mainUrl: url, selectedIdx: idx });
  }

  closeLightbox(): void { this.lightbox.set(null); }
}
