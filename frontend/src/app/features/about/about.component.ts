import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SOURCES_IMAGES } from '../../core/credits/credit-image';

interface StackGroup {
  group: string;
  ico: string;
  items: string[];
}

/** L238 : une source réelle d'image ou de texte affichés, et ses droits. */
export interface CreditLigne {
  id: string;
  nom: string;
  url?: string;
  usage: string;
  droits: string;
}

/**
 * L238 — crédits et droits, une ligne par source. Les droits des sources d'images sont ceux de
 * `SOURCES_IMAGES` (même texte que la liste du pied de page). Rien de deviné : une origine non
 * retrouvée est dite telle.
 */
export const CREDITS: CreditLigne[] = [
  {
    id: 'games-workshop', nom: 'Games Workshop Limited', url: 'https://www.warhammer.com/',
    usage: 'Univers de Warhammer 40,000 : noms, marques, logos, personnages, illustrations, fiches techniques, textes des codex et des romans Black Library.',
    droits: 'Warhammer 40,000 et ses marques, logos, images et textes sont ®, ™ et/ou © Games Workshop Limited. Utilisés sans autorisation, sans contestation de leurs droits.',
  },
  {
    id: 'fandom', nom: SOURCES_IMAGES.fandom.nom, url: 'https://warhammer40k.fandom.com/',
    usage: 'Images des fiches, des héros de page et du lore (cherchées à l’affichage), icônes des factions.',
    droits: SOURCES_IMAGES.fandom.droits + ' Texte du wiki : licence CC BY-SA (fandom.com/licensing) ; les fiches de la chronologie qui s’en servent citent sa page en source.',
  },
  { id: 'fiche', nom: SOURCES_IMAGES.fiche.nom, usage: '119 scans des fiches d’unités (profil, armes, aptitudes), embarqués dans le site.', droits: SOURCES_IMAGES.fiche.droits },
  { id: 'portrait', nom: SOURCES_IMAGES.portrait.nom, usage: '14 portraits et insignes d’unités sans fiche technique, embarqués dans le site.', droits: SOURCES_IMAGES.portrait.droits },
  { id: 'carte', nom: SOURCES_IMAGES.carte.nom, usage: 'Fond de la carte galactique.', droits: SOURCES_IMAGES.carte.droits },
  {
    id: 'galerie', nom: 'Galerie',
    usage: 'Catalogue d’œuvres (titre et artiste du catalogue, image cherchée sur le Warhammer 40k Wiki d’après le titre), collection personnelle et images importées.',
    droits: SOURCES_IMAGES.perso.droits + ' ' + SOURCES_IMAGES.import.droits,
  },
  {
    id: 'youtube', nom: 'YouTube', url: 'https://www.youtube.com/',
    usage: 'Vidéos intégrées, miniatures et chaînes de la page Vidéos.',
    droits: SOURCES_IMAGES.youtube.droits + ' Vidéos © leurs chaînes ; chaque carte mène à la vidéo d’origine.',
  },
  {
    id: 'lexicanum', nom: 'Lexicanum', url: 'https://wh40k.lexicanum.com/',
    usage: 'Source principale des textes de lore (successeurs Space Marines, chronologie, personnages secondaires), réécrits en français.',
    droits: 'Univers © Games Workshop Limited ; les fiches de la chronologie citent la page utilisée.',
  },
  {
    id: 'omnis-bibliotheca', nom: 'Omnis Bibliotheca', url: 'https://omnis-bibliotheca.com/',
    usage: 'Wiki francophone, source des fiches en français.',
    droits: 'Le wiki indique que ses textes sources et nombre de ses illustrations sont la propriété de Games Workshop Limited.',
  },
  {
    id: 'appoint', nom: 'Fluff Bible et 2d4chan',
    usage: 'Sources d’appoint du lore (document communautaire, wiki 2d4chan).',
    droits: 'Univers © Games Workshop Limited.',
  },
  {
    id: 'textes', nom: 'Textes du codex',
    usage: 'Rédigés pour ce site en français d’après les sources ci-dessus ; les descriptions d’unités et de séries demandées à la volée sont générées par Claude (Anthropic).',
    droits: 'Univers, noms et personnages © Games Workshop Limited ; romans © leurs auteurs et Black Library.',
  },
  {
    id: 'jeux-video', nom: 'Jeux vidéo',
    usage: 'Dates, plateformes et résumés d’après les annonces des éditeurs et la presse.',
    droits: 'Chaque jeu à venir renvoie à la source de son annonce ; jeux © leurs éditeurs et Games Workshop Limited.',
  },
  {
    id: 'polices', nom: 'Polices Cinzel et Inter', url: 'https://fonts.google.com/',
    usage: 'Titres (Cinzel) et texte courant (Inter), servis par Google Fonts.',
    droits: 'SIL Open Font License 1.1.',
  },
  {
    id: 'code', nom: 'Code du site',
    usage: 'Application Angular et NestJS.',
    droits: 'Licence MIT, © Sylvain Ladoire. Ne couvre aucun contenu de Games Workshop.',
  },
];

