import { afterNextRender, Component, computed, effect, inject, Injector, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Saint, SaintCategory } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';
import { LightboxDialogDirective } from '../../shared/lightbox-dialog.directive';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { compteur, toSafeSignal } from '../../shared/safe-signal';
import { pageCiblee } from '../../core/utils/page-ciblee';
import { teinteLisible } from '../../core/utils/teinte-lisible';

const CATEGORY_LABEL: Record<SaintCategory, string> = {
  'living-saint': 'Sainte Vivante',
  'saint-canonized': 'Sainte canonisée',
  'ecclesiarch-canonized': 'Ecclésiarque canonisé',
};

@Component({
  selector: 'app-lore-saints',
  standalone: true,
  imports: [LoadErrorComponent, CommonModule, RouterLink, FigureLightboxComponent, LightboxDialogDirective],
  template: `
    <a class="back-btn" routerLink="/lore">← RETOUR AU CODEX</a>

    <header class="hero">
      <h1>Saintes & Saints de l'Imperium</h1>
      <p class="lead">
        L'Imperial Cult vénère ses Saintes Vivantes, ses canonisés à titre posthume, ses Ecclésiarques réformateurs.
        Chaque Saint manifeste un fragment de la grâce de l'Empereur — par miracles, par martyres, par la simple
        présence inspirante. Voici les figures qui galvanisent un trillion de fidèles à travers la galaxie.
      </p>
      <div class="filters" role="group" aria-label="Filtrer par catégorie">
        <button type="button" [class.active]="filter() === 'all'" [attr.aria-pressed]="filter() === 'all'" (click)="filter.set('all')">Tous · {{ nb(saints().length) }}</button>
        <button type="button" [class.active]="filter() === 'living-saint'" [attr.aria-pressed]="filter() === 'living-saint'" (click)="filter.set('living-saint')">Saintes Vivantes</button>
        <button type="button" [class.active]="filter() === 'saint-canonized'" [attr.aria-pressed]="filter() === 'saint-canonized'" (click)="filter.set('saint-canonized')">Canonisés</button>
        <button type="button" [class.active]="filter() === 'ecclesiarch-canonized'" [attr.aria-pressed]="filter() === 'ecclesiarch-canonized'" (click)="filter.set('ecclesiarch-canonized')">Ecclésiarques</button>
      </div>
    </header>

    @if (saints.failed()) {
      <app-load-error (retry)="saints.retry()" />
    }

    <section class="grid">
      @for (s of filtered(); track s.id) {
        <div class="card-wrap">
        <a class="card" [routerLink]="['/lore/saints', s.id]" [style.--card-color]="s.color">
          <div class="card-img" [style.background-image]="saintImg(s.id)" [style.background-color]="s.color"></div>
          <div class="card-overlay">
            <div class="card-class">{{ categoryLabel(s.category) }}</div>
            <h2>{{ s.name }}</h2>
            @if (s.epithet) { <p class="card-epithet">{{ s.epithet }}</p> }
            <div class="card-meta">
              <span class="size-badge">{{ s.era }}</span>
              <span class="card-faction">{{ s.ordoOrChapter }}</span>
            </div>
          </div>
        </a>
        @if (saintImages().has(s.id)) {
          <button class="card-zoom" type="button" (click)="openLightbox(s, $event)" [attr.aria-label]="'Voir en grand : ' + s.name">⛶</button>
        }
        </div>
      }
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)"
                         [appLightboxDialog]="lightbox() ? 'Visionneuse — ' + lightbox()!.title : null" />
  `,
  styleUrls: ['../lore-ships/lore-ships.component.scss'],
})
export class LoreSaintsComponent {
  private readonly service = inject(WarhammerService);
  private readonly injector = inject(Injector);

  readonly saints = toSafeSignal(this.service.saints$, [] as Saint[]);
  readonly filter = signal<'all' | SaintCategory>('all');
  readonly saintImages = signal(new Map<string, string>());
  readonly lightbox = signal<LightboxState | null>(null);
  /** Le ⛶ qui a ouvert la visionneuse : il récupère le focus à la fermeture. */
  private opener: HTMLElement | null = null;

  /** L115 : « — » tant que la liste est en échec. */
  nb(n: number): string { return compteur(n, this.saints.failed()); }

  readonly filtered = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.saints();
    return this.saints().filter(s => s.category === f);
  });

  constructor() {
    effect(() => {
      const list = this.saints();
      untracked(() => {
        list.forEach(s => {
          if (s.wikiQuery) {
            this.service.getWikiImage(s.wikiQuery).subscribe(r => {
              if (r.imageUrl) {
                this.saintImages.update(m => new Map(m).set(s.id, r.imageUrl!));
              }
            });
          }
        });
      });
    });
  }

  saintImg(id: string): string {
    const url = this.saintImages().get(id);
    return url ? `url('${url}')` : 'none';
  }

  categoryLabel(c: SaintCategory): string { return CATEGORY_LABEL[c]; }

  openLightbox(s: Saint, ev?: Event): void {
    const baseUrl = this.saintImages().get(s.id);
    if (!baseUrl) return;
    this.opener = ev?.currentTarget instanceof HTMLElement ? ev.currentTarget : null;
    this.lightbox.set({
      title: s.name,
      subtitle: `${CATEGORY_LABEL[s.category]} — ${s.ordoOrChapter}`,
      description: s.epithet || undefined,
      contextName: 'Saintes & Saints',
      // Teinte éclaircie (≥ 4,5:1) : certaines couleurs du seed (#a02020) sont illisibles sur le fond noir de la visionneuse.
      contextColor: teinteLisible(s.color),
      contextSigil: '✠',
      searchQuery: s.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    // Les pages du sujet (`galleryPages`, L215), une à la fois, comme les Concepts (L207) : le wiki ne rend qu'une image par
    // page, les quatre variantes de requête retombaient sur l'image de la carte. Une page qui répond sous un autre titre,
    // sans vraie image ou avec une image déjà listée est écartée sans arrêter la chaîne, comme une erreur HTTP.
    const pages = s.galleryPages ?? [];
    const ajouter = (i: number): void => {
      if (i >= pages.length) return;
      this.service.getWikiImage(pages[i]).subscribe({
        next: r => {
          const cur = this.lightbox();
          if (!cur || cur.title !== s.name) return;
          if (pageCiblee(pages[i], r) && !cur.thumbUrls.includes(r.imageUrl!)) {
            this.lightbox.set({ ...cur, thumbUrls: [...cur.thumbUrls, r.imageUrl!] });
          }
          ajouter(i + 1);
        },
        error: () => {
          const cur = this.lightbox();
          if (cur && cur.title === s.name) ajouter(i + 1);
        },
      });
    };
    ajouter(0);
  }

  selectThumb(idx: number): void {
    const cur = this.lightbox();
    if (!cur) return;
    const url = cur.thumbUrls[idx];
    if (!url) return;
    this.lightbox.set({ ...cur, mainUrl: url, selectedIdx: idx });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
    const origine = this.opener;
    this.opener = null;
    // Après le rendu : la visionneuse est encore dans le DOM avant, et lui rendre le focus plus tôt le lui ferait reprendre.
    afterNextRender(() => { if (origine?.isConnected) origine.focus(); }, { injector: this.injector });
  }
}
