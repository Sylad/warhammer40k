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

**Date dernière mise à jour** : 2026-05-02 (session 12 — V2 complète : équipement, lightbox, Hérésie)
**Phase active** : aucune — **V1 + V2 toutes ✅ TERMINÉES** 🎉
**Prochaine phase potentielle** : auth multi-rôles (read public / write authentifié), polish UX (lightbox sur /lore/equipment et /lore/concepts).

## ⭐ État cumulé après session 11 (2026-05-02)

| Catégorie | Avant F4 | Après V2 |
|---|---|---|
| Factions parents | 11 | **17** |
| Sous-factions | 63 | **113** |
| Pages UI | 9 | **15** (dashboard, factions, faction-detail, subfaction-detail, unit-detail, romans, videos, gallery, lore hub, lore-emperor, lore-primarchs, lore-chaos-gods, lore-civilians, lore-concepts, lore-galaxy + about) |
| Types `SubFactionType` | 11 | **19** |
| Séries Black Library | 5 | **33** |
| Entrées lore-feed | 10 | **40** |
| Artworks catalog | 0 | **35** |
| Lore-concepts | 0 | **15** |
| Lore narratif (entités) | 0 | **6 sections Empereur + 20 Primarques + 4 Chaos Gods + 10 organisations civiles + 15 concepts** |
| Datasheets unités locales | 0 | **119** (bundled Docker `backend/public/datasheets/`) |

**Nouvelles factions parents (F4)** : Adeptus Custodes, Officio Assassinorum, Drukhari, Grey Knights, Leagues of Votann, Genestealer Cults — chacune avec sous-factions enrichies (Shield Hosts, Temples, Kabales, Wych Cults, Haemonculus Covens, Brotherhoods, Kindreds, Cultes).

**Nouvelles pages lore (F5+F6+F9)** :
- `/lore` (hub avec 4 cards actives + 1 à venir)
- `/lore/emperor` — narrative scrollable 6 sections + 5 stats + images alternées
- `/lore/primarchs` — 20 fiches filtrables (9/9/2) avec status badges
- `/lore/chaos-gods` — 4 dieux multi-couleur + 8 daemons notables + primarques corrompus liés
- `/lore/civilians` — 10 organisations filtrables par catégorie (governance/religion/military/psyker/commerce/training)

**Dashboard refondu** : hero image-bg Empereur sur Trône d'Or + 2 CTA + quick lore bar + 4 shortcut cards image-first + Brèves du 41ᵉ millénaire (lore feed dynamique) + stats bar étendue.

**Backend lore module** : étendu massivement avec endpoints `/api/lore/emperor`, `/api/lore/primarchs[/:id]`, `/api/lore/chaos-gods[/:id]`, `/api/lore/imperial-orgs[/:id]`. Seeds : `emperor.json`, `primarchs.json`, `chaos-gods.json`, `imperial-orgs.json`.

**Topbar** : ajout du lien "✠ LORE" entre Galerie et À propos.

**Commits GitHub** : `b91cb30 feat: Phase F4 + F5 + F6 + Dashboard refonte` + `1ac2ef6 feat: Phase F9 — Civils impériaux`.

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