interface Inspiration {
  name: string;
  by: string;
  why: string;
  url: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="eyebrow">Codex personnel · 41<sup>e</sup> millénaire</div>
        <h1>Le Scribe et son Daemon</h1>
        <p class="lede">
          Un codex Warhammer 40,000 imaginé, conçu et façonné en duo —
          un humain curieux, <strong>Claude Code</strong> et des renforts ponctuels
          de <strong>Codex</strong>.
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
          <a href="https://claude.com/product/claude-code" target="_blank" rel="noopener">
            Claude Code <span class="ext" aria-hidden="true">⤤</span><span class="sr-only"> (nouvel onglet)</span>
          </a>.
          Mon rôle : tracer la vision, valider l'identité visuelle, repérer ce qui sonne faux.
          Le rôle de Claude : poser le code, expliquer chaque choix, itérer.
        </p>
        <p>
          Avant que Claude n'écrive la première ligne, un autre agent IA est passé par là —
          <a href="https://chatgpt.com/" target="_blank" rel="noopener">
            ChatGPT <span class="ext" aria-hidden="true">⤤</span><span class="sr-only"> (nouvel onglet)</span>
          </a>
          a généré les logos, les premières maquettes UX et les schémas de pages
          (visibles dans le dossier <code>/UX/</code> du projet). Une vraie collab à trois :
          humain + ChatGPT (visuels) + Claude Code (implémentation).
        </p>
        <p>
          Depuis, <strong>Codex</strong> intervient comme compagnon de maintenance :
          revue des garde-fous, vérification des builds, petites passes UI, et verrouillage
          du mode démo public pour que le codex reste consultable sans exposer les actions
          d'administration.
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
            <span class="ext" aria-hidden="true">⤤</span>
          </div>
          <span class="inspi-by">par {{ i.by }}</span>
          <p>{{ i.why }}</p>
          <span class="sr-only">(nouvel onglet)</span>
        </a>
      }
    </section>

    <!-- L238 : une ligne par source réelle d'image ou de texte (recensée dans le code), avec ses droits. -->
    <section id="credits" class="credits" aria-labelledby="credits-titre" tabindex="-1">
      <h2 class="section-title" id="credits-titre">Crédits et droits</h2>
      <p class="section-lede">
        Site de fan non officiel, sans approbation de Games Workshop et sans lien avec elle. Chaque image
        d’un tiers porte son crédit en infobulle ; le pied de chaque page liste les images de la page et
        leur fichier d’origine.
      </p>
      <ul class="credits-liste" data-testid="credits-liste">
        @for (c of credits; track c.id) {
          <li [attr.data-credit-id]="c.id">
            <span class="credit-nom">
              @if (c.url) {
                <a [href]="c.url" target="_blank" rel="noopener noreferrer">{{ c.nom }}<span class="sr-only"> (nouvel onglet)</span></a>
              } @else {
                {{ c.nom }}
              }
            </span>
            <span class="credit-usage">{{ c.usage }}</span>
            <span class="credit-droits">{{ c.droits }}</span>
          </li>
        }
      </ul>
    </section>

    <section class="other-sites">
      <h2>Mes autres sites</h2>
      <p class="other-intro">Quatre autres apps perso vibe-codées avec Claude Code, toutes en open-source.</p>
      <div class="other-grid">
        @for (s of otherSites; track s.url) {
          <a [href]="s.url" target="_blank" rel="noopener" class="other-card">
            <span class="other-tag" aria-hidden="true">{{ s.tag }}</span>
            <span class="other-text">
              <strong>{{ s.name }}</strong>
              <em>{{ s.desc }}</em>
            </span>
            <span class="other-arrow" aria-hidden="true">↗</span>
            <span class="sr-only">(nouvel onglet)</span>
          </a>
        }
      </div>
    </section>

    <section class="cta">
      <div class="cta-inner">
        <p>
          Si tu veux faire pareil — prends un sujet qui t'enflamme, ouvre Claude Code,
          décris en langage naturel ce que tu rêves de voir exister, puis itère.
          Tu seras surpris de ce qu'on peut bâtir en quelques sessions.
        </p>
        <div class="cta-meta">
          <span>Forgé avec curiosité · Hébergé sur Kubernetes (k3s) · v1.0</span>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent {
  readonly credits = CREDITS;

  stack: StackGroup[] = [
    {
      group: 'Frontend',
      ico: '⌬',
      items: [
        'Angular 20 + TypeScript 5.9',
        'Standalone components (zéro NgModule)',
        'RxJS 7 + Signals (toSignal interop)',
        'SCSS custom — tokens gothiques',
        'Polices : Cinzel (titres) + Inter (corps)',
        'Leaflet 1.9 (carte galactique SVG calibrée)',
      ],
    },
    {
      group: 'Backend',
      ico: '⚒',
      items: [
        'NestJS 11 + TypeScript 5',
        'Stockage JSON local (factions/units/series/videos)',
        'Anthropic SDK — claude-sonnet-4-6',
        'Image proxy wiki (Wikipedia FR/EN async)',
        'Modules NestJS : factions, units, subfactions, series, videos, artworks, images, lore-feed, timeline, wiki-image, image-import, image-meta, channels, demo, health',
      ],
    },
    {
      group: 'Infra',
      ico: '⛯',
      items: [
        'Docker multi-stage (node:20-alpine → nginx:alpine)',
        'Images publiées sur GHCR par la CI GitHub Actions',
        'Kubernetes k3s, déployé par ArgoCD (GitOps, chart Helm)',
        'Volume persistant Kubernetes pour les données JSON',
        'nginx proxy /api → backend NestJS',
        'Exposé via un tunnel Cloudflare (aucun port ouvert)',
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

  otherSites = [
    { tag: '🦖', name: 'Evatosorus', desc: 'Codex Mésozoïque (cadeau pour Eva)', url: 'https://evatosorus.pages.dev' },
    { tag: '⚽', name: 'OL Companion', desc: 'Suivi Olympique Lyonnais', url: 'https://github.com/Sylad/ol-companion' },
    { tag: '💸', name: 'Finance Tracker', desc: 'Suivi finances perso (PDF Claude)', url: 'https://github.com/Sylad/finance-tracker' },
    { tag: '🌿', name: 'Eywa', desc: 'Codex Pandora (pour Eva)', url: 'https://avatar-pandora-12q.pages.dev' },
  ];
}
