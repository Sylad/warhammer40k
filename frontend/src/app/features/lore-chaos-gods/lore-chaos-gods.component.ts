import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { ChaosGod, ChaosGodDaemon } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';

@Component({
  selector: 'app-lore-chaos-gods',
  standalone: true,
  imports: [CommonModule, RouterLink, FigureLightboxComponent],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">☠ Les Quatre Puissances Ruineuses</div>
        <h1>Le Panthéon Chaos</h1>
        <p class="lede">
          Quatre dieux nés du chaos émotionnel de l'humanité — la guerre, l'ambition, la maladie, le désir.
          Leurs domaines couvrent toute la condition mortelle. Leurs daemons habitent l'Immaterium.
          Leurs champions corrompent l'Imperium depuis dix mille ans.
        </p>
        <div class="quick-nav">
          @for (g of gods(); track g.id) {
            <a class="quick-link" [href]="'#' + g.id" [style.color]="g.color">
              <span class="quick-sigil">{{ g.sigil }}</span>
              <span class="quick-name">{{ g.name }}</span>
            </a>
          }
        </div>
      </div>
    </section>

    @for (god of gods(); track god.id) {
      <article class="god" [id]="god.id" [style.--god-color]="god.color">
        <header class="god-head">
          <button class="god-bg" type="button" [style.background-image]="godImg(god.id)" (click)="openGodLightbox(god)" aria-label="Voir en grand"></button>
          <div class="god-bg-overlay"></div>
          <span class="god-zoom" (click)="openGodLightbox(god)">⛶</span>
          <div class="god-head-content">
            <div class="number">{{ formatNum(god.number) }} / IV</div>
            <div class="god-sigil-wrap">
              <span class="god-sigil" [style.color]="god.color">{{ god.sigil }}</span>
            </div>
            <h2 [style.color]="god.color">{{ god.name }}</h2>
            <div class="god-title">{{ god.title }}</div>
            <div class="god-sphere">Sphère : {{ god.sphere }}</div>
            <p class="citation"><span class="quote">«</span> {{ god.citation }} <span class="quote">»</span></p>
          </div>
        </header>

        <div class="god-body">
          <div class="god-main">
            <p class="description">{{ god.description }}</p>
            <p class="loreLong">{{ god.loreLong }}</p>

            <h3 class="section-title">Manifestations daemoniques</h3>
            <div class="daemons-hierarchy">
              <div class="daemon-tier">
                <span class="tier-label">Lesser</span>
                <span class="tier-value">{{ god.daemons.lesser }}</span>
              </div>
              <div class="daemon-tier">
                <span class="tier-label">Élite</span>
                <span class="tier-value">{{ god.daemons.elite }}</span>
              </div>
              <div class="daemon-tier">
                <span class="tier-label">Greater</span>
                <span class="tier-value">{{ god.daemons.greater }}</span>
              </div>
            </div>

            @if (god.daemons.notable.length > 0) {
              <h3 class="section-title">Daemons notables</h3>
              <div class="notable-grid">
                @for (d of god.daemons.notable; track d.name) {
                  <button class="notable-card" type="button" (click)="openDaemonLightbox(god, d)">
                    <div class="notable-name">{{ d.name }}</div>
                    <p>{{ d.description }}</p>
                    <span class="notable-zoom">⛶</span>
                  </button>
                }
              </div>
            }
          </div>

          <aside class="god-side">
            <div class="side-block">
              <div class="side-title">Portfolio</div>
              <ul>
                @for (p of god.portfolio; track p) {
                  <li>{{ p }}</li>
                }
              </ul>
            </div>

            @if (god.primarchsCorrupted.length > 0) {
              <div class="side-block">
                <div class="side-title">Primarques corrompus</div>
                @for (p of god.primarchsCorrupted; track p.name) {
                  <div class="primarch-link">
                    <div class="primarch-name">{{ p.name }}</div>
                    <div class="primarch-legion">{{ p.legion }}</div>
                    @if (p.primarchId) {
                      <a class="primarch-go" [routerLink]="['/lore/primarchs']" [fragment]="p.primarchId">
                        Voir fiche →
                      </a>
                    }
                  </div>
                }
              </div>
            }

            <div class="side-block">
              <div class="side-title">Légions notables</div>
              <ul class="legions">
                @for (l of god.legions; track l) {
                  <li>{{ l }}</li>
                }
              </ul>
            </div>
          </aside>
        </div>
      </article>
    }

    <section class="cta-bottom">
      <div class="ornament"><span class="line"></span><span class="aigle">✠</span><span class="line"></span></div>
      <p class="cta-text">
        Quatre dieux. Trois primarques nommés ici. Six millénaires de corruption.<br>
        L'Imperium tient encore — mais l'Œil de la Terreur ne se ferme jamais.
      </p>
      <div class="cta-actions">
        <a routerLink="/lore/primarchs" class="cta-link">Voir les vingt Primarques →</a>
        <a routerLink="/lore" class="cta-link secondary">Retour Lore Hub</a>
      </div>
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
  `,
  styleUrls: ['./lore-chaos-gods.component.scss'],
})
export class LoreChaosGodsComponent {
  private readonly service = inject(WarhammerService);
  readonly gods = toSignal(this.service.chaosGods$, { initialValue: [] as ChaosGod[] });
  readonly godImages = signal<Map<string, string>>(new Map());
  readonly lightbox = signal<LightboxState | null>(null);

  constructor() {
    this.service.chaosGods$.subscribe(list => {
      list.forEach(g => {
        if (g.wikiQuery) {
          this.service.getWikiImage(g.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              const m = new Map(this.godImages());
              m.set(g.id, r.imageUrl);
              this.godImages.set(m);
            }
          });
        }
      });
    });
  }

  godImg(id: string): string | null {
    const url = this.godImages().get(id);
    return url ? `url('${url}')` : null;
  }

  formatNum(n: number): string {
    return ['I', 'II', 'III', 'IV'][n - 1] ?? String(n);
  }

  openGodLightbox(g: ChaosGod): void {
    const baseUrl = this.godImages().get(g.id);
    if (!baseUrl) return;
    this.lightbox.set({
      title: g.name,
      subtitle: `${g.title} — ${g.sphere}`,
      description: g.description,
      contextName: 'Panthéon Chaos',
      contextColor: g.color,
      contextSigil: g.sigil,
      searchQuery: g.name,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const variants = [
      `${g.wikiQuery} 40k`,
      `${g.wikiQuery} greater daemon`,
      `${g.name} daemon prince warhammer 40k`,
      `${g.name} legion chaos space marines`,
      `${g.wikiQuery} art warhammer`,
    ];
    for (const q of variants) this.fetchVariant(q, g.name);
  }

  openDaemonLightbox(g: ChaosGod, d: ChaosGodDaemon): void {
    const query = d.wikiQuery ?? d.name;
    // Fetch base image first since daemons don't have pre-cached image
    this.service.getWikiImage(query).subscribe(r => {
      if (!r.imageUrl) return;
      this.lightbox.set({
        title: d.name,
        subtitle: `Daemon de ${g.name}`,
        description: d.description,
        contextName: 'Panthéon Chaos',
        contextColor: g.color,
        contextSigil: g.sigil,
        searchQuery: d.name,
        mainUrl: r.imageUrl,
        thumbUrls: [r.imageUrl],
        selectedIdx: 0,
      });
      const variants = [
        `${query} art`,
        `${d.name} ${g.name}`,
        `${query} concept art`,
        `${query} warhammer 40k`,
      ];
      for (const q of variants) this.fetchVariant(q, d.name);
    });
  }

  private fetchVariant(query: string, expectedTitle: string): void {
    this.service.getWikiImage(query).subscribe({
      next: r => {
        if (!r.imageUrl) return;
        const cur = this.lightbox();
        if (!cur || cur.title !== expectedTitle) return;
        if (cur.thumbUrls.includes(r.imageUrl)) return;
        this.lightbox.set({ ...cur, thumbUrls: [...cur.thumbUrls, r.imageUrl] });
      },
      error: () => {},
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
