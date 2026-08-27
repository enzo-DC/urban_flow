#!/usr/bin/env bash
# Sauvegarde quotidienne de la base — a planifier via cron sur le VPS, ex. :
#   0 3 * * * /opt/urban_flow/infra/scripts/backup-db.sh >> /var/log/urbanflow-backup.log 2>&1
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
RETENTION_JOURS="${RETENTION_JOURS:-14}"

if [ -f "$REPO_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_DIR/.env"
  set +a
fi

HORODATAGE="$(date +%Y%m%d-%H%M%S)"
FICHIER="$BACKUP_DIR/urbanflow-$HORODATAGE.sql.gz"

mkdir -p "$BACKUP_DIR"

cd "$REPO_DIR/infra"
# --clean --if-exists : le dump commence par supprimer chaque objet avant de
# le recreer, pour rester restaurable directement sur une base qui a deja
# le schema en place (le cas normal en reprise apres incident) — sans ca,
# psql echoue en cascade sur des "already exists"/"duplicate key", verifie
# en conditions reelles avant d'ajouter ces options.
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump --clean --if-exists -U "${POSTGRES_USER:-urbanflow}" "${POSTGRES_DB:-urbanflow}" \
  | gzip > "$FICHIER"

echo "Sauvegarde ecrite : $FICHIER ($(du -h "$FICHIER" | cut -f1))"

# Rotation : ne garde que les RETENTION_JOURS derniers jours de sauvegardes.
find "$BACKUP_DIR" -name 'urbanflow-*.sql.gz' -mtime "+$RETENTION_JOURS" -delete
