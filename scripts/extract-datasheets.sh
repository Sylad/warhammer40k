#!/bin/bash
# Pipeline: télécharge les PDFs faction, extrait les pages-artwork de chaque unité
# et les sauvegarde dans backend/public/datasheets/{unit-id}.jpg

POPPLER="/c/Users/Sylvain Ladoire/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin"
PDF_DIR="/c/Temp/wh40k-pdfs"
OUT_DIR="/c/Developpeur/warhammer40k/backend/public/datasheets"
CACHE_DIR="/c/Temp/wh40k-page-cache"

mkdir -p "$PDF_DIR" "$OUT_DIR" "$CACHE_DIR"

# ── Téléchargement PDF ──────────────────────────────────────────────────────
download_pdf() {
  local name="$1" url="$2"
  local dest="$PDF_DIR/$name.pdf"
  if [ -f "$dest" ]; then
    echo "  [skip] $name.pdf"
  else
    echo "  [dl]   $name.pdf ..."
    curl -sL --retry 3 -o "$dest" "$url"
    echo "         → $(du -sh "$dest" | cut -f1)"
  fi
}

# ── Cache: extrait les 1ères lignes de toutes les pages d'un PDF ─────────────
# Crée $CACHE_DIR/{pdf_basename}.txt  avec lignes: "PAGE|FIRST_LINE"
build_page_cache() {
  local pdf="$1"
  local base
  base=$(basename "$pdf" .pdf)
  local cache_file="$CACHE_DIR/$base.txt"
  if [ -f "$cache_file" ]; then
    echo "  [cache] $base.txt déjà construit"
    return
  fi
  echo "  [scan]  $base.pdf ..."
  local pages
  pages=$("$POPPLER/pdfinfo.exe" "$pdf" 2>/dev/null | grep "^Pages:" | awk '{print $2}')
  > "$cache_file"
  for p in $(seq 1 "$pages"); do
    local first
    first=$("$POPPLER/pdftotext.exe" -f "$p" -l "$p" "$pdf" - 2>/dev/null | grep -m1 ".")
    printf '%s|%s\n' "$p" "$first" >> "$cache_file"
  done
  echo "         → $pages pages indexées"
}

# ── Trouver la page d'une unité dans le cache ────────────────────────────────
find_unit_page() {
  local pdf="$1" search="$2"
  local base
  base=$(basename "$pdf" .pdf)
  local cache_file="$CACHE_DIR/$base.txt"
  grep -m1 "|${search}$" "$cache_file" | cut -d'|' -f1
}

# ── Rendu d'une page en JPEG ─────────────────────────────────────────────────
render_page() {
  local pdf="$1" page="$2" unit_id="$3"
  local prefix="$OUT_DIR/.tmp_${unit_id}"
  "$POPPLER/pdftoppm.exe" -jpeg -r 120 -f "$page" -l "$page" "$pdf" "$prefix" 2>/dev/null
  local tmp
  tmp=$(ls "${prefix}"-*.jpg 2>/dev/null | head -1)
  if [ -n "$tmp" ]; then
    mv "$tmp" "$OUT_DIR/$unit_id.jpg"
    echo "  [img]  $unit_id.jpg (page $page)"
  else
    echo "  [ERR]  rendu échoué pour $unit_id (page $page)"
  fi
}

# ── Extraction d'une unité ───────────────────────────────────────────────────
extract_unit() {
  local unit_id="$1" pdf_file="$2" pdf_name="$3"
  local out_file="$OUT_DIR/$unit_id.jpg"
  if [ -f "$out_file" ]; then
    echo "  [skip] $unit_id.jpg"
    return
  fi
  local page
  page=$(find_unit_page "$pdf_file" "$pdf_name")
  if [ -n "$page" ]; then
    render_page "$pdf_file" "$page" "$unit_id"
  else
    echo "  [miss] '$pdf_name' introuvable dans $(basename "$pdf_file")"
  fi
}

# ════════════════════════════════════════════════════════════════════════════
# TÉLÉCHARGEMENTS
# ════════════════════════════════════════════════════════════════════════════
echo "=== Téléchargement des PDFs ==="

if [ -f "/c/Temp/sm-rules.pdf" ] && [ ! -f "$PDF_DIR/space-marines.pdf" ]; then
  cp /c/Temp/sm-rules.pdf "$PDF_DIR/space-marines.pdf"
  echo "  [ok]   space-marines.pdf (copié)"
fi