### 2026-05-01 session 8 (F4 + F5 + F6 + Dashboard refonte)
**Phase F4 — Nouvelles factions parents (+6 factions, +39 sous-factions)** :
- Étendu `SubFactionType` union avec 8 nouveaux types : `shield_host`, `temple`, `kabal`, `wych_cult`, `haemonculus_coven`, `brotherhood`, `kindred`, `cult` (4 fichiers TS modifiés en miroir : backend service.ts + frontend models.ts + 2 maps frontend faction-detail/subfaction-detail).
- **Adeptus Custodes** (Imperium gold, ⚜) + 6 Shield Hosts (Shadowkeepers + Hykanatoi enrichis avec Trajann Valoris/Castellan Geôliers/Custodian Guard ; Solar Watch / Aquilan Shield / Eternal / Emissaries Imperatus minimaux).
- **Officio Assassinorum** (Imperium dark, ☠) + 4 Temples enrichis : Callidus (polymorphine + Phase Sword), Vindicare (Exitus Rifle + M'Shen tueuse de Konrad Curze), Eversor (frénésie chimique + neurogen), Culexus (Pariah anti-psyker + Animus Speculum).
- **Drukhari** (Xenos violet sombre, ⛧) + 10 sous-factions : 4 Kabales (Black Heart/Asdrubael Vect, Obsidian Rose/Lady Malys, Poisoned Tongue, Flayed Skull), 3 Wych Cults (Strife/Lelith Hesperax, Cursed Blade, Red Grief), 3 Haemonculus Covens (Prophets of Flesh/Urien Rakarth, Black Descent, Dark Creed).
- **Grey Knights** (Imperium silver, ✠) + 8 Brotherhoods : 1st (Suprême Grand Master, Kaldor Draigo perdu dans le Warp), 8th Purifiers (Castellan Crowe + Black Blade of Antwyr), 2nd-7th minimaux.
- **Leagues of Votann** (Xenos slate, ⚒) + 5 Kindreds : Trans-Hyperian Alliance (Ûthar the Destined enrichi), Greater Thurian, Kronus Hegemony, Ymyr Conglomerate, Urani-Surtr Regulates.
- **Genestealer Cults** (Xenos purple, ☩) + 6 Cultes : Cult of the Four-Armed Emperor (Patriarche/Magus/Primus enrichi), Twisted Helix, Bladed Cog, Hivecult, Pauper Princes, Rusted Claw.

**Phase F5 — Pages Lore dédiées** :
- Backend lore-feed module étendu : endpoints `GET /api/lore/emperor`, `/api/lore/primarchs[/:id]`. Models `Emperor` (sections + stats), `Primarch` (number, allegiance, status, statusDetail, etc.).
- `/lore` (hub) : 4 cards (Empereur active, Primarques active, Panthéon Chaos active, Galaxie à venir).
- `/lore/emperor` : page narrative scrollable, hero image-bg Trône d'Or, 5 stats, 6 sections (Origine mystique → Statut M42 — un dieu en gestation ?), images alternées, citations.
- `/lore/primarchs` : hero + compteurs dynamiques (9/9/2) + filtres par allegiance + grille 20 cards image-first avec N° + status badge + allegiance + lien vers Légion. Images wiki async par primarque.
- Topbar : ajout lien "✠ LORE" entre Galerie et À propos.

**Phase F6 — Panthéon Chaos** :
- Backend étendu : endpoint `GET /api/lore/chaos-gods[/:id]`. Model `ChaosGod` (portfolio, daemons hierarchy, primarchsCorrupted, legions, citation).
- `/lore/chaos-gods` : page longue scrollable, 4 sections multi-couleur distinctes (Khorne rouge ⚔ / Tzeentch bleu ✦ / Nurgle vert ☣ / Slaanesh rose ♆). Chaque section avec hero image-bg + sigil + nom + title + sphere + citation, body 2 cols (description+lore+daemons VS portfolio+primarques+légions).
- 8 daemons notables : Skarbrand, Ka'Bandha, Kairos Fateweaver, The Changeling, Rotigus Rainfather, Ku'gath Plaguefather, Shalaxi Helbane, Syll'Esske.
- Quick nav en haut pour sauter directement à un dieu.

**Dashboard refonte (image-first immersif)** :
- Hero image bg Empereur sur Trône d'Or via wiki proxy + glow doré + 2 CTA ("⚔ Explorer les factions" + "✠ Le Trône d'Or").
- Quick lore bar (3 cards horizontales) : L'Empereur / Les 20 Primarques / Le Panthéon Chaos.
- 4 Shortcut cards image-first (au lieu de cards plates) avec hover scale+glow doré et images bg wiki (Space Marines, Black Library, Astartes animation, fresque impériale).
- Section "Brèves du 41ᵉ millénaire" : 3 events random du lore-feed avec border-left coloré par type (rouge menace/guerre, or événement, bleu découverte, violet prophétie).
- Stats bar étendue : 17 factions / 102 sous-factions / 11 romans / 16 vidéos / 10 œuvres + citation "Le Trône veille".

**Commit GitHub** : `b91cb30 feat: Phase F4 + F5 + F6 + Dashboard refonte`.

### 2026-05-01 session 9 (F9 — Civils impériaux)
**Phase F9 — Civils Impériaux (les rouages humains de l'Imperium)** :
- Backend étendu : endpoint `GET /api/lore/imperial-orgs[/:id]`. Model `ImperialOrganization` (category, color, sigil, keyRole, functions, notableFigures) + `ImperialOrgCategory` union ('governance' | 'military' | 'religion' | 'psyker' | 'commerce' | 'training').
- `/lore/civilians` : page filtrable par catégorie, hero + 3 compteurs (10 orgs / 50 fonctions / 12 figures notables). Chaque org avec hero coloré + sigil + nom + title + meta (N° + category badge), body 2 cols (description+lore+citation+figures notables VS sidebar Rôle clé+fonctions).
- 10 organisations enrichies : Adeptus Administratum (Master of Administratum), Adeptus Ministorum (Sebastian Thor), Adeptus Arbites, Rogue Traders (Aurelia Malys), Schola Progenium (Yarrick), Navigators (Maison Belisarius), Astropaths, Sœurs du Silence (Aleya), Imperial Knight Households (House Hawkshroud), Remembrancers (Solomon Voss + Mersadie Oliton).
- Hub mis à jour : la card "Civils Impériaux" est maintenant active.

**Subagent `about-readme-sync`** créé en `~/.claude/agents/about-readme-sync.md` (mémoire `subagent_about_readme_sync.md`) — auto-syncs Stack/Sources des pages About + README quand on ajoute une techno.

**Commit GitHub** : `1ac2ef6 feat: Phase F9 — Civils impériaux`.

**À reprendre next session** :
- **F7 (Lore concepts encyclopédie)** : pages dédiées pour Trône d'Or, Astronomican, Webway, Œil de la Terreur, Maelstrom, Cicatrix Maledictum, Codex Astartes, Imperium Sanctus/Nihilus, Holy Terra, Macragge, Cadia (détruite), Nuceria, Barbarus, Fenris, Caliban. Pattern lore similaire à F5/F6/F9. ~12-15 concepts à seeder.
- **F3 (enrichir 51 sous-factions minimalistes)** : Aeldari (Eldrad/Yriel/Phoenix Lords), Tyranides (Swarmlord/Old One Eye), Necrons (Trazyn/Anrakyr/Szarekh/Crypteks), Orks (Mad Dok Grotsnik/Big Mek), Sœurs (Saint Celestine/Ephrael Stern), Tau (Shadowsun/Farsight), AdMech (Belisarius Cawl). Lourd mais data-only.
- **F8 (Carte galactique SVG interactive)** : 5 Segmenta + Œil de la Terreur + Maelstrom + Cicatrice Maledictum + Webway tracés. Hot zones cliquables (Cadia, Armageddon, Macragge, Krieg, Vraks). Imperium Sanctus vs Nihilus visualisé. Routes warp principales. Lourd côté SVG/interactivité.
- **F10 (Intégration galerie ↔ factions)** : suggestions catégorie image-meta = 6 built-in + 17 noms de factions + custom. Léger.
- **Tweaks UX** : breadcrumb (Factions › Space Marines › Ultramarines › Marneus Calgar), combobox catégorize CSS custom (au lieu de datalist natif), primarque image dans sous-faction card.

**Specs à charger en froid pour F7/F3/F8** : `warhammer_vision`, `warhammer_specs_location`, `warhammer_ux_lessons`, `warhammer_subfactions_pattern`, `warhammer_lore_sources` + ce tracker. Le Fluff Bible PDF (`/volume2/docker/developpeur/warhammer40k/fluff/1400214179388.pdf` + `pdftotext` dispo NAS) reste source canonique pour F7.

### 2026-05-01 session 10 (F7 + F8 + F10 + Tweaks UX)

**F7 — Lore concepts encyclopédie** : page `/lore/concepts` filtrable + 15 concepts seedés dans `lore-concepts.json` (Trône d'Or, Astronomican, Webway, Œil de la Terreur, Maelstrom, Cicatrix Maledictum, Codex Astartes, Imperium Sanctus/Nihilus, Holy Terra, Macragge, Cadia, Fenris, Caliban, Baal). Chaque concept a `keyFacts[]`, `relatedConcepts[]`, `wikiQuery`, citation. Backend module `lore-concepts` ajouté.

**F8 — Carte galactique SVG interactive** : page `/lore/galaxy` avec image HD bg + 8 hot zones SVG calibrées via PIL grid overlay (Œil de la Terreur 88,163 / Cadia 90,167 / Baal 325,165 / Terra 126,265 / Mars 134,262 / Titan 130,272 / Maelstrom 268,262 / Macragge 424,398). viewBox 700×490 mappé au visuel canonique 3054×2136. Hot zones cliquent vers le concept correspondant.

**F10 — Intégration galerie ↔ factions** : `allCategories()` computed sur gallery.component.ts qui combine 6 built-in + 17 noms de factions + customs. Modal de catégorisation montre toutes les options.

**Tweaks UX** :
- Breadcrumb global (`shared/components/breadcrumb`) — parse l'URL via NavigationEnd, mappe slugs vers labels canoniques (chaos-gods → Panthéon Chaos, etc.).
- Mini-portrait Primarque overlay sur sous-faction card (faction-detail), via `primarchWikiQuery` lookup.
- Fix `/galerie` → `/gallery` (2 occurrences unit-detail).
- Fragment scroll `withInMemoryScrolling` + anchorScrolling activés dans `app.config.ts`, scroll manuel setTimeout 100ms dans `lore-concepts` pour les fragments.
- Galaxy debug overlay temporaire (grid + coords curseur) ajouté puis retiré après calibration.

**Cloudflare tunnels** : tunnel quick-mode lancé pour partager warhammer + ol-companion à la famille sans VPN. Binary `cloudflared` téléchargé dans `~/.local/bin/`.

**Source de lore mémorisée** : Omnis Bibliotheca (FR) — wiki Warhammer francophone, ajout dans `warhammer_lore_sources.md`.

**Commits GitHub** : `46502b0`, `4360fe0`, `ddc2f93`, `18b3d4f`, `3c7f196`.

### 2026-05-02 session 11 (Audit V2 — cleanup + enrichissement seeds + fix images)

**Cleanup mort code** :
- `factions.component.ts` : card "+6 autres factions" + CSS associé + `resetFilters()` méthode (toutes les factions présentes désormais).
- `gallery.component.ts` : panneau "Couleurs dominantes" + signal `filterColor` + filtre + `toggleColorFilter()` + `PALETTE` constant + CSS `.color-palette`/`.color-dot` (sans valeur ajoutée).
- `unit-detail.component.ts` : tabs "Règles (optionnel)" + "Galerie" placeholders (100% narratif, pas de jeu plateau ; galerie globale suffit).

**Catégories galerie dynamiques + fallback image** :
- "Parcourir par catégorie" + dropdown filtre listent toute catégorie ayant ≥1 image (au lieu des 7 statiques). Computed `availableCategories` = built-in + factions (17) + customs créées par l'utilisateur, comptées et triées.
- `categoryBg(key)` fait fallback sur la 1ère œuvre de la catégorie quand aucun pré-cache wiki n'existe (locale via `service.imageUrl` ou wiki cached). Plus de cards noires.

**Datasheet locale prioritaire (fix images unités)** :
- Pattern HEAD-check sur `/api/images/datasheets/<unit-id>` avant fallback vers wiki proxy.
- 119/133 unités ont une JPEG bundlée dans `backend/public/datasheets/<unit-id>.jpg` (servies via `images.controller.ts:30`).
- Appliqué sur : `unit-detail.component.ts` (heroImage + relatedImages), `faction-detail.component.ts` (unitImages liste).
- 14 unités sans datasheet (Sanguinius, Horus, Fulgrim, Yarrick, Macharius, Corbec, Ravenor, Valeria, Magos Biologis, Hellbrute, Henchmen, Makari, Leman Russ Primarch, Primaris Intercessor) → wiki fallback automatique.

**Enrichissement seeds (4 fichiers)** :
- `series.json` : 11 → 33 (Siege of Terra, Dawn of Fire, Dark Imperium, Beast Arises, Watchers of the Throne, Vaults of Terra, Devastation of Baal, Helsreach, Black Legion, Salamanders, Word Bearers, Yarrick, Cadia Stands, Infinite & Divine, Twice-Dead King, Path of the Eldar, Brutal Kunnin, Fire Caste, Farsight, Mark of Faith, Belisarius Cawl, Horusian Wars). Distribution : SM 10 / AM 9 / Chaos 8 / Inquisition 5 / Orks 4 / Custodes 3 / Necrons 3 / AdMech 2 / Sœurs 2 / Tyranides 2 / T'au 2 / Aeldari 1.
- `subfactions.json` : 102 → 113 xenos enrichis. Aeldari +3 (Mymeara, Lugganath, Yme-Loc), Tyranides +4 (Jörmungandr, Hydra, Gorgon, Kronos), Necrons +4 (Nihilakh-Trazyn, Thokt, Charnovokh, Maynarkh).
- `lore-feed.json` : 10 → 40 (atmosphère ticker dashboard : Indomitus, Cicatrix, Cadia, Magnus, Léviathan, Trazyn, Cawl, Plague Wars, Yarrick, Helsreach, etc.).
- `artworks.json` : 10 → 35 (Sanguinius, Horus, Empereur Trône d'Or, Magnus, Mortarion, Abaddon, Lion, Logan, Dante, Calgar, Cawl, Eldrad, Yvraine, Drazhar, Ghazghkull, Trazyn, Imotekh, Farsight, Swarmlord, Eisenhorn, Custodes Captain-General, Repentia, Yarrick, Cicatrix, Knight Lancer).

**Mémoires créées** :
- `warhammer_unit_image_fallback.md` (reference) — recette HEAD-check datasheet + wiki fallback, où sont les JPEGs, pattern à reproduire.
- `warhammer_state_2026_05_01.md` (project) — refresh post-V1 complet avec compteurs seeds.

**Commit GitHub** : `354204f feat: enrichissement seeds + datasheet locale prioritaire + cleanup audit V2` (8 fichiers, +1776/-219 lignes).

**Validation Playwright** : sm-tactique → datasheet locale OK ; sm-sanguinius (sans datasheet) → wiki fallback OK ; gallery "Sœurs de Bataille" custom catégorie → image fallback 1ère œuvre OK.

**À reprendre next session (si reprise)** :
- F3 résiduelle : compléter notableUnits xenos (Aeldari Eldrad/Phoenix Lords/Yriel ; Tyranides Swarmlord/Old One Eye/Norn ; Necrons Anrakyr/Szarekh/Crypteks ; Orks Mad Dok/Big Mek ; Sœurs Stern ; Tau Shadowsun/Aun'Shi ; AdMech Skitarii Marshal).
- 14 datasheets manquantes : prendre images du wiki + cropper à la main, déposer dans `backend/public/datasheets/` puis rebuild backend.
- Series xénos (Drukhari/GK/Votann/Genestealer Cults absents).
- Auth multi-rôles (read public / write authentifié).
- Rafraîchir `WARHAMMER_PROGRESS.md` et `WARHAMMER_ROADMAP.md` après chaque grosse session pour éviter dérive.

### 2026-05-02 session 12 (V2 complète — F3 résiduelle, équipement, lightbox)

**F3 résiduelle (8 agents parallèles)** :
- Aeldari +6 notableUnits (Asurmen, Karandras, Fuegan, Baharroth, Jain Zar, Wild Riders, Spiritseer)
- Tyranides +5 (Old One Eye, Hive Tyrant Behemoth, Norn Emissary, Tervigon, Broodlord)
- Necrons +8 (Orikan, Szarekh, Triarch Stalker, Lychguards, Doomsday Ark, Lokhust Destroyers, Anrakyr, Plasmancer)
- Orks +7 (Kaptin Badrukk, Big Mek, Buzzgob, Lootas, Painboy, Squiggoths, Boss Zagstruk, Stormboyz)
- Sœurs +13 (Morvenn Vahl, Junith Eruita, Triumph of Saint Katherine, Seraphim, Mistress of Repentance, Repentia, Cassia Orsinio, Sebastian Thor, Imagifier, Hospitaller, Dialogus, Mortifier)
- T'au +13 (Shadowsun, Aun'Va, Coldstar, Crisis XV8, Fire Warriors, Riptide, Stormsurge, Pathfinders, Kroot, Vespid, Hammerhead, Farsight, O'Vesa, The Eight)
- AdMech +12 (Cawl, Skitarii Rangers, Tech-Priest Manipulus, Tech-Priest Dominus, Onager Dunecrawler, Knight Households, Magos Biologis, Kastelan Robots, Sicarian Infiltrators, Skitarii Marshal, Kataphron Destroyers, Vanguards)
- Total : **+70 notableUnits xenos**.

**+5 séries Black Library xenos** (Path of the Dark Eldar, Grey Knights Trilogy, Castellan Crowe, Cult of the Spiral Dawn, The Bookkeeper's Skull). series.json : 33 → 38.

**+3 imperial-orgs (10 → 13)** :
- Imperial Navy (Battlefleet par Segmentum, classes vaisseaux Cobra→Lunar→Retribution→Emperor 12km)
- Collegia Titanica (Légions Titanica, classes Warhound 12m → Imperator 55m, Princeps Senioris)
- Conseil du Sigillite (Malcador, Constantin Valdor, Knights-Errant, Trône d'Or)

**52 personnages Hérésie d'Horus (2 agents parallèles)** :
- Loyalistes (24) : Sigismund, Camba Diaz, Pollux, Boreas, Marius Gage, Remus Ventanus, Tarasha Euten, Artellus Numeon, Azkaellon, Raldoron, Mkani Kano, Corswain, Holguin, Nemiel, Astelan, Gunnar Gunnhilt, Othere Wyrdmake, Geigor Fell-Hand, Shiban Khan, Targutai Yesugei, Torghun Khan, Shadrak Meduson, Branne Nev, Alvarex Maun
- Traîtres (28) : Lhorke, Skane, Garro, Calas Typhon, Caipha Morarg, Vorx, Hathor Maat, Phosis T'kar, Khalophis, Yeb, Saul Tarvitz (loyaliste tragique), Eidolon, Marius Vairosean, Fabius Bile, Loken (loyaliste), Torgaddon (loyaliste), Iacton Qruze (loyaliste), Ezekyle Abaddon, Horus Aximand, Argel Tal, Kor Phaeron, Forrix, Kroeger, Ingo Pech, Mathias Herzog, Sheed Ranko, Krieg Acerbus, Variel le Faucheur

**Page /lore/equipment (NOUVEAU)** :
- 4 agents parallèles ont produit 69 pièces : 26 ranged (bolter, plasma, melta, las, flame, volkite, graviton), 16 melee (power, force, chain, eviscerator), 15 armures (Mark IV-X, Cataphractii, Tartaros, Indomitus, Custodes Auramite, Flak, Carapace, Aspect, Mega Armour, XV8 Crisis), 12 reliques (Drach'nyen, Talon of Horus, Worldbreaker, Lash of Slaanesh, Black Staff, Black Sword Sigismund, Mjalnar, Spear of Vulkan, Blade Encarmine, Sword of Secrets, Emperor's Sword, Spear of Telesto, Chaos Power Armour, Armour of the Chosen).
- Backend : Equipment interface ajoutée à `lore-feed.model.ts`, endpoints `/api/lore/equipment[/:id]`.
- Frontend : `LoreEquipmentComponent` avec hero + filtres (type + faction + recherche) + grid de cards image-first cliquables avec expansion inline (specs, notable, citation).
- Card "Armement & Reliques" ajoutée au hub `/lore` (7 cards désormais).

**14 datasheets unités manquantes pourvues** :
- 12 via wiki direct (Sanguinius, Leman Russ Primarque, Hellbrute, Horus Lupercal, Fulgrim, Yarrick, Macharius, Magos Biologis, Ravenor, Valeria, Henchmen, Primaris Intercessor)
- 2 via Lexicanum (Makari Lucky Grot, Colonel Colm Corbec) — pages dédiées que Fandom EN n'a pas
- **133/133 unités** ont désormais un visuel local bundlé.

**Lightbox plein écran (FigureLightboxComponent shared)** :
- Click sur figure-card → modal full-screen avec image + mini-galerie de thumbs + lien `/gallery?q=` filtré
- Appliqué sur `/lore/civilians`, `/lore/primarchs`, `/lore/chaos-gods`
- Variantes wiki dérivées fetched async pour enrichir la mini-galerie
- ESC + clic-out + bouton ✕ pour fermer

**Wiki queries ciblées 40K-spécifiques** :
- chaos-gods : "Khorne Chaos God" → "Bloodthirster", "Tzeentch Chaos God" → "Lord of Change", etc. (les images génériques pan-Warhammer remplacées par les Greater Daemons 40K canoniques)
- primarchs : tous les `<name> primarch` simplifiés en `<name>` (les pages directes du wiki sont mieux trouvées sans le suffixe). Magnus le Rouge → "Magnus the Red".

**Page À propos enrichie** : ajout de Lexicanum + Omnis Bibliotheca dans la section "Inspirations & sources" (8 cards).

**Fix infra critique** : nginx décodait `%2F` en `/` avant proxy → 404 sur les images importées (URL/Reddit).
- Solution : endpoint dédié `GET /api/images/imported/:filename` (pas de slash dans le param).
- Frontend `imageUrl()` route selon le préfixe.
- Mémoire `nginx_proxy_slash_decode.md` créée pour l'écosystème.

**Recherche `/gallery` filtre dynamiquement les cards de catégorie** :
- Computed `searchedArtworks` (tous filtres SAUF catégorie) ; `availableCategories` et `categoryCount` se basent dessus.
- Test "Khorne" : 11 cards → 1 card "Chaos · 1 œuvre".

**Bonus card "Voir toutes les unités"** sur faction-detail révèle réellement les unités masquées (signal `showAllUnits()` au lieu de juste reset des filtres).

**Commits GitHub V2** :
- `354204f Audit V2 + datasheet locale prioritaire + enrichissement seeds`
- `9706704 14 datasheets locales manquantes`
- `b569114 ork-makari + am-corbec via Lexicanum`
- `7d112da F3 résiduelle (+70 notableUnits xenos + 5 séries BL xenos)`
- `c3a2c32 imperial-orgs +3 (Imperial Navy, Collegia Titanica, Conseil du Sigillite)`
- `20f3a74 +52 personnages Hérésie d'Horus`
- `2c385e0 codex de l'arsenal — page /lore/equipment + fix images Civils`
- `0a9b912 lightbox plein écran sur figures notables`
- `1f68936 lightbox extrait en shared component + appliqué à 3 surfaces lore`
- `1b673e5 chaos-gods images 40K-spécifiques`
- `c1c2a6f primarch wikiQuery simplifiés`
- `e34e428 imports URL — endpoint dédié /images/imported/:filename`
- `bca4c55 gallery — recherche filtre cards de catégorie`
