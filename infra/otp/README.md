# OpenTripPlanner — infra/otp

Moteur de calcul d'itinéraire multimodal. Voir `markdown/PROGRAMME_PRODUCTION.md` (Phase 3) pour
le contexte complet.

## Prérequis

- Java 25 LTS (`java -version`). OTP 2 ne démarre pas sur une version antérieure.

## Récupération des données

Aucune donnée (`*.osm.pbf`, `*.zip`, `*.jar`, `graph.obj`) n'est commitée — voir `.gitignore`.
Le script `scripts/fetch-data.sh` est la seule source de vérité pour les récupérer :

```bash
infra/otp/scripts/fetch-data.sh
```

Il télécharge dans `infra/otp/` :

| Fichier | Source | Contenu |
|---|---|---|
| `toulouse.osm.pbf` | [Geofabrik — Midi-Pyrénées](https://download.geofabrik.de/europe/france/midi-pyrenees.html) | Voirie, pistes cyclables (pas d'extrait au niveau département, on prend la région) |
| `tisseo-gtfs.zip` | [Portail open data Toulouse Métropole](https://data.toulouse-metropole.fr/explore/dataset/tisseo-gtfs/) | Horaires théoriques du réseau Tisséo |
| `otp-shaded.jar` | [Maven Central](https://repo1.maven.org/maven2/org/opentripplanner/otp-shaded/) | Distribution autonome d'OpenTripPlanner |

> Le lien GTFS encode un hash de contenu côté Toulouse Métropole : s'il répond 404, reprends
> l'URL à jour depuis la page du dataset (bouton téléchargement du fichier `Tisseo_GTFS.zip`).
