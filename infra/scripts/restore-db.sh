#!/usr/bin/env bash
# Restauration a partir d'une sauvegarde produite par backup-db.sh.
# Usage : ./restore-db.sh chemin/vers/urbanflow-XXXXXXXX-XXXXXX.sql.gz
#
# ATTENTION : ecrase le contenu actuel de la base cible. A tester au moins
# une fois avant la mise en prod reelle (voir docs/avancement.md, Phase 12) —
# de preference contre une base de restauration separee, pas la prod.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage : $0 chemin/vers/sauvegarde.sql.gz" >&2
  exit 1
fi

SAUVEGARDE="$1"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -f "$REPO_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_DIR/.env"
  set +a
fi

cd "$REPO_DIR/infra"
gunzip -c "$SAUVEGARDE" | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "${POSTGRES_USER:-urbanflow}" "${POSTGRES_DB:-urbanflow}"

echo "Restauration terminee depuis $SAUVEGARDE"
