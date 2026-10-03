#!/usr/bin/env bash
# L51 — valide dans un vrai nginx (Docker) ce que frontend/nginx.conf répond
# pour les fichiers du build Angular, en-têtes de cache compris :
#   1. `nginx -t` dans l'image de base du Dockerfile frontend ;
#   2. index.html (/, /index.html, repli des routes) : `no-cache`, et un 304
#      possible (ETag, Last-Modified) ;
#   3. fichier à empreinte (main-, polyfills-, chunk-, styles-, media/) : cache
#      d'un an immutable ; script, feuille de style, police, image ou JSON
#      absent : 404 `no-store`, jamais le repli HTML ;
#   4. chaque fichier du build : copié de public/ (favicon, carte, Nouveautés,
#      plan) = `no-cache` ; produit par le build = empreinte dans le nom, sinon
#      échec (il serait gardé un an sous un nom qui ne change pas) ;
#   5. /api/ : relayé tel quel, aucun Cache-Control ajouté, même pour un chemin
#      qui finit par .jpg ou .js ;
#   6. la politique de sécurité de contenu reste sur chaque réponse (un
#      `add_header` dans un `location` annule ceux du bloc `server`).
#
# Prérequis : `cd frontend && npm run build` (le script sert
# frontend/dist/frontend/browser tel quel, monté comme le Dockerfile le copie).
# Le backend n'existe pas ici : il est simulé par un second nginx nommé
# `warhammer-backend` (port 3001), sans quoi nginx refuse de charger la conf
# (« host not found in upstream »). Tout est supprimé à la fin.
# Sur Big-Blue : DOCKER_API_VERSION=1.44 scripts/test-nginx-cache.sh
# NGINX_CONF=<fichier> rejoue les mêmes cas sur une autre conf (l'ancienne,
# pour voir le test échouer).
set -euo pipefail

cd "$(dirname "$0")/.."
DIST="$PWD/frontend/dist/frontend/browser"
PUBLIC="$PWD/frontend/public"
CONF="${NGINX_CONF:-$PWD/frontend/nginx.conf}"
[ -f "$DIST/index.html" ] ||
  { echo "test-nginx-cache: $DIST/index.html absent — lancer « cd frontend && npm run build »" >&2; exit 2; }
[ -f "$CONF" ] || { echo "test-nginx-cache: $CONF absent" >&2; exit 2; }

# la même image de base que le dernier étage du Dockerfile frontend
IMAGE="$(awk '$1 == "FROM" && $2 ~ /^nginx/ { print $2 }' frontend/Dockerfile | tail -n 1)"
[ -n "$IMAGE" ] || { echo "test-nginx-cache: image nginx introuvable dans frontend/Dockerfile" >&2; exit 2; }

NET="wh-nginx-cache-$$"
FRONT="wh-nginx-cache-front-$$"
BACK="warhammer-backend"
CURL="wh-nginx-cache-curl-$$"
TMP="$(mktemp -d)"

cleanup() {
  docker rm -f "$FRONT" "$BACK-$$" "$CURL" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

# faux backend : répète le chemin reçu (le relais ne doit pas le réécrire) ;
# /api/images/ pose son propre Cache-Control, que le frontal doit laisser passer
cat > "$TMP/backend.conf" <<'EOF'
server {
    listen 3001;
    # text/plain quel que soit le nom demandé : un autre type vu à travers le
    # frontal viendrait donc du frontal
    types { }
    default_type text/plain;
    location /api/images/ {
        add_header Cache-Control "public, max-age=86400";
        return 200 "stub $request_uri\n";
    }
    location / {
        return 200 "stub $request_uri\n";
    }
}
EOF

docker network create "$NET" >/dev/null
docker run -d --name "$BACK-$$" --network "$NET" --network-alias "$BACK" -p 127.0.0.1::3001 \
  -v "$TMP/backend.conf:/etc/nginx/conf.d/default.conf:ro" "$IMAGE" >/dev/null
docker run --rm --network "$NET" \
  -v "$CONF:/etc/nginx/conf.d/default.conf:ro" "$IMAGE" nginx -t
docker run -d --name "$FRONT" --network "$NET" -p 127.0.0.1::80 \
  -v "$CONF:/etc/nginx/conf.d/default.conf:ro" \
  -v "$DIST:/usr/share/nginx/html:ro" "$IMAGE" >/dev/null
docker run -d --name "$CURL" --network "$NET" --entrypoint sleep curlimages/curl:latest 600 >/dev/null
ready=0
for _ in $(seq 1 40); do
  if docker exec "$CURL" curl -s -o /dev/null "http://$FRONT/" &&
     docker exec "$CURL" curl -s -o /dev/null "http://$BACK:3001/"; then ready=1; break; fi
  sleep 0.25
done
[ "$ready" = 1 ] || { echo "test-nginx-cache: les nginx de test ne répondent pas" >&2; docker logs "$FRONT" >&2 || true; exit 2; }

# probe <chemin> [options curl…] → STATUS, CTYPE, CC, CSP, ETAG, LASTMOD (« - » si
# absent ; un en-tête répété serait joint par « + », donc visible et refusé)
probe() {
  local path="$1"; shift
  local raw
  raw="$(docker exec "$CURL" curl -sI "$@" "http://$FRONT$path" | tr -d '\r')"
  header() {
    printf '%s\n' "$raw" | awk -v name="$1" '
      BEGIN { FS = ": " }
      tolower($1) == name { v = (v == "" ? "" : v " + ") substr($0, length($1) + 3) }
      END { print (v == "" ? "-" : v) }'
  }
  STATUS="$(printf '%s\n' "$raw" | awk 'NR == 1 { print $2 }')"
  CTYPE="$(header content-type)"
  CC="$(header cache-control)"
  CSP="$(header content-security-policy)"
  ETAG="$(header etag)"
  LASTMOD="$(header last-modified)"
}

fail=0
QUIET=0
# la politique de sécurité de contenu attendue sur chaque réponse : celle de /
probe /
CSP_REF="$CSP"
case "$CSP_REF" in
  -|*' + '*) echo "FAIL / sans Content-Security-Policy unique (reçu : $CSP_REF)"; fail=1 ;;
