import { afterNextRender, Component, computed, effect, inject, Injector, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { ImperialOrganization, ImperialOrgCategory, ImperialOrgFigure } from '../../core/models/models';
import { LightboxDialogDirective } from '../../shared/lightbox-dialog.directive';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { teinteLisible } from '../../core/utils/teinte-lisible';
import { compteur, toSafeSignal } from '../../shared/safe-signal';

/** Titre des visionneuses : l'or, lisible sur leur fond ; la couleur de l'organisation y est sous 4,5:1 (L177). */
const TITRE_VISIONNEUSE = '#f0d276';

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
  imports: [LoadErrorComponent, CommonModule, RouterLink, FigureLightboxComponent, LightboxDialogDirective],
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
          <div class="counter"><strong>{{ nb(orgs().length) }}</strong><span>Organisations</span></div>
          <div class="counter"><strong>{{ nb(totalFunctions()) }}</strong><span>Fonctions documentées</span></div>
          <div class="counter"><strong>{{ nb(totalFigures()) }}</strong><span>Figures notables</span></div>
        </div>
      </div>
    </section>

    <div class="load-status" role="status">
      @if (orgs.pending()) { Chargement des civils impériaux… }
    </div>

    @if (orgs.failed()) {
      <app-load-error (retry)="orgs.retry()" />
    }

    <section class="filters">
      <button type="button" class="filter" [class.active]="filterCategory() === 'all'" [attr.aria-pressed]="filterCategory() === 'all'" (click)="setFilter('all')">
        Toutes · {{ nb(orgs().length) }}
      </button>
      @for (cat of categories; track cat) {
        <button type="button" class="filter" [class.active]="filterCategory() === cat" [attr.aria-pressed]="filterCategory() === cat" (click)="setFilter(cat)" [style.--cat-color]="categoryColor(cat)" [style.--cat-text]="categoryText(cat)">
          {{ categoryLabel(cat) }} · {{ nb(countByCategory(cat)) }}
        </button>
      }
    </section>

    <section class="orgs">
      @for (org of filtered(); track org.id; let i = $index) {
        <article class="org" [style.--org-color]="org.color" [style.--org-text]="lisible(org.color)" [attr.data-i]="i">
          <header class="org-head">
            <div class="org-bg" [style.background-image]="orgImg(org.id)"></div>
            <div class="org-bg-overlay"></div>
            <div class="org-head-content">
              <div class="org-meta">
                <span class="number">{{ formatNum(org.number) }}</span>
                <span class="category" [style.color]="categoryText(org.category)">{{ categoryLabel(org.category) }}</span>
              </div>
              <div class="org-sigil-row">
                <span class="org-sigil" [style.color]="org.color">{{ org.sigil }}</span>
                <div>
                  <h2 [style.color]="lisible(org.color)">{{ org.name }}</h2>
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
                    <button class="figure-card" type="button" [style.--fig-bg]="figureImg(org.id, f.name)" (click)="openLightbox(org, f, $event)">
                      <div class="figure-card-overlay"></div>
                      <span class="figure-zoom">⛶</span>
                      <div class="figure-card-content">
                        <div class="figure-name">{{ f.name }}</div>
                        <div class="figure-role">{{ f.role }}</div>
                        @if (f.description) {
                          <p>{{ f.description }}</p>
                        }
                      </div>
                    </button>
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

    @if (!orgs.pending()) {
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
    }

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)"
                         [appLightboxDialog]="lightbox() ? 'Visionneuse — ' + lightbox()!.title : null" />
  `,
  styleUrls: ['./lore-civilians.component.scss'],
})
export class LoreCiviliansComponent {
  private readonly service = inject(WarhammerService);
  private readonly injector = inject(Injector);
  readonly orgs = toSafeSignal(this.service.imperialOrgs$, [] as ImperialOrganization[]);
  readonly filterCategory = signal<'all' | ImperialOrgCategory>('all');
  readonly orgImages = signal<Map<string, string>>(new Map());
  readonly figureImages = signal<Map<string, string>>(new Map());
  readonly heroImg = signal<string>('');
  readonly lightbox = signal<LightboxState | null>(null);
  /** Élément qui a ouvert la visionneuse : il récupère le focus à la fermeture. */
  private opener: HTMLElement | null = null;

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

  /** L115, L184 : « — » tant que la liste est en échec ou n'est pas arrivée (un « 0 » serait une valeur). */
  nb(n: number): string { return compteur(n, this.orgs.failed() || this.orgs.pending()); }

  countByCategory(cat: ImperialOrgCategory): number {
    return this.orgs().filter(o => o.category === cat).length;
  }

  constructor() {
    // Hero image
    this.service.getWikiImage('Imperium of Man Adeptus Terra Holy Terra').subscribe(r => {
      if (r.imageUrl) this.heroImg.set(`url('${r.imageUrl}')`);
    });

    // Per-org + per-figure images
    effect(() => {
      const list = this.orgs();
      untracked(() => {
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
          for (const fig of org.notableFigures) {
            const q = fig.wikiQuery ?? fig.name;
            if (!q) continue;
            this.service.getWikiImage(q).subscribe(r => {
              if (r.imageUrl) {
                const key = `${org.id}::${fig.name}`;
                const m = new Map(this.figureImages());
                m.set(key, r.imageUrl);
                this.figureImages.set(m);
              }
            });
          }
        });
      });
    });
  }

  figureImg(orgId: string, figureName: string): string {
    const url = this.figureImages().get(`${orgId}::${figureName}`);
    return url ? `url('${url}')` : 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
  }

  openLightbox(org: ImperialOrganization, figure: ImperialOrgFigure, ev?: Event): void {
    const baseUrl = this.figureImages().get(`${org.id}::${figure.name}`);
    if (!baseUrl) return;
    this.opener = ev?.currentTarget instanceof HTMLElement ? ev.currentTarget : null;

    this.lightbox.set({
      title: figure.name,
      subtitle: figure.role,
      description: figure.description,
      contextName: org.name,
      contextColor: TITRE_VISIONNEUSE,
      contextSigil: org.sigil,
      searchQuery: figure.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });

    const baseQuery = figure.wikiQuery ?? figure.name;
    const variants = [
      `${baseQuery} art`,
      `${baseQuery} concept art`,
      `${figure.name} ${org.name}`,
      `${baseQuery} warhammer 40k`,
      `${baseQuery} battlefleet`,
    ];

    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const current = this.lightbox();
          if (!current || current.title !== figure.name) return;
          if (current.thumbUrls.includes(r.imageUrl)) return;
          this.lightbox.set({
            ...current,
            thumbUrls: [...current.thumbUrls, r.imageUrl],
          });
        },
        error: () => {},
      });
    }
  }

  selectThumb(idx: number): void {
    const current = this.lightbox();
    if (!current) return;
    const url = current.thumbUrls[idx];
    if (!url) return;
    this.lightbox.set({ ...current, mainUrl: url, selectedIdx: idx });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
    const origine = this.opener;
    this.opener = null;
    // Après le rendu : la visionneuse est encore dans le DOM tant qu'il n'a pas eu lieu, et rendre le focus plus tôt
    // le lui ferait reprendre (LightboxDialogDirective garde le focus dans un dialogue encore ouvert).
    afterNextRender(() => { if (origine?.isConnected) origine.focus(); }, { injector: this.injector });
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

  lisible(couleur: string): string { return teinteLisible(couleur); }

  categoryLabel(c: ImperialOrgCategory): string { return CATEGORY_LABEL[c]; }
  categoryColor(c: ImperialOrgCategory): string { return CATEGORY_COLOR[c]; }
  /** Teinte de texte de la catégorie (badge, filtre actif) : la couleur d'origine est sous 4,5:1 (L178). */
  categoryText(c: ImperialOrgCategory): string { return teinteLisible(CATEGORY_COLOR[c]); }
}
