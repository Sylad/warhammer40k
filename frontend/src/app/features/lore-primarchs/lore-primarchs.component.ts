import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  returned: 'Retourné',
  'daemon-prince': 'Daemon-Prince',
  expunged: 'Expurgé',
};

const STATUS_COLOR: Record<PrimarchStatus, string> = {
  alive: '#5fc97a',
  dead: '#9a3a3a',
  missing: '#7d8a9c',
  returned: '#f0d276',
  'daemon-prince': '#c43a26',
  expunged: '#3a3a3a',
};

@Component({
  selector: 'app-lore-primarchs',
  standalone: true,
  imports: [CommonModule, RouterLink, FigureLightboxComponent],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge gold">⚜ Les fils de l'Empereur</div>
        <h1>Les Vingt Primarques</h1>
        <p class="lede">
          Vingt fils créés par l'Empereur lui-même au M30. Vingt destins éclatés dans l'Hérésie.
          Aujourd'hui : 9 Loyalistes (dont 2 retournés au M42), 9 Traîtres (dont 6 Daemon-Princes
          encore actifs), 2 expurgés des registres impériaux pour des raisons que personne ne révèle.
        </p>
        <div class="counters">
          <div class="counter"><strong>{{ countLoyalist() }}</strong><span>Loyalistes</span></div>
          <div class="counter"><strong>{{ countTraitor() }}</strong><span>Traîtres</span></div>
          <div class="counter"><strong>{{ countLost() }}</strong><span>Perdus</span></div>
        </div>
      </div>
    </section>

    <section class="filters">
      <button class="filter" [class.active]="filterAllegiance() === 'all'" (click)="setFilter('all')">
        Tous · 20
      </button>
      <button class="filter" [class.active]="filterAllegiance() === 'loyalist'" (click)="setFilter('loyalist')">
        Loyalistes · {{ countLoyalist() }}
      </button>
      <button class="filter" [class.active]="filterAllegiance() === 'traitor'" (click)="setFilter('traitor')">
        Traîtres · {{ countTraitor() }}
      </button>
      <button class="filter" [class.active]="filterAllegiance() === 'lost'" (click)="setFilter('lost')">
        Perdus · {{ countLost() }}
      </button>
    </section>

    <section class="grid">
      @for (p of filtered(); track p.id) {
        <article class="card" [attr.data-allegiance]="p.allegiance" [attr.data-status]="p.status">
          <button class="card-img" type="button" [style.background-image]="primarchImg(p.id)" [style.background-color]="p.primaryColor || '#3a3a3a'" (click)="openLightbox(p)" aria-label="Voir en grand">
            <div class="card-img-overlay"></div>
            <span class="number">{{ formatNumber(p.number) }}</span>
            <span class="status" [style.color]="statusColor(p.status)">{{ statusLabel(p.status) }}</span>
            <span class="card-zoom">⛶</span>
          </button>
          <div class="card-body">
            <div class="card-head">
              <h2>{{ p.name }}</h2>
              @if (p.legion) {
                <div class="legion">{{ p.legion }}</div>
              }
            </div>
            <p class="desc">{{ p.description }}</p>
            <div class="status-detail">{{ p.statusDetail }}</div>
            <div class="card-foot">
              <span class="allegiance" [class]="'a-' + p.allegiance">{{ allegianceLabel(p.allegiance) }}</span>
              @if (p.legionId) {
                <a class="legion-link" [routerLink]="['/factions', p.legionId]">Voir Légion →</a>
              }
            </div>
          </div>
        </article>
      }
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />

    <section class="cta-bottom">
      <div class="ornament"><span class="line"></span><span class="aigle">⚜</span><span class="line"></span></div>
      <p class="cta-text">
        « Mes fils. Mes plus grands fils. Voilà ce que j'ai fait pour vous. »<br>
        <span class="muted">— L'Empereur, devant le corps de Sanguinius</span>
      </p>
      <div class="cta-actions">
        <a routerLink="/lore/emperor" class="cta-link">Lire le lore de l'Empereur →</a>
      </div>
    </section>
  `,
  styleUrls: ['./lore-primarchs.component.scss'],
})
export class LorePrimarchsComponent {
  private readonly service = inject(WarhammerService);

  readonly primarchs = toSignal(this.service.primarchs$, { initialValue: [] as Primarch[] });
  readonly filterAllegiance = signal<'all' | PrimarchAllegiance>('all');
  readonly primarchImages = signal<Map<string, string>>(new Map());
  readonly lightbox = signal<LightboxState | null>(null);

  readonly filtered = computed(() => {
    const all = this.primarchs();
    const f = this.filterAllegiance();
    if (f === 'all') return all;
    return all.filter(p => p.allegiance === f);
  });

  readonly countLoyalist = computed(() => this.primarchs().filter(p => p.allegiance === 'loyalist').length);
  readonly countTraitor = computed(() => this.primarchs().filter(p => p.allegiance === 'traitor').length);
  readonly countLost = computed(() => this.primarchs().filter(p => p.allegiance === 'lost').length);

  constructor() {
    // Async wiki images for each primarch
    this.service.primarchs$.subscribe(list => {
      list.forEach(p => {
        if (p.wikiQuery) {
          this.service.getWikiImage(p.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              const m = new Map(this.primarchImages());
              m.set(p.id, r.imageUrl);
              this.primarchImages.set(m);
            }
          });
        }
      });
    });
  }

  setFilter(a: 'all' | PrimarchAllegiance) {
    this.filterAllegiance.set(a);
  }

  primarchImg(id: string): string | null {
    const url = this.primarchImages().get(id);
    return url ? `url('${url}')` : null;
  }

  formatNumber(n: number): string {
    return `N° ${String(n).padStart(2, '0')}`;
  }

  allegianceLabel(a: PrimarchAllegiance): string { return ALLEGIANCE_LABEL[a]; }
  statusLabel(s: PrimarchStatus): string { return STATUS_LABEL[s]; }
  statusColor(s: PrimarchStatus): string { return STATUS_COLOR[s]; }

  openLightbox(p: Primarch): void {
    const baseUrl = this.primarchImages().get(p.id);
    if (!baseUrl) return;
    const subtitle = p.legion
      ? `${p.legion} — ${ALLEGIANCE_LABEL[p.allegiance]}`
      : ALLEGIANCE_LABEL[p.allegiance];
    this.lightbox.set({
      title: p.name,
      subtitle,
      description: p.statusDetail || p.description,
      contextName: 'Les Primarques',
      contextColor: p.primaryColor || '#c9a24a',
      contextSigil: '⚜',
      searchQuery: p.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const baseQuery = p.wikiQuery ?? p.name;
    const variants = [
      `${baseQuery} primarch`,
      `${baseQuery} art`,
      `${baseQuery} Horus Heresy`,
      `${p.legion ?? baseQuery} cover`,
      `${baseQuery} concept art`,
    ];
    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const cur = this.lightbox();
          if (!cur || cur.title !== p.name) return;
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
