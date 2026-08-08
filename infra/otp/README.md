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

## Construction du graphe

```bash
java -Xmx6G -jar infra/otp/otp-shaded.jar --build --save infra/otp
```

OTP découvre automatiquement `toulouse.osm.pbf` et `tisseo-gtfs.zip` dans le dossier passé en
argument — pas besoin de `build-config.json` tant qu'on reste sur les valeurs par défaut.
Le résultat (`graph.obj`, non commité) se recharge ensuite sans reconstruire :

```bash
java -Xmx6G -jar infra/otp/otp-shaded.jar --load infra/otp
```

### Repères observés (extrait Midi-Pyrénées complet, ~344 Mo)

- Durée de build : **~3 min 25 s**.
- Graphe obtenu : 1 392 762 nœuds, 3 406 072 arêtes, 3 903 arrêts, 360 patterns.
- `graph.obj` : **~256 Mo**.
- RAM : `-Xmx6G` a suffi (testé sur une machine avec 16 Go de RAM, ~6 Go libres au moment du
  build). La recommandation initiale du dossier était `-Xmx8G` — si le build échoue sans message
  clair, c'est presque toujours la RAM disponible qui est le facteur limitant, pas la
  configuration.
- Aucune erreur bloquante : uniquement des `DataImportIssueSummary` (îlots de rue isolés,
  limitations de vitesse suspectes, etc.) — normal sur un extrait régional complet et sans
  impact sur le routage transport en commun.

### Piège observé — flux GBFS VélôToulouse

Au démarrage, l'updater GBFS échoue à parser `station_status.json` : une station renvoie un
`last_reported` de `-62135596800` (sentinelle typique d'une date .NET jamais initialisée,
sérialisée en epoch), qui dépasse la capacité d'un `int` côté OTP. C'est une donnée invalide
côté opérateur (Cyclocity/JCDecaux), pas une erreur de configuration — et **le serveur démarre
quand même**, seul l'updater GBFS reste en échec (il retente toutes les 60 s). C'est exactement
la dégradation gracieuse attendue par les règles du projet : une source tierce cassée ne fait pas
tomber le routage transport en commun + marche. À surveiller : si le flux se corrige côté
opérateur, l'updater doit se remettre à jour sans intervention.

## Servir via Docker

```bash
docker compose up -d otp   # depuis infra/
```

Le service (`infra/docker-compose.yml`) charge `infra/otp/graph.obj` au démarrage — reconstruire
le graphe ne se fait jamais depuis le conteneur, seulement via les commandes ci-dessus en local.

## Tester la requête de référence

```bash
pnpm otp:test          # contre localhost:8080, quelle que soit la méthode de démarrage
```

Vérifie qu'un trajet Capitole → Blagnac renvoie au moins un itinéraire multimodal cohérent.

## Reconstruction planifiée

Tisséo republie son GTFS quotidiennement (voir le lien de téléchargement). Le graphe doit donc
être reconstruit périodiquement pour rester à jour — **différé à la Phase 11/12** : il n'y a pas
encore de pipeline CI/CD dans ce projet (Phase 11) ni d'environnement de production (Phase 12)
pour héberger une tâche planifiée. Options à évaluer le moment venu :
- GitHub Actions avec un déclencheur `schedule` (cron) qui relance `fetch-data.sh` + le build et
  publie le nouveau `graph.obj` (ou reconstruit l'image Docker) ;
- une tâche planifiée côté VPS OVHcloud (`cron` + le script existant), une fois la Phase 12 en
  place.

Dans tous les cas, le déclencheur est la publication d'un nouveau GTFS, pas un intervalle fixe.

### Pour aller plus loin (non fait ici, faute de nécessité)

Le dossier recommande de réduire l'extrait OSM à la zone utile (rectangle englobant
l'agglomération) pour accélérer le build. Avec un extrait régional complet et `-Xmx6G` le build
reste sous les 4 minutes, donc pas nécessaire pour l'instant. À reconsidérer si le temps de build
devient gênant (ex. reconstruction fréquente en CI).
