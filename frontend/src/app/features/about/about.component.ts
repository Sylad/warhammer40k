import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface StackGroup {
  group: string;
  ico: string;
  items: string[];
}

interface Inspiration {
  name: string;
  by: string;
  why: string;
  url: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="eyebrow">Codex personnel · 41<sup>e</sup> millénaire</div>
        <h1>Le Scribe et son Daemon</h1>
        <p class="lede">
          Un codex Warhammer 40,000 imaginé, conçu et façonné en duo —
          un humain curieux et un agent IA appelé <strong>Claude Code</strong>.
        </p>
      </div>
    </section>

    <section class="story">
      <div class="story-side">
        <div class="sigil">⚜</div>
        <div class="story-meta">
          <div class="meta-line">CO-AUTEUR</div>
          <div class="meta-name">Claude Code</div>
          <div class="meta-line muted">par Anthropic — modèle Sonnet 4.6</div>
        </div>
      </div>
      <div class="story-body">
        <h2>L'histoire courte</h2>
        <p>
          Vingt-et-un ans de Java et de web côté serveur — mais novice sur Angular et NestJS.
          Ce codex est mon terrain d'exploration : sortir de la zone JVM, apprivoiser les
          frameworks front modernes, et tester ce qu'un agent IA peut bâtir en duo avec un
          humain.
        </p>
        <p>
          Pages factions, romans Black Library, archives vidéo, galerie impériale —
          tout a été co-écrit avec
          <a href="https://claude.com/claude-code" target="_blank" rel="noopener">
            Claude Code <span class="ext">⤤</span>
          </a>.
          Mon rôle : tracer la vision, valider l'identité visuelle, repérer ce qui sonne faux.
          Le rôle de Claude : poser le code, expliquer chaque choix, itérer.
        </p>
        <p>
          Avant que Claude n'écrive la première ligne, un autre agent IA est passé par là —
          <a href="https://chat.openai.com/" target="_blank" rel="noopener">
            ChatGPT <span class="ext">⤤</span>
          </a>
          a généré les logos, les premières maquettes UX et les schémas de pages
          (visibles dans le dossier <code>/UX/</code> du projet). Une vraie collab à trois :
          humain + ChatGPT (visuels) + Claude Code (implémentation).
        </p>
        <p class="quote">
          « Une collaboration humain ⇄ IA, pas du tout-IA. La machine pense
          aussi vite que le Trône d'Or, mais sans le Scribe pour guider la flamme,
          elle n'écrit que des litanies vides. »
        </p>
      </div>
    </section>

    <h2 class="section-title">Composantes techniques</h2>

    <section class="stack">
      @for (s of stack; track s.group) {
        <div class="stack-card">
          <div class="stack-head">
            <span class="stack-ico">{{ s.ico }}</span>
            <h3>{{ s.group }}</h3>
          </div>
          <ul>
            @for (it of s.items; track it) {
              <li><span class="bullet">›</span>{{ it }}</li>
            }
          </ul>
        </div>
      }
    </section>

    <h2 class="section-title">Inspirations &amp; sources</h2>
    <p class="section-lede">
      Pas une copie — des principes lus, des sites étudiés, des bibles consultées.
    </p>

    <section class="inspirations">
      @for (i of inspirations; track i.name) {
        <a class="inspi" [href]="i.url" target="_blank" rel="noopener">
          <div class="inspi-head">
            <span class="inspi-name">{{ i.name }}</span>
            <span class="ext">⤤</span>
          </div>
          <span class="inspi-by">par {{ i.by }}</span>
          <p>{{ i.why }}</p>
        </a>
      }
    </section>

