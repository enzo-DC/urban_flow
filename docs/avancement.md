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
- [x] Phase 7 — F4 carbone
- [x] Phase 8 — Gamification
- [x] Phase 9 — PWA
- [x] Phase 10 — A11y / sécurité / éco
- [ ] Phase 11 — Tests & CI
- [x] Phase 12 — Déploiement OVH

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

## Phase 7 — F4 calculateur d'empreinte carbone

Découpée en 4 branches séquentielles (`feat/carbon-ademe-table`, `feat/trajets-effectues`,
`feat/carbone-consumer`, `feat/web-mon-impact`), même convention qu'aux phases précédentes.

- **Table ADEME versionnée** (`carbone/facteurs-ademe.ts`, version 2026-08-20) : source unique
  pour toute l'application — remplace la table d'estimation approximative de la Phase 6
  (supprimée) plutôt que de garder deux chiffres différents pour le même concept. Chaque facteur
  cite sa source précise (Base Carbone/Empreinte ADEME, ou données d'opérateurs de référence type
  RATP quand Tisséo ne publie pas son propre facteur), avec une limite méthodologique documentée
  explicitement dans le code : les sources mélangent phase d'usage seule (bus/métro/tram/voiture)
  et cycle de vie complet (trottinette/scooter, seule donnée ADEME disponible et la plus
  pertinente pour du free-floating dont l'impact réel est dominé par la logistique de collecte).
  Recherche des sources primaires plutôt qu'un appel à un service (rien à vérifier en direct pour
  une table de référence) — 9 tests dédiés, le calcul carbone étant le « cœur évalué » du projet.
- **`POST /api/v1/trajets`** : persiste un itinéraire réellement effectué et publie l'évènement
  `TrajetEffectue` (`@nestjs/event-emitter`, nouvellement installé) — l'évènement ne transporte
  que des faits bruts (mode + distance par segment), jamais une conclusion déjà calculée : chaque
  consommateur (carbone, puis gamification en Phase 8) dérive son propre état, vrai découplage et
  pas une simple notification. RGPD par construction : `EnregistrerTrajetDto` n'a pas de champ
  « trace » — avec `forbidNonWhitelisted` actif globalement, en envoyer un fait rejeter la requête
  (400), vérifié en conditions réelles. Les colonnes `geography` (Unsupported() dans Prisma) ne
  passent pas par `create()` : nouvelle méthode `creerItineraireEffectue()` en SQL natif,
  transactionnelle.
- **Module carbone consommateur** : `CarboneListener` écoute `TrajetEffectue` sans importer le
  module trajets au-delà de son contrat d'évènement, recalcule son propre CO2 à partir des faits
  bruts, persiste `EmpreinteCarbone` (CO2 réel + comparatif voiture évité, jamais négatif).
  Dégradation gracieuse : un évènement en échec est loggé, ne fait jamais planter le process.
  `GET /api/v1/moi/impact` agrège le CO2 évité cumulé et le convertit en équivalent concret (km
  voiture évités).
- **Écran « Mon impact »** : ferme la boucle Phase 6 → Phase 7 — sur `/planificateur`, un bouton
  « J'ai fait ce trajet » apparaît sous l'itinéraire sélectionné et poste directement les segments
  déjà calculés, sans ressaisie. `/mon-impact` affiche le chiffre dominant (km voiture évités),
  les stats cumulées et l'historique.