esac

printf '%-4s | %-3s | %-24s | %-36s | %s\n' '' 'st.' 'Content-Type' 'Cache-Control' 'requête'
# expect <libellé> <chemin> <statut> <type attendu (préfixe, « - » = absent, « * » = libre)> <Cache-Control exact> [options curl…]
# QUIET=1 : n'affiche que les échecs (boucles sur tous les fichiers du build)
expect() {
  local label="$1" path="$2" status="$3" ctype="$4" cc="$5"; shift 5
  probe "$path" "$@"
  local verdict=OK
  [ "$STATUS" = "$status" ] || verdict=FAIL
  [ "$CC" = "$cc" ] || verdict=FAIL
  [ "$CSP" = "$CSP_REF" ] || verdict=FAIL
  case "$ctype" in
    '*') ;;
    *) case "$CTYPE" in "$ctype"*) ;; *) verdict=FAIL ;; esac ;;
  esac
  if [ "$verdict" = FAIL ] || [ "$QUIET" = 0 ]; then
    printf '%-4s | %-3s | %-24s | %-36s | %s\n' "$verdict" "$STATUS" "$CTYPE" "$CC" "$label"
  fi
  if [ "$verdict" = FAIL ]; then
    echo "       attendu : $status | $ctype | $cc"
    [ "$CSP" = "$CSP_REF" ] || echo "       Content-Security-Policy différente de celle de / (reçu : $CSP)"
    fail=1
  fi
}

IMMUTABLE='public, max-age=31536000, immutable'

# 1. le document, sous toutes ses formes (routes réelles de app.routes.ts)
expect '/'                                  /                        200 text/html no-cache
expect '/index.html'                        /index.html              200 text/html no-cache
expect '/factions (repli)'                  /factions                200 text/html no-cache
expect '/lore/primarchs/horus (repli)'      /lore/primarchs/horus    200 text/html no-cache
expect '/units/intercessors (repli)'        /units/intercessors      200 text/html no-cache
expect '/route/inconnue (repli)'            /route/inconnue          200 text/html no-cache
# un point dans le dernier segment ne suffit pas à faire un fichier : seules les
# extensions listées dans nginx.conf répondent 404
expect '/units/mk.iv (repli)'               /units/mk.iv             200 text/html no-cache

# 2. le 304 reste possible, et porte le même Cache-Control
probe /
etag="$ETAG" lastmod="$LASTMOD"
if [ "$etag" = - ] || [ "$lastmod" = - ]; then
  echo "FAIL / sans ETag ($etag) ou sans Last-Modified ($lastmod) : aucun 304 possible"
  fail=1
else
  expect '/ + If-None-Match'                /                        304 - no-cache -H "If-None-Match: $etag"
  expect '/ + If-Modified-Since'            /                        304 - no-cache -H "If-Modified-Since: $lastmod"
  expect '/factions + If-None-Match'        /factions                304 - no-cache -H "If-None-Match: $etag"
fi

# 3. fichiers à empreinte : cache long ; un fichier absent = 404, pas le repli
first() { (cd "$DIST" && find . -type f -name "$1" | sed 's|^\./||' | sort | head -n 1); }
js="$(first 'main-*.js')"
chunk="$(first 'chunk-*.js')"
css="$(first 'styles-*.css')"
media="$(first '*.png' | grep '^media/' || true)"
[ -n "$js" ] && [ -n "$chunk" ] && [ -n "$css" ] ||
  { echo "FAIL build sans main-*.js, chunk-*.js ou styles-*.css"; fail=1; }
