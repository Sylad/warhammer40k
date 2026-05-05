import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';

interface Segmentum {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface HotZone {
  id: string;
  name: string;
  type: 'world' | 'rift' | 'nexus';
  cx: number;
  cy: number;
  r: number;
  color: string;
  description: string;
  conceptId?: string;
  external?: string;
}

@Component({
  selector: 'app-lore-galaxy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">✦ Imperius Dominatus · Carte des Cinq Segmenta</div>
        <h1>La Galaxie</h1>
        <p class="lede">
          Carte canonique de la Voie Lactée au M42. Cinq Segmenta administratifs depuis Terra,
          deux failles warp permanentes, et la Cicatrix Maledictum qui traverse la galaxie
          depuis la chute de Cadia. Survolez les pastilles colorées, cliquez pour explorer le lore.
        </p>
      </div>
    </section>

    <div class="layout">
      <main class="map-wrap">
        <svg class="galaxy-map" viewBox="0 0 700 490" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Image canonique W40K (post-Cicatrix Imperius Dominatus) -->
          @if (mapBgUrl()) {
            <image [attr.href]="mapBgUrl()" x="0" y="0" width="700" height="490" />
          } @else {
            <rect x="0" y="0" width="700" height="490" fill="#0a0814" />
            <text x="350" y="245" text-anchor="middle" fill="#8d8678" font-family="Cinzel, serif" font-size="14">
              Chargement de la carte galactique…
            </text>
          }

          <!-- Voile sombre pour rendre les hot zones plus contrastées -->
          <rect x="0" y="0" width="700" height="490" fill="#000" opacity="0.18" />

          <!-- Hot zones (pastilles cliquables) -->
          @for (hz of hotZones; track hz.id) {
            <g class="hot-zone" [class.zone-rift]="hz.type === 'rift'" (click)="goTo(hz)" (mouseenter)="hoveredId.set(hz.id)" (mouseleave)="hoveredId.set(null)">
              <circle [attr.cx]="hz.cx" [attr.cy]="hz.cy" [attr.r]="hz.r + 4" [attr.fill]="hz.color" opacity="0.25" filter="url(#strongGlow)"/>
              <circle [attr.cx]="hz.cx" [attr.cy]="hz.cy" [attr.r]="hz.r" [attr.fill]="hz.color" filter="url(#glow)" class="hz-core"/>
              <circle [attr.cx]="hz.cx" [attr.cy]="hz.cy" [attr.r]="hz.r - 1.5" fill="#fff" opacity="0.7"/>
              <text [attr.x]="hz.cx" [attr.y]="hz.cy - hz.r - 6" fill="#fff" font-family="Cinzel, serif" font-size="9" letter-spacing="1.5" text-anchor="middle" class="hz-label" style="paint-order: stroke; stroke: #000; stroke-width: 2.5; stroke-linejoin: round;">
                {{ hz.name | uppercase }}
              </text>
            </g>
          }
        </svg>

        @if (hoveredZone(); as hz) {
          <div class="tooltip">
            <div class="tt-name" [style.color]="hz.color">{{ hz.name }}</div>
            <div class="tt-type">{{ typeLabel(hz.type) }}</div>
            <p>{{ hz.description }}</p>
            @if (hz.conceptId) {
              <div class="tt-cta">Cliquez pour explorer →</div>
            }
          </div>
        }
      </main>

      <aside class="legend">
        <h3>Les 5 Segmenta</h3>
        <div class="seg-grid">
          @for (seg of segmenta; track seg.id) {
            <div class="seg-card" [style.--seg-color]="seg.color">
              <div class="seg-dot"></div>
              <div>
                <div class="seg-name">{{ seg.name }}</div>
                <p>{{ seg.description }}</p>
              </div>
            </div>
          }
        </div>

        <h3>Failles warp</h3>
        <div class="rift-card eye">
          <div class="rift-name">Œil de la Terreur</div>
          <p>Plaie warp permanente née de la naissance de Slaanesh (M30).</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="eye-of-terror">Voir lore →</a>
        </div>
        <div class="rift-card maelstrom">
          <div class="rift-name">Maelstrom</div>
          <p>Tempête warp permanente du Segmentum Ultima.</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="maelstrom">Voir lore →</a>
        </div>
        <div class="rift-card cicatrix">
          <div class="rift-name">Cicatrix Maledictum</div>
          <p>Déchirure galactique née de la chute de Cadia (M41). Imperium Sanctus / Nihilus.</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="cicatrix-maledictum">Voir lore →</a>
        </div>

        <h3>Hot zones cliquables</h3>
        <ul class="hz-list">
          @for (hz of hotZones; track hz.id) {
            <li>
              <button class="hz-btn" (click)="goTo(hz)" [style.--hz-color]="hz.color">
                <span class="hz-bullet"></span>{{ hz.name }}
              </button>
            </li>
          }
        </ul>

        <div class="credit">
          Carte : <em>Imperius Dominatus, Imperial Record 0853</em> (M42).<br>
          Source : Warhammer 40K Wiki Fandom (CC BY-SA).
        </div>
      </aside>
    </div>

    <section class="cta-bottom">
      <div class="ornament"><span class="line"></span><span class="aigle">✠</span><span class="line"></span></div>
      <p class="cta-text">
        Une galaxie de mille milliards de mondes. Une cathédrale d'or qui se fissure.<br>
        Quelque part au centre, un homme cloué sur un Trône regarde sa lumière s'éteindre.
      </p>
      <div class="cta-actions">
        <a routerLink="/lore/concepts" class="cta-link">Encyclopédie des concepts →</a>
      </div>
    </section>
  `,
  styleUrls: ['./lore-galaxy.component.scss'],
})
export class LoreGalaxyComponent {
  private readonly router = inject(Router);
  private readonly service = inject(WarhammerService);

  readonly hoveredId = signal<string | null>(null);
  readonly mapBgUrl = signal<string>('');

  readonly segmenta: Segmentum[] = [
    { id: 'solar', name: 'Solar', color: '#f0d276', description: 'Centre galactique. Terra, Mars, Trône d\'Or.' },
    { id: 'pacificus', name: 'Pacificus', color: '#3a6cc4', description: 'Ouest galactique. Halo Stars, Calixis Sector.' },
    { id: 'tempestus', name: 'Tempestus', color: '#5fc97a', description: 'Sud galactique. Veiled Region, frontière.' },
    { id: 'obscurus', name: 'Obscurus', color: '#9c2680', description: 'Nord galactique. Œil de la Terreur, Cadia (✝).' },
    { id: 'ultima', name: 'Ultima', color: '#1d4ba0', description: 'Est galactique. Macragge, Ultramar, Maelstrom.' },
  ];

  // Coordonnées calibrées sur image canonique HD (viewBox 700×490, ratio = 700/3054 = 0.229)
  // Positions mesurées via grille SVG superposée sur l'image originale.
  readonly hotZones: HotZone[] = [
    { id: 'eye-of-terror', name: 'Œil de la Terreur', type: 'rift', cx: 88, cy: 163, r: 12, color: '#9c2680',
      description: 'Faille warp permanente née de la naissance de Slaanesh (M30). Repaire des Légions Chaos. Visible : tache noire entourée de Halo Stars.', conceptId: 'eye-of-terror' },
    { id: 'cadia', name: 'Cadia (✝)', type: 'world', cx: 90, cy: 167, r: 6, color: '#5a6878',
      description: 'Forteresse-monde tombée à la 13ᵉ Croisade Noire (M41). Origine de la Cicatrix.', conceptId: 'cadia' },
    { id: 'baal', name: 'Baal', type: 'world', cx: 325, cy: 165, r: 5, color: '#c9302c',
      description: 'Monde-mère des Blood Angels. Sanctuaire de Sanguinius. Système triple-soleils irradié.', conceptId: 'baal' },
    { id: 'terra', name: 'Holy Terra', type: 'world', cx: 126, cy: 265, r: 7, color: '#f0d276',
      description: 'Capitale sacrée de l\'Imperium. Trône d\'Or, Astronomican.', conceptId: 'holy-terra' },
    { id: 'mars', name: 'Mars', type: 'world', cx: 134, cy: 262, r: 5, color: '#b85a3a',
      description: 'Capitale de l\'Adeptus Mechanicus.', conceptId: 'mars' },
    { id: 'titan', name: 'Titan', type: 'world', cx: 130, cy: 272, r: 4, color: '#5a6878',
      description: 'Lune de Saturne. Monde-forteresse caché des Grey Knights.' },
    { id: 'maelstrom', name: 'Maelstrom', type: 'rift', cx: 268, cy: 262, r: 10, color: '#c43a26',
      description: 'Tempête warp permanente du Segmentum Ultima. Bandes Chaos, pirates.', conceptId: 'maelstrom' },
    { id: 'macragge', name: 'Macragge', type: 'world', cx: 424, cy: 398, r: 7, color: '#1d4ba0',
      description: 'Monde-mère des Ultramarines. Capitale d\'Ultramar (500 mondes).', conceptId: 'macragge' },
  ];

  constructor() {
    // Force URL HD (full résolution 3054x2136 au lieu du scale-down 700px du wiki proxy)
    this.mapBgUrl.set(
      'https://static.wikia.nocookie.net/warhammer40k/images/f/fa/SpaceMarineChapterHomeworldsGreatRift.png/revision/latest/scale-to-width-down/2000'
    );
  }

  hoveredZone(): HotZone | null {
    const id = this.hoveredId();
    if (!id) return null;
    return this.hotZones.find(z => z.id === id) ?? null;
  }

  goTo(hz: HotZone) {
    if (hz.conceptId) {
      this.router.navigate(['/lore/concepts'], { fragment: hz.conceptId });
    }
  }

  typeLabel(t: HotZone['type']): string {
    return t === 'rift' ? 'Faille warp' : t === 'nexus' ? 'Nexus xenos' : 'Monde-clé';
  }
}