- **Deux bugs réels découverts en vérifiant la branche 4 de bout en bout** (ni l'un ni l'autre
  n'était visible sur les jeux de coordonnées testés en Phase 6) :
  1. `perturbations.util.ts` (Phase 6) faisait retomber le rapprochement d'une perturbation sur
     `routeId` dès que `voyageId` ne correspondait pas. Une ligne très fréquentée peut avoir des
     dizaines d'entités de perturbation actives simultanément : ce filet de sécurité annulait des
     itinéraires parfaitement valides dès qu'un *autre* voyage de la même ligne était perturbé —
     vérifié en réel, la ligne 99 avait 22 perturbations actives et vidait systématiquement les
     résultats de recherche pour cette ligne. Corrigé : rapprochement uniquement par `voyageId`.
  2. `EnregistrerTrajetDto` exigeait un entier pour `distanceMetres`, mais OTP renvoie des
     distances fractionnaires (ex. 543,78 m) — tout enregistrement réel échouait en 400. Validation
     assouplie, arrondi appliqué uniquement à la persistance (colonne Postgres `INTEGER`).
- Comme aux phases précédentes, chaque branche validée par un test réel contre la vraie stack
  avant merge `--no-ff` ; le scénario e2e formel « inscription → planification → consultation
  impact » reste le sujet dédié de la Phase 11, pas anticipé ici.

## Phase 8 — Gamification

Découpée en 4 branches séquentielles (`feat/gamification-points`, `feat/gamification-badges`,
`feat/web-push`, `feat/web-gamification-ui`), même convention qu'aux phases précédentes.

- **Second consommateur indépendant de `TrajetEffectue`** : `GamificationListener` n'importe
  jamais le module carbone (règle non négociable du dossier) — il dérive son propre CO2 évité à
  partir des mêmes faits bruts (mode + distance + durée par segment) plutôt que de faire
  confiance à une conclusion déjà tirée par un autre module. `TrajetEffectueEvent` étendu avec
  `dureeSecondes` par segment (absent du besoin initial de la Phase 7, nécessaire ici pour la
  vitesse moyenne) — évolution normale d'un contrat au fil de ses consommateurs.
- **Points pondérés par le CO2 évité** (1 point / 10g), jamais par le nombre de trajets — un
  trajet 100 % voiture n'évite rien et ne rapporte donc aucun point.
- **Anti-fraude** : recoupe le mode déclaré avec la vitesse moyenne du segment (plafonds par
  mode bases sur des vitesses urbaines plausibles, aucun plafond pour la voiture). Un seul
  segment suspect invalide l'attribution de points pour tout le trajet ; le trajet lui-même
  reste enregistré normalement côté carbone — l'anti-fraude ne bloque que la récompense, jamais
  le suivi honnête.
- **Badges/paliers** (bronze/argent/or/platine, seuils produit sans référence externe) : stockés
  comme des `Recompense` de type `badge:<palier>` (points=0, un badge est un marqueur, pas une
  source de points), aucune migration nécessaire. `paliersFranchis()` renvoie tous les paliers
  nouvellement atteints, jamais un seul — un trajet conséquent peut en franchir plusieurs d'un
  coup. Nouvel évènement interne `BadgeDebloque`, distinct de `TrajetEffectue`, propre au module
  gamification.
- **Web Push** : clés VAPID réelles générées (`npx web-push generate-vapid-keys`), nouveau
  modèle `AbonnementPush` (migration Prisma), nettoyage automatique des abonnements expirés
  (404/410 du service de push). `PushListener` s'abonne à `BadgeDebloque` sans connaître la
  gamification — même découplage par évènement que pour le carbone.
- **Écran** : `/mon-impact` (Phase 7) étendu plutôt qu'un nouvel écran — points, badges
  débloqués/verrouillés, et un bouton d'activation des notifications. Service worker minimal
  ajouté (`public/sw.js`) uniquement pour la réception Web Push, volontairement borné : le
  manifest, l'installabilité et le mode hors-ligne restent le sujet de la Phase 9 (Serwist
  remplacera ou étendra ce fichier à ce moment-là).
- **Piège réel découvert en générant la migration `AbonnementPush`** : `prisma migrate dev` a
  proposé de `DROP` les index GIST sur les colonnes geography (`itineraires_*_gist`,
  `segments_*_gist`) — invisibles du DSL Prisma (`Unsupported()`), le moteur de diff les voit
  comme « en trop ». Repéré et retiré du SQL généré, mais la première exécution les avait déjà
  supprimés : recréés manuellement à l'identique. Avertissement ajouté dans `schema.prisma` pour
  la prochaine migration touchant ces tables — ce piège se reproduira à chaque fois tant que ces
  colonnes restent en `Unsupported()`.