expect "/$js"                               "/$js"                   200 application/javascript "$IMMUTABLE"
expect "/$chunk"                            "/$chunk"                200 application/javascript "$IMMUTABLE"
expect "/$css"                              "/$css"                  200 text/css "$IMMUTABLE"
[ -z "$media" ] ||
  expect "/$media"                          "/$media"                200 image/png "$IMMUTABLE"
probe "/$js"
expect "/$js + If-None-Match"               "/$js"                   304 - "$IMMUTABLE" -H "If-None-Match: $ETAG"
expect '/chunk-00000000.js (absent)'        /chunk-00000000.js       404 text/html no-store
expect '/main-00000000.js (absent)'         /main-00000000.js        404 text/html no-store
expect '/styles-00000000.css (absent)'      /styles-00000000.css     404 text/html no-store
expect '/absent.js'                         /absent.js               404 text/html no-store
expect '/ABSENT.JS'                         /ABSENT.JS               404 text/html no-store
expect '/absent.png'                        /absent.png              404 text/html no-store
expect '/media/absent-00000000.woff2'       /media/absent-00000000.woff2 404 text/html no-store
expect '/assets/absent.svg'                 /assets/absent.svg       404 text/html no-store
expect '/nouveautes-data/absent.json'       /nouveautes-data/absent.json 404 text/html no-store
expect '/nouveautes-data/captures/absent.png' /nouveautes-data/captures/absent.png 404 text/html no-store
expect '/lore/primarchs/absent.js'          /lore/primarchs/absent.js 404 text/html no-store
expect '/absent.js?v=1 (paramètre)'         '/absent.js?v=1'         404 text/html no-store

# 4. chaque fichier du build. Copié de public/ : son nom ne change pas d'une
# livraison à l'autre → no-cache. Produit par le build : le cache d'un an n'est
# sûr que si son nom porte l'empreinte d'Angular (-XXXXXXXX avant l'extension,
# à la racine ou dans media/) — le motif même de nginx.conf.
HASHED='^(media/)?[^/]+-[A-Z0-9]{8}\.[a-z0-9]+$'
copied=0 hashed=0
QUIET=1
while IFS= read -r f; do
  [ "$f" = index.html ] && continue
  if [ -f "$PUBLIC/$f" ]; then
    if printf '%s\n' "$f" | grep -Eq "$HASHED"; then
      echo "FAIL $f : copié de public/ mais son nom a la forme d'une empreinte, il serait servi immutable"
      fail=1
    fi
    expect "/$f"                            "/$f"                    200 '*' no-cache
    copied=$((copied + 1))
  else
    if ! printf '%s\n' "$f" | grep -Eq "$HASHED"; then
      echo "FAIL $f : produit par le build sans empreinte dans son nom"
      fail=1
    fi
    expect "/$f"                            "/$f"                    200 '*' "$IMMUTABLE"
    hashed=$((hashed + 1))
  fi
done < <(cd "$DIST" && find . -type f | sed 's|^\./||' | sort)
QUIET=0
echo "     | $copied fichiers copiés de public/ contrôlés (no-cache), $hashed fichiers à empreinte (immutable)"
[ "$copied" -gt 0 ] && [ "$hashed" -gt 0 ] || { echo "FAIL une des deux familles est vide"; fail=1; }
expect '/favicon.svg'                       /favicon.svg             200 image/svg+xml no-cache
expect '/galaxy-map.jpg'                    /galaxy-map.jpg          200 image/jpeg no-cache
expect '/plan-data/plan.json'               /plan-data/plan.json     200 application/json no-cache
expect '/nouveautes-data/nouveautes.json'   /nouveautes-data/nouveautes.json 200 application/json no-cache
probe /favicon.svg
expect '/favicon.svg + If-None-Match'       /favicon.svg             304 - no-cache -H "If-None-Match: $ETAG"

# 5. l'API est relayée telle quelle : aucun Cache-Control ajouté, celui du
# backend passe inchangé, et une extension de fichier n'y change rien
expect '/api/health (relais)'               /api/health              200 text/plain -
expect '/api/wiki-image?q=Kharn.png (relais)' '/api/wiki-image?q=Kharn.png' 200 text/plain -
expect '/api/absent.js (relais)'            /api/absent.js           200 text/plain -
expect '/api/images/file/x.jpg (relais)'    /api/images/file/x.jpg   200 text/plain 'public, max-age=86400'
expect '/api/images/datasheets/x (relais)'  /api/images/datasheets/x 200 text/plain 'public, max-age=86400'
for path in '/api/wiki-image?q=Kharn.png' /api/images/file/x.jpg /api/chunk-00000000.js; do
  body="$(docker exec "$CURL" curl -s "http://$FRONT$path")"
  if [ "$body" = "stub $path" ]; then
    echo "OK   | le backend reçoit $path"
  else
    echo "FAIL | le backend ne reçoit pas $path (réponse : $body)"
    fail=1
  fi
done

if [ "$fail" = 0 ]; then echo "test-nginx-cache: tout est conforme"; else echo "test-nginx-cache: ÉCHEC"; fi
exit "$fail"
