import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { ImperialOrganization, ImperialOrgCategory } from '../../core/models/models';

const CATEGORY_LABEL: Record<ImperialOrgCategory, string> = {
  governance: 'Gouvernance',
  military: 'Militaire',
  religion: 'Religion',
  psyker: 'Psyker',
  commerce: 'Commerce',
  training: 'Formation',
};

const CATEGORY_COLOR: Record<ImperialOrgCategory, string> = {
  governance: '#a89060',
  military: '#9a3a3a',
  religion: '#c43a26',
  psyker: '#3a6cc4',
  commerce: '#7a4a8b',
  training: '#5a6878',
};

@Component({
  selector: 'app-lore-civilians',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-bg" [style.background-image]="heroImg()"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">⚙ Les rouages humains de l'Imperium</div>
        <h1>Civils Impériaux</h1>
        <p class="lede">
          Au-delà des Astartes et des Inquisiteurs, l'Imperium tient debout grâce à des
          milliards de civils — bureaucrates, prêtres, navigateurs aveugles, marchands-princes,
          écolières-soldates. Voici les ordres et institutions qui font tourner Sa machine.
        </p>
        <div class="counters">
          <div class="counter"><strong>{{ orgs().length }}</strong><span>Organisations</span></div>
          <div class="counter"><strong>{{ totalFunctions() }}</strong><span>Fonctions documentées</span></div>
          <div class="counter"><strong>{{ totalFigures() }}</strong><span>Figures notables</span></div>
        </div>
      </div>
    </section>

    <section class="filters">
      <button class="filter" [class.active]="filterCategory() === 'all'" (click)="setFilter('all')">
        Toutes · {{ orgs().length }}
      </button>
      @for (cat of categories; track cat) {
        <button class="filter" [class.active]="filterCategory() === cat" (click)="setFilter(cat)" [style.--cat-color]="categoryColor(cat)">
          {{ categoryLabel(cat) }} · {{ countByCategory(cat) }}
        </button>
      }
    </section>

    <section class="orgs">
      @for (org of filtered(); track org.id; let i = $index) {
        <article class="org" [style.--org-color]="org.color" [attr.data-i]="i">
          <header class="org-head">
            <div class="org-bg" [style.background-image]="orgImg(org.id)"></div>
            <div class="org-bg-overlay"></div>
            <div class="org-head-content">
              <div class="org-meta">
                <span class="number">{{ formatNum(org.number) }}</span>
                <span class="category" [style.color]="categoryColor(org.category)">{{ categoryLabel(org.category) }}</span>
              </div>
              <div class="org-sigil-row">
                <span class="org-sigil" [style.color]="org.color">{{ org.sigil }}</span>
                <div>
                  <h2 [style.color]="org.color">{{ org.name }}</h2>
                  <div class="org-title">{{ org.title }}</div>
                </div>
              </div>
            </div>
          </header>

          <div class="org-body">
            <div class="org-main">
              <p class="description">{{ org.description }}</p>
              <p class="loreLong">{{ org.loreLong }}</p>

              @if (org.citation) {
                <div class="citation">
                  <span class="quote">«</span> {{ org.citation }} <span class="quote">»</span>
                </div>
              }

              @if (org.notableFigures.length > 0) {
                <h3 class="section-title">Figures notables</h3>
                <div class="figures-grid">
                  @for (f of org.notableFigures; track f.name) {
                    <div class="figure-card">
                      <div class="figure-name">{{ f.name }}</div>
                      <div class="figure-role">{{ f.role }}</div>
                      @if (f.description) {
                        <p>{{ f.description }}</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <aside class="org-side">
              <div class="side-block">
                <div class="side-title">Rôle clé</div>
                <p class="side-role">{{ org.keyRole }}</p>
              </div>
              <div class="side-block">
                <div class="side-title">Fonctions</div>
                <ul>
                  @for (fn of org.functions; track fn) {
                    <li>{{ fn }}</li>
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
        L'Imperium n'est pas tenu par les bolters. Il est tenu par les scribes,
        les prêtres, les navigateurs aveugles et les comptables fous qui travaillent<br>
        dans la pénombre depuis dix mille ans.
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
      opacity: 0.32;
      filter: grayscale(0.25) contrast(1.05);
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 80% 30%, rgba(168, 144, 96, 0.32), transparent 55%),
        radial-gradient(circle at 20% 80%, rgba(123, 17, 19, 0.4), transparent 55%),
        linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.95) 80%);
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
      text-shadow: 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 15px; color: var(--text); line-height: 1.65; margin: 0 0 18px; max-width: 640px; }

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

    .orgs { display: flex; flex-direction: column; gap: 28px; margin-bottom: 36px; }

    .org {
      border: 1px solid var(--border);
      background: #060504;
      overflow: hidden;
    }

    .org-head {
      position: relative;
      min-height: 200px;
      display: flex;
      align-items: end;
      padding: 30px 38px 24px;
      overflow: hidden;
    }
    .org-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.25;
      filter: grayscale(0.3) contrast(1.05);
    }
    .org-bg-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, color-mix(in srgb, var(--org-color) 18%, transparent) 0%, rgba(0,0,0,0.85) 80%);
    }
    .org-head-content { position: relative; z-index: 1; max-width: 760px; flex: 1; }

    .org-meta { display: flex; gap: 14px; align-items: baseline; margin-bottom: 14px; }
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

    .org-sigil-row { display: flex; align-items: center; gap: 18px; }
    .org-sigil {
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
    .org-title {
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.05em;
      color: var(--gold);
      text-transform: uppercase;
    }

    .org-body {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 28px;
      padding: 28px 38px 32px;
    }
    @media (max-width: 1024px) {
      .org-body { grid-template-columns: 1fr; padding: 24px; }
    }

    .org-main p.description {
      color: var(--gold-bright);
      font-size: 15px;
      line-height: 1.65;
      margin: 0 0 14px;
      font-style: italic;
    }
    .org-main p.loreLong {
      color: var(--text);
      font-size: 13.5px;
      line-height: 1.75;
      margin: 0 0 18px;
    }

    .citation {
      padding: 12px 16px;
      border-left: 2px solid var(--org-color, var(--gold-soft));
      background: rgba(0, 0, 0, 0.3);
      font-style: italic;
      color: var(--gold);
      font-size: 13px;
      line-height: 1.6;
      margin: 16px 0 18px;
    }
    .citation .quote { color: var(--org-color, var(--gold)); font-family: var(--serif); font-size: 18px; margin: 0 4px; }

    .section-title {
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--org-color, var(--gold));
      margin: 22px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .figures-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
    }
    .figure-card {
      padding: 12px 14px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
    }
    .figure-name {
      color: var(--org-color, var(--gold));
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .figure-role {
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .figure-card p {
      font-size: 11.5px;
      color: var(--text);
      line-height: 1.55;
      margin: 0;
    }

    .org-side { display: flex; flex-direction: column; gap: 14px; }
    .side-block {
      padding: 12px 16px 14px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
    }
    .side-title {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--org-color, var(--gold));
      font-weight: 800;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border);
    }
    .side-role { font-size: 12.5px; color: var(--text); line-height: 1.55; margin: 0; }
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
export class LoreCiviliansComponent {
  private readonly service = inject(WarhammerService);
  readonly orgs = toSignal(this.service.imperialOrgs$, { initialValue: [] as ImperialOrganization[] });
  readonly filterCategory = signal<'all' | ImperialOrgCategory>('all');
  readonly orgImages = signal<Map<string, string>>(new Map());
  readonly heroImg = signal<string>('');

