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
      min-height: 280px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow);
      margin-bottom: 28px;
      display: flex;
      align-items: end;
      padding: 50px 50px 40px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 75% 30%, rgba(123, 17, 19, 0.42), transparent 55%),
        radial-gradient(circle at 25% 80%, rgba(201, 162, 74, 0.18), transparent 50%),
        linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.92) 80%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 760px; }
    .badge { display: inline-block; padding: 5px 12px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 800; margin-bottom: 14px; }
    .badge.gold { color: var(--gold-bright); border: 1px solid rgba(201, 162, 74, 0.5); background: rgba(201, 162, 74, 0.1); }
    .hero h1 {
      font-size: clamp(36px, 4.5vw, 56px);
      line-height: 1.05;
      margin: 0 0 14px;
      color: var(--gold-bright);
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 15px; color: var(--text); line-height: 1.6; margin: 0 0 18px; max-width: 640px; }
    .counters { display: flex; gap: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
    .counter { display: flex; flex-direction: column; gap: 2px; }
    .counter strong { font-family: var(--serif); color: var(--gold-bright); font-size: 22px; line-height: 1; }
    .counter span { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }

    .filters { display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; }
    .filter {
      background: rgba(11, 9, 7, 0.6);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
      font-family: var(--sans);
    }
    .filter:hover { color: var(--text); border-color: var(--border-strong); }
    .filter.active { color: var(--bg); background: var(--gold); border-color: var(--gold); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
      margin-bottom: 36px;
    }

    .card {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      background: rgba(8, 6, 4, 0.7);
      transition: border-color 0.2s, transform 0.2s;
      overflow: hidden;
    }
    .card:hover { border-color: var(--border-strong); transform: translateY(-3px); }

    .card-img {
      position: relative;
      height: 200px;
      width: 100%;
      background-size: cover;
      background-position: center;
      border: 0;
      padding: 0;
      cursor: pointer;
      font-family: inherit;
      display: block;
    }
    .card-zoom {
      position: absolute;
      bottom: 10px;
      right: 10px;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(8,7,6,0.7);
      border: 1px solid rgba(201,162,74,0.32);
      color: var(--gold-soft);
      font-size: 13px;
      opacity: 0.6;
      transition: opacity 0.15s, color 0.15s, border-color 0.15s;
    }
    .card-img:hover .card-zoom {
      opacity: 1;
      color: var(--gold-bright);
      border-color: var(--gold);
    }
    .card-img-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.92) 100%);
    }
    .card-img .number {
      position: absolute;
      top: 12px;
      left: 12px;
      font-family: var(--serif);
      font-size: 14px;
      color: var(--gold);
      letter-spacing: 0.1em;
      background: rgba(0,0,0,0.6);
      padding: 4px 10px;
      border: 1px solid rgba(201, 162, 74, 0.4);
    }
    .card-img .status {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 800;
      background: rgba(0,0,0,0.65);
      padding: 5px 10px;
      border: 1px solid currentColor;
    }

    .card-body { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }
    .card-head { margin-bottom: 10px; }
    .card-head h2 { margin: 0; font-size: 18px; color: var(--gold); line-height: 1.15; }
    .legion {
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 4px;
    }
    .desc {
      flex: 1;
      font-size: 12.5px;
      color: var(--text);
      line-height: 1.55;
      margin: 0 0 10px;
    }
    .status-detail {
      font-size: 11px;
      color: var(--muted);
      font-style: italic;
      padding: 8px 0;
      border-top: 1px solid var(--border);
      margin-top: 4px;
    }
    .card-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      margin-top: 6px;
    }
    .allegiance {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      padding: 3px 8px;
    }
    .allegiance.a-loyalist { color: #93c0ff; border: 1px solid rgba(73, 125, 190, 0.6); background: rgba(23, 61, 117, 0.4); }
    .allegiance.a-traitor { color: #ff8a8a; border: 1px solid rgba(170, 45, 45, 0.6); background: rgba(123, 17, 19, 0.42); }
    .allegiance.a-lost { color: var(--muted); border: 1px solid var(--border); background: rgba(40, 40, 40, 0.4); }
    .legion-link { color: var(--gold); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; }
    .legion-link:hover { color: var(--gold-bright); }

    .cta-bottom {
      max-width: 720px;
      margin: 30px auto 8px;
      text-align: center;
      padding: 32px 24px;
      border: 1px solid var(--border);
      background: radial-gradient(circle at 50% 100%, rgba(201, 162, 74, 0.1), transparent 70%);
    }
    .ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 18px;
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
      margin: 0 0 18px;
    }
    .cta-text .muted { color: var(--muted); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-style: normal; }
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
