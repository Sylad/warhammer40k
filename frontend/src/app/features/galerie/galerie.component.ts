import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WarhammerService } from '../../core/services/warhammer.service';

@Component({
  selector: 'app-galerie',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Galerie</h1>
        <p class="page-subtitle">{{ allImages()?.length ?? '…' }} illustrations Warhammer 40 000</p>
      </div>
      <div class="header-actions">
        <button mat-stroked-button (click)="shuffleOrder()">
          <mat-icon>shuffle</mat-icon> Mélanger
        </button>
      </div>
    </div>

    @if (!allImages()) {
      <div class="loading">Chargement des images…</div>
    } @else {
      <div class="masonry">
        @for (filename of shuffledImages(); track filename) {
          <div class="masonry-item" (click)="openLightbox(filename)">
            <img [src]="service.imageUrl(filename)" [alt]="filename"
                 loading="lazy" (error)="onImgError($event)" />
          </div>
        }
      </div>
    }

    @if (lightboxSrc()) {
      <div class="lightbox-overlay" (click)="closeLightbox()">
        <div class="lightbox-nav left" (click)="$event.stopPropagation(); lightboxPrev()">
          <mat-icon>chevron_left</mat-icon>
        </div>
        <img [src]="lightboxSrc()!" (click)="$event.stopPropagation()" class="lightbox-img" />
        <div class="lightbox-nav right" (click)="$event.stopPropagation(); lightboxNext()">
          <mat-icon>chevron_right</mat-icon>
        </div>
        <button class="lightbox-close" (click)="closeLightbox()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    h1 { margin: 0 0 4px; font-size: 2.2rem; }
    .page-subtitle { color: #555; margin: 0; font-size: 0.88rem; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .loading { color: #555; text-align: center; padding: 60px; }

    .masonry {
      column-count: 1;
      column-gap: 8px;
      margin-bottom: 24px;
    }
    @media (min-width: 640px) { .masonry { column-count: 2; } }
    @media (min-width: 1000px) { .masonry { column-count: 3; } }
    @media (min-width: 1400px) { .masonry { column-count: 4; } }

    .masonry-item {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 8px;
      border-radius: 3px;
      overflow: hidden;
      background: #0e0e0e;
      border: 1px solid #1a1a1a;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.15s;
    }
    .masonry-item:hover { border-color: rgba(201,168,76,0.4); transform: scale(1.02); }
    .masonry-item img {
      width: 100%;
      height: auto;
      display: block;
    }

    .lightbox-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.92);
      display: flex; align-items: center; justify-content: center;
    }
    .lightbox-img {
      max-width: 90vw; max-height: 90vh;
      object-fit: contain;
      border-radius: 3px;
      box-shadow: 0 0 60px rgba(0,0,0,0.8);
    }
    .lightbox-close {
      position: absolute; top: 16px; right: 16px;
      background: rgba(0,0,0,0.6); border: 1px solid #333;
      border-radius: 50%; width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #aaa; transition: color 0.2s;
    }
    .lightbox-close:hover { color: #fff; }
    .lightbox-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(0,0,0,0.6); border: 1px solid #333;
      border-radius: 50%; width: 48px; height: 48px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #aaa; transition: color 0.2s;
    }
    .lightbox-nav:hover { color: #c9a84c; }
    .lightbox-nav.left { left: 16px; }
    .lightbox-nav.right { right: 16px; }
  `],
})
export class GalerieComponent {
  readonly service = inject(WarhammerService);

  readonly allImages = toSignal(this.service.images$);

  private shuffleSeed = signal(0);

  readonly shuffledImages = computed(() => {
    this.shuffleSeed();
    const imgs = this.allImages();
    if (!imgs?.length) return [];
    const arr = [...imgs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  shuffleOrder() {
    this.shuffleSeed.update(v => v + 1);
    this.lightboxIndex.set(-1);
  }

  private lightboxIndex = signal(-1);

  readonly lightboxSrc = computed(() => {
    const idx = this.lightboxIndex();
    if (idx < 0) return null;
    const filename = this.shuffledImages()[idx];
    return filename ? this.service.imageUrl(filename) : null;
  });

  openLightbox(filename: string) {
    this.lightboxIndex.set(this.shuffledImages().indexOf(filename));
  }

  closeLightbox() { this.lightboxIndex.set(-1); }
  lightboxNext() { this.lightboxIndex.update(i => Math.min(i + 1, this.shuffledImages().length - 1)); }
  lightboxPrev() { this.lightboxIndex.update(i => Math.max(i - 1, 0)); }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).style.opacity = '0.1';
  }
}
