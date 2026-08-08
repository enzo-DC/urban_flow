#!/usr/bin/env bash
# Telecharge les donnees necessaires a OpenTripPlanner dans infra/otp/.
# Aucun de ces fichiers n'est commite (voir .gitignore) : ce script est la seule source
# de verite pour les reobtenir, en local comme dans un build Docker.
set -euo pipefail

OTP_VERSION="2.9.0"

# Extrait OSM Midi-Pyrenees (couvre la Haute-Garonne / Toulouse Metropole).
# Geofabrik ne propose pas d'extrait au niveau departement ; "-latest" redirige
# toujours vers le fichier le plus recent.
OSM_URL="https://download.geofabrik.de/europe/france/midi-pyrenees-latest.osm.pbf"

# GTFS Tisseo (horaires theoriques). Lien direct du fichier publie sur le portail
# open data de Toulouse Metropole (OpenDataSoft). Ce lien encode un hash de contenu
# et peut changer quand Tisseo republie ses donnees : si le telechargement echoue,
# reprends l'URL a jour depuis https://data.toulouse-metropole.fr/explore/dataset/tisseo-gtfs/
GTFS_URL="https://data.toulouse-metropole.fr/explore/dataset/tisseo-gtfs/files/fc1dda89077cf37e4f7521760e0ef4e9/download/"

# Jar autonome d'OpenTripPlanner (build + serveur), depuis Maven Central.
OTP_JAR_URL="https://repo1.maven.org/maven2/org/opentripplanner/otp-shaded/${OTP_VERSION}/otp-shaded-${OTP_VERSION}.jar"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OTP_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Extrait OSM (Midi-Pyrenees) -> toulouse.osm.pbf"
curl -L --fail --progress-bar -o "$OTP_DIR/toulouse.osm.pbf" "$OSM_URL"

echo "==> GTFS Tisseo -> tisseo-gtfs.zip"
curl -L --fail --progress-bar -o "$OTP_DIR/tisseo-gtfs.zip" "$GTFS_URL"

echo "==> otp-shaded-${OTP_VERSION}.jar -> otp-shaded.jar"
curl -L --fail --progress-bar -o "$OTP_DIR/otp-shaded.jar" "$OTP_JAR_URL"

echo "==> Termine :"
ls -lh "$OTP_DIR"/toulouse.osm.pbf "$OTP_DIR"/tisseo-gtfs.zip "$OTP_DIR"/otp-shaded.jar
