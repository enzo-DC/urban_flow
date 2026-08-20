# Journal de bord — UrbanFlow Mobility

Suivi de l'avancement par phase (voir `markdown/PROGRAMME_PRODUCTION.md`), avec les points de
friction rencontrés et les ajustements faits par rapport au plan initial.

- [x] Phase 0 — Prérequis
- [x] Phase 1 — Socle monorepo
- [x] Phase 2 — Base de données
- [x] Phase 3 — OpenTripPlanner
- [x] Phase 4 — F1 compte & profil
- [x] Phase 5 — F3 temps réel
- [x] Phase 6 — F2 planificateur
- [ ] Phase 7 — F4 carbone
- [ ] Phase 8 — Gamification
- [ ] Phase 9 — PWA
- [ ] Phase 10 — A11y / sécurité / éco
- [ ] Phase 11 — Tests & CI
- [ ] Phase 12 — Déploiement OVH

---

## Phase 0 — Prérequis

Node 24, pnpm 10, Docker 29, Git présents dès le départ. Java 25 (Azul Zulu, installé via
`winget`) a été différé jusqu'à la Phase 3 — c'est le seul outil réellement nécessaire pour
OpenTripPlanner, pas de raison de l'installer avant.

## Phase 1 — Socle monorepo

Bootstrap Next.js 16 + NestJS 11 + `packages/shared` + ESLint/Prettier partagés + docker-compose
(5 services). Point de friction : `create-next-app` génère son propre `pnpm-workspace.yaml`
imbriqué (avec `ignoredBuiltDependencies`), qui masque celui de la racine pour pnpm — supprimé et
fusionné dans le fichier racine.

## Phase 2 — Base de données

Prisma 7 a changé d'architecture entre la rédaction du dossier et l'implémentation : un driver
adapter (`@prisma/adapter-pg`) est désormais **obligatoire**, il n'y a plus de moteur de requêtes
embarqué connecté directement via `DATABASE_URL` dans le schéma. Ajusté en conséquence
(`PrismaService` instancie `PrismaPg` explicitement). Autres frictions mineures : image
`postgis/postgis:18-3.6` attend un volume monté sur `/var/lib/postgresql` (pas `.../data` comme
avant Postgres 18), et `prisma.config.ts` (nouveau fichier de config CLI) doit être exclu du build
Nest sous peine de faire dériver la sortie `tsc` (`dist/src/main.js` au lieu de `dist/main.js`).

## Phase 3 — OpenTripPlanner

Risque technique principal du dossier, traité tôt comme prévu. Résumé :

- **Données** : extrait OSM Midi-Pyrénées (Geofabrik, pas d'extrait au niveau département,
  344 Mo), GTFS Tisséo (portail open data Toulouse Métropole), `otp-shaded-2.9.0.jar` (Maven
  Central — plus récent que la version 2.7.0 utilisée par erreur en Phase 1, alignée).
- **Build** : ~3 min 25 s avec `-Xmx6G` (pas besoin des 8 Go recommandés par le dossier).
  1 392 762 nœuds, 3 406 072 arêtes, 3 903 arrêts. Pas eu besoin de réduire l'extrait à la zone
  utile pour l'instant.
- **Rechargement** (`--load`) : ~30 s, confirme qu'on ne reconstruit jamais au démarrage.
- **Piège réel** : le flux GBFS VélôToulouse renvoie une donnée invalide (`last_reported` hors
  bornes `int`, sentinelle de date jamais initialisée côté opérateur) qui fait échouer l'updater
  GBFS — mais **pas le serveur**, qui démarre et route quand même. Validation concrète en
  conditions réelles de la règle de dégradation gracieuse du projet.
- **Requête de référence** (Capitole → Blagnac) : cohérente à chaque test — métro A jusqu'à
  Arènes puis tram jusqu'à Place du Relais, ou variante bus. Validée en local (jar) et via le
  service `docker-compose` (image alignée sur 2.9.0).
