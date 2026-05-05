import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { LoreConcept, LoreConceptCategory } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';

const CATEGORY_LABEL: Record<LoreConceptCategory, string> = {
  imperial: 'Impérial',
  warp: 'Warp',
  world: 'Monde',
  doctrine: 'Doctrine',
};

const CATEGORY_COLOR: Record<LoreConceptCategory, string> = {
  imperial: '#c9a24a',
  warp: '#7a4a8b',
  world: '#1d4ba0',
  doctrine: '#a89060',
};

@Component({
  selector: 'app-lore-concepts',
  standalone: true,
  imports: [CommonModule, RouterLink, FigureLightboxComponent],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-bg" [style.background-image]="heroImg()"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">📜 Encyclopédie du 41<sup>e</sup> millénaire</div>
        <h1>Concepts &amp; Lieux Sacrés</h1>
        <p class="lede">
          Au-delà des dieux et des héros, l'univers de Warhammer 40,000 est tissé
          d'institutions, de failles warp et de mondes-clés qui définissent l'Imperium.
          Trône d'Or, Astronomican, Œil de la Terreur, Cadia tombée, Cicatrix Maledictum…
          voici les piliers (et les fissures) de la galaxie.
        </p>
        <div class="counters">
          <div class="counter"><strong>{{ concepts().length }}</strong><span>Concepts</span></div>
          <div class="counter"><strong>{{ totalKeyFacts() }}</strong><span>Faits documentés</span></div>
          <div class="counter"><strong>{{ totalRelations() }}</strong><span>Liens inter-concepts</span></div>
        </div>
      </div>
    </section>

    <section class="filters">
      <button class="filter" [class.active]="filterCategory() === 'all'" (click)="setFilter('all')">
        Tous · {{ concepts().length }}
      </button>
      @for (cat of categories; track cat) {
        <button class="filter" [class.active]="filterCategory() === cat" (click)="setFilter(cat)" [style.--cat-color]="categoryColor(cat)">
          {{ categoryLabel(cat) }} · {{ countByCategory(cat) }}
        </button>
      }
    </section>

    <section class="concepts">
      @for (c of filtered(); track c.id) {
        <article class="concept" [id]="c.id" [style.--c-color]="c.color">
          <header class="concept-head">
            <button class="concept-bg" type="button" [style.background-image]="conceptImg(c.id)" (click)="openLightbox(c)" aria-label="Voir en grand"></button>
            <div class="concept-bg-overlay"></div>
            <span class="concept-zoom" (click)="openLightbox(c)" [style.color]="c.color">⛶</span>
            <div class="concept-head-content">
              <div class="concept-meta">
                <span class="number">{{ formatNum(c.number) }}</span>
                <span class="category" [style.color]="categoryColor(c.category)">{{ categoryLabel(c.category) }}</span>
              </div>
              <div class="concept-sigil-row">
                <span class="concept-sigil" [style.color]="c.color">{{ c.sigil }}</span>
                <div>
                  <h2 [style.color]="c.color">{{ c.name }}</h2>
                  <div class="concept-title">{{ c.title }}</div>
                </div>
              </div>
            </div>
          </header>

          <div class="concept-body">
            <div class="concept-main">
              <p class="description">{{ c.description }}</p>
              <p class="loreLong">{{ c.loreLong }}</p>

              @if (c.citation) {
                <div class="citation">
                  <span class="quote">«</span> {{ c.citation }} <span class="quote">»</span>
                </div>
              }

              @if (c.relatedConcepts.length > 0) {
                <h3 class="section-title">Liens inter-concepts</h3>
                <div class="related-grid">
                  @for (r of c.relatedConcepts; track r.name) {
                    @if (r.conceptId) {
                      <a class="related-card" [href]="'#' + r.conceptId">
                        <div class="related-name">{{ r.name }}</div>
                        @if (r.description) { <p>{{ r.description }}</p> }
                        <span class="related-arrow">→</span>
                      </a>
                    } @else {
                      <div class="related-card static">
                        <div class="related-name">{{ r.name }}</div>
                        @if (r.description) { <p>{{ r.description }}</p> }
                      </div>
                    }
                  }
                </div>
              }
            </div>

            <aside class="concept-side">
              <div class="side-block">
                <div class="side-title">Faits clés</div>
                <ul>
                  @for (f of c.keyFacts; track f) {
                    <li>{{ f }}</li>
                  }
                </ul>
              </div>
            </aside>
          </div>
        </article>
      }
    </section>

    <section class="cta-bottom">
      <div class="ornament"><span class="line"></span><span class="aigle">⚜</span><span class="line"></span></div>
      <p class="cta-text">
        L'Imperium n'est pas un peuple. C'est un système — fragile, immense,<br>
        tenu par dix mille ans de litanies et de calculs précis.<br>
        Brisez un de ces piliers et toute la cathédrale vacille.
      </p>
      <div class="cta-actions">
        <a routerLink="/lore" class="cta-link">Retour aux archives lore →</a>
      </div>
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
  `,
  styleUrls: ['./lore-concepts.component.scss'],
})
export class LoreConceptsComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);
  readonly concepts = toSignal(this.service.loreConcepts$, { initialValue: [] as LoreConcept[] });
  readonly filterCategory = signal<'all' | LoreConceptCategory>('all');
  readonly conceptImages = signal<Map<string, string>>(new Map());
  readonly heroImg = signal<string>('');
  readonly lightbox = signal<LightboxState | null>(null);

  readonly categories: LoreConceptCategory[] = ['imperial', 'warp', 'world', 'doctrine'];

  readonly filtered = computed(() => {
    const all = this.concepts();
    const f = this.filterCategory();
    if (f === 'all') return all;
    return all.filter(c => c.category === f);
  });

  readonly totalKeyFacts = computed(() =>
    this.concepts().reduce((sum, c) => sum + c.keyFacts.length, 0),
  );
  readonly totalRelations = computed(() =>
    this.concepts().reduce((sum, c) => sum + c.relatedConcepts.length, 0),
  );

  countByCategory(cat: LoreConceptCategory): number {
    return this.concepts().filter(c => c.category === cat).length;
  }

  constructor() {
    this.service.getWikiImage('Imperium of Man galaxy Astronomican').subscribe(r => {
      if (r.imageUrl) this.heroImg.set(`url('${r.imageUrl}')`);
    });

    this.service.loreConcepts$.subscribe(list => {
      list.forEach(c => {
        if (c.wikiQuery) {
          this.service.getWikiImage(c.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              const m = new Map(this.conceptImages());
              m.set(c.id, r.imageUrl);
              this.conceptImages.set(m);
            }
          });
        }
      });

      // Scroll vers le fragment URL une fois les concepts rendus
      const frag = this.route.snapshot.fragment;
      if (frag && list.some(c => c.id === frag)) {
        setTimeout(() => {
          document.getElementById(frag)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });
  }

  setFilter(c: 'all' | LoreConceptCategory) {
    this.filterCategory.set(c);
  }

  conceptImg(id: string): string | null {
    const url = this.conceptImages().get(id);
    return url ? `url('${url}')` : null;
  }

  formatNum(n: number): string {
    return `N° ${String(n).padStart(2, '0')}`;
  }

  categoryLabel(c: LoreConceptCategory): string { return CATEGORY_LABEL[c]; }
  categoryColor(c: LoreConceptCategory): string { return CATEGORY_COLOR[c]; }

  openLightbox(c: LoreConcept): void {
    const baseUrl = this.conceptImages().get(c.id);
    if (!baseUrl) return;
    this.lightbox.set({
      title: c.name,
      subtitle: c.title,
      description: c.description,
      contextName: CATEGORY_LABEL[c.category],
      contextColor: c.color,
      contextSigil: c.sigil,
      searchQuery: c.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const baseQuery = c.wikiQuery;
    const variants = [
      `${baseQuery} art`,
      `${baseQuery} concept art`,
      `${c.name} warhammer 40k`,
      `${baseQuery} illustration`,
    ];
    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const cur = this.lightbox();
          if (!cur || cur.title !== c.name) return;
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
}
