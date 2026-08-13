#!/usr/bin/env bash
# Build-and-deploy warhammer40k sans persister les sources sur le NAS.
# Pipeline : tar context (WSL) → ssh nas → docker build → image taggée → compose up.
#
# Usage : ./scripts/build-deploy.sh [backend|frontend|all]
set -euo pipefail

# Surcharger via env si besoin ; le port SSH vient de ~/.ssh/config (Host nas).
NAS_USER="${NAS_USER:-admin}"
NAS_HOST="${NAS_HOST:-nas}"
COMPOSE_PATH=/volume2/docker/developpeur/warhammer40k/docker-compose.yml
TAG=$(date +%Y%m%d-%H%M%S)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}"

build_one() {
  local service="$1"          # warhammer-backend | warhammer-frontend
  local ctx="$2"              # backend | frontend
  local img="warhammer40k-${ctx}"

  echo "▶ Build ${img}:${TAG} from ${ctx}/ (context streamé)"
  tar --exclude-from="${ROOT}/${ctx}/.dockerignore" -C "${ROOT}/${ctx}" -czf - . \
    | ssh "${NAS_USER}@${NAS_HOST}" \
        "docker build -t ${img}:${TAG} -t ${img}:latest -"
  echo "✓ ${img}:${TAG} pushed to NAS daemon"
}

case "${TARGET}" in
  backend)
    build_one warhammer-backend backend
    ssh "${NAS_USER}@${NAS_HOST}" \
      "docker compose -f ${COMPOSE_PATH} up -d --no-deps --force-recreate warhammer-backend"
    ;;
  frontend)
    build_one warhammer-frontend frontend
    ssh "${NAS_USER}@${NAS_HOST}" \
      "docker compose -f ${COMPOSE_PATH} up -d --no-deps --force-recreate warhammer-frontend"
    ;;
  all|*)
    build_one warhammer-backend backend
    build_one warhammer-frontend frontend
    ssh "${NAS_USER}@${NAS_HOST}" \
      "docker compose -f ${COMPOSE_PATH} up -d --force-recreate"
    ;;
esac

echo "✅ Deploy ${TARGET} done (tag ${TAG})"
