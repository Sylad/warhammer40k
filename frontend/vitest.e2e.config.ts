import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { acceptationBrowser, acceptationIgnored } from './scripts/acceptation-runner.mjs';
import { dureesMesurees, lirePartie, partager } from './scripts/e2e-parties.mjs';

// Étape e2e (npm run test:e2e), APRÈS `npm run build`, Chromium installé : les acceptations de lots qui pilotent
// un navigateur (docs/specs/*/acceptation-*.json, `vert: true` seulement : les rouges attendent leur lot), exclues de vitest.config.ts. 30 s par cas
// (le cas R3 de L47 dure ~2,5 s au repos et a dépassé 5 s sous charge). Un fichier à la fois (L166) : chaque
// fichier lance son Chromium ; trois en parallèle sur le runner CI sont l'hypothèse (non prouvée, voir README L166) des attentes
// expirées au hasard.
const root = path.resolve(__dirname, '..');
const pending = new Set(acceptationIgnored(root));
// L256 : E2E_PARTIE=k/n (job matriciel de frontend-checks.yml) ne garde que la k-ième part, partagée par durées
// mesurées (scripts/e2e-parties.mjs) ; sans la variable, tous les fichiers (npm run test:e2e, porte de cadence).
const partie = lirePartie(process.env.E2E_PARTIE);
const E2E_FICHIERS = [
  ...acceptationBrowser(root).filter((f) => !pending.has(f)).map((f) => path.resolve(root, f)),
  // L61 : la garde de l'espacement de texte (WCAG 1.4.12) ne tournait nulle part en CI (`vitest run` passe avant le build, dist absent).
  path.resolve(__dirname, 'src/app/layout/main-layout/espacement-texte.e2e.spec.ts'),
  // L250 : texte de la page à 200 % — ni défilement horizontal ni lien de l'en-tête inatteignable (/, /gallery, fiche unité).
  path.resolve(__dirname, 'src/app/layout/main-layout/texte-200-l250.e2e.spec.ts'),
  // L253 : contenu à 200 % — texte courant, titres et libellés doublent, aucune page ne défile en largeur (320 à 1440 px).
  path.resolve(__dirname, 'src/app/features/texte-200-contenu-l253.e2e.spec.ts'),
  // L253 passe 2 : à 200 %, ni mot coupé sans trait, ni colonne d'une à deux lettres, ni texte rogné (320 à 1440 px).
  path.resolve(__dirname, 'src/app/features/texte-200-reflux-l253.e2e.spec.ts'),
  // L255 : suites de L253 à 200 % — liste « Trier par » des Vidéos lisible, anneau des Romans, noms des Concepts.
  path.resolve(__dirname, 'src/app/features/texte-200-suites-l255.e2e.spec.ts'),
  // L259 : /lore/concepts, le h1 tient sur sa ligne à 320 et 390 px (100 et 200 %) ; les noms de concepts ne le poussent plus.
  path.resolve(__dirname, 'src/app/features/lore-concepts/concepts-h1-l259.e2e.spec.ts'),
  // L259 r1 : la même page avec la vraie police Cinzel (fichiers du dépôt, src/testing/polices-locales.ts) ; QA en prod, « CONCEPT|S ».
  path.resolve(__dirname, 'src/app/features/lore-concepts/concepts-h1-polices-l259.e2e.spec.ts'),
  // L52 : le rechargement sur « morceau absent » se mesure avec le réseau coupé et des réponses 404/502 : navigateur réel.
  path.resolve(__dirname, 'src/app/core/utils/morceau-absent.e2e.spec.ts'),
  // L40 : les pages pilotes de la densité (fiches faction et primarque) tiennent les règles D1 à D6 à 1440 et 390 px.
  path.resolve(__dirname, 'src/app/features/densite-pilotes-l40.e2e.spec.ts'),
  // L238 : mention des droits de Games Workshop au pied de chaque route, crédits sous les images tierces.
  path.resolve(__dirname, 'src/app/layout/credits-page/credits-l238.e2e.spec.ts'),
  // L237 : sur la fiche faction, une rangée en texte simple garde le filet et la hauteur d'une rangée lien.
  path.resolve(__dirname, 'src/app/features/faction-detail/faction-rangees-l237.e2e.spec.ts'),
  // L224 : la date de la chronologie d'un Primarque ne chevauche plus le titre de sa bataille (320, 390, 1440 px).
  path.resolve(__dirname, 'src/app/features/primarch-detail/primarch-chronologie-l224.e2e.spec.ts'),
  // L225 : les titres h2 des fiches faction et Primarque tiennent dans leur panneau à 320 px (« ✠ ICONOGRAPHIE » débordait).
  path.resolve(__dirname, 'src/app/features/faction-detail/fiche-titres-l225.e2e.spec.ts'),
  // L71 : galerie, Entrée sur « Page suivante » → focus sur la grille et « Page 2 sur N » dans la région d'état.
  path.resolve(__dirname, 'src/app/features/gallery/gallery-pagination-l71.e2e.spec.ts'),
  // L239 : un filtre de la Galerie ou des Vidéos ne fait plus sauter la page (scrollY mesuré, 390 et 1440 px).
  path.resolve(__dirname, 'src/app/features/filtres-defilement-l239.e2e.spec.ts'),
  // L241/t1 : Vidéos de 761 à 1220 px, rappel du compte et de l'état vide en tête de « Filtres avancés ».
  path.resolve(__dirname, 'src/app/features/videos/videos-rappel-compte-l241.e2e.spec.ts'),
  // L242 : Vidéos, « Effacer les filtres » de l'état vide : le focus va au premier résultat revenu, jamais sur body.
  path.resolve(__dirname, 'src/app/features/videos/videos-effacer-l242.e2e.spec.ts'),
  // L108 : Galerie au bureau, le panneau Filtres reste collant sans recouvrir Artistes / Collections (1440, 1300, 1024, 390 px).
  path.resolve(__dirname, 'src/app/features/gallery/gallery-filtres-collants-l108.e2e.spec.ts'),
  // L248 : Galerie, un 5e / 6e artiste choisi sous 1024 px reste affiché et retirable une fois la fenêtre élargie au bureau.
  path.resolve(__dirname, 'src/app/features/gallery/gallery-artiste-actif-l248.e2e.spec.ts'),
  // L107 : Vidéos, le ▶ d'une carte ne recouvre jamais le titre (1440, 1024, 390 px, titres réels et allongés).
  path.resolve(__dirname, 'src/app/features/videos/videos-play-l107.e2e.spec.ts'),
  // L96 : /factions, chargement, erreur avec « Réessayer », recherche vide avec « Effacer les filtres », compte annoncé.
  path.resolve(__dirname, 'src/app/features/factions/factions-etats-l96.e2e.spec.ts'),
  // L67 : /plan#<lot> amène la carte sous la barre (espace réservé en fin de page), sans vide en navigation ordinaire.
  path.resolve(__dirname, 'src/app/features/plan/plan.e2e.spec.ts'),
  // L245 : arrivée sur une ancre (liens rapides, barres d'ancres, /plan, /nouveautes) juste sous la barre du haut ;
  // hors de la porte, le cas #subfactions est resté rouge sans que personne ne le voie depuis L94.
  path.resolve(__dirname, 'src/app/layout/main-layout/ancres.e2e.spec.ts'),
  // L245 : liens d'ancre de section (sectionAnchor, L160) — href vers la page + fragment, clics modifiés non annulés.
  path.resolve(__dirname, 'src/app/core/utils/section-anchor-href-l160.e2e.spec.ts'),
  // L99 : /factions et fiche faction, sélecteur de tri nommé, filtres à état (aria-pressed) lus dans l'arbre d'accessibilité.
  path.resolve(__dirname, 'src/app/features/faction-detail/controles-nommes-l99.e2e.spec.ts'),
  // L101 : /factions et chaque fiche faction, aucun glyphe décoratif (✠ ⚔ ⌚ ⊛ ▤ →…) dans l'arbre d'accessibilité ;
  // « 41e » sous un parent en capitales reste « 41ᵉ » (règle sup globale).
  path.resolve(__dirname, 'src/app/features/faction-detail/glyphes-l101.e2e.spec.ts'),
  // L98 : libellés du bandeau d'une sous-faction ≥ 4,5:1 sur image claire (pixels mesurés, 1440 et 390 px).
  path.resolve(__dirname, 'src/app/features/subfaction-detail/subfaction-bandeau-l98.e2e.spec.ts'),
];
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    reporters: ['default'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: partie ? partager(E2E_FICHIERS, partie.total, dureesMesurees(), __dirname)[partie.partie - 1].fichiers : E2E_FICHIERS,
  },
});
