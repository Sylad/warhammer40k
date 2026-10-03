#!/bin/sh
# Vérification appelée par `cadence deliver` (L51) : ce que reçoit un visiteur,
# à travers Cloudflare (réessayée par cadence jusqu'au délai).
#   1. le document (/ et une route servie par repli) porte `Cache-Control:
#      no-cache` — sans quoi un navigateur garde l'ancienne appli après une
#      livraison ;
#   2. le script principal que référence le document existe : 200 et du
#      JavaScript — un script absent, ou le repli HTML mis en cache sous son nom
#      pendant une bascule, donne une page blanche avec une livraison verte.
#      Son Cache-Control n'est pas contrôlé ici : le CDN peut le réécrire sur
#      une extension qu'il met en cache (scripts/test-nginx-cache.sh le
#      contrôle à la sortie de nginx) ;
#   3. un script absent répond 404, pas le repli HTML en 200.
# Lecture seule, par curl. WARHAMMER_URL remplace l'adresse
# (scripts/test-nginx-cache.sh s'en sert contre un nginx local).
set -eu

BASE="${WARHAMMER_URL:-https://warhammer.sladoire.dev}"

# en-têtes d'un GET (ce que fait un navigateur), sans le corps ; l'échec de curl
# est rendu tel quel (dans `curl | tr`, sans pipefail, il serait perdu)
headers() {
  raw=$(curl -sS -o /dev/null -D - --max-time 15 "$1") || return 1
  printf '%s\n' "$raw" | tr -d '\r'
}
status() { printf '%s\n' "$1" | awk 'NR == 1 { print $2 }'; }
cache_control() { printf '%s\n' "$1" | awk -F': ' 'tolower($1) == "cache-control" { print $2 }'; }
content_type() { printf '%s\n' "$1" | awk -F': ' 'tolower($1) == "content-type" { print $2 }'; }

for path in / /factions; do
  h=$(headers "$BASE$path") || { echo "verify: $BASE$path injoignable" >&2; exit 1; }
  [ "$(status "$h")" = 200 ] || { echo "verify: $path répond $(status "$h"), attendu 200" >&2; exit 1; }
  case "$(cache_control "$h")" in
    *no-cache*) ;;
    *) echo "verify: $path sans Cache-Control no-cache (reçu : '$(cache_control "$h")')" >&2; exit 1 ;;
  esac
done

# le build Angular écrit <script src="main-XXXXXXXX.js" type="module">, relatif à <base href="/">
body=$(curl -sS --max-time 15 "$BASE/") || { echo "verify: $BASE/ injoignable" >&2; exit 1; }
main=$(printf '%s\n' "$body" | grep -o 'src="/\{0,1\}main-[A-Z0-9]*\.js"' | head -n 1 | sed 's|^src="/\{0,1\}||; s|"$||' || true)
[ -n "$main" ] || { echo "verify: aucun <script src=\"main-*.js\"> dans le document" >&2; exit 1; }
h=$(headers "$BASE/$main") || { echo "verify: $BASE/$main injoignable" >&2; exit 1; }
[ "$(status "$h")" = 200 ] ||
  { echo "verify: le script du document répond $(status "$h"), attendu 200 (/$main)" >&2; exit 1; }
case "$(content_type "$h")" in
  *javascript*) ;;
  *) echo "verify: le script du document n'est pas du JavaScript (reçu : '$(content_type "$h")', /$main)" >&2; exit 1 ;;
esac

# Nom qu'aucun build ne produit (l'empreinte d'Angular n'a ni 0 ni 1), et
# paramètre différent à chaque passage : la sonde ne peut ni lire ni laisser dans
# le cache du CDN une entrée sous un nom que l'appli demanderait.
probe="/chunk-00000000.js?verify=$(date +%s)-$$"
h=$(headers "$BASE$probe") || { echo "verify: $BASE$probe injoignable" >&2; exit 1; }
[ "$(status "$h")" = 404 ] ||
  { echo "verify: un script absent répond $(status "$h"), attendu 404 ($probe)" >&2; exit 1; }
