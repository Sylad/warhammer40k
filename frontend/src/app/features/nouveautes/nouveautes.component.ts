import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { NEWS_BASE, NewsService, type NewsEntry } from './news.service';
import { isUnseen, seenSeparatorLabel, sinceLabel, type NewsSeen } from './news-badge';
import { entryForFragment, permalink } from './news-anchor';
import {
  captureAlt, captureBoxWidth, formatDay, separatorIndex, viewerMode, viewerPhoneWidth, type CaptureSize,
} from './nouveautes.utils';

interface Capture {
  src: string;
  alt: string;
  size?: CaptureSize;
  box: string | null;
}

interface Viewing {
  capture: Capture;
  mode: 'scroll' | 'fit' | 'natural';
  width: string | null;
  /** Téléphone : capture ajustée à la largeur de la zone (défilement vertical seul). */
  fill: boolean;
  opener: HTMLElement;
}

/**
 * L23 — page Nouveautés (/nouveautes) : le journal des évolutions visibles du codex,
 * la plus récente en haut (signature commune des apps : finance-tracker L18,
 * ol-companion L13, claude-code-codex L13, AetherWX).
 *
 * - pastille « Nouveau », ligne « N nouveautés depuis votre dernière visite » et
 *   séparateur « Déjà vu lors de votre visite du … » (mémoire localStorage) ;
 * - lien permanent par entrée (/nouveautes#<slug>) : le titre copie l'adresse ;
 * - visionneuse <dialog> : Entrée ou clic ouvre, Échap ou « Fermer » referme et rend
 *   le focus à la capture ; au téléphone la capture garde sa largeur naturelle (au plus
 *   deux écrans) dans une zone qui défile, « Fermer » reste hors de cette zone.
 */