download_pdf "chaos-space-marines"  "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-chaos-space-marines_compressed.pdf"
download_pdf "world-eaters"         "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-world-eaters_compressed.pdf"
download_pdf "death-guard"          "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-death-guard_compressed.pdf"
download_pdf "thousand-sons"        "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-thousand-sons_compressed.pdf"
download_pdf "blood-angels"         "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-blood-angels_compressed.pdf"
download_pdf "dark-angels"          "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-dark-angels_compressed.pdf"
download_pdf "space-wolves"         "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-space-wolves_compressed.pdf"
download_pdf "aeldari"              "https://thimi-games.com/wp-content/uploads/2023/07/index-aeldari-fr.pdf"
download_pdf "orks"                 "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-orks_compressed.pdf"
download_pdf "tyranides"            "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-tyranides_compressed.pdf"
download_pdf "necrons"              "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-necrons_compressed.pdf"
download_pdf "tau"                  "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-empire-tau_compressed.pdf"
download_pdf "astra-militarum"      "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-astra-militarum_compressed.pdf"
download_pdf "adeptus-mechanicus"   "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-adeptus-mechanicus_compressed.pdf"
download_pdf "adepta-sororitas"     "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-adepta-sororitas_compressed.pdf"
download_pdf "agents-imperium"      "https://thimi-games.com/wp-content/uploads/2023/06/regle-armee-agents-de-limperium_compressed.pdf"

