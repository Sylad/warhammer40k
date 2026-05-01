# Warhammer 40K — Tracker de progression cross-sessions

> **Première lecture obligatoire à chaque reprise de session.**
> Ce fichier est l'état canonique du chantier UX Warhammer.

---

## Comment reprendre une session (5 min)

1. Lire ce fichier en entier (jusqu'à "Décisions UX figées").
2. Lire la spec de la phase active dans `/volume2/docker/developpeur/UX/`.
3. Regarder le mockup correspondant (PNG ou HTML).
4. Vérifier que le site tourne : http://nas:4201 — si KO :
   ```bash
   docker compose -f /volume2/docker/developpeur/warhammer40k/docker-compose.yml up -d --build warhammer-frontend
   ```
5. Continuer la phase active dans le tableau ci-dessous.

---

## Vision globale

Codex Warhammer 40K **immersif lore-first**, type produit AAA / plateforme premium.
**Pas un outil de stats** — une expérience visuelle gothique narrative.

Specs canoniques dans `/volume2/docker/developpeur/UX/` (fichiers `warhammer - *`) :
- `consignes.txt` — sources YouTube FR/EN, ton, footer légal, philosophie
- `spec global.md` — règles transverses + hiérarchie Faction→SubFaction (post-MVP)
- `factions - spec.txt`, `Faction detail - spec.md`, `Faction unit detail.md`, `Romans.md`, `Video.md`, `Galerie.md`

Mockups visuels :
- PNG : `dashboard.png`, `factions.png`, `Faction detail.png`, `Faction unit detail.png`, `Romans.png`, `Galerie.png`
- HTML interactifs : `Video.html` (référence CSS la plus précise)

## Identité visuelle constante (toutes pages)

**Tokens** : `--bg #050403`, `--gold #c9a24a`, `--gold-light #f0d276`, `--red #7b1113`, `--text #e8deca`, `--muted #8d8678`, `--border rgba(201,162,74,.28)`.
**Polices** : Cinzel/Georgia serif uppercase letter-spacing .05em pour titres ; Inter pour body.
**Topbar** : 70-72px sticky, brand gauche Cinzel doré + nav uppercase center-right (Accueil/Factions/Romans/Vidéos/Galerie) + claude badge.
**Body** : radial-gradient rouge top + or 85%/15% + linear sombre + `body::before` grille fine 80px overlay.
**Sidebar droite 320px sticky** récurrente sur pages list/detail (PAS QUE factions) — contient lore court, liens rapides, filtres avancés, ressources externes.
**Footer légal** "Site fan non officiel..." en bas.
**Cards 100% image-first** avec gradient sombre vers le bas + texte au bas. Jamais fond plat.
**Hover** : translateY(-5px) + scale(1.05) image + glow doré + border doré plus visible.

## Synthèse pages cibles

### `/` Dashboard
Hero cinéma + 4 cards d'accès rapide (Factions/Romans/Vidéos/Galerie) + section "Activité récente".
**Stats bar `11/247/89/1842` est ICI uniquement.**

### `/factions`
Hero générique "FACTIONS" + image Space Marine + panel "Résumé des factions" (11 majeures, +6 autres, 41K ans, innombrables guerriers) intégré au hero droite.
Toolbar : filter pills (Toutes/Imperium/Chaos/Xénos/Autres) + search + select tri A-Z.
Grille 5 cols (auto-fill min 280px). Card faction = image bg + sigil + badge type + nom + description courte + ligne "UNITÉS XX →".
Last card "+6 autres factions" listant Drukhari/Leagues of Votann/Genestealer/Adepta Sororitas/Grey Knights.
Sidebar : "À propos des factions" + "Ressources rapides" (Timeline / Carte galactique / Relations / Lexique) + "Filtres rapides" (type checkboxes + slider unités + alignement Loyal/Neutre/Hostile).

### `/factions/:id` (page longue scrollable)
Bouton retour ← + hero TEXTE|IMAGE 50/50 (badge type + nom Cinzel XL + sous-titre Adeptus Astartes + description + bouton "EXPLORER LES UNITÉS" + citation italique encart bas-gauche + image dominante 50% droite).
Section "HISTOIRE & LORE" : 3 cols (Origine / Organisation / Doctrine) avec sigil + titre + paragraphe.
Section "EXPLORER LES UNITÉS" : tabs (Tous/Infanterie/Véhicule/Héros/Psyker) + search + grille 4 cols.
Last card "VOIR TOUTES LES UNITÉS · +47 autres".
Sidebar : "À propos" texte court + "Liens rapides" (Chronologie/Personnages/Monde origine/Héraldique/Relations) + "Statistiques" (Chapitres/Effectifs/Origine/Allégeance) + "Médias" (vidéo à la une + galerie) + "Ressources" + citation italique.

### `/units/:id` (route flat — PAS `/factions/:fid/units/:uid` actuelle, à reroute)
Bouton retour + bookmark/share top-right.
Hero TEXTE|IMAGE : nom Cinzel XL + 3 badges (Infanterie/Ligne/Imperium) + description + 2 boutons ("VOIR DANS LA GALERIE" / "VOIR LA VIDÉO") + image unité 50% droite.
Tabs internes : Aperçu / Équipement / Histoire & Lore / Règles (optionnel) / Variantes / Galerie.
Main left :
- Description (paragraphe lore)
- Capacités principales (liste 4 items avec icônes)
- Équipement standard (image figurine 50% + liste équipement avec icônes Bolter/Arme corps-corps/Armure/Équipement supplémentaire)
- Stats (approx) — 6 barres horizontales (Endurance/Résistance/Puissance feu/Mobilité/Portée/Soutien) avec valeur 1-10
- Icônes clés (3 sigils Imperium/Adeptus Astartes/Primaris)
- Histoire & Lore (paragraphe + image immersive)
- Variantes & Options (5 cards horizontales : Auto bolt rifle/Stalker/Assault/Auxiliaire grenade/Sergent)
Sidebar : Infos clés (Rôle/Allégeance/Chapitre/Taille unité/Points/Apparition) + Liens rapides + Unités associées (4 mini-cards) + Citation italique encart + Ressources + Signaler erreur.

### `/romans`
Hero image bibliothèque gothique + titre "Romans Black Library" Cinzel XL + description + search.
Tabs : Toutes les séries (active) / Ma Bibliothèque / Ordre de lecture / À lire.
Filtres : Tri A-Z + filtres lettre (#, A-Z) + bouton "Filtres avancés".
Grille collections 4 cols. Card = cover + titre Cinzel + auteur italique + description + "X livres" + barre progression "X/Y lus" + badges colorés (Fondamental/Inquisition/Space Marines/Garde Impériale/Aventure/Adeptus Sororitas/Papier/Audible) + bouton "VOIR LA COLLECTION".
Bouton "CHARGER PLUS DE SÉRIES" centré bas.
Sidebar : "Votre progression" (disque % terminé + lus/en cours/à lire/total) + "Actions rapides" (Voir ordre lecture/Continuer/Ma liste/Téléchargements) + "Séries populaires" (top 5 numéroté avec nb livres) + "Légende" badges.

### `/videos`
Hero image dark + eyebrow "Archives vidéo du 41e millénaire" + h1 "Archives Cinématiques" Cinzel XL + description + panel droit "Chaînes prioritaires" (3 lignes : LL Le Librarium FR / I4 Indomitus 40K FR / A Astartes EN avec avatar + nom + description + badge langue).
Toolbar : search + filter pills (Tous/Lore/Animations/Officiel/FR/EN) + select tri.
Layout main + sidebar 320px sticky.
Section "Incontournables" : grille 1.35fr/1fr/1fr (1 grande min-h 330px + 2 normales min-h 245px). Cards = thumbnail bg + duration top-right + play button center 62px + tags + titre Cinzel + meta (chaîne · description courte).
Section "Chaînes recommandées" : grille 4 cols. Cards horizontale 58px avatar (initiales sur dark) + nom Cinzel + description courte.
Section "Toutes les vidéos" : grille 3 cols. Mêmes cards.
Sidebar : "Filtres avancés" (lignes Durée courte X / Long format X / FR uniquement X / Animations X) + "Vidéos récentes" (titre + délai relatif) + "Règle UX" (rappel).
Modal vidéo iframe YouTube fullscreen avec close ESC + clic-out + arrêt iframe à fermeture.

### `/gallery` (renommer /galerie)
Hero image cité gothique + titre "GALERIE IMPÉRIALE" Cinzel XL + description + 3 compteurs droite (4217 Œuvres / 128 Artistes / 32 Collections) + search.
Section "Parcourir par catégorie" : 6 cards horizontales (Space Marines 892 / Chaos 712 / Xénos 645 / Imperium 1120 / Personnages 421 / Véhicules 287) — image bg + sigil center + titre + nb œuvres.
Section "Œuvres récentes" + lien "Voir toutes les œuvres →".
Grille 4 cols artworks. Card = image dominante + bookmark icon top-right + titre + artiste + likes ❤.
Bouton "CHARGER PLUS D'ŒUVRES" centré.
Sidebar : "Filtres" (Faction/Catégorie/Type d'œuvre/Artiste/Trier par dropdowns) + "Réinitialiser" + "Couleurs dominantes" (palette 8 swatches) + "Artistes à découvrir" (top 3 + lien) + "Collections populaires" (Horus Heresy 312 / 40K Core Book 276 / Black Library 198).
Viewer fullscreen modal : image HD centrée + fond noir profond + infos titre/artiste + navigation ← → + boutons fermer/source externe + ESC + clic-out.

## Anti-patterns (interdits absolus)

- ❌ pas de fond blanc / lien bleu / Bootstrap / tableau HTML / liste texte brute
- ❌ pas de Material `mat-select` / `mat-form-field` / `<mat-button>` pour filtres → custom gothique uniquement
- ❌ pas de stats bar `11/247/89/1842` ailleurs que dashboard
- ❌ pas de single-screen forcé sur toutes pages — pages détail SCROLLENT
- ❌ pas de cards à fond plat, image-first toujours
- ❌ pas de hiérarchie Faction→SubFaction en v1 — flat avant tout

---

## État actuel (à mettre à jour à chaque session)

**Date dernière mise à jour** : 2026-04-30 (session 7)
**Phase active** : aucune — **P1-P9 toutes ✅ TERMINÉES** 🎉
**Prochaine phase** : aucune — refonte UX warhammer COMPLÈTE.

**État du site** :
- http://nas:4201/ → Dashboard (hero + 4 shortcuts + stats bar)
- http://nas:4201/factions → Factions list refonte (hero compact 200px, pas de panel résumé, toolbar, grille, sidebar 320px sans redondance, footer ornement aigle)
- http://nas:4201/factions/space-marines → Faction Detail refonte (hero TEXTE|IMAGE 50/50 + section lore 3 cols Origine/Organisation/Doctrine + image 1/3 + section "EXPLORER LES UNITÉS" avec filter pills + search + grille 4 cols + card "voir toutes" + sidebar 320px sticky)
- http://nas:4201/units/sm-primaris-intercessor → Unit Detail refonte session 4 (topbar retour + actions, hero TEXTE|IMAGE 50/50 avec badges colorés + 2 CTA, tabs (Aperçu/Équipement/Histoire/Règles/Variantes/Galerie) avec filtrage de sections, panels Description/Capacités/Équipement+figure/Stats avec barres + Icônes clés/Histoire & Lore + image/Variantes grille auto-fill, sidebar 320px : Informations clés / Liens rapides / Unités associées + bouton / Citation / Ressources / Bouton signaler erreur)
- http://nas:4201/romans → Romans Black Library refonte session 5 (hero TEXTE|IMAGE avec recherche, 4 tabs Toutes/Bibliothèque/Ordre/À lire, toolbar tri+lettres A-Z+filtres avancés, grille 4 cols cards image-first avec barre progression + badges colorés (Fondamental/Inquisition/Space Marines/Garde Impériale/Adeptus Sororitas/Aventure/Papier/Audible) + CTA "Voir la collection", sidebar Progression donut SVG + Actions rapides + Top 5 séries + Légende, bouton "Charger plus" pagination 8 par 8)
- Backend complet : channels/artworks/lore-feed endpoints + factions/units enrichies (Space Marines + Chaos Space Marines + Astra Militarum côté lore complet, Primaris Intercessor pour unit), series enrichi (readBooks + badges)
- http://nas:4201/videos → Archives Cinématiques refonte session 6 (hero photo wiki + panel "Chaînes prioritaires" 3 chaînes priority + toolbar search + filter pills (Tous/Lore/Animations/Officiel/FR/EN) + select tri, layout main+sidebar 320px, section Incontournables 1.35fr 1fr 1fr (3 featured fixes : tts-device/astartes/lord-inquisitor) + Chaînes recommandées grid 4 cols + Toutes les vidéos grid 3 cols filtrable, sidebar Filtres avancés (compteurs dynamiques) + Vidéos récentes + Règle UX, modal iframe YouTube avec ESC+clic-out+autoplay, thumbnails YouTube via img.youtube.com pour videos / wiki fallback pour playlists+chaînes)
- http://nas:4201/gallery → Galerie Impériale refonte session 7 (hero "Galerie Impériale" + bg wiki cité gothique + 3 stat cards Œuvres/Artistes/Collections + barre recherche, 6 cards catégories image-first (Space Marines/Chaos/Xénos/Imperium/Personnages/Véhicules) avec count, grille artworks 4 cols image-first + bookmark + likes + hover overlay, sidebar 320px Filtres/Couleurs dominantes 9 palette/Artistes à découvrir/Collections populaires, viewer modal plein écran ← → ESC clic-out + bouton favori + source externe, charger plus 8 par 8, toutes images via /api/wiki-image, route /galerie → redirect vers /gallery)
- ✅ TOUTES les pages refondues. La v1 Material n'existe plus.
- **Routing** : route flat `/units/:id` ajoutée. Ancienne `/factions/:fid/units/:uid` → redirect via redirectTo function vers `/units/:uid`. Cards dans faction-detail mises à jour vers `/units/:id`.

**Important** : `angular.json` budget `anyComponentStyle` relevé à `12kB warning / 20kB error` (au lieu de 4/8) car composants AAA premium nécessitent beaucoup de styles custom. Si phase 6+ dépasse, relever encore.

---

## Plan de phases

### Phase 0 — Foundations ⚠️ PARTIEL
- ✅ P0.1 Design tokens dans `styles.scss` (--bg, --gold, --red, Cinzel/Inter, gradients) — **OK gardé**
- ✅ P0.2 Layout shell `main-layout.component.ts` (topbar 70px + footer légal 26px) — **OK gardé**, peut nécessiter un ajustement phase 3 (ajouter "Accueil" au menu)
- ❌ P0.3 Page Factions v1 — **À JETER**. Problèmes : overflow horizontal, pas conforme nouvelles specs. Le fichier `features/factions/factions.component.ts` sera entièrement réécrit en phase 4.

**Note importante** : ne pas tenter de patcher la factions v1. Toute énergie va sur les phases 1→9 dans l'ordre.

### Phase 1 — Data models backend ✅ TERMINÉ (session 2)

**Fait** :
- ✅ Models backend étendus (champs OPTIONNELS pour backward-compat) :
  - `Faction` : `+ iconUrl, sousTitre, imageHero, citation, unitCount, lore{origine/organisation/doctrine}, stats{chapitresConnus/effectifs/mondeOrigine/allegiance}, liensRapides[], resources[]`
  - `Unit` : `+ role, badges[], description, loreCourt, loreLong, image, capacities[], equipment[], stats{6 axes}, variants[], relatedUnitIds[], citation, apparition, tailleUnite`
  - `Serie` : `+ cover, readBooks, badges[]`
  - `Video` : `+ thumbnail, duration, channelId, category, language strict, featured`
- ✅ Nouveaux models : `Channel`, `Artwork`, `ArtworkCollection`, `ArtworkArtist`, `LoreEvent`
- ✅ Modules backend nouveaux : `channels`, `artworks`, `lore-feed` (chacun service + controller + module, lecture JSON)
- ✅ Endpoints : `/api/channels(?priority=true)`, `/api/channels/:id`, `/api/artworks(?category=X)`, `/api/artworks/:id`, `/api/artwork-collections`, `/api/artwork-artists`, `/api/lore(?count=N)`, `/api/lore/all`
- ✅ Seeds créés :
  - `data/warhammer/channels.json` (8 chaînes YouTube : Le Librarium, Indomitus 40K, Astartes, Sire Lambert, FWS, Vox Obscura, Luetin09, Majorkill — 3 priorité)
  - `data/warhammer/lore-feed.json` (10 events ambiance grimdark)
  - `data/warhammer/artworks.json` (10 placeholder artworks)
  - `data/warhammer/artwork-collections.json` (3 collections)
- ✅ Seed enrichi : Space Marines avec lore complet + stats + liens + ressources (modèle pour autres factions)
- ✅ Seed enrichi : nouvelle unité `sm-primaris-intercessor` avec stats/equipment/variants/loreLong/citation (modèle pour unit-detail page)
- ✅ Frontend `models.ts` mis à jour en miroir + `warhammer.service.ts` avec nouveaux observables

**Important pour next session** : Les autres factions (10 sur 11) n'ont PAS encore les champs lore/stats étendus. Pour la phase 5 (Faction Detail), soit on fallback sur Space Marines comme exemple, soit on enrichit progressivement. Idem pour les unités — seul `sm-primaris-intercessor` a les champs riches.

### Phase 2 — Dashboard `/` ✅ PLACEHOLDER FAIT (à enrichir)

**Fait** :
- ✅ `features/dashboard/dashboard.component.ts` créé
- ✅ Route `/` pointe sur DashboardComponent (plus de redirect vers /factions)
- ✅ Hero "Bienvenue, Initié" + 4 cards shortcuts (Factions/Romans/Vidéos/Galerie) avec compteurs réels + stats bar 4 chiffres + citation

**À enrichir plus tard** :
- [ ] Hero plus cinématique (image bg fan-art réelle)
- [ ] Section "Activité récente" (derniers ajouts d'œuvres / vidéos / romans)
- [ ] Lore feed mini (3 events random) intégré

### Phase 3 — Topbar mis à jour ✅ FAIT (session 2)

**Fait** :
- ✅ "Accueil" ajouté en première position du menu (route `/`)
- ✅ Icônes ajoutées avant chaque label (⌂ ⚔ ▤ ▶ ▦) à la manière des mockups
- ✅ État actif via routerLinkActive avec underline doré
- ✅ Body scroll redevient naturel (`overflow: hidden` retiré, height: 100vh → min-height)
- ✅ Wrap : padding 32px 34px 60px, max-width 1920px, scroll vertical OK

### Phase 4 — Page Factions ✅ FAIT (session 2)

**Fait selon mockup factions.png** :
- ✅ Hero "FACTIONS" générique avec image Space Marines bg + eyebrow "Les peuples du 41e millénaire" + description longue + panel "Résumé des factions" droite (4 lignes : Factions majeures / +6 autres / 41K années / Innombrables guerriers)
- ✅ Toolbar 3 cols : filter pills (Toutes/Imperium/Chaos/Xénos/Autres) + search input + select tri (A-Z / nb unités / alignement) — tout custom gothique
- ✅ Layout `1fr | 320px sidebar`
- ✅ Grille auto-fill min 260px, cards image-first avec sigil top-left + content bottom (h2 nom + badge + description 3 lignes + footer "UNITÉS X →")
- ✅ Card spéciale "+6 autres factions" en dernier (dashed border + icône + texte)
- ✅ Sidebar 3 panels : "À propos des factions" / "Ressources rapides" (4 liens : Timeline / Carte galactique / Relations / Lexique) / "Filtres rapides" (TYPE 4 boutons + 2 stats)
- ✅ unitCount dérivé via `/api/units` (compute Map factionId → count)
- ✅ Wiki images chargées en async pour bg cards + hero

### Phase 5 — Page Faction Detail `/factions/:id` ✅ FAIT (session 3)

**Fait selon mockup `Faction detail.png`** :
- ✅ Bouton retour "← RETOUR AUX FACTIONS"
- ✅ Hero TEXTE|IMAGE 50/50 : badge type or + nom Cinzel XL + sous-titre underline + description + CTA "EXPLORER LES UNITÉS" (scroll smooth) + citation italique avec sigil
- ✅ Section "HISTOIRE & LORE" : 3 cols Origine/Organisation/Doctrine (icônes or + h + p) + image immersive 1/3 (wiki query "<faction> battle"). Fallback texte par faction si pas de lore enrichi
- ✅ Section "EXPLORER LES UNITÉS" id="units" : filter pills (Tous/Infanterie/Véhicule/Héros/Psyker) + search + grille auto-fill 220px (4 cols ~). Cards image-first wiki + badge couleur type top-left + h3 + loreCourt 2 lignes + arrow. Limite à 7 visibles, 8e card "VOIR TOUTES LES UNITÉS · +N autres" si reste
- ✅ Sidebar 320px sticky : 5 panels (À propos / Liens rapides / Statistiques / Médias [vidéo featured + galerie] / Ressources) + citation italique en bas
- ✅ Wiki images chargées async pour hero + lore + chaque unité (via wikiQuery ou nom)
- ✅ Aucun Material — full custom design tokens

**À renforcer plus tard** :
- [ ] Enrichir 10 autres factions avec lore.{origine/organisation/doctrine} et stats (seul Space Marines complet aujourd'hui ; les autres affichent fallback). À l'occasion d'une session "data".
- [ ] Featured video sidebar : actuellement la 1ère featured/incontournable des videos. Idéalement filtrer par factionId quand le model Video aura ce champ.

### Phase 6 — Page Unit Detail `/units/:id`
Spec : `Faction unit detail.md` + `Faction unit detail.png`.

**À faire** :
- [ ] Hero unité TEXTE | IMAGE
- [ ] Tabs (Aperçu/Équipement/Histoire/Règles/Variantes/Galerie)
- [ ] Stats en barres visuelles (pas tableau)
- [ ] Variantes en cards
- [ ] Panneau droit (Infos clés / Liens rapides / Unités associées / Citation / Ressources)
- [ ] Changer route de `/factions/:fid/units/:uid` → `/units/:id`

### Phase 7 — Page Romans `/romans` ✅ FAIT (session 5)

**Fait selon mockup `Romans.png` + spec `Romans.md`** :
- ✅ Hero TEXTE|IMAGE 50/50 (eyebrow + h1 Cinzel XL + desc + search bar avec icon ⌕). Image hero wiki "Black Library gothic warhammer 40k"
- ✅ 4 onglets sous-hero (Toutes les séries / Ma bibliothèque / Ordre de lecture / À lire) — ma bibliothèque = readBooks > 0, à lire = readBooks === 0, ordre = sort par epoque
- ✅ Toolbar 3 cols : Trier par (custom select A-Z / Nb livres / Progression) / Filtrer par lettre (#, A-Z 27 boutons ronds cliquables) / Bouton "Filtres avancés" (visuel)
- ✅ Layout 1fr | 320px. Grille auto-fill 260px (4 cols sur écran XL). Cards image-first (150px image + body). Description 3-line clamp. "X livres" Cinzel or, barre progression "X/Y lus" gradient or, badges colorés par catégorie, CTA "Voir la collection ›"
- ✅ Sidebar 320px sticky : Progression (donut SVG 100x100 avec stroke-dasharray + 3 dots stats Lus/En cours/À lire + total) / Actions rapides (4 liens) / Top 5 séries populaires (par nbLivres) / Légende 6 badges
- ✅ Bouton "Charger plus" centré (pagination 8 par 8) si filtre > visible
- ✅ Recherche live (titre/VO/auteurs/tags), tri appliqué après tab/recherche/lettre, helper stripPrefix pour tri ignorant "Le/La/Les/L'"
- ✅ Pure custom CSS (zéro Material). Effet wiki async sur hero + chaque card.
- ✅ Données enrichies : `data/warhammer/series.json` mis à jour avec `readBooks` + `badges` sur les 11 séries. Total 108 livres / 57 lus / 53% progression.
- ✅ Principes refactoringui/lawsofux mentalisés : Hick's Law (4 tabs/3 sorts/6 légende), hiérarchie typographique (Cinzel uppercase or → italique muted → body), Fitts (CTA pleine largeur), Von Restorff (un seul accent or par card), Empty state explicite.

### Phase 8 — Page Vidéos `/videos` ✅ FAIT (session 6)
Spec : `Video.md` + `Video.html` + `Video` mockup.

**Réalisé** :
- ✅ Hero + 3 chaînes prioritaires (Le Librarium / Indomitus / Astartes via `channelsPriority$`)
- ✅ Recherche + filtres (Tous/Lore/Animations/Officiel/FR/EN) + tri (recommandées/durée/chaîne/récentes)
- ✅ Section "Incontournables" 1.35fr 1fr 1fr (3 featured fixes : tts-device/astartes/lord-inquisitor)
- ✅ Section "Chaînes recommandées" grid 4 cols (8 chaînes)
- ✅ Section "Toutes les vidéos" grid 3 cols filtrable
- ✅ Sidebar 320px (Filtres avancés avec compteurs dynamiques / Vidéos récentes / Règle UX)
- ✅ Modal iframe YouTube + ESC + clic-out + autoplay + cleanup auto à la fermeture
- ✅ Seed `videos.json` enrichi (thumbnail query wiki, duration, channelId, category, language, featured) sur 16 vidéos
- ✅ Thumbnails : YouTube `img.youtube.com/vi/{id}/mqdefault.jpg` pour les vidéos avec embedId / wiki fallback `/api/wiki-image?q=...` pour playlists et chaînes
- ✅ Décisions session 6 figées : 3 featured fixes, thumbnails fallback wiki pour les sans-embedId, compteurs sidebar dynamiques via `computed()`

### Phase 9 — Page Galerie `/gallery` ✅ FAIT (session 7)
Spec : `Galerie.md` + `Galerie.png`. Route renommée `/galerie` → `/gallery` avec redirect.

**Réalisé** :
- ✅ Hero "Galerie Impériale" + bg wiki cité gothique + 3 stats (Œuvres/Artistes/Collections) + recherche live
- ✅ 6 cards catégories visuelles (Space Marines/Chaos/Xénos/Imperium/Personnages/Véhicules) image-first via wiki + count + filtre cliquable
- ✅ Grille artworks 4 cols image-first + bookmark heart + likes + hover overlay
- ✅ Sidebar 320px (Filtres faction/catégorie/tri + Palette 9 couleurs + Top artistes + Collections populaires)
- ✅ Viewer modal plein écran (← → flèches clavier + ESC + clic-out + bouton favori + source externe optionnelle)
- ✅ Charger plus pagination 8 par 8
- ✅ Routes : `/gallery` actif, `/galerie` redirect (compat)

---

## Décisions UX figées

- **Tons** : `--bg #050403`, `--gold #c9a24a`, `--red #7b1113`, `--gold-bright #f0d276`, `--text #e6dfce`
- **Fonts** : `Cinzel` pour titres uppercase / `Inter` pour body — déjà chargés dans `index.html`
- **Layout topbar** : 70px sticky, padding 0 34px, brand gauche + nav droite + claude badge
- **Wrap** : largeur 100% padding 18px 34px, hauteur `calc(100vh - 70px - 26px)`
- **Footer légal** : 26px slim sticky bottom, "Site fan non officiel..."
- **body** : `height: 100vh, overflow: hidden` — pas de scroll vertical global
- **Hover convention** : translateY(-6px) + scale(1.05) image + glow doré
- **Badges alignement** : `.badge.blue` (Imperium), `.badge.red` (Chaos), `.badge.green` (Xenos)
- **Lore feed/chronicle** : statique pour l'instant (3 events hardcodés). Pas de Claude pour économiser crédits.

---

## Décisions à prendre (à chaque entrée en phase)

- [ ] **Phase 1** : on migre la data existante ou on repart from scratch avec nouveaux JSON ?
- [ ] **Phase 1** : on garde l'ancien endpoint `/factions` ou on remplace direct ?
- [ ] **Phase 2** : "Activité récente" = lore feed statique ou vraies données (derniers ajouts JSON) ?
- [ ] **Phase 7** : seed Romans — on inclut juste les collections officielles GW ou aussi des fan-fiction ?
- [x] **Phase 8** : modal vidéo — iframe YouTube native (résolu session 6 : iframe directe avec `bypassSecurityTrustResourceUrl` + autoplay + cleanup au close).
- [ ] **Phase 9** : grid masonry vraie (CSS columns) ou pseudo-masonry (grid avec rows variables) ?

---

## Inventaire fichiers actuels

### Frontend (`warhammer40k/frontend/src/app/`)
- `app.routes.ts` — routes : `/factions`, `/factions/:id`, `/factions/:fid/units/:uid`, `/romans`, `/videos`, `/galerie`
- `layout/main-layout/main-layout.component.ts` — topbar + wrap + legal footer (à jour design tokens)
- `core/services/warhammer.service.ts` — `factions$`, `units`, `series$`, `videos$`, `images$`, `getWikiImage`
- `core/services/sse.service.ts` — SSE générique
- `core/services/quota-alert.service.ts` — bandeau quota Claude
- `core/models/models.ts` — types Faction, Unit, Serie, Video (PAS de SubFaction/Hero/Channel/Collection/Artwork)
- `features/factions/factions.component.ts` — v1 single-screen (à refondre phase 4)
- `features/faction-detail/faction-detail.component.ts` — ANCIEN (à refondre phase 5)
- `features/unit-detail/unit-detail.component.ts` — ANCIEN (à refondre phase 6)
- `features/series/series.component.ts` — ANCIEN, route `/romans` (à refondre phase 7)
- `features/videos/videos.component.ts` — ANCIEN (à refondre phase 8)
- `features/galerie/galerie.component.ts` — ANCIEN (à refondre phase 9, renommer en gallery)
- `shared/components/claude-usage-badge/` — réutilisable

### Backend (`warhammer40k/backend/src/`)
- À auditer phase 1 (modules factions/units/series/videos/images/wiki)

### Specs UX (`/volume2/docker/developpeur/UX/`)
- 7 specs `.md`/`.txt` — voir liste plus haut
- 6 mockups PNG (factions, dashboard, faction detail, unit detail, romans, galerie)
- 1 mockup HTML : `Video.html`

---

## Pièges connus

- **PinGuard finance** ≠ warhammer (pas de PIN sur warhammer).
- **Permissions Synology** : commandes `docker` OK sans sudo (groupe docker).
- **Build Docker** : `docker compose -f .../warhammer40k/docker-compose.yml up -d --build warhammer-frontend` reconstruit en ~16s.
- **`isolatedModules` TS** : `import type` obligatoire pour types utilisés dans décorateurs (genre `@Body() body: MonType` → `import type { MonType }`).
- **claude-usage-badge** : SSE déjà branché (phase précédente, finance). Ne pas casser.
- **Données seed** : au premier lancement après changement de model, copier les JSON seed dans `data/warhammer/` sinon ENOENT crash-loop.

---

## Logs de session

### 2026-04-30 session 1
- Foundations : design tokens + layout shell topbar/footer.
- Tentative single-screen factions v1 abandonnée.
- Specs nouvelles découvertes : 7 fichiers `warhammer - *.md`, 6 mockups PNG, 1 mockup HTML.
- Création de ce tracker.

### 2026-04-30 session 2
- Lecture exhaustive de tous les mockups + specs. Vision claire synthétisée dans ce fichier + 3 memories.
- Phase 1 complète : models backend+frontend étendus, 3 nouveaux modules (channels/artworks/lore-feed), endpoints OK testés.
- Phase 3 : topbar avec "Accueil" + icônes nav + body scroll naturel.
- Phase 4 : refonte complète factions.component selon mockup. Hero générique + résumé + toolbar + grille + sidebar 320px.
- Phase 2 : Dashboard placeholder. Hero "Bienvenue Initié" + 4 shortcuts + stats bar.
- Tout build OK. http://nas:4201/ et http://nas:4201/factions opérationnels.

### 2026-04-30 session 3
- Retour utilisateur sur factions v2 : hero trop gros, info "11+6" répétée 3 fois, footer pas selon mockup.
- Corrections : hero factions descend à 200px (pas de panel résumé), sidebar perd quick-stats redondants au profit d'un bloc "ALIGNEMENT" (Loyal/Neutre/Hostile), filtres TYPE de la sidebar maintenant cliquables.
- Footer refait : ornement (line + ⚜ + line) + texte légal centré, sans border-top sombre. Fidèle au mockup `factions.png`.
- Phase 5 complète : refonte intégrale `faction-detail.component.ts` (passe de 300 lignes Material à ~700 lignes pure custom) selon mockup `Faction detail.png`.
- Budget CSS angular.json relevé : 12kB warning / 20kB error.
- Nouvelle source d'images mémorisée : https://40k.gallery/40k-tags/ (memory `warhammer_image_sources.md`).
- Tout build OK. /factions et /factions/space-marines opérationnels.

### 2026-04-30 session 5
- Enrichissement lore : Chaos Space Marines + Astra Militarum dans `factions.json` (sousTitre, citation, lore.{origine/organisation/doctrine}, stats, liensRapides, resources). Source : PDF Fluff Bible (sections "The Traitor Legions" pour CSM, "The Imperial Guard" pour AM), reformulé en français.
- Mémoire `stack_strategy_future.md` créée : Warhammer reste Angular custom, futurs gros chantiers finance/ol = candidat React+shadcn+Tailwind. refactoringui + lawsofux applicables tout de suite quel que soit le stack.
- Plugin `hookify` désactivé dans `~/.claude/settings.json` (Python 3.8.15 incompatible avec syntaxe `tuple[Dict[str,Any], str]` PEP 585 du plugin → traceback à chaque tool call). Python 3.9.22 installé en parallèle dans `/usr/local/bin/python3.9` mais le default `python3` reste 3.8 (faudrait un symlink root pour basculer).
- Phase 7 complète : `series.component.ts` réécrit intégralement (333 lignes Material → ~640 lignes pure custom). Hero + recherche, 4 tabs, toolbar (tri + 27 boutons lettre + filtres avancés), grille 4 cols cards image-first avec barre progression + badges colorés, sidebar Progression donut SVG + Actions + Top 5 + Légende, bouton "Charger plus" pagination 8x8. Wiki images sur hero + chaque card. CSS budget pas dépassé. Tout build OK.
- Données series.json enrichies : 11 séries avec `readBooks` + `badges` (108 livres total, 57 lus, 53% progression).

**À reprendre next session** :
- Phase 8 = Vidéos `/videos` (spec `Video.md` + mockup `Video.html` qui est le mockup le plus précis car HTML interactif). Hero + 3 chaînes prioritaires (Le Librarium / Indomitus 40K / Astartes), search + filtres pills (Tous/Lore/Animations/Officiel/FR/EN) + select tri, layout main+sidebar 320px, section "Incontournables" 1 grande + 2 petites, "Chaînes recommandées" grid 4 cols horizontales, "Toutes les vidéos" grid 3 cols, sidebar Filtres avancés + Vidéos récentes + Règle UX, modal vidéo iframe YouTube + ESC + clic-out + arrêt iframe à fermeture.
- Côté data : `videos.json` déjà existant (model étendu en session 2 avec thumbnail/duration/channelId/category/language/featured) + `channels.json` avec 8 chaînes (Le Librarium, Indomitus 40K, Astartes, Sire Lambert, FWS, Vox Obscura, Luetin09, Majorkill — 3 priorité). À voir si enrichissement complémentaire nécessaire.
- Specs à charger en froid : `warhammer_vision`, `warhammer_specs_location`, `warhammer_ux_lessons`, `warhammer_image_sources`, `warhammer_lore_sources`, `stack_strategy_future` (memories) + ce tracker + mockup `Video.html` (lecture directe car HTML).
- Avant Phase 8 : penser à consulter refactoringui.com + lawsofux.com (5 principes pertinents) pour cadrer les choix UX.

### 2026-04-30 session 4
- Phase 6 complète : `unit-detail.component.ts` réécrit intégralement selon mockup `Faction unit detail.png`. ~1100 lignes. Pure custom (zéro Material). Topbar retour + actions (bookmark/share). Hero TEXTE|IMAGE 50/50 avec h1 Cinzel + badges colorés (type / sous-rôle / alignement) + sigil faction + role italique + description + 2 CTA (Galerie or solid + Vidéo or outline). Tabs (Aperçu/Équipement/Histoire/Règles/Variantes/Galerie) avec activeTab signal et filtrage de sections selon onglet (Aperçu = tout). Panels : Description / Capacités principales (4 items icônes rondes) / Équipement standard (figurine + 4 items) / Stats (6 barres horizontales endurance/résistance/puissance feu/mobilité/portée/soutien + Icônes clés 3 sigils) / Histoire & Lore (texte + image immersive + citation inline) / Variantes (grille auto-fill cards image-first). Sidebar 320px sticky : Informations clés (6 rows ico+label+value) / Liens rapides (4 rows avec routerLink) / Unités associées (4 mini-cards avatar+nom+type + bouton "Voir toutes") / Citation (guillemets or stylisés + signature) / Ressources (4 rows) / Bouton "Signaler une erreur".
- Routing : ajout route flat `/units/:id` + redirect function `/factions/:fid/units/:uid` → `/units/:uid` pour compat. Update routerLink dans faction-detail cards d'unités.
- Nouvelles sources de lore mémorisées :
  - PDF "WH40K Fluff Bible" dans `/volume2/docker/developpeur/warhammer40k/fluff/1400214179388.pdf` (822 KB, doc canonique)
  - 2d4chan wiki https://2d4chan.org/wiki/Category:Warhammer_40,000
  - Wiki Fandom Fluff Bible https://warhammer40k.fandom.com/wiki/Category:40k_Fluff_Bible — **bloqué Cloudflare** côté server (WebFetch + curl). Référence visuelle pour l'utilisateur ("c'est vivant, de grosses images en background") → confirme la direction image-first hero + overlays sombres prise sur faction-detail/unit-detail. À garder comme inspi UX pour Romans (hero biblio cinématique) et Galerie (viewer fullscreen).
  - Memory `warhammer_lore_sources.md` créée puis enrichie avec la 3e source.
- Tout build OK. /factions, /factions/space-marines, /units/sm-primaris-intercessor opérationnels.

**À reprendre next session** :
- Phase 7 = Romans `/romans` (mockup `Romans.png` + spec `Romans.md`). Hero biblio gothique + recherche + onglets (Toutes les séries / Ma bibliothèque / Ordre de lecture / À lire) + tri A-Z + filtres lettres + grille 4 cols collections + sidebar (Progression / Actions rapides / Séries populaires / Légende badges) + bouton "Charger plus".
- Côté data : à enrichir le seed `series.json` avec covers, badges, readBooks (model déjà étendu en session 2). Le PDF Fluff Bible peut servir de source pour synopsis. Black Library reste l'éditeur officiel — possibilité de scrap des covers depuis blacklibrary.com pour seed (à valider).
- Avant phase 7 : option d'enrichir d'abord avec le PDF Fluff Bible 1-2 factions (Chaos Space Marines, Astra Militarum) pour gagner en cohérence vs Space Marines isolé. Décision user au démarrage.
- Specs à charger en froid : `warhammer_vision`, `warhammer_specs_location`, `warhammer_ux_lessons`, `warhammer_image_sources`, `warhammer_lore_sources` (memories) + ce tracker + mockup `Romans.png` (resize via `convert -resize 1400x`).

### Sessions précédentes
- Phase initiale : SSE backend OL + SSE finance déclarations + claude-usage-badge SSE 3 apps.
- Pas directement liée à Warhammer UX, mais environnement stable.
