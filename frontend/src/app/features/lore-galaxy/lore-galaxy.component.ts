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
        <!-- Debug overlay : affiche x/y au hover (viewBox 700×490) pour calibrer les hot zones -->
        <div class="debug-coords">
          coords SVG : <strong>{{ debugX() }}</strong>, <strong>{{ debugY() }}</strong>
          <span class="debug-hint">(hover map, copie-colle dans le chat)</span>
        </div>
        <svg class="galaxy-map" viewBox="0 0 700 490" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" (mousemove)="onMapMove($event)">
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
      min-height: 200px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #050403;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
      display: flex;
      align-items: end;
      padding: 32px 50px 26px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 80% 30%, rgba(201, 162, 74, 0.32), transparent 55%),
        radial-gradient(circle at 20% 80%, rgba(122, 74, 139, 0.32), transparent 55%),
        linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.95) 80%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 760px; }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 12px;
      color: var(--gold-bright);
      border: 1px solid rgba(201, 162, 74, 0.5);
      background: rgba(201, 162, 74, 0.1);
    }
    h1 {
      font-size: clamp(38px, 4.8vw, 56px);
      line-height: 1.04;
      margin: 0 0 12px;
      color: var(--gold-bright);
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 14px; color: var(--text); line-height: 1.65; margin: 0; max-width: 720px; }

    .layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 22px;
      margin-bottom: 32px;
    }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }

    .map-wrap {
      position: relative;
      border: 1px solid var(--border);
      background: #050403;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .debug-coords {
      position: absolute;
      top: 6px;
      left: 6px;
      z-index: 5;
      padding: 4px 10px;
      background: rgba(0,0,0,0.85);
      border: 1px solid var(--gold-soft);
      font-family: monospace;
      font-size: 11px;
      color: var(--gold-bright);
      pointer-events: none;
    }
    .debug-coords strong { color: #f0d276; min-width: 28px; display: inline-block; }
    .debug-hint { color: var(--muted); font-size: 10px; margin-left: 8px; font-style: italic; }

    .galaxy-map {
      width: 100%;
      height: auto;
      display: block;
    }

    .hot-zone { cursor: pointer; transition: transform 0.2s; transform-origin: center; transform-box: fill-box; }
    .hot-zone:hover .hz-core { transform: scale(1.5); transform-origin: center; transform-box: fill-box; }
    .hot-zone .hz-label { transition: opacity 0.2s; pointer-events: none; }
    .hot-zone:hover .hz-label { fill: var(--gold-bright); }

    .tooltip {
      position: absolute;
      pointer-events: none;
      max-width: 280px;
      padding: 10px 14px 12px;
      border: 1px solid var(--border-strong);
      background: rgba(8, 6, 4, 0.96);
      box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      top: 12px;
      right: 12px;
      z-index: 10;
    }
    .tt-name {
      font-family: var(--serif);
      font-size: 14px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .tt-type {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .tooltip p {
      font-size: 11.5px;
      color: var(--text);
      line-height: 1.5;
      margin: 0 0 8px;
    }
    .tt-cta {
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 700;
    }

    .legend {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 18px 20px;
      border: 1px solid var(--border);
      background: rgba(11, 9, 7, 0.65);
      max-height: calc(100vh - 100px);
      overflow-y: auto;
    }
    .legend h3 {
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--gold);
      margin: 0 0 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .seg-grid { display: flex; flex-direction: column; gap: 10px; }
    .seg-card {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 8px 10px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
    }
    .seg-dot {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--seg-color);
      box-shadow: 0 0 8px var(--seg-color);
      margin-top: 2px;
    }
    .seg-name {
      font-family: var(--serif);
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--seg-color);
    }
    .seg-card p {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
      margin: 2px 0 0;
    }

    .rift-card {
      padding: 10px 12px 12px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.4);
      margin-bottom: 8px;
    }
    .rift-card.eye { border-left: 3px solid #9c2680; }
    .rift-card.maelstrom { border-left: 3px solid #c43a26; }
    .rift-card.cicatrix { border-left: 3px solid #f0d276; }
    .rift-name {
      font-family: var(--serif);
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--gold-bright);
      margin-bottom: 4px;
    }
    .rift-card p {
      font-size: 11px;
      color: var(--text);
      line-height: 1.5;
      margin: 0 0 6px;
    }
    .rift-link {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 700;
    }
    .rift-link:hover { color: var(--gold-bright); }

    .hz-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .hz-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text);
      font-family: var(--sans);
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .hz-btn:hover {
      background: rgba(0, 0, 0, 0.4);
      border-color: var(--border);
      color: var(--gold-bright);
    }
    .hz-bullet {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--hz-color);
      box-shadow: 0 0 6px var(--hz-color);
    }

    .credit {
      font-size: 10px;
      color: var(--muted);
      line-height: 1.5;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-style: italic;
    }
    .credit em { color: var(--gold); font-style: italic; }

    .cta-bottom {
      max-width: 760px;
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
export class LoreGalaxyComponent {
  private readonly router = inject(Router);
  private readonly service = inject(WarhammerService);

  readonly hoveredId = signal<string | null>(null);
  readonly mapBgUrl = signal<string>('');
  readonly debugX = signal<string>('—');
  readonly debugY = signal<string>('—');

  onMapMove(e: MouseEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (m) {
      const local = pt.matrixTransform(m.inverse());
      this.debugX.set(local.x.toFixed(0));
      this.debugY.set(local.y.toFixed(0));
    }
  }

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
    { id: 'eye-of-terror', name: 'Œil de la Terreur', type: 'rift', cx: 120, cy: 130, r: 12, color: '#9c2680',
      description: 'Faille warp permanente née de la naissance de Slaanesh (M30). Repaire des Légions Chaos. Visible : tache noire entourée de Halo Stars.', conceptId: 'eye-of-terror' },
    { id: 'cadia', name: 'Cadia (✝)', type: 'world', cx: 145, cy: 155, r: 6, color: '#5a6878',
      description: 'Forteresse-monde tombée à la 13ᵉ Croisade Noire (M41). Origine de la Cicatrix.', conceptId: 'cadia' },
    { id: 'baal', name: 'Baal', type: 'world', cx: 325, cy: 165, r: 5, color: '#c9302c',
      description: 'Monde-mère des Blood Angels. Sanctuaire de Sanguinius. Système triple-soleils irradié.', conceptId: 'baal' },
    { id: 'terra', name: 'Holy Terra', type: 'world', cx: 125, cy: 215, r: 7, color: '#f0d276',
      description: 'Capitale sacrée de l\'Imperium. Trône d\'Or, Astronomican.', conceptId: 'holy-terra' },
    { id: 'mars', name: 'Mars', type: 'world', cx: 135, cy: 220, r: 5, color: '#b85a3a',
      description: 'Capitale de l\'Adeptus Mechanicus.', conceptId: 'mars' },
    { id: 'titan', name: 'Titan', type: 'world', cx: 130, cy: 225, r: 4, color: '#5a6878',
      description: 'Lune de Saturne. Monde-forteresse caché des Grey Knights.' },
    { id: 'maelstrom', name: 'Maelstrom', type: 'rift', cx: 285, cy: 240, r: 10, color: '#c43a26',
      description: 'Tempête warp permanente du Segmentum Ultima. Bandes Chaos, pirates.', conceptId: 'maelstrom' },
    { id: 'macragge', name: 'Macragge', type: 'world', cx: 425, cy: 380, r: 7, color: '#1d4ba0',
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
