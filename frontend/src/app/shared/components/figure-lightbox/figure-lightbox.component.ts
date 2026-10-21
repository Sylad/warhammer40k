import { Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface LightboxState {
  title: string;
  subtitle: string;
  description?: string;
  contextName: string;
  contextColor: string;
  contextSigil: string;
  searchQuery: string;
  mainUrl: string;
  thumbUrls: string[];
  selectedIdx: number;
}

@Component({
  selector: 'app-figure-lightbox',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (state()) {
      <div class="lightbox" (click)="closed.emit()">
        <div class="lightbox-stage" (click)="$event.stopPropagation()">
          <button class="lightbox-close" (click)="closed.emit()" aria-label="Fermer">✕</button>
          <div class="lightbox-image" [style.background-image]="'url(\\'' + state()!.mainUrl + '\\')'"></div>
          <div class="lightbox-info">
            <div class="lightbox-meta">
              <span class="lightbox-org">{{ state()!.contextName }}</span>
              <span class="lightbox-sigil">{{ state()!.contextSigil }}</span>
            </div>
            <h2 class="lightbox-title" [style.color]="state()!.contextColor">{{ state()!.title }}</h2>
            <div class="lightbox-role">{{ state()!.subtitle }}</div>
            @if (state()!.description) {
              <p class="lightbox-desc">{{ state()!.description }}</p>
            }
            @if (state()!.thumbUrls.length > 1) {
              <div class="lightbox-section-title">Galerie</div>
              <div class="lightbox-thumbs">
                @for (url of state()!.thumbUrls; track url; let i = $index) {
                  <button class="lightbox-thumb" type="button"
                          [class.active]="i === state()!.selectedIdx"
                          [style.background-image]="'url(\\'' + url + '\\')'"
                          (click)="thumbSelected.emit(i)" [attr.aria-label]="'Vue ' + (i + 1)"></button>
                }
              </div>
            }
            <a class="lightbox-cta" [routerLink]="['/gallery']" [queryParams]="{ q: state()!.searchQuery }" (click)="closed.emit()">
              <span class="lightbox-cta-ico">▦</span> Chercher dans la Galerie Impériale →
            </a>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .lightbox {
      position: fixed; inset: 0;
      z-index: 1000;
      background: rgba(2,1,1,0.92);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 32px;
      animation: fade 0.18s ease-out;
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    .lightbox-stage {
      position: relative;
      max-width: 1280px;
      width: 100%;
      max-height: calc(100vh - 64px);
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 0;
      background: #050403;
      border: 1px solid rgba(201,162,74,0.4);
      box-shadow: 0 28px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,74,0.18);
      overflow: hidden;
    }
    @media (max-width: 900px) {
      .lightbox-stage { grid-template-columns: 1fr; max-height: calc(100vh - 32px); }
      .lightbox { padding: 16px; }
    }
    .lightbox-close {
      position: absolute; top: 12px; right: 12px;
      z-index: 2;
      width: 36px; height: 36px;
      background: rgba(8,7,6,0.78);
      border: 1px solid rgba(201,162,74,0.4);
      color: var(--gold-bright);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .lightbox-close:hover { background: rgba(123,17,19,0.6); border-color: var(--gold); }
    .lightbox-image {
      min-height: 480px;
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      background-color: #050403;
      filter: contrast(1.05) saturate(0.95);
    }
    @media (max-width: 900px) { .lightbox-image { min-height: 280px; } }
    .lightbox-info {
      padding: 28px 28px 24px;
      overflow-y: auto;
      display: flex; flex-direction: column;
      border-left: 1px solid rgba(201,162,74,0.18);
    }
    @media (max-width: 900px) { .lightbox-info { border-left: 0; border-top: 1px solid rgba(201,162,74,0.18); } }
    .lightbox-meta {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .lightbox-org {
      color: var(--muted);
      font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700;
    }
    .lightbox-sigil { color: var(--gold); font-size: 18px; }
    .lightbox-title {
      font-family: var(--serif);
      font-size: clamp(22px, 3vw, 30px);
      letter-spacing: 0.02em;
      margin: 0 0 4px;
      color: var(--gold-bright);
      line-height: 1.15;
    }
    .lightbox-role {
      color: var(--gold-soft);
      font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;
      margin-bottom: 14px;
    }
    .lightbox-desc { color: var(--text); font-size: 14px; line-height: 1.7; margin: 0 0 18px; }
    .lightbox-section-title {
      color: var(--gold);
      font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;
      margin: 4px 0 8px;
    }
    .lightbox-thumbs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 6px;
      margin-bottom: 18px;
    }
    .lightbox-thumb {
      aspect-ratio: 1;
      background-size: cover;
      background-position: center;
      border: 1px solid rgba(201,162,74,0.32);
      cursor: pointer;
      padding: 0;
      opacity: 0.7;
      transition: all 0.15s;
    }
    .lightbox-thumb:hover { opacity: 1; border-color: var(--gold-soft); transform: scale(1.04); }
    .lightbox-thumb.active { opacity: 1; border-color: var(--gold-bright); box-shadow: 0 0 0 1px var(--gold-bright), 0 0 14px rgba(201,162,74,0.32); }
    .lightbox-cta {
      margin-top: auto;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 16px;
      border: 1px solid var(--gold);
      color: var(--gold);
      font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
      text-decoration: none;
      transition: all 0.15s;
    }
    .lightbox-cta:hover { background: rgba(201,162,74,0.08); color: var(--gold-bright); border-color: var(--gold-bright); }
    .lightbox-cta-ico { font-size: 14px; }
  `],
})
export class FigureLightboxComponent {
  readonly state = input<LightboxState | null>(null);
  readonly closed = output<void>();
  readonly thumbSelected = output<number>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state()) this.closed.emit();
  }
}