  readonly categories: ImperialOrgCategory[] = [
    'governance',
    'religion',
    'military',
    'psyker',
    'commerce',
    'training',
  ];

  readonly filtered = computed(() => {
    const all = this.orgs();
    const f = this.filterCategory();
    if (f === 'all') return all;
    return all.filter(o => o.category === f);
  });

  readonly totalFunctions = computed(() =>
    this.orgs().reduce((sum, o) => sum + o.functions.length, 0),
  );
  readonly totalFigures = computed(() =>
    this.orgs().reduce((sum, o) => sum + o.notableFigures.length, 0),
  );

  countByCategory(cat: ImperialOrgCategory): number {
    return this.orgs().filter(o => o.category === cat).length;
  }

  constructor() {
    // Hero image
    this.service.getWikiImage('Imperium of Man Adeptus Terra Holy Terra').subscribe(r => {
      if (r.imageUrl) this.heroImg.set(`url('${r.imageUrl}')`);
    });

    // Per-org images
    this.service.imperialOrgs$.subscribe(list => {
      list.forEach(org => {
        if (org.wikiQuery) {
          this.service.getWikiImage(org.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              const m = new Map(this.orgImages());
              m.set(org.id, r.imageUrl);
              this.orgImages.set(m);
            }
          });
        }
      });
    });
  }

  setFilter(c: 'all' | ImperialOrgCategory) {
    this.filterCategory.set(c);
  }

  orgImg(id: string): string | null {
    const url = this.orgImages().get(id);
    return url ? `url('${url}')` : null;
  }

  formatNum(n: number): string {
    return `N° ${String(n).padStart(2, '0')}`;
  }

  categoryLabel(c: ImperialOrgCategory): string { return CATEGORY_LABEL[c]; }
  categoryColor(c: ImperialOrgCategory): string { return CATEGORY_COLOR[c]; }
}
