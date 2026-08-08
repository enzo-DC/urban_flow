#!/usr/bin/env bash
# Requete de reference du projet : verifie qu'OTP renvoie un itineraire multimodal coherent
# entre le Capitole et Blagnac. Suppose un serveur OTP deja demarre sur localhost:8080
# (java --load infra/otp, ou le service docker-compose "otp").
set -euo pipefail

OTP_URL="${OTP_URL:-http://localhost:8080}"

QUERY='{"query":"{ plan(from: {lat: 43.6047, lon: 1.4442}, to: {lat: 43.6357, lon: 1.3928}) { itineraries { duration legs { mode from { name } to { name } } } } }"}'

RESPONSE=$(curl -sf -X POST "$OTP_URL/otp/routers/default/index/graphql" \
  -H "Content-Type: application/json" \
  -d "$QUERY")

NB_ITINERAIRES=$(echo "$RESPONSE" | grep -o '"duration"' | wc -l)

if [ "$NB_ITINERAIRES" -lt 1 ]; then
  echo "ECHEC : aucun itineraire renvoye par OTP pour Capitole -> Blagnac."
  echo "$RESPONSE"
  exit 1
fi

echo "OK : $NB_ITINERAIRES itineraire(s) renvoye(s) pour Capitole -> Blagnac."
echo "$RESPONSE"