- **Reconstruction planifiée** : différée aux Phases 11/12 (pas de CI/CD ni de VPS encore en
  place pour l'orchestrer) — juste documentée pour l'instant dans `infra/otp/README.md`.

## Phase 4 — F1 compte et profil de mobilité

Découpée en 5 branches séquentielles (`feat/auth-backend`, `feat/gdpr-rights`,
`feat/profile-backend`, `feat/auth-pages`, `feat/profile-page`), chacune mergée avant de
démarrer la suivante — nouvelle convention adoptée à partir de cette phase (une branche par
sous-domaine plutôt qu'une seule par phase).

- **Auth backend** : JWT court (15 min) + refresh token en rotation à usage unique, stocké
  dans Valkey (pas dans Postgres) pour que l'API reste sans état. Argon2 pour les mots de
  passe. Piège réel : Prisma 7 impose un driver adapter, pas de souci ici car déjà réglé en
  Phase 2 — mais `AuthModule` doit ré-exporter `JwtModule` (pas seulement le guard), sinon tout
  module qui utilise `@UseGuards(JwtAuthGuard)` plante au démarrage (découvert en écrivant le
  module RGPD, cassait même un test e2e de la Phase 1).
- **RGPD** : export JSON complet et suppression réelle (cascade Prisma), jamais un flag
  `deleted`. Erreurs "compte introuvable" mappées en 404 plutôt que de laisser fuiter une 500.
- **BFF côté Next.js** (`feat/auth-pages`, `feat/profile-page`) : décision d'architecture
  centrale de cette phase — le JWT ne quitte **jamais** le serveur Next.js. Les Route Handlers
  relaient vers NestJS et reposent leurs propres cookies httpOnly (`access_token` et
  `refresh_token`), le navigateur ne voit jamais le token brut ni l'URL interne de l'API. Un
  helper dédié (`callAuthenticated`) gère le refresh automatique si l'access token a expiré
  (15 min), avec un seul essai de retry.
- **Constante partagée** : `PASSWORD_MIN_LENGTH` déplacée dans `@urbanflow/shared` pour que la
  validation du formulaire web et le `RegisterDto` NestJS ne puissent jamais diverger.
- **Incident hors-scope réglé pendant cette phase** : le disque `C:` s'est rempli à 100 % (0
  octet libre) à force de reconstruire les images Docker — Docker Desktop a fini par planter.
  Cause : le fichier `docker_data.vhdx` (disque virtuel WSL2) grossit à chaque build mais ne se
  réduit jamais tout seul, même après un `docker system prune`. Un `docker system prune -af`
  a libéré 19,5 Go *à l'intérieur* du disque virtuel, mais le fichier lui-même restait à 23 Go
  sur l'hôte tant qu'il n'était pas compacté explicitement (`diskpart` : `attach vdisk
  readonly` puis `compact vdisk`, après `wsl --shutdown`). Résultat : 23 Go → 3,1 Go, et 2,7 Go
  → 26 Go d'espace libre. Les données des volumes (base, cache) ont été préservées tout du
  long ; seules les images ont dû être reconstruites.
- Chaque branche validée par un test réel contre la vraie stack (Postgres + Valkey + NestJS,
  parfois via Docker directement) avant merge, pas seulement via des tests unitaires mockés.

## Phase 5 — F3 intégrations temps réel

Découpée en 4 branches séquentielles (`feat/mobility-provider-core`,
`feat/gbfs-velotoulouse`, `feat/gbfs-scooters`, `feat/gtfs-rt-tisseo`), même convention
qu'en Phase 4. Chaque flux externe vérifié contre les vraies données (curl + décodage
manuel) avant d'écrire le moindre code contre sa forme supposée.

- **Abstraction commune** : interface `FournisseurMobilite` (une méthode `disponibilites()`),
  assemblée par `IntegrationsModule` sous le token `FOURNISSEUR_MOBILITE_TOKEN` via une
  factory — ajouter un opérateur = ajouter une classe + une ligne dans le tableau, sans
  toucher au reste du module.
- **GBFS VélôToulouse** : auto-discovery (`gbfs.json`), jamais d'URL de sous-flux codée en
  dur ; cache Valkey aligné sur le `ttl` annoncé par `station_status.json` plutôt qu'une
  valeur arbitraire. Vérifié en réel : 466 stations, ~1,4 s à froid puis ~1,3 ms en cache.
- **GBFS YEGO (trottinettes/scooters free-floating)** : même pattern, forme de flux
  différente (`free_bike_status`, pas de notion de station) — a motivé l'ajout du mode
  `scooter` dans `@urbanflow/shared` (distinct de `trottinette`, l'opérateur propose les
  deux types de véhicule). Filtre `!is_reserved && !is_disabled` pour ne remonter que les
  véhicules réellement disponibles. Vérifié en réel : 295 scooters.
- **GTFS-RT Tisséo** : seul flux au format Protocol Buffers (pas JSON) du dossier, décodé via
  `gtfs-realtime-bindings`. Contrairement aux flux GBFS (cache-aside à la demande), le flux
  n'annonce pas son propre TTL : rafraîchissement piloté par une tâche planifiée
  (`@Interval`, 45 s), `getPerturbations()` ne fait que lire le cache. TTL de cache (120 s)
  volontairement supérieur à l'intervalle de rafraîchissement pour qu'un cycle raté ne vide
  pas l'état — utile en pratique, le flux beta de Tisséo a répondu 502 sur 1 tentative sur 3
  lors des essais manuels. Piège réel découvert en testant contre le vrai flux : `protobuf.js`
  renvoie une chaîne vide (`""`) et non `undefined` pour un champ `string` optionnel absent du
  message décodé — le fallback `routeId`/`tripId` doit utiliser `||`, pas `??`. Vérifié en
  réel : 851 entités, 202 perturbations détectées (68 annulations, 38 ajouts, 96 retards).
- Comme en Phase 4, chaque branche validée par un test réel contre le vrai service externe
  (script jetable, supprimé après vérification) en plus de la suite de tests unitaires
  mockés, avant merge `--no-ff`.

## Phase 6 — F2 planificateur multimodal (cœur du produit)

Découpée en 4 branches séquentielles (`feat/otp-client`, `feat/geocoding`,
`feat/itineraire-aggregation`, `feat/web-map-planner`), même convention qu'en Phases 4 et 5.
Décision de cadrage prise avant de commencer : le géocodage passe par Nominatim plutôt que le
service places de l'API Tisséo — celui-ci nécessite une clé attribuée manuellement par mail à
opendata@tisseo.fr (pas de signup en libre-service), incompatible avec la règle du projet de
toujours vérifier un flux en conditions réelles avant d'écrire du code contre lui.

- **Client OTP** : `planConnection` (le champ `plan` est déprécié depuis OTP 2.x — confirmé par
  introspection avant d'écrire le client). Traduit le `Mode` OTP (plus riche : rail, ferry,
  avion, taxi...) vers le `ModeTransport` du projet, calé sur le réseau Tisséo réellement
  desservi à Toulouse ; un mode sans équivalent direct retombe sur `bus`. Étendu en cours de
  Phase 6 (branches 3 et 4) pour récupérer `route.gtfsId`/`trip.gtfsId` (recoupement avec les
  perturbations GTFS-RT) et `legGeometry.points` (tracé pour la carte) — piège vérifié en
  conditions réelles : OTP préfixe les identifiants avec le feed interne (`1:line:61`), absent
  du flux GTFS-RT brut (`line:61`).
- **Agrégation** (`POST /api/v1/itineraires`) : trois sources en parallèle sans blocage mutuel —
  OTP et GTFS-RT via un `Promise.allSettled`, les fournisseurs GBFS via un second
  `Promise.allSettled` indépendant, les deux groupes rejoints par un seul `Promise.all` (déjà
  sûrs, ils ne rejettent jamais). Un segment de transport en commun annulé invalide l'itinéraire
  entier ; un retard s'ajoute à la durée totale. CO2 par segment calculé avec une table d'ordres
  de grandeur locale et non versionnée — la table ADEME versionnée officielle est le sujet de la
  Phase 7, pas de celle-ci. Cache Valkey sur le couple départ/arrivée arrondi, appliqué avant tri
  et filtre (qui s'exécutent à la volée sur le résultat brut mis en cache, pour maximiser le taux
  de succès) ; comme pour le géocodage, un résultat vide (échec OTP transitoire) n'est jamais mis
  en cache. Vérifié contre la vraie stack (OTP + Valkey + les deux flux GBFS + GTFS-RT Tisséo) :
  POST réel Capitole → Blagnac, 201 en 606 ms (budget < 2 s tenu), 5 itinéraires avec CO2 par
  segment et ligne GTFS, 767 disponibilités agrégées ; deuxième appel identique servi par le
  cache en 17 ms.
- **Front** (`feat/web-map-planner`) : écran `/planificateur` — deux champs d'adresse avec
  autocomplete (proxy BFF vers le nouvel endpoint public `GET /api/v1/lieux/recherche`),
  géolocalisation avec repli sur saisie manuelle, tri segmenté durée/CO2, carte MapLibre GL +
  fond de tuiles OSM (composant client chargé via `next/dynamic` avec `ssr: false`, MapLibre
  exige `window`), cartes de résultats comparables. La trace du trajet (polyline encodée
  OTP) est décodée côté client (`decode-polyline.ts`, vérifié contre un échantillon réel avant
  intégration) pour dessiner le vrai tracé plutôt que des lignes droites.
- **E2E absent du projet jusqu'ici** : le script `test:e2e` référencé dans le `package.json`
  racine depuis la Phase 4 n'avait jamais été implémenté côté web (aucun framework installé).
  Ajouté cette phase : Playwright, un test réel (Capitole → Blagnac, plusieurs options triables)
  vérifié contre la vraie stack complète (web + api + Postgres + Valkey + OTP + Nominatim).
- **Limitation d'environnement découverte en vérifiant visuellement la carte** : le rendu WebGL
  d'une ligne vectorielle MapLibre ne s'affiche pas dans Chromium headless de cet environnement
  sandboxé (vérifié par élimination : une ligne codée en dur avec des couleurs et une épaisseur
  volontairement extrêmes ne s'affiche pas non plus, alors que les tuiles raster et les marqueurs
  DOM s'affichent normalement ; le style/source/layer MapLibre a été confirmé structurellement
  correct par introspection — paint, géométrie, bounds). Conclusion : limitation du navigateur
  headless de cet environnement, pas un défaut du code. Le test E2E ne vérifie donc pas le rendu
  pixel de la trace, seulement le pipeline fonctionnel (résultats, tri, absence d'erreur) — point
  d'attention pour une vérification visuelle manuelle en navigateur réel avant la soutenance.
- Comme aux phases précédentes, chaque branche validée par un test réel contre la vraie stack
  (script jetable, supprimé après vérification) en plus de la suite de tests unitaires mockés,
  avant merge `--no-ff`.

### Addendum — `feat/geocoding-tisseo` (2026-08-20)

Tisséo a répondu à la demande de clé (opendata@tisseo.fr, 2026-08-18) : `NominatimGeocodageService`
remplacé par `TisseoGeocodageService` (`GET https://api.tisseo.fr/v2/places.json`). Usage
volontairement limité à ce que le mail Tisséo autorise explicitement — recherche à la demande pour
un calcul d'itinéraire, jamais l'extraction en masse du référentiel arrêts/lignes (qui reste sur le
jeu de données GTFS déjà utilisé pour le graphe OTP). Attribution ODbL + lien vers la licence ajoutés
sur l'écran planificateur (obligation explicite des conditions d'usage). Piège réel découvert en
testant contre la vraie API : un terme vide ou sans résultat renvoie un statut HTTP 404 avec un corps
JSON valide (`placesList.place: []`) — traité explicitement comme une absence de résultats, pas un
échec, contrairement à Nominatim qui renvoyait un tableau vide en 200. Vérifié réel : résultats plus
riches que Nominatim (inclut directement les arrêts Tisséo et POI comme les stations VélôToulouse et
Citiz) ; suite E2E Playwright rejouée avec succès contre la stack complète.