- **Limitation d'environnement confirmée à deux reprises** (branches `feat/web-push` et
  `feat/web-gamification-ui`) : `Notification.permission` reste `"denied"` par défaut dans le
  Chromium headless de cet environnement sandboxé, quelle que soit la méthode d'octroi testée
  (`grantPermissions` avec/sans origine, lancement sans `--disable-notifications`) — probable
  absence d'infrastructure de notification système, dans la même veine que la limitation WebGL
  de la Phase 6. La souscription Web Push réelle a néanmoins été vérifiée différemment : requête
  réellement signée (VAPID) et envoyée à l'infrastructure Google FCM avec une clé P-256
  cryptographiquement valide, acceptée sans erreur. Point d'attention pour une vérification
  manuelle en navigateur réel avant la soutenance, comme pour le rendu de la carte en Phase 6.
- Comme aux phases précédentes, chaque branche validée par un test réel contre la vraie stack
  avant merge `--no-ff`.

## Phase 9 — PWA

Découpée en 4 branches (`chore/pwa-serwist-manifest`, `feat/pwa-cache-strategies`,
`feat/pwa-offline-storage`, `chore/pwa-installability`), la dernière purement de vérification
(aucun changement de code, cf. plus bas).

- **Turbopack, pas webpack** : le projet tourne sous Turbopack (défaut de Next 16). La première
  tentative (`@serwist/next`, base webpack) échoue au build (`InjectManifest` incompatible
  Turbopack). Basculé sur `@serwist/turbopack`, dont l'architecture diffère nettement : pas
  d'écriture statique dans `public/sw.js`, le service worker est compilé à la volée par une route
  dynamique (`app/serwist/[path]/route.ts`) et servi à `/serwist/sw.js` ; `SerwistProvider`
  (`app/layout.tsx`) prend en charge l'enregistrement côté client, remplaçant l'appel manuel
  `navigator.serviceWorker.register()` de la Phase 8.
- **esbuild-wasm plante sous Windows** (chemin de working directory jugé non-POSIX par son layout
  interne) lors de la compilation du service worker. `useNativeEsbuild` laissé à son défaut par
  plateforme plutôt que forcé : natif sous Windows (dev), esbuild-wasm sous Linux (image Docker) —
  les deux paquets installés côte à côte pour que chaque environnement prenne le bon.
- **Stratégies de cache différenciées, évaluées avant `defaultCache`** (`app/sw-runtime-caching.ts`) :
  app shell (`/_next/static`, cache-first — hashé par contenu, jamais périmé), tuiles OSM
  (cache-first + expiration, la politique d'usage OSM demande explicitement un cache client),
  `/api/*` hors `/api/auth` (network-first + repli cache, 4 s de timeout). Vérifié contre le vrai
  serveur de tuiles et la vraie API : les caches se remplissent bien de vraies réponses.
- **Piège réel** : `defaultCache` se réduit volontairement à un simple `NetworkOnly` généralisé en
  mode `next dev` (comportement voulu par Serwist pour éviter la confusion de cache en
  développement) — un premier test de navigation hors-ligne y échouait donc systématiquement,
  y compris avec le mécanisme de repli (`fallbacks`) correctement câblé. Le même test refait contre
  un vrai build de production (`next build && next start`, ce qui tourne réellement dans Docker)
  passe sans accroc. Le mode dev n'est pas la référence pour valider un comportement de cache — un
  écueil à garder en tête pour toute vérification PWA future.
- **IndexedDB pour l'historique carbone et le profil** (`app/_lib/offline-store.ts`, magasin
  clé/valeur minimal sans dépendance externe) : `mon-impact-content.tsx` et `profil-form.tsx`
  sauvegardent la dernière réponse API réussie et s'y replient si le réseau échoue. Corrige au
  passage un vrai bug préexistant dans les deux composants : sans `try/catch` autour du fetch
  initial, un échec réseau laissait l'écran bloqué indéfiniment sur « Chargement… », même avec des
  données en cache.