    <section class="cta">
      <div class="cta-inner">
        <p>
          Si tu veux faire pareil — prends un sujet qui t'enflamme, ouvre Claude Code,
          décris en langage naturel ce que tu rêves de voir exister, puis itère.
          Tu seras surpris de ce qu'on peut bâtir en quelques sessions.
        </p>
        <div class="cta-meta">
          <span>Forgé avec curiosité · Hébergé sur Synology NAS · v1.0</span>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .hero {
      position: relative;
      min-height: 280px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow);
      margin-bottom: 32px;
      display: flex;
      align-items: end;
      padding: 50px 50px 44px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 75% 30%, rgba(123, 17, 19, 0.42), transparent 55%),
        radial-gradient(circle at 25% 80%, rgba(201, 162, 74, 0.18), transparent 50%),
        linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.92) 80%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 780px; }

    .eyebrow {
      color: var(--gold);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .hero h1 {
      font-size: clamp(40px, 5vw, 64px);
      line-height: 1.05;
      margin: 0 0 18px;
      color: var(--gold-bright);
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede {
      font-size: 17px;
      color: var(--text);
      max-width: 640px;
      line-height: 1.6;
      margin: 0;
    }
    .lede strong {
      color: var(--gold-bright);
      font-weight: 600;
    }

    .story {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 32px;
      padding: 36px 40px;
      border: 1px solid var(--border);
      background:
        radial-gradient(circle at 0% 100%, rgba(201, 162, 74, 0.06), transparent 60%),
        linear-gradient(180deg, rgba(20, 14, 8, 0.4), rgba(8, 6, 4, 0.6));
      margin-bottom: 44px;
    }
    .story-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      padding-right: 24px;
      border-right: 1px solid var(--border);
    }
    .sigil {
      font-size: 84px;
      line-height: 1;
      color: var(--gold);
      text-shadow: 0 0 40px rgba(201, 162, 74, 0.45);
    }
    .story-meta { text-align: center; }
    .meta-line {
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 800;
    }
    .meta-line.muted { color: var(--muted); font-weight: 500; margin-top: 4px; }
    .meta-name {
      font-family: var(--serif);
      color: var(--gold-bright);
      font-size: 22px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin: 6px 0 4px;
    }

    .story-body h2 {
      font-size: 22px;
      margin: 0 0 16px;
      color: var(--gold);
    }
    .story-body p {
      color: var(--text);
      line-height: 1.7;
      margin: 0 0 14px;
    }
    .story-body a {
      color: var(--gold-bright);
      border-bottom: 1px solid rgba(201, 162, 74, 0.4);
      padding-bottom: 1px;
    }
    .story-body a:hover {
      color: var(--gold-bright);
      border-bottom-color: var(--gold-bright);
    }
    .ext { font-size: 11px; opacity: 0.7; margin-left: 2px; }

    .story-body code {
      font-family: 'Consolas', 'Menlo', monospace;
      font-size: 12px;
      padding: 1px 6px;
      background: rgba(201, 162, 74, 0.1);
      border: 1px solid rgba(201, 162, 74, 0.25);
      border-radius: 2px;
      color: var(--gold-bright);
      letter-spacing: 0.02em;
    }

    .story-body .quote {
      margin-top: 18px;
      padding: 14px 18px;
      border-left: 2px solid var(--gold-soft);
      background: rgba(201, 162, 74, 0.04);
      font-style: italic;
      color: var(--muted);
      font-size: 14px;
    }

    .section-title {
      font-size: 22px;
      margin: 0 0 6px;
      color: var(--gold);
    }
    .section-lede {
      color: var(--muted);
      margin: 0 0 22px;
      font-size: 14px;
      max-width: 600px;
    }

    .stack {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-bottom: 44px;
    }
    .stack-card {
      border: 1px solid var(--border);
      background: rgba(11, 9, 7, 0.7);
      padding: 22px 22px 24px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .stack-card:hover {
      border-color: var(--border-strong);
      transform: translateY(-2px);
    }
    .stack-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }
    .stack-ico {
      font-size: 22px;
      color: var(--gold);
      width: 32px;
      text-align: center;
      filter: drop-shadow(0 0 8px rgba(201, 162, 74, 0.3));
    }
    .stack-head h3 {
      margin: 0;
      font-size: 14px;
      letter-spacing: 0.16em;
      color: var(--gold-bright);
    }
    .stack-card ul { list-style: none; margin: 0; padding: 0; }
    .stack-card li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 6px 0;
      font-size: 13px;
      color: var(--text);
      line-height: 1.55;
    }
    .bullet {
      color: var(--gold-soft);
      font-weight: 800;
      width: 12px;
      flex-shrink: 0;
      margin-top: -1px;
    }

    .inspirations {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 44px;
    }
    .inspi {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 18px 20px 20px;
      border: 1px solid var(--border);
      background: rgba(11, 9, 7, 0.6);
      transition: border-color 0.2s, background 0.2s, transform 0.2s;
      color: var(--text);
    }
    .inspi:hover {
      border-color: var(--border-strong);
      background: rgba(20, 14, 8, 0.65);
      transform: translateY(-2px);
    }
    .inspi-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .inspi-name {
      font-family: var(--serif);
      color: var(--gold);
      font-size: 16px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .inspi:hover .inspi-name { color: var(--gold-bright); }
    .inspi:hover .ext { opacity: 1; color: var(--gold-bright); }
    .inspi-by {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .inspi p {
      margin: 8px 0 0;
      font-size: 13px;
      color: var(--muted);
      line-height: 1.6;
    }

    .cta {
      border: 1px solid var(--border);
      background:
        radial-gradient(circle at 50% 100%, rgba(201, 162, 74, 0.1), transparent 70%),
        linear-gradient(180deg, rgba(8, 6, 4, 0.4), rgba(20, 14, 8, 0.6));
      padding: 36px 40px;
      text-align: center;
      margin-bottom: 8px;
    }
    .cta-inner { max-width: 720px; margin: 0 auto; }
    .cta p {
      font-size: 15px;
      line-height: 1.7;
      color: var(--text);
      margin: 0 0 20px;
    }
    .cta-meta {
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--muted);
    }

    @media (max-width: 1024px) {
      .stack { grid-template-columns: 1fr; }
      .inspirations { grid-template-columns: 1fr; }
      .story { grid-template-columns: 1fr; padding: 28px; }
      .story-side {
        flex-direction: row;
        justify-content: flex-start;
        padding-right: 0;
        padding-bottom: 18px;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
      .sigil { font-size: 56px; }
    }
    @media (max-width: 640px) {
      .hero { padding: 40px 28px 36px; min-height: 240px; }
      .hero h1 { font-size: 36px; }
    }
  `],
})
export class AboutComponent {
  stack: StackGroup[] = [
    {
      group: 'Frontend',
      ico: '⌬',
      items: [
        'Angular 19 + TypeScript 5.6',
        'Standalone components (zéro NgModule)',
        'RxJS 7 + Signals (toSignal interop)',
        'SCSS custom — tokens gothiques',
        'Polices : Cinzel (titres) + Inter (corps)',
        'Material 19 (legacy, retiré progressivement)',
      ],
    },
    {
      group: 'Backend',
      ico: '⚒',
      items: [
        'NestJS 10 + TypeScript 5',
        'Stockage JSON local (factions/units/series/videos)',
        'Anthropic SDK — claude-sonnet-4-6',
        'Server-Sent Events (badge usage live)',
        'Image proxy wiki (Wikipedia FR/EN async)',
        'Modules NestJS : factions, units, series, videos, gallery, channels, lore',
      ],
    },
    {
      group: 'Infra',
      ico: '⛯',
      items: [
        'Docker multi-stage (node:20-alpine → nginx:alpine)',
        'docker-compose Synology NAS',
        'Volumes persistants /volume2/docker',
        'nginx proxy /api → backend NestJS',
        'env_file .env (clés API isolées)',
        'Hostname réseau : nas:4201',
      ],
    },
  ];

  inspirations: Inspiration[] = [
    {
      name: 'refactoringui.com',
      by: 'Adam Wathan & Steve Schoger',
      why: 'Le manuel pour les non-designers — grille, contraste, hiérarchie, espacement. Les pages détail respirent grâce à ce livre.',
      url: 'https://refactoringui.com/',
    },
    {
      name: 'lawsofux.com',
      by: 'Jon Yablonski',
      why: 'Hick, Fitts, Miller, Postel, Von Restorff — les principes UX qui structurent chaque toolbar et chaque grille.',
      url: 'https://lawsofux.com/',
    },
    {
      name: 'WH40K Fluff Bible',
      by: 'Communauté 40K',
      why: 'PDF canonique 800+ pages — origine de chaque texte lore (Space Marines, Chaos Legions, Imperial Guard).',
      url: 'https://warhammer40k.fandom.com/wiki/Category:40k_Fluff_Bible',
    },
    {
      name: '2d4chan wiki',
      by: 'Communauté ouverte',
      why: 'Wiki décalé et exhaustif sur le lore — informel mais bien plus profond que la doc officielle GW.',
      url: 'https://2d4chan.org/wiki/Category:Warhammer_40,000',
    },
    {
      name: 'Black Library',
      by: 'Games Workshop',
      why: 'Maison d\'édition officielle 40K. Source pour les fiches romans, séries, auteurs et chronologies.',
      url: 'https://www.blacklibrary.com/',
    },
    {
      name: '40k.gallery',
      by: 'Fan-art collection',
      why: 'Catalogue d\'illustrations 40K filtrables par faction. Référence visuelle pour la galerie impériale.',
      url: 'https://40k.gallery/',
    },
  ];
}