# ════════════════════════════════════════════════════════════════════════════
# CONSTRUCTION DES CACHES (scan des premières lignes de chaque page)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "=== Scan des PDFs (premières lignes) ==="
for pdf_file in "$PDF_DIR"/*.pdf; do
  build_page_cache "$pdf_file"
done

# ════════════════════════════════════════════════════════════════════════════
# EXTRACTION DES IMAGES
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Space Marines ==="
SM="$PDF_DIR/space-marines.pdf"
extract_unit "sm-captain"     "$SM" "CAPITAINE PRIMARIS"
extract_unit "sm-chaplain"    "$SM" "CHAPELAIN PRIMARIS"
extract_unit "sm-librarian"   "$SM" "ARCHIVISTE PRIMARIS"
extract_unit "sm-tactique"    "$SM" "ESCOUADE TACTIQUE"
extract_unit "sm-assault"     "$SM" "ESCOUADE D'ASSAUT"
extract_unit "sm-devastator"  "$SM" "ESCOUADE DEVASTATOR"
extract_unit "sm-scouts"      "$SM" "ESCOUADE DE SCOUTS"
extract_unit "sm-terminators" "$SM" "ESCOUADE TERMINATOR"
extract_unit "sm-dreadnought" "$SM" "DREADNOUGHT"
extract_unit "sm-land-raider" "$SM" "LAND RAIDER"
extract_unit "sm-guilliman"   "$SM" "ROBOUTE GUILLIMAN"
extract_unit "sm-calgar"      "$SM" "MARNEUS CALGAR"

echo ""
echo "=== Chaos Space Marines ==="
CSM="$PDF_DIR/chaos-space-marines.pdf"
extract_unit "csm-marines"       "$CSM" "LÉGIONNAIRES DU CHAOS"
extract_unit "csm-cultistes"     "$CSM" "CULTISTES DU CHAOS"
extract_unit "csm-obliterators"  "$CSM" "OBLITÉRATEURS"
extract_unit "csm-hellbrute"     "$CSM" "HELLBRUTE"
extract_unit "csm-daemon-prince" "$CSM" "PRINCE DÉMON"
extract_unit "csm-sorceleur"     "$CSM" "SORCIER DU CHAOS"
extract_unit "csm-abaddon"       "$CSM" "ABADDON LE DESTRUCTEUR"

echo ""
echo "=== World Eaters ==="
WE="$PDF_DIR/world-eaters.pdf"
extract_unit "csm-angron" "$WE" "ANGRON"
extract_unit "csm-kharn"  "$WE" "KHÂRN LE TRAÎTRE"

echo ""
echo "=== Death Guard ==="
DG="$PDF_DIR/death-guard.pdf"
extract_unit "csm-mortarion" "$DG" "MORTARION"
extract_unit "csm-typhus"    "$DG" "TYPHUS"

echo ""
echo "=== Thousand Sons ==="
TS="$PDF_DIR/thousand-sons.pdf"
extract_unit "csm-magnus"  "$TS" "MAGNUS LE ROUGE"
extract_unit "csm-ahriman" "$TS" "AHRIMAN"

echo ""
echo "=== Blood Angels ==="
BA="$PDF_DIR/blood-angels.pdf"
extract_unit "sm-mephiston" "$BA" "MEPHISTON"
extract_unit "sm-dante"     "$BA" "DANTE"
extract_unit "sm-lemartes"  "$BA" "LEMARTES"

echo ""
echo "=== Dark Angels ==="
DA="$PDF_DIR/dark-angels.pdf"
extract_unit "sm-lion" "$DA" "LION EL'JONSON"

echo ""
echo "=== Space Wolves ==="
SW="$PDF_DIR/space-wolves.pdf"
extract_unit "sm-leman-russ-prim" "$SW" "LEMAN RUSS"

echo ""
echo "=== Aeldari ==="
ELD="$PDF_DIR/aeldari.pdf"
extract_unit "eld-guardians"     "$ELD" "GARDIENS"
extract_unit "eld-dire-avengers" "$ELD" "IMPLACABLES"
extract_unit "eld-banshees"      "$ELD" "BANSHEES HURLANTES"
extract_unit "eld-scorpions"     "$ELD" "SCORPIONS FRAPPANTS"
extract_unit "eld-farseer"       "$ELD" "ARCHIVISTE"
extract_unit "eld-warlock"       "$ELD" "SORCIER DE GUERRE"
extract_unit "eld-wraithknight"  "$ELD" "WRAITHKNIGHT"
extract_unit "eld-avatar"        "$ELD" "AVATAR DE KHAINE"
extract_unit "eld-eldrad"        "$ELD" "ELDRAD ULTHRAN"
extract_unit "eld-jain-zar"      "$ELD" "JAIN ZAR"
extract_unit "eld-asurmen"       "$ELD" "ASURMEN"
extract_unit "eld-yriel"         "$ELD" "PRINCE YRIEL"

echo ""
echo "=== Orks ==="
ORK="$PDF_DIR/orks.pdf"
extract_unit "ork-boyz"       "$ORK" "ORK BOYZ"
extract_unit "ork-nobz"       "$ORK" "NOBZ"
extract_unit "ork-gretchin"   "$ORK" "GRETCHIN"
extract_unit "ork-lootas"     "$ORK" "LOOTAS"
extract_unit "ork-warboss"    "$ORK" "WARBOSS"
extract_unit "ork-mek"        "$ORK" "BIG MEK"
extract_unit "ork-gorkanaut"  "$ORK" "GORKANAUT"
extract_unit "ork-deff-dread" "$ORK" "DEFF DREAD"
extract_unit "ork-weirdboy"   "$ORK" "WEIRDBOY"
extract_unit "ork-ghazghkull" "$ORK" "GHAZGHKULL MAG URUK THRAKA"
extract_unit "ork-makari"     "$ORK" "MAKARI"

echo ""
echo "=== Tyranides ==="
TYR="$PDF_DIR/tyranides.pdf"
extract_unit "tyr-gaunts"       "$TYR" "TERMAGANTS"
extract_unit "tyr-hormagaunts"  "$TYR" "HORMAGUANTS"
extract_unit "tyr-genestealers" "$TYR" "GENESTEALERS"
extract_unit "tyr-warriors"     "$TYR" "GUERRIERS TYRANIDES"
extract_unit "tyr-hive-tyrant"  "$TYR" "TYRAN DE RUCHE"
extract_unit "tyr-carnifex"     "$TYR" "CARNIFEX"
extract_unit "tyr-lictor"       "$TYR" "LICTOR"
extract_unit "tyr-trygon"       "$TYR" "TRYGON"
extract_unit "tyr-zoanthrope"   "$TYR" "ZOANTHROPES"
extract_unit "tyr-broodlord"    "$TYR" "BROODLORD"
extract_unit "tyr-swarmlord"    "$TYR" "LE SEIGNEUR-ESSAIM"

echo ""
echo "=== Nécrons ==="
NEC="$PDF_DIR/necrons.pdf"
extract_unit "nec-warriors"     "$NEC" "GUERRIERS NÉCRONS"
extract_unit "nec-immortals"    "$NEC" "IMMORTELS"
extract_unit "nec-lychguard"    "$NEC" "LYCHGUARDS"
extract_unit "nec-deathmarks"   "$NEC" "MARQUES DE MORT"
extract_unit "nec-overlord"     "$NEC" "SEIGNEUR SUPRÊME"
extract_unit "nec-cryptek"      "$NEC" "CRYPTEK"
extract_unit "nec-monolith"     "$NEC" "MONOLITHE"
extract_unit "nec-nightbringer" "$NEC" "C'TAN FRAGMENT DU BRISEUR DE NUIT"
extract_unit "nec-szarekh"      "$NEC" "LE ROI SILENCIEUX"
extract_unit "nec-imotekh"      "$NEC" "IMOTEKH LE SEIGNEUR DES TEMPÊTES"
extract_unit "nec-trazyn"       "$NEC" "TRAZYN L'INFINI"

echo ""
echo "=== T'au ==="
TAU="$PDF_DIR/tau.pdf"
extract_unit "tau-fire-warriors"  "$TAU" "GUERRIERS DU FEU"
extract_unit "tau-pathfinders"    "$TAU" "PATHFINDERS"
extract_unit "tau-stealth"        "$TAU" "COMBINAISONS FURTIVES XV25"
extract_unit "tau-commander"      "$TAU" "COMMANDANT EN COMBINAISON CRISIS"
extract_unit "tau-ethereal"       "$TAU" "ÉTHÉRÉ"
extract_unit "tau-riptide"        "$TAU" "ARMURE DE BATAILLE RIPTIDE XV104"
extract_unit "tau-broadside"      "$TAU" "ARMURE DE BATAILLE BROADSIDE XV88"
extract_unit "tau-hammerhead"     "$TAU" "CHAR HAMMERHEAD"
extract_unit "tau-shadowsun"      "$TAU" "COMMANDANTE SHADOWSUN"
extract_unit "tau-farsight"       "$TAU" "COMMANDANT FARSIGHT"
extract_unit "tau-aun-va"         "$TAU" "AUN'VA"

echo ""
echo "=== Astra Militarum ==="
AM="$PDF_DIR/astra-militarum.pdf"
extract_unit "am-infantry"        "$AM" "ESCOUADE D'INFANTERIE"
extract_unit "am-veterans"        "$AM" "VÉTÉRANS DE GUERRE"
extract_unit "am-ogryns"          "$AM" "OGRYNS"
extract_unit "am-ratlings"        "$AM" "RATLINGS"
extract_unit "am-commissar"       "$AM" "COMMISSAIRE"
extract_unit "am-primaris-psyker" "$AM" "PSYKER PRIMARIS"
extract_unit "am-leman-russ"      "$AM" "CHAR LEMAN RUSS"
extract_unit "am-sentinel"        "$AM" "SENTINELLE"
extract_unit "am-basilisk"        "$AM" "BASILISK"
extract_unit "am-creed"           "$AM" "LORD-CASTELLAN URSULA CREED"
extract_unit "am-yarrick"         "$AM" "COMMISSAIRE YARRICK"

echo ""
echo "=== Adeptus Mechanicus ==="
ADMECH="$PDF_DIR/adeptus-mechanicus.pdf"
extract_unit "admech-skitarii"    "$ADMECH" "VANGUARDS SKITARII"
extract_unit "admech-rangers"     "$ADMECH" "RANGERS SKITARII"
extract_unit "admech-electro"     "$ADMECH" "ÉLECTRO-PRÊTRES FULGURITES"
extract_unit "admech-dominus"     "$ADMECH" "TECH-PRÊTRE DOMINUS"
extract_unit "admech-magos"       "$ADMECH" "MAGOS BIOLOGIS"
extract_unit "admech-onager"      "$ADMECH" "DUNECRAWLER ONAGER"
extract_unit "admech-kastelan"    "$ADMECH" "ROBOTS KASTELAN"
extract_unit "admech-ironstrider" "$ADMECH" "IRONSTRIDER BALLISTARIUS"
extract_unit "admech-cawl"        "$ADMECH" "ARCHMAGOS DOMINUS BELISARIUS CAWL"

echo ""
echo "=== Sœurs de Bataille ==="
SOB="$PDF_DIR/adepta-sororitas.pdf"
extract_unit "sob-sisters"    "$SOB" "SŒURS DE BATAILLE"
extract_unit "sob-seraphim"   "$SOB" "SÉRAPHINES"
extract_unit "sob-repentia"   "$SOB" "SŒURS REPENTANTES"
extract_unit "sob-canoness"   "$SOB" "CANONESSE"
extract_unit "sob-hospitaler" "$SOB" "HOSPITALIÈRE"
extract_unit "sob-imagifier"  "$SOB" "IMAGIFIER"
extract_unit "sob-penitent"   "$SOB" "MOTEUR PÉNITENT"
extract_unit "sob-exorcist"   "$SOB" "TANK EXORCISTE"
extract_unit "sob-celestine"  "$SOB" "SAINTE CÉLESTINE"
extract_unit "sob-katherine"  "$SOB" "SAINTE KATHERINE"

echo ""
echo "=== Inquisition / Agents ==="
AGT="$PDF_DIR/agents-imperium.pdf"
extract_unit "inq-coteaz"    "$AGT" "INQUISITEUR TORQUEMADA COTEAZ"
extract_unit "inq-karamazov" "$AGT" "FYODOR KARAMAZOV"
extract_unit "inq-vindicare" "$AGT" "ASSASSIN VINDICARE"
extract_unit "inq-eversor"   "$AGT" "ASSASSIN EVERSOR"
extract_unit "inq-callidus"  "$AGT" "ASSASSIN CALLIDUS"
extract_unit "inq-agents"    "$AGT" "ACOLYTES INQUISITORIAUX"

echo ""
echo "════════════════════════════════"
echo "Terminé ! Images dans : $OUT_DIR"
ls "$OUT_DIR"/*.jpg 2>/dev/null | wc -l && echo " images extraites"
