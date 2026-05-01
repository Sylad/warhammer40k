import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { inject } from '@angular/core';

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
        <div class="badge">✦ Carte des Cinq Segmenta</div>
        <h1>La Galaxie</h1>
        <p class="lede">
          La Voie Lactée du 41<sup>e</sup> millénaire. Cinq Segmenta administratifs depuis Terra,
          deux failles warp permanentes, et une Cicatrice qui partage l'Imperium en deux moitiés
          depuis la chute de Cadia. Survolez les zones-clés, cliquez pour lire leur lore.
        </p>
      </div>
    </section>

    <div class="layout">
      <main class="map-wrap">
        <svg class="galaxy-map" viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="galaxyCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff7c2" stop-opacity="0.95"/>
              <stop offset="20%" stop-color="#f0d276" stop-opacity="0.6"/>
              <stop offset="60%" stop-color="#7b1113" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="#050403" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="eyeOfTerror" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#9c2680" stop-opacity="0.95"/>
              <stop offset="50%" stop-color="#3a0e3e" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="maelstrom" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#c43a26" stop-opacity="0.85"/>
              <stop offset="60%" stop-color="#5a0e10" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="cicatrix" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c43a26" stop-opacity="0"/>
              <stop offset="20%" stop-color="#c43a26" stop-opacity="0.7"/>
              <stop offset="50%" stop-color="#f0d276" stop-opacity="0.95"/>
              <stop offset="80%" stop-color="#9c2680" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#9c2680" stop-opacity="0"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Fond étoiles -->
          @for (s of stars(); track s.id) {
            <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r" [attr.fill]="s.fill" [attr.opacity]="s.opacity" />
          }

          <!-- Bras de spirale galactique (4 bras Voie Lactée stylisés) -->
          <g opacity="0.42">
            <path d="M 500,350 Q 350,200 180,250 T 80,400" stroke="#c9a24a" stroke-width="60" fill="none" stroke-linecap="round" opacity="0.18"/>
            <path d="M 500,350 Q 650,500 820,450 T 920,300" stroke="#c9a24a" stroke-width="60" fill="none" stroke-linecap="round" opacity="0.18"/>
            <path d="M 500,350 Q 400,500 220,560 T 100,500" stroke="#c9a24a" stroke-width="50" fill="none" stroke-linecap="round" opacity="0.13"/>
            <path d="M 500,350 Q 600,200 770,150 T 920,250" stroke="#c9a24a" stroke-width="50" fill="none" stroke-linecap="round" opacity="0.13"/>
          </g>

          <!-- Coeur galactique brillant -->
          <ellipse cx="500" cy="350" rx="320" ry="220" fill="url(#galaxyCore)" opacity="0.7"/>

          <!-- Segmenta — labels arrondis -->
          @for (seg of segmenta; track seg.id) {
            <g [attr.transform]="segmentumTransform(seg.id)" opacity="0.6">
              <text [attr.fill]="seg.color" font-family="Cinzel, serif" font-size="13" letter-spacing="3" text-anchor="middle" filter="url(#glow)">
                {{ seg.name | uppercase }}
              </text>
            </g>
          }

          <!-- Cicatrix Maledictum (la déchirure) -->
          <line x1="160" y1="120" x2="900" y2="600" stroke="url(#cicatrix)" stroke-width="3" stroke-dasharray="2 4" opacity="0.85" filter="url(#strongGlow)"/>
          <line x1="160" y1="120" x2="900" y2="600" stroke="#f0d276" stroke-width="0.8" stroke-dasharray="1 8" opacity="0.5"/>
          <text x="320" y="180" fill="#f0d276" font-family="Cinzel, serif" font-size="11" letter-spacing="2" opacity="0.85" filter="url(#glow)">CICATRIX MALEDICTUM</text>

          <!-- Œil de la Terreur (tache warp) -->
          <ellipse cx="290" cy="220" rx="55" ry="38" fill="url(#eyeOfTerror)" filter="url(#strongGlow)"/>
          <ellipse cx="290" cy="220" rx="22" ry="14" fill="#1a0a26" opacity="0.85"/>
          <text x="290" y="282" fill="#9c2680" font-family="Cinzel, serif" font-size="10" letter-spacing="2" text-anchor="middle" filter="url(#glow)">ŒIL DE LA TERREUR</text>

          <!-- Maelstrom -->
          <ellipse cx="660" cy="430" rx="32" ry="22" fill="url(#maelstrom)" filter="url(#glow)"/>
          <text x="660" y="475" fill="#c43a26" font-family="Cinzel, serif" font-size="9" letter-spacing="2" text-anchor="middle" filter="url(#glow)">MAELSTROM</text>

          <!-- Hot zones (mondes-clés cliquables) -->
          @for (hz of hotZones; track hz.id) {
            <g class="hot-zone" [class.zone-rift]="hz.type === 'rift'" (click)="goTo(hz)" (mouseenter)="hoveredId.set(hz.id)" (mouseleave)="hoveredId.set(null)">
              <circle [attr.cx]="hz.cx" [attr.cy]="hz.cy" [attr.r]="hz.r + 6" [attr.fill]="hz.color" opacity="0.18" filter="url(#glow)"/>
              <circle [attr.cx]="hz.cx" [attr.cy]="hz.cy" [attr.r]="hz.r" [attr.fill]="hz.color" filter="url(#glow)" class="hz-core"/>
              <circle [attr.cx]="hz.cx" [attr.cy]="hz.cy" [attr.r]="hz.r - 1" fill="#fff" opacity="0.6"/>
              <text [attr.x]="hz.cx" [attr.y]="hz.cy - hz.r - 8" fill="#e8deca" font-family="Cinzel, serif" font-size="10" letter-spacing="2" text-anchor="middle" class="hz-label">
                {{ hz.name | uppercase }}
              </text>
            </g>
          }

          <!-- Légende coin haut-gauche -->
          <g transform="translate(20, 30)" opacity="0.85">
            <text fill="#c9a24a" font-family="Cinzel, serif" font-size="11" letter-spacing="3">VOIE LACTÉE · M42</text>
            <text fill="#8d8678" font-family="Inter, sans" font-size="9" y="14">Imperium Sanctus / Imperium Nihilus</text>
          </g>

          <!-- Marker Imperium Sanctus / Nihilus -->
          <text x="220" y="500" fill="#1d4ba0" font-family="Cinzel, serif" font-size="14" letter-spacing="3" opacity="0.65" filter="url(#glow)">IMPERIUM SANCTUS</text>
          <text x="730" y="240" fill="#3a3a3a" font-family="Cinzel, serif" font-size="14" letter-spacing="3" opacity="0.85" filter="url(#glow)">IMPERIUM NIHILUS</text>
        </svg>

        <!-- Tooltip flottant pour la zone hovered -->
        @if (hoveredZone(); as hz) {
          <div class="tooltip" [style.left.px]="hoveredX()" [style.top.px]="hoveredY()">
            <div class="tt-name" [style.color]="hz.color">{{ hz.name }}</div>
            <div class="tt-type">{{ typeLabel(hz.type) }}</div>
            <p>{{ hz.description }}</p>
            <div class="tt-cta">Cliquez pour explorer →</div>
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
          <p>Plaie warp permanente née de la naissance de Slaanesh (M30). Repaire des Légions Chaos.</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="eye-of-terror">Voir lore →</a>
        </div>
        <div class="rift-card maelstrom">
          <div class="rift-name">Maelstrom</div>
          <p>Tempête warp permanente du Segmentum Ultima. Bandes Chaos et pirates.</p>
          <a class="rift-link" routerLink="/lore/concepts" fragment="maelstrom">Voir lore →</a>
        </div>
        <div class="rift-card cicatrix">
          <div class="rift-name">Cicatrix Maledictum</div>
          <p>Déchirure galactique née de la chute de Cadia (M41). Divise Sanctus et Nihilus.</p>
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
      min-height: 220px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #050403;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
      display: flex;
      align-items: end;
      padding: 36px 50px 30px;
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
      font-size: clamp(40px, 5vw, 60px);
      line-height: 1.04;
      margin: 0 0 14px;
      color: var(--gold-bright);
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 14px; color: var(--text); line-height: 1.65; margin: 0; max-width: 700px; }

    /* Layout map + legend */
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
      background: radial-gradient(circle at 50% 50%, #0a0814 0%, #050403 70%);
      box-shadow: var(--shadow);
      padding: 8px;
      overflow: hidden;
    }

    .galaxy-map {
      width: 100%;
      height: auto;
      display: block;
    }

    .hot-zone { cursor: pointer; transition: transform 0.2s; transform-origin: center; transform-box: fill-box; }
    .hot-zone:hover .hz-core { transform: scale(1.6); transform-origin: center; transform-box: fill-box; }
    .hot-zone .hz-label { transition: opacity 0.2s; }
    .hot-zone:hover .hz-label { fill: #fff7c2; }

    .tooltip {
      position: absolute;
      pointer-events: none;
      max-width: 240px;
      padding: 10px 14px 12px;
      border: 1px solid var(--border-strong);
      background: rgba(8, 6, 4, 0.95);
      box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      transform: translate(-50%, -110%);
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

    /* Légende latérale */
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

  readonly hoveredId = signal<string | null>(null);
  readonly hoveredX = signal<number>(0);
  readonly hoveredY = signal<number>(0);

  readonly stars = signal<{ id: number; cx: number; cy: number; r: number; fill: string; opacity: number }[]>(
    Array.from({ length: 200 }, (_, i) => ({
      id: i,
      cx: Math.random() * 1000,
      cy: Math.random() * 700,
      r: Math.random() * 1.4 + 0.2,
      fill: Math.random() > 0.85 ? '#f0d276' : '#ffffff',
      opacity: Math.random() * 0.6 + 0.3,
    })),
  );

  readonly segmenta: Segmentum[] = [
    { id: 'solar', name: 'Solar', color: '#f0d276', description: 'Centre galactique. Contient Terra, Mars, le Trône d\'Or. Cœur historique de l\'Imperium.' },
    { id: 'pacificus', name: 'Pacificus', color: '#3a6cc4', description: 'Ouest galactique. Frontière fragile face aux Tyranides et aux Aeldari Craftworlds.' },
    { id: 'tempestus', name: 'Tempestus', color: '#5fc97a', description: 'Sud galactique. Régions tau, Hive Fleet Leviathan en progression.' },
    { id: 'obscurus', name: 'Obscurus', color: '#9c2680', description: 'Nord galactique. Œil de la Terreur, Cadia (détruite), Croisades Noires.' },
    { id: 'ultima', name: 'Ultima', color: '#1d4ba0', description: 'Est galactique. Macragge, Ultramar, le Maelstrom. QG Croisade Indomitus.' },
  ];

  readonly hotZones: HotZone[] = [
    { id: 'terra', name: 'Holy Terra', type: 'world', cx: 500, cy: 350, r: 7, color: '#f0d276',
      description: 'Capitale sacrée de l\'Imperium. Le Palais Impérial couvre l\'Himalaya, la Sanctum Imperialis abrite le Trône d\'Or.', conceptId: 'holy-terra' },
    { id: 'mars', name: 'Mars', type: 'world', cx: 515, cy: 345, r: 5, color: '#b85a3a',
      description: 'Capitale de l\'Adeptus Mechanicus. Planète-forge, théocratie du Dieu-Machine.', conceptId: 'mars' },
    { id: 'macragge', name: 'Macragge', type: 'world', cx: 760, cy: 360, r: 6, color: '#1d4ba0',
      description: 'Monde-mère des Ultramarines. Capitale d\'Ultramar (500 mondes), QG Croisade Indomitus.', conceptId: 'macragge' },
    { id: 'cadia', name: 'Cadia (✝)', type: 'world', cx: 350, cy: 250, r: 5, color: '#5a6878',
      description: 'Forteresse-monde devant l\'Œil. Détruite à la 13ᵉ Croisade Noire (M41). Origine de la Cicatrix Maledictum.', conceptId: 'cadia' },
    { id: 'fenris', name: 'Fenris', type: 'world', cx: 380, cy: 320, r: 4, color: '#8090a0',
      description: 'Monde-glacier des Space Wolves. Russ y est parti en quête de la Wolftime.' },
    { id: 'baal', name: 'Baal', type: 'world', cx: 560, cy: 460, r: 4, color: '#c9302c',
      description: 'Monde-mère des Blood Angels. Sanctuaire de Sanguinius.' },
    { id: 'caliban', name: 'Caliban (✝)', type: 'world', cx: 470, cy: 280, r: 4, color: '#1a4f2a',
      description: 'Monde-forêt des Dark Angels. Détruit pendant l\'Hérésie d\'Horus, suite à la trahison de Luther.' },
    { id: 'commorragh', name: 'Commorragh', type: 'nexus', cx: 230, cy: 320, r: 5, color: '#3a0e3e',
      description: 'Cité Sombre des Drukhari, nichée dans les replis du Webway. Capitale d\'Asdrubael Vect.' },
    { id: 'titan', name: 'Titan', type: 'world', cx: 510, cy: 360, r: 4, color: '#5a6878',
      description: 'Lune de Saturne. Monde-forteresse caché des Grey Knights. Aucune trace officielle dans l\'Imperium.' },
    { id: 'eye-of-terror', name: 'Œil de la Terreur', type: 'rift', cx: 290, cy: 220, r: 8, color: '#9c2680',
      description: 'Faille warp permanente née de la naissance de Slaanesh (M30). Repaire des Légions Chaos depuis l\'Hérésie.', conceptId: 'eye-of-terror' },
    { id: 'maelstrom', name: 'Maelstrom', type: 'rift', cx: 660, cy: 430, r: 7, color: '#c43a26',
      description: 'Tempête warp permanente du Segmentum Ultima. Bandes Chaos, pirates Drukhari.', conceptId: 'maelstrom' },
  ];

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

  segmentumTransform(id: string): string {
    const positions: Record<string, string> = {
      solar:     'translate(500, 250)',
      pacificus: 'translate(180, 360) rotate(-90)',
      tempestus: 'translate(500, 620)',
      obscurus:  'translate(500, 110)',
      ultima:    'translate(890, 360) rotate(90)',
    };
    return positions[id] ?? '';
  }

  typeLabel(t: HotZone['type']): string {
    return t === 'rift' ? 'Faille warp' : t === 'nexus' ? 'Nexus xenos' : 'Monde-clé';
  }
}
