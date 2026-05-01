import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { LoreConcept, LoreConceptCategory } from '../../core/models/models';

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
  imports: [CommonModule, RouterLink],
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
            <div class="concept-bg" [style.background-image]="conceptImg(c.id)"></div>
            <div class="concept-bg-overlay"></div>
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
  `,
  styles: [`
    :host { display: block; }

    .back-link {
      display: inline-block;
      margin-bottom: 18px;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold);
      border-bottom: 1px solid transparent;
      padding-bottom: 2px;
    }
    .back-link:hover { border-bottom-color: var(--gold-soft); color: var(--gold-bright); }

    .hero {
      position: relative;
      min-height: 320px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #050403;
      box-shadow: var(--shadow);
      margin-bottom: 28px;
      display: flex;
      align-items: end;
      padding: 50px 50px 36px;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center 35%;
      opacity: 0.35;
      filter: grayscale(0.2) contrast(1.05);
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 80% 30%, rgba(201, 162, 74, 0.32), transparent 55%),
        radial-gradient(circle at 20% 80%, rgba(122, 74, 139, 0.32), transparent 55%),
        linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.95) 80%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 760px; }

    .badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 14px;
      color: var(--gold-bright);
      border: 1px solid rgba(201, 162, 74, 0.5);
      background: rgba(201, 162, 74, 0.1);
    }
    h1 {
      font-size: clamp(40px, 5vw, 60px);
      line-height: 1.04;
      margin: 0 0 14px;
      color: var(--gold-bright);
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 15px; color: var(--text); line-height: 1.65; margin: 0 0 18px; max-width: 680px; }

    .counters { display: flex; gap: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
    .counter { display: flex; flex-direction: column; gap: 2px; }
    .counter strong { font-family: var(--serif); color: var(--gold-bright); font-size: 22px; line-height: 1; }
    .counter span { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }

    .filters { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
    .filter {
      background: rgba(11, 9, 7, 0.6);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
      font-family: var(--sans);
    }
    .filter:hover { color: var(--text); border-color: var(--border-strong); }
    .filter.active {
      color: var(--bg);
      background: var(--cat-color, var(--gold));
      border-color: var(--cat-color, var(--gold));
    }

    .concepts { display: flex; flex-direction: column; gap: 28px; margin-bottom: 36px; }

    .concept {
      border: 1px solid var(--border);
      background: #060504;
      overflow: hidden;
      scroll-margin-top: 90px;
    }

    .concept-head {
      position: relative;
      min-height: 200px;
      display: flex;
      align-items: end;
      padding: 30px 38px 24px;
      overflow: hidden;
    }
    .concept-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.28;
      filter: grayscale(0.25) contrast(1.05);
    }
    .concept-bg-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, color-mix(in srgb, var(--c-color) 18%, transparent) 0%, rgba(0,0,0,0.85) 80%);
    }
    .concept-head-content { position: relative; z-index: 1; max-width: 780px; flex: 1; }

    .concept-meta { display: flex; gap: 14px; align-items: baseline; margin-bottom: 14px; }
    .number {
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.2em;
      color: var(--gold);
      text-transform: uppercase;
    }
    .category {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      padding: 3px 8px;
      border: 1px solid currentColor;
    }

    .concept-sigil-row { display: flex; align-items: center; gap: 18px; }
    .concept-sigil {
      font-size: 44px;
      line-height: 1;
      filter: drop-shadow(0 0 12px currentColor);
      flex-shrink: 0;
    }
    h2 {
      font-size: 32px;
      line-height: 1.05;
      margin: 0 0 4px;
      letter-spacing: 0.04em;
      text-shadow: 0 0 20px currentColor;
    }
    .concept-title {
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.05em;
      color: var(--gold);
      text-transform: uppercase;
    }

    .concept-body {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 28px;
      padding: 28px 38px 32px;
    }
    @media (max-width: 1024px) {
      .concept-body { grid-template-columns: 1fr; padding: 24px; }
    }

    .concept-main p.description {
      color: var(--gold-bright);
      font-size: 15px;
      line-height: 1.65;
      margin: 0 0 14px;
      font-style: italic;
    }
    .concept-main p.loreLong {
      color: var(--text);
      font-size: 13.5px;
      line-height: 1.75;
      margin: 0 0 18px;
    }

    .citation {
      padding: 12px 16px;
      border-left: 2px solid var(--c-color, var(--gold-soft));
      background: rgba(0, 0, 0, 0.3);
      font-style: italic;
      color: var(--gold);
      font-size: 13px;
      line-height: 1.6;
      margin: 16px 0 18px;
    }
    .citation .quote { color: var(--c-color, var(--gold)); font-family: var(--serif); font-size: 18px; margin: 0 4px; }

    .section-title {
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--c-color, var(--gold));
      margin: 22px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .related-card {
      position: relative;
      padding: 12px 14px 14px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
      color: inherit;
      transition: border-color 0.2s, background 0.2s;
      display: block;
    }
    .related-card:not(.static):hover {
      border-color: var(--c-color, var(--gold-soft));
      background: rgba(0, 0, 0, 0.5);
    }
    .related-card.static { cursor: default; opacity: 0.85; }
    .related-name {
      color: var(--c-color, var(--gold));
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .related-card p {
      font-size: 11.5px;
      color: var(--text);
      line-height: 1.5;
      margin: 0;
    }
    .related-arrow {
      position: absolute;
      top: 12px;
      right: 14px;
      font-size: 14px;
      color: var(--c-color, var(--gold));
      opacity: 0.6;
    }
    .related-card:hover .related-arrow { opacity: 1; }

    .concept-side { display: flex; flex-direction: column; gap: 14px; }
    .side-block {
      padding: 12px 16px 14px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
    }
    .side-title {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--c-color, var(--gold));
      font-weight: 800;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border);
    }
    .side-block ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .side-block li { font-size: 11.5px; color: var(--text); padding: 3px 0; line-height: 1.5; }
    .side-block li::before { content: '› '; color: var(--gold-soft); }

    .cta-bottom {
      max-width: 740px;
      margin: 30px auto 8px;
      text-align: center;
      padding: 28px 24px;
      border: 1px solid var(--border);
      background: radial-gradient(circle at 50% 100%, rgba(201, 162, 74, 0.1), transparent 70%);
    }
    .ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .ornament .line {
      flex: 0 0 80px;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--gold-soft), transparent);
    }
    .ornament .aigle { color: var(--gold); font-size: 18px; }
    .cta-text {
      color: var(--gold);
      font-family: var(--serif);
      font-style: italic;
      letter-spacing: 0.04em;
      font-size: 15px;
      line-height: 1.7;
      margin: 0 0 16px;
    }
    .cta-link {
      display: inline-block;
      color: var(--gold-bright);
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      padding: 10px 20px;
      border: 1px solid var(--gold-soft);
    }
    .cta-link:hover { border-color: var(--gold-bright); background: rgba(201, 162, 74, 0.08); }
  `],
})
export class LoreConceptsComponent {
  private readonly service = inject(WarhammerService);
  readonly concepts = toSignal(this.service.loreConcepts$, { initialValue: [] as LoreConcept[] });
  readonly filterCategory = signal<'all' | LoreConceptCategory>('all');
  readonly conceptImages = signal<Map<string, string>>(new Map());
  readonly heroImg = signal<string>('');

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
}