- **Écran `/hors-ligne`** : repli du service worker pour toute navigation document qui échoue —
  le scénario réel de la DoD (« l'app installée s'ouvre en mode avion ») est une navigation dure
  (ouverture d'icône), pas une navigation douce interne à l'app. Précaché explicitement
  (`additionalPrecacheEntries`, révision = horodatage de build plutôt qu'un hash git, indisponible
  dans l'image Docker) et branché via `fallbacks.entries`. C'est un client component qui lit
  directement l'IndexedDB, sans dépendance serveur — impossible de vérifier le cookie de session
  hors-ligne, donc pas de logique d'auth sur cette page.
- **Vérification de l'installabilité** : Lighthouse ≥ 10 a retiré ses audits PWA dédiés
  (`service-worker`, `installable-manifest`, etc.) de son cœur — `--list-all-audits` le confirme,
  aucun de ces identifiants n'existe plus. Vérifié à la place directement via le mécanisme Chrome
  sous-jacent que ces audits utilisaient eux-mêmes (`Page.getInstallabilityErrors` en CDP, plus
  autoritaire que Lighthouse ne l'a jamais été) : zéro erreur d'installabilité contre le vrai
  conteneur Docker, manifest valide (icônes, nom, `display: standalone`, couleur de thème) confirmé
  par `Page.getAppManifest`. Le HTTPS proprement dit reste hors-scope ici (localhost fait exception
  aux yeux de Chrome) — sera couvert par Caddy/Let's Encrypt en Phase 12.
- Nettoyage : les SVG du gabarit Next.js de départ (jamais réutilisés depuis la réécriture de
  `app/page.tsx`) supprimés au passage de la première branche.
- Comme aux phases précédentes, chaque branche fonctionnelle validée par un test réel contre la
  vraie stack (serveur de tuiles OSM, API réelle via un compte créé en direct, conteneur Docker
  reconstruit) avant merge `--no-ff` ; la dernière branche, purement de vérification, n'a rien eu à
  committer.

## Phase 10 — Accessibilité, sécurité, éco-conception

Découpée en 4 branches (`test/a11y-axe-core`, `feat/itineraire-pmr`, `feat/security-headers`,
`feat/eco-conception`), chacune productrice de code cette fois (contrairement à la dernière
branche de la Phase 9).

- **axe-core** (`@axe-core/playwright`) intégré à un nouveau `e2e/accessibilite.spec.ts` couvrant
  les pages principales, y compris connecté (impact, profil). Deux vraies violations modérées
  trouvées et corrigées, pas seulement journalisées : `connexion`/`inscription` n'avaient aucun
  `<h1>` (marque en `<strong>`), `planificateur` n'avait pas de landmark `<main>` contrairement
  aux autres pages. Seules les violations *critiques* font échouer le test (règle du dossier) ;
  les autres sont journalisées comme signal, pas comme blocage.
- **Itinéraires accessibles PMR** : introspection GraphQL contre la vraie instance OTP pour
  trouver le bon paramètre (`preferences.accessibility.wheelchair.enabled` sur `planConnection`,
  pas un argument top-level comme sur d'autres versions d'OTP). `accessibilityScore` (Leg/
  Itinerary) reste `null` en permanence sur notre build (fonctionnalité sandbox IBI non activée) :
  volontairement absent de la réponse plutôt qu'exposé pour rien. Effet réel vérifié avec de
  vraies coordonnées (Capitole → Aéroport Blagnac) : 2 itinéraires bus (26 min) sans le filtre,
  une seule marche à pied de 98 min avec — OTP écarte bien les trajets non accessibles. Corrige au
  passage un bug latent : la clé de cache Redis ne dépendait que des coordonnées, une recherche
  standard et PMR sur le même trajet se seraient écrasées. Le formulaire pré-coche le bouton si le
  profil connecté a déjà `besoinsAccessibilite` — connecte enfin ce champ, jusque-là stocké mais
  jamais exploité (trouvé lors de l'état des lieux de branche).
- **CSP/HSTS** : la première tentative (nonce, recommandation par défaut de Next.js) échoue au
  test réel — vérifié contre un vrai build de production, pas seulement en dev — car les nonces
  exigent que *toutes* les pages soient en rendu dynamique, alors que `/connexion`,
  `/inscription` et `/planificateur` sont statiques par choix. La doc officielle Next.js
  documente explicitement ce compromis ("Without Nonces") : bascule sur une CSP statique
  (`next.config.ts`, `script-src 'unsafe-inline'`). CORS restrictif déjà en place depuis la
  Phase 4, rien à ajouter. Découverte notable : le mode `next dev` fait apparaître des faux
  positifs axe-core (`link-in-text-block`) via son propre overlay de debug, disparus en
  production — même piège dev-vs-prod que déjà rencontré en Phase 9, désormais un réflexe de
  vérification systématique.
- **helmet + `@nestjs/throttler`** côté API (CSP désactivée côté helmet, une API JSON pure n'en a
  pas l'usage). Vérifié contre le vrai conteneur Docker, pas seulement des mocks : 6 tentatives de
  connexion rapprochées renvoient 401×5 puis 429 ; reproduit une seconde fois après reconstruction
  complète de la stack en fin de phase, toujours correct.
- **Audit secrets** : recherche de motifs (clé/mot de passe en dur, blocs PEM, chaînes de
  connexion, la vraie clé Tisséo) dans tout le code suivi par git — rien trouvé, `.env` n'est pas
  versionné.
- **Vrai bug trouvé par l'audit d'accessibilité, pas seulement constaté** : le conteneur de la
  carte avait `role="img"` alors que MapLibre y injecte des contrôles focusables (zoom,
  boussole) — viole `nested-interactive`. Corrigé en `role="region"`, vérifié à 0 violation contre
  un vrai build de production.
- **Éco-conception, état des lieux avant d'agir** (recherche dédiée) : next/image — aucune balise
  `<img>` brute dans le projet, rien à migrer ; code-splitting — la carte (MapLibre) est déjà en
  chargement paresseux, rien d'autre d'assez lourd identifié ; polling → WebSocket — aucun polling
  côté frontend à remplacer, le seul rafraîchissement périodique (GTFS-RT, `@Interval` 45 s) est
  un poll serveur vers Tisséo dont le flux externe n'offre pas de push, hors périmètre. Seul point
  réellement actionnable : purge automatique. `Itineraire`/`Segment`/`Trajet`/`EmpreinteCarbone`/
  `Recompense` sont l'historique permanent de l'utilisateur (le cœur de « Mon impact »), jamais
  purgeables ; les refresh tokens expirent déjà nativement via Redis `EX`. Reste
  `AbonnementPush`, qui peut devenir obsolète sans jamais déclencher le nettoyage réactif existant
  (404/410 à l'envoi) : nouveau champ `derniereUtilisationLe` + purge quotidienne (`@Cron`,
  90 jours d'inactivité — seuil volontairement long, un badge peut se débloquer une fois tous les
  quelques mois). Vérifié contre la vraie base Postgres (4 abonnements de test à dates réelles,
  la purge en supprime exactement les 2 attendus), pas seulement des mocks.
- **Piège Prisma revisité** : la migration générée en `--create-only` contenait de nouveau les
  `DROP INDEX` GIST parasites déjà documentés en Phase 8 — retirés avant application. Complication
  supplémentaire cette fois : l'historique de migrations refusait de rejouer (checksum du fichier
  déjà modifié en Phase 8) — résolu sans perte de données en supprimant puis regénérant
  l'enregistrement via `prisma migrate resolve --applied`, puis application via `migrate deploy`
  (non-interactif) après avoir tué des process `prisma migrate dev` orphelins qui tenaient un
  verrou consultatif Postgres.
- **Incident hors-code** : le disque C: est passé à 0 octet libre en cours de phase (cache Docker
  WSL2 jamais compacté malgré les purges internes déjà faites en Phase 9). Nettoyage Docker complet
  (cache de build + toutes les images inutilisées) puis compaction du disque virtuel WSL2 via
  `diskpart` (`compact vdisk`) : 16,5 Go → 3,4 Go, ~21 Go récupérés sur l'hôte. Docker Desktop a
  ensuite crashé une fois de plus en toute fin de phase (moteur WSL) — redémarré proprement après
  avoir nettoyé les process orphelins.
- Comme aux phases précédentes, chaque branche validée par un test réel contre la vraie stack
  (instance OTP réelle interrogée en introspection GraphQL, conteneur Docker reconstruit, vraie
  base Postgres) avant merge `--no-ff`.

## Phase 12 — Déploiement OVHcloud

Phase 11 (Tests & CI) volontairement sautée pour l'instant, à la demande explicite : la Phase 12
a été avancée pour préparer la publication. Rédigé en deux temps : d'abord tout ce qui pouvait être
préparé et vérifié *sans* infrastructure réelle (compose de prod, Caddy, pipeline CI/CD, sauvegarde,
Sentry), puis — dans la foulée, même session — le déploiement réel lui-même : VPS OVHcloud acheté et
provisionné, nom de domaine `urbanflow-toulouse.fr` acheté, secrets GitHub configurés, pipeline
poussé jusqu'au bout et débuggé en conditions réelles. La DoD du dossier (« l'app est en ligne en
HTTPS sur ton domaine ») est désormais réellement atteinte, pas seulement préparée.

Découpée en 4 branches (`chore/prod-compose-caddy`, `chore/prod-secrets`, `ci/deploy-pipeline`,
`chore/backup-observability`).

- **`docker-compose.prod.yml` + Caddy** : mêmes 5 services que le compose de dev, mais deux
  différences délibérées. D'abord, `api`/`web` utilisent des images `ghcr.io` (construites et
  publiées par le pipeline CI, jamais buildées sur le VPS) au lieu de `build:`. Ensuite, aucun
  port n'est publié sur `db`/`cache`/`otp`/`api`/`web` — seul Caddy (80/443) est exposé à
  Internet, l'API n'étant jamais appelée directement par le navigateur (rôle BFF de `web`). TLS
  Let's Encrypt automatique, zéro configuration au-delà du nom de domaine (`{$DOMAIN}` dans le
  Caddyfile). Vérifié avec les vrais outils : `docker compose config` (structure/interpolation)
  et `caddy validate` avec la vraie image Caddy — configuration valide, redirection HTTP→HTTPS
  bien détectée automatiquement.
- **Secrets externalisés** : `.env.prod.example`, modèle complet séparé du `.env.example` de dev
  (domaine en `https://`, `NODE_ENV=production`, nouvelles variables `DOMAIN`/`ACME_EMAIL`,
  rappel de générer des secrets JWT distincts de ceux du dev). Recherche dédiée confirmant
  qu'aucun secret réel ne s'est glissé dans les fichiers infra de cette phase.
- **Pipeline GitHub Actions** (`.github/workflows/deploy.yml`), déclenché sur push vers `main` :
  `test` (lint + jest, garde-fou minimal avant tout déploiement — la CI complète reste le sujet de
  la Phase 11) → `build-and-push` (images GHCR, tags `latest` + sha du commit) → `deploy` (ssh vers
  le VPS, `git pull` pour garder `docker-compose.prod.yml`/Caddyfile synchronisés avec le dépôt,
  `docker compose pull && up -d`). Secrets GitHub à configurer avant le premier run (`VPS_HOST`,
  `VPS_USER`, `VPS_SSH_KEY`) — aucun ne peut être créé depuis cette session, le VPS n'existant pas
  encore. Vérifié avec `actionlint` (l'outil de référence pour les workflows GitHub Actions), pas
  seulement relu : 0 erreur.
- **Sauvegarde/restauration** (`infra/scripts/backup-db.sh`/`restore-db.sh`, `pg_dump` planifiable
  via cron). **Vrai bug trouvé en testant la restauration pour de vrai** (règle du dossier —
  « teste une restauration au moins une fois »), pas seulement en relisant le script : sans
  `--clean --if-exists`, `pg_dump` produit un dump qui échoue en cascade
  (« already exists »/« duplicate key ») dès qu'on restaure sur une base qui a déjà son schéma —
  le cas normal en reprise après incident, pas une base vierge de test. Reproduit avec une ligne
  marqueur insérée puis supprimée : la restauration ne la faisait pas revenir avant correction,
  la fait revenir après. `.gitattributes` ajouté (`*.sh` forcé en LF) et bit exécutable forcé via
  `git update-index --chmod=+x` : ces scripts tournent sur le VPS (Linux), un checkout Windows en
  CRLF les aurait rendus inexécutables sans que rien ne le signale avant le premier vrai run.
- **Sentry** (`@sentry/nestjs` et `@sentry/nextjs`) — `Sentry.init()` conditionné à la présence du
  DSN des deux côtés, aucune tentative de connexion en dev/test. Vérifié par un vrai build de
  production et un démarrage réel du serveur, pas seulement la compilation : aucune régression,
  l'upload des source maps se désactive proprement sans `SENTRY_AUTH_TOKEN` plutôt que d'échouer.
- **Incident hors-code, une 3ᵉ fois cette semaine** : le disque C: est retombé à quasiment 0 octet
  libre en cours de phase (même cause que la Phase 10 — le disque virtuel Docker WSL2 regonfle à
  chaque rebuild d'image, la compaction n'est pas permanente). Même remède (purge Docker complète
  + `diskpart compact vdisk`, ~21 Go récupérés) ; Docker Desktop a aussi replanté deux fois en
  cours de route et redémarré proprement à chaque fois. Prendrait sens de creuser une solution
  durable (VHD en mode sparse, ou compaction régulière planifiée) plutôt que de refaire ce
  contournement à chaque grosse phase.
- Comme aux phases précédentes, chaque branche fonctionnelle validée par un test réel avant merge
  `--no-ff` — cette fois contre des outils dédiés (`docker compose config`, `caddy validate`,
  `actionlint`, `shellcheck`) et une vraie base Postgres pour le cycle sauvegarde/restauration.

### Déploiement réel sur VPS OVHcloud

Une fois l'infra préparée, passage au déploiement effectif : VPS OVHcloud (Debian, datacenter
Erith UK — pas de datacenter France disponible sur cette offre ; adéquation RGPD UK/UE, acceptable
et défendable pour le dossier), nom de domaine `urbanflow-toulouse.fr` acheté séparément, DNS
pointé vers l'IP du VPS. Accès SSH par clé dédiée (`urbanflow_deploy`), secrets GitHub Actions
configurés (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`). Plusieurs vrais bugs trouvés et
corrigés en poussant le pipeline jusqu'au bout, aucun anticipable sans l'infra réelle :

- **Lint CI en échec (146 erreurs ESLint)** sur un runner GitHub Actions neuf : `PrismaClient`
  jamais généré (le postinstall de Prisma est bloqué par défaut par pnpm, même symptôme que
  rencontré en local plus tôt dans le projet). Corrigé par un step `prisma generate` explicite
  avant lint/build dans `deploy.yml`.
- **Jest CI en échec** : le test d'intégration Prisma a besoin d'une vraie base Postgres absente du
  job minimal. Exclu via `--testPathIgnorePatterns='\.integration\.spec\.ts$'` — la CI complète avec
  conteneur Postgres reste le sujet de la Phase 11, non anticipée ici.
- **`build-and-push` en échec : « repository name must be lowercase »**. Le propriétaire GitHub du
  dépôt contient une majuscule ; les expressions GitHub Actions n'ont pas de fonction de conversion
  native. Corrigé en calculant `OWNER_LC` via un step `tr '[:upper:]' '[:lower:]'` dédié plutôt
  qu'en utilisant `github.repository_owner` tel quel dans les tags d'image.
- **Permissions du workflow** : push GHCR refusé par défaut (`GITHUB_TOKEN` en lecture seule au
  niveau du dépôt) — à activer explicitement dans Settings → Actions → General → Workflow
  permissions → « Read and write ».
- **`deploy` en échec : « can't connect without a private SSH key or password »**, à deux reprises.
  Cause : collages de clé privée corrompus dans le formulaire GitHub via PowerShell/navigateur
  (problème de presse-papiers récurrent sous Windows). Résolu définitivement en installant GitHub
  CLI (`gh`) et en poussant le secret directement depuis le fichier
  (`Get-Content -Raw <clé> | gh secret set VPS_SSH_KEY`), qui évite tout passage par un presse-papiers.
- **`~/.ssh/authorized_keys` vide côté VPS** malgré une clé bien ajoutée : le collage initial avait
  créé `~/.ssh/authorised_keys` (orthographe britannique) au lieu de `authorized_keys` — le fichier
  que SSH lit réellement. Diagnostiqué en listant le dossier (`ls -la ~/.ssh`), corrigé par un
  renommage + `chmod 600`.
- **Certificat TLS Let's Encrypt en échec via le challenge `http-01`** : la requête de validation
  pour `urbanflow-toulouse.fr` était redirigée via `www.urbanflow-toulouse.fr` vers la page de
  parking OVH (produit « Redirection » d'OVH, distinct de la zone DNS brute et non supprimable
  depuis l'interface — il se régénérait automatiquement). Plutôt que de continuer à lutter contre
  l'UI OVH, résolu en redémarrant le conteneur Caddy : la tentative suivante a réussi via le
  challenge `tls-alpn-01`, qui valide directement sur le port 443 et contourne entièrement
  l'interférence de la redirection HTTP. Confirmé dans les logs Caddy
  (« certificate obtained successfully »). Reste une limitation connue et non bloquante :
  `https://www.urbanflow-toulouse.fr` (avec le préfixe www) affiche encore la page de parking OVH
  au lieu de l'app ; le domaine nu fonctionne correctement et c'est lui qui est utilisé partout.
- **Conteneur OTP en crash-loop sur le VPS** : `graph.obj` est volontairement ignoré par git (fichier
  binaire de ~267 Mo), donc absent d'un clone frais. Résolu en générant le graphe directement sur le
  VPS : téléchargement des données réelles (extrait OSM Midi-Pyrénées via Geofabrik, GTFS Tisséo)
  via `infra/otp/scripts/fetch-data.sh`, puis construction (`--build --save`, `-Xmx6G`, ~5 min 18 s)
  — seuls des avertissements `DataImportIssueSummary` attendus, aucune erreur bloquante.

Vérification finale en conditions réelles, pas seulement un statut de pipeline vert : les 6
conteneurs (`api`, `cache`, `caddy`, `db`, `otp`, `web`) `Up`/`healthy` sur le VPS, un vrai compte
créé via `https://urbanflow-toulouse.fr/api/auth/register` (201) et un vrai itinéraire
Capitole → Aéroport Blagnac recherché via `https://urbanflow-toulouse.fr/api/itineraires`
(201, 4 itinéraires trouvés) — Caddy/TLS, Next.js, NestJS, Postgres/PostGIS et OpenTripPlanner (avec
le vrai graphe Toulouse) fonctionnent ensemble en production.
