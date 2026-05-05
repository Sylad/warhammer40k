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
  styleUrls: ['./about.component.scss'],
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
    {
      name: 'Lexicanum',
      by: 'Communauté W40K',
      why: 'Wiki MediaWiki anglais encyclopédique — pages dédiées même pour les personnages secondaires (Makari, Colm Corbec) là où le Fandom EN manque. Source d\'images bundlées.',
      url: 'https://wh40k.lexicanum.com/wiki/Main_Page',
    },
    {
      name: 'Omnis Bibliotheca',
      by: 'Communauté FR Warhammer',
      why: 'Wiki MediaWiki francophone — texte directement utilisable en FR pour enrichir les fiches sans passer par la traduction.',
      url: 'https://omnis-bibliotheca.com/index.php/Cat%C3%A9gorie:Imperium',
    },
  ];
}