@Component({
  selector: 'app-nouveautes',
  standalone: true,
  template: `
    <section class="news">
      <header class="news-head">
        <p class="news-eyebrow">Nouveautés · Codex numérique</p>
        <h1>Ce qui a changé</h1>
        <p class="news-lede">Le journal des évolutions visibles du codex, la plus récente en haut.</p>
      </header>

      @switch (state()) {
        @case ('error') {
          <p class="news-empty">Le journal des nouveautés n’a pas pu être chargé. Réessayez plus tard.</p>
        }
        @case ('ready') {
          @if (entries().length === 0) {
            <p class="news-empty">Aucune nouveauté publiée pour l’instant.</p>
          } @else {
            <p class="news-since" role="status">{{ since() }}</p>
            <ol class="news-list">
              @for (e of entries(); track e.slug; let i = $index) {
                @if (i === separatorAt()) {
                  <!-- Repère visuel ; la ligne « N nouveautés depuis… » le dit aux lecteurs d'écran. -->
                  <li class="news-seen-sep" aria-hidden="true">{{ separatorLabel() }}</li>
                }
                <li>
                  <article class="news-entry" [id]="e.slug" tabindex="-1"
                           [class.is-target]="target() === e.slug" [attr.aria-labelledby]="e.slug + '-titre'">
                    <p class="news-date">
                      <time [attr.datetime]="e.date">{{ formatDay(e.date) }}</time>
                      @if (fresh()[i]) { <span class="news-new">Nouveau</span> }
                    </p>
                    <h2 [id]="e.slug + '-titre'">
                      <a class="news-permalink" [attr.href]="'/nouveautes#' + e.slug"
                         title="Lien vers cette nouveauté (copié au clic)"
                         (click)="copyLink($event, e.slug)">{{ e.title }}</a>
                    </h2>
                    <p class="news-link-status" role="status">{{ linkStatus()[e.slug] }}</p>
                    <!-- HTML produit par cadence depuis le Markdown du dépôt (assaini par Angular). -->
                    <div class="news-body" [innerHTML]="e.html"></div>
                    @if (e.captures.length) {
                      <div class="news-captures">
                        @for (c of captures(e); track c.src) {
                          <a class="news-capture" [attr.href]="c.src" [style.width]="c.box"
                             [attr.aria-label]="c.alt + ' (agrandir)'" (click)="openViewer($event, c)">
                            <img [attr.src]="c.src" [attr.alt]="c.alt" [attr.width]="c.size?.[0]" [attr.height]="c.size?.[1]"
                                 [style.aspect-ratio]="c.size ? c.size[0] + ' / ' + c.size[1] : null"
                                 loading="lazy" decoding="async" />
                          </a>
                        }
                      </div>
                    }
                  </article>
                </li>
              }
            </ol>
          }
        }
        @default {
          <p class="news-empty" role="status">Chargement…</p>
        }
      }
    </section>

    <!-- Visionneuse des captures : « Fermer » hors de la zone qui défile, toujours visible. -->
    <dialog #viewer class="news-viewer" [attr.aria-label]="viewing()?.capture?.alt ?? 'Capture agrandie'"
            [attr.data-mode]="viewing()?.mode ?? null" [attr.data-fill]="viewing()?.fill ? '' : null"
            (keydown)="onViewerKeydown($event)" (click)="onViewerClick($event)" (close)="onViewerClosed()">
      <div class="news-viewer-inner">
        <button #closeButton type="button" class="news-viewer-close" (click)="closeViewer()">
          <span aria-hidden="true">✕</span> Fermer
        </button>
        <div class="news-viewer-zone" role="region" tabindex="0"
             aria-label="Capture agrandie, faire défiler pour voir la suite">
          @if (viewing(); as v) {
            <img [attr.src]="v.capture.src" [attr.alt]="v.capture.alt" [style.width]="v.width" />
          }
        </div>
      </div>
    </dialog>
  `,
  styleUrl: './nouveautes.component.scss',
})
export class NouveautesComponent implements OnInit, OnDestroy {
  private readonly news = inject(NewsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // @ViewChild (et non viewChild()) : les requêtes-signaux exigent la transformation AOT,
  // absente des tests Vitest en JIT.
  @ViewChild('viewer', { static: true }) private dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('closeButton', { static: true }) private closeRef?: ElementRef<HTMLButtonElement>;

  readonly state = this.news.state;
  readonly entries = this.news.entries;
  /** Mémoire de la visite PRÉCÉDENTE, figée à l'arrivée sur la page. */
  private readonly before = signal<NewsSeen | null>(null);
  private readonly visited = signal(false);

  readonly fresh = computed(() => {
    const before = this.before();
    return this.entries().map((e) => isUnseen(e, before));
  });
  readonly since = computed(() => sinceLabel(this.fresh().filter(Boolean).length));
  readonly separatorAt = computed(() => separatorIndex(this.fresh(), this.before() !== null));
  readonly separatorLabel = computed(() => {
    const before = this.before();
    return before ? seenSeparatorLabel(before) : '';
  });
  readonly target = signal<string | null>(null);
  readonly linkStatus = signal<Record<string, string>>({});
  readonly viewing = signal<Viewing | null>(null);

  readonly formatDay = formatDay;

  private readonly onHashChange = () => this.revealTarget();
  private statusTimers: ReturnType<typeof setTimeout>[] = [];

  async ngOnInit(): Promise<void> {
    window.addEventListener('hashchange', this.onHashChange);
    await this.news.load();
    if (this.state() !== 'ready' || this.visited()) return;
    this.visited.set(true);
    this.before.set(this.news.visit());
    // Les entrées viennent d'être rendues : viser l'ancre une fois le DOM à jour.
    setTimeout(() => this.revealTarget());
  }

  ngOnDestroy(): void {
    window.removeEventListener('hashchange', this.onHashChange);
    this.statusTimers.forEach(clearTimeout);
    if (this.viewing()) document.body.style.overflow = '';
  }

  captures(e: NewsEntry): Capture[] {
    const sizes = this.news.sizes();
    return e.captures.map((c, i) => ({
      src: `${NEWS_BASE}/${c}`,
      alt: captureAlt(e.title, i, e.captures.length),
      size: sizes[c],
      box: captureBoxWidth(sizes[c]),
    }));
  }

  /** Lien permanent : l'ancre va dans la barre d'adresse, l'URL complète est copiée. */
  async copyLink(event: MouseEvent, slug: string): Promise<void> {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.replaceState(history.state, '', `${location.pathname}#${encodeURIComponent(slug)}`);
    this.revealTarget();
    let message: string;
    try {
      await navigator.clipboard.writeText(permalink(location.origin, slug));
      message = 'Lien copié dans le presse-papiers';
    } catch {
      message = 'Lien affiché dans la barre d’adresse';
    }
    this.linkStatus.update((s) => ({ ...s, [slug]: message }));
    this.statusTimers.push(setTimeout(() => this.linkStatus.update((s) => ({ ...s, [slug]: '' })), 4000));
  }

  /** Entrée visée par l'ancre de l'URL : signalée, focalisée, amenée à l'écran. */
  private revealTarget(): void {
    const slug = entryForFragment(location.hash, this.entries());
    this.target.set(slug);
    if (!slug) return;
    const el = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('article.news-entry')).find((a) => a.id === slug);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: 'start' });
  }

  /** Clic, ou Entrée sur le lien (qui déclenche un clic) : la visionneuse, pas le PNG brut. */
  openViewer(event: MouseEvent, capture: Capture): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const mode = viewerMode(capture.size, viewport);
    let width: string | null = null;
    let fill = false;
    if (capture.size && mode === 'scroll') {
      const w = viewerPhoneWidth(capture.size, viewport.width);
      fill = w === 'zone';
      width = fill ? '100%' : `${w}px`;
    }
    if (capture.size && mode === 'natural') width = `min(${capture.size[0]}px, calc(100vw - 3rem - 2px))`;
    this.viewing.set({ capture, mode, width, fill, opener: event.currentTarget as HTMLElement });
    document.body.style.overflow = 'hidden';
    this.dialogRef?.nativeElement.showModal();
    this.closeRef?.nativeElement.focus();
  }

  closeViewer(): void {
    this.dialogRef?.nativeElement.close();
  }

  onViewerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.closeViewer();
  }

  /** Clic sur le voile (le dialogue lui-même ou son cadre, hors capture et bouton). */
  onViewerClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (t === this.dialogRef?.nativeElement || t.classList.contains('news-viewer-inner')) this.closeViewer();
  }

  /** Événement `close` du dialogue (Échap natif, « Fermer », voile) : tout est rendu. */
  onViewerClosed(): void {
    const opener = this.viewing()?.opener;
    this.viewing.set(null);
    document.body.style.overflow = '';
    if (opener?.isConnected) opener.focus();
  }
}
