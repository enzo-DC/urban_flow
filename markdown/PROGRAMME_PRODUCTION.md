# UrbanFlow Mobility — Programme de production

Plan d'exécution du MVP, de la machine vide au déploiement sur OVH.
Chaque phase indique **ce qu'on intègre**, **comment**, et le **critère de fin** (Definition of Done).

**Stack cible** — Next.js 16 (App Router) · NestJS 11 · PostgreSQL 18 + PostGIS 3.6 · Valkey 9 · OpenTripPlanner 2 (Java 25) · TypeScript 6 · Node.js 24 LTS · Docker · OVHcloud

**Ordre de lecture** : les phases sont séquentielles. La phase 3 (OpenTripPlanner) est volontairement placée tôt : c'est le plus gros risque technique du projet, il faut le lever avant d'écrire des fonctionnalités qui en dépendent.

---

## Correspondance avec les sprints du dossier

| Sprint | Phases | Objectif |
|---|---|---|
| S0 | 0 – 1 | Cadrage, socle technique, CI |
| S1 | 2 – 3 | Base de données, moteur d'itinéraire |
| S2 | 4 | F1 — compte et profil |
| S3 | 5 | F3 — intégrations temps réel |
| S4–S5 | 6 | F2 — planificateur multimodal |
| S6 | 7 – 8 | F4 — carbone, puis gamification |
| S7 | 9 – 10 | PWA, accessibilité, RGPD |
| S8 | 11 – 12 | Tests, CI/CD, mise en production |

---

## Phase 0 — Prérequis

### À installer localement
| Outil | Version | Vérifier avec |
|---|---|---|
| Node.js | 24 LTS | `node -v` |
| pnpm | 9+ | `pnpm -v` |
| Docker + Compose | récent | `docker compose version` |
| Java (JDK) | **25 LTS** | `java -version` |
| Git | récent | `git --version` |

> Java 25 sert uniquement à OpenTripPlanner. OTP 2 ne démarre pas sur une version antérieure.

### Accès et comptes à obtenir
- **Clé API Tisséo** — à demander sur le portail open data de Tisséo. Délai possible : anticipe dès le premier jour.
- **Compte OVHcloud** + VPS (8 Go de RAM minimum, 16 Go confortable).
- **Nom de domaine** (pour le TLS et l'installabilité PWA — une PWA exige HTTPS).
- **GitHub** : dépôt privé.

### Données à récupérer
| Donnée | Source | Usage |
|---|---|---|
| GTFS Tisséo | portail open data Tisséo | graphe horaires + arrêts |
| GTFS-RT Tisséo | endpoint temps réel | perturbations, passages |
| Extrait OSM Haute-Garonne | Geofabrik (`.osm.pbf`) | voirie, pistes cyclables |
| GBFS VélôToulouse / scooters | flux opérateurs | disponibilité véhicules |
| Facteurs d'émission | Base Carbone ADEME | calcul CO₂ (F4) |

**DoD** — Toutes les commandes de vérification passent, la clé Tisséo est demandée, un `.env.example` liste chaque variable requise.

---

## Phase 1 — Socle du monorepo

### Ce qu'on intègre
Structure pnpm workspace, les deux applications, les types partagés, l'outillage qualité, et l'orchestration Docker.

```
urbanflow/
├── apps/
│   ├── web/          # Next.js 16 — présentation + BFF
│   └── api/          # NestJS 11 — domaine métier
├── packages/
│   └── shared/       # types & DTO partagés (source de vérité des contrats)
├── infra/
│   ├── docker-compose.yml
│   └── otp/          # graphe + données OTP
└── docs/
```

### Comment
1. `pnpm init` à la racine, créer `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
2. `pnpm create next-app apps/web` — TypeScript, App Router, sans Tailwind si tu préfères des CSS Modules.
3. `pnpm dlx @nestjs/cli new apps/api`.
4. `packages/shared` : un simple paquet TS exportant les interfaces (`Itineraire`, `Segment`, `ModeTransport`…). **Les deux apps l'importent — jamais de duplication de type.**
5. ESLint + Prettier à la racine, configuration unique héritée par les deux apps.
6. `docker-compose.yml` avec 5 services : `db` (postgis), `cache` (valkey), `otp`, `api`, `web`.

### Pièges
- Ne mets pas de logique métier dans `apps/web`. Le front consomme, il ne décide pas.
- Fixe les versions dans `package.json` (pas de `^` sur les majeures critiques).

**DoD** — `docker compose up` démarre les 5 services ; la page d'accueil Next.js répond ; `pnpm lint` passe.

---

## Phase 2 — Base de données et modèle de domaine

### Ce qu'on intègre
Le modèle du diagramme de classes du dossier (§11.1), avec le géospatial natif.

### Comment
1. Image `postgis/postgis:18-3.6` dans Compose.
2. ORM : **Prisma** (ou TypeORM). Migration initiale activant l'extension :
   `CREATE EXTENSION IF NOT EXISTS postgis;`
3. Entités : `Utilisateur`, `ProfilMobilite`, `Trajet`, `Itineraire`, `Segment`, `EmpreinteCarbone`, `Recompense`, `Operateur`.
4. Colonnes géographiques en `geography(Point, 4326)`.
   Prisma ne gère pas nativement PostGIS → déclare-les via `Unsupported("geography")` et **fais les requêtes spatiales en SQL natif** (`$queryRaw`).
5. Index spatial obligatoire sur chaque colonne géographique :
   `CREATE INDEX idx_x_geom ON table USING GIST (colonne);`
6. Seed : jeux **synthétiques uniquement**. Jamais de position réelle en base de développement.

### Requête de référence (proximité)
Recherche des stations dans un rayon — c'est le motif que tu réutiliseras partout :
`ST_DWithin(position, ST_MakePoint($lon,$lat)::geography, 300)`

**DoD** — Migrations rejouables de zéro, seed fonctionnel, une requête de proximité renvoie un résultat correct.

---

## Phase 3 — OpenTripPlanner *(phase à risque — à traiter tôt)*

### Ce qu'on intègre
Le moteur de calcul d'itinéraire multimodal, alimenté par GTFS + OSM + GBFS.

### Comment
1. Place dans `infra/otp/` : `toulouse.osm.pbf` (extrait Geofabrik) et le GTFS Tisséo (`.zip`).
2. Récupère `otp-shaded-*.jar` depuis Maven Central.
3. **Construire le graphe** (opération lourde, plusieurs minutes) :
   `java -Xmx8G -jar otp-shaded.jar --build --save infra/otp`
4. **Servir** le graphe construit :
   `java -Xmx8G -jar otp-shaded.jar --load infra/otp`
5. Déclare les flux GBFS dans `router-config.json` (OTP les consomme nativement, y compris le free-floating).
6. Teste une requête via l'API GraphQL d'OTP (Capitole → Blagnac) avant d'écrire la moindre ligne de NestJS.

### Pièges — lis-les avant de lancer
- **La RAM est le facteur limitant.** Si le build échoue sans message clair, c'est presque toujours `-Xmx` trop bas.
- Réduis l'extrait OSM à la zone utile (rectangle englobant l'agglomération) : graphe plus petit, build plus rapide.
- Le graphe construit (`graph.obj`) se sauvegarde : **ne le reconstruis pas à chaque démarrage**, charge-le.
- Prévois la reconstruction quand Tisséo publie un nouveau GTFS (tâche planifiée, pas manuelle).

**DoD** — Une requête d'itinéraire multimodal renvoie un résultat cohérent, et le service redémarre en chargeant le graphe sauvegardé.

---

## Phase 4 — F1 : compte et profil de mobilité

### Ce qu'on intègre
Identité, préférences, besoins d'accessibilité, et les droits RGPD dès le départ.

### Comment
1. **Auth** : JWT court (15 min) + refresh token en cookie `httpOnly` `Secure` `SameSite`. Hachage **argon2** (ou bcrypt).
2. Validation systématique des entrées : `class-validator` sur tous les DTO NestJS.
3. Endpoints : inscription, connexion, rafraîchissement, profil (lecture/écriture).
4. **RGPD, à faire maintenant et pas plus tard** :
   - consentement explicite horodaté à l'inscription ;
   - `GET /api/v1/moi/export` → archive JSON de toutes les données ;
   - `DELETE /api/v1/moi` → suppression effective (pas un flag `deleted`).
5. Front : pages inscription/connexion/profil, formulaires avec `<label>` associés et messages d'erreur reliés par `aria-describedby`.

**DoD** — Un compte se crée, se connecte, exporte ses données et se supprime réellement. Les mots de passe ne sont jamais en clair ni journalisés.

---

## Phase 5 — F3 : intégrations temps réel

### Ce qu'on intègre
GTFS-RT Tisséo et GBFS, avec cache et résilience.

### Comment
1. **GTFS-RT** est du Protocol Buffers, pas du JSON → décode avec `gtfs-realtime-bindings`.
2. Tâche planifiée (`@nestjs/schedule`) : rafraîchissement toutes les 30–60 s.
3. **GBFS** : lire d'abord `gbfs.json` (auto-discovery), puis `station_status` / `free_bike_status`. Respecte le `ttl` annoncé par le flux.
4. Cache **Valkey** avec TTL aligné sur la fraîcheur réelle de la donnée.
5. **Dégradation gracieuse** — la règle du projet : chaque appel externe a un `timeout` et un fallback ; une source morte ne fait jamais échouer la réponse globale.
6. Un module par opérateur, tous derrière **une interface commune** (`FournisseurMobilite`). Ajouter un opérateur = ajouter une implémentation, sans toucher au cœur.

**DoD** — Les disponibilités remontent en direct ; couper un flux tiers ne provoque aucune erreur 500, seulement une réponse partielle annoncée.

---

## Phase 6 — F2 : planificateur multimodal *(cœur du produit)*

### Ce qu'on intègre
L'endpoint de calcul, l'agrégation, le tri, et l'écran carte.

### Comment
**Back — `POST /api/v1/itineraires`**
1. Corps : origine (lat/lon ou adresse), destination, préférences (modes, critère de tri).
2. Géocodage via le service `places` de l'API Tisséo ou Nominatim.
3. Appels **en parallèle** — c'est ce que montre ton diagramme de séquence :
   `Promise.allSettled([otp, gbfs, trafic])` — `allSettled`, pas `all`, sinon un échec fait tomber le tout.
4. Agrégation → calcul du CO₂ par segment → tri selon le critère demandé.
5. Cache Valkey sur les couples origine/destination fréquents.
6. Budget de performance : **< 2 s au 95ᵉ centile**. Mesure-le, ne le suppose pas.

**Front**
7. Carte **MapLibre GL** + fond de tuiles OSM.
8. Géolocalisation : `navigator.geolocation` — toujours prévoir la saisie manuelle en repli (permission refusée, zone blanche).
9. Écran conforme à la maquette V1 : deux champs, carte, tri segmenté, cartes de résultats comparables.

**DoD** — Un trajet Capitole → Blagnac renvoie plusieurs options multimodales triables, en moins de 2 s, et reste utilisable si la géolocalisation est refusée.

---

## Phase 7 — F4 : calculateur d'empreinte carbone

### Ce qu'on intègre
Le calcul CO₂, l'historique, et le bus d'évènements interne.

### Comment
1. Table de référence des **facteurs ADEME**, versionnée (garde la date de version : elle sera demandée en soutenance).
2. À l'enregistrement d'un trajet : `CO₂ = distance × facteur(mode)`, plus le comparatif voiture équivalent.
3. **Publier l'évènement** `TrajetEffectue` via `EventEmitter2` de NestJS.
   Le module Carbone le consomme. Le module Gamification aussi, **sans que les deux se connaissent** — c'est le découplage de ton diagramme de communication.
4. **Minimisation RGPD** : le tracé GPS brut sert au calcul puis n'est pas persisté. Seul l'agrégat (mode, distance, CO₂) est conservé.
5. Front : écran « Mon impact » avec le chiffre dominant et l'équivalent concret (km voiture évités).

**DoD** — Un trajet enregistré produit une empreinte cohérente ; aucune trace GPS brute en base ; l'évènement est bien consommé par deux modules indépendants.

---

## Phase 8 — Gamification

### Ce qu'on intègre
Points, badges, paliers, notifications push.

### Comment
1. Second consommateur de `TrajetEffectue`.
2. **Points pondérés par le CO₂ évité**, pas par le nombre de trajets (règle du dossier — plus juste et défendable).
3. Anti-fraude minimal : recoupe le mode déclaré avec la vitesse moyenne (un « vélo » à 90 km/h est un trajet voiture).
4. **Web Push** : génère des clés VAPID, gère l'abonnement, déclenche à l'approche d'un palier.

**DoD** — Les points s'attribuent, un badge se débloque, une notification push arrive sur mobile avec l'app installée.

---

## Phase 9 — PWA

### Ce qu'on intègre
Manifest, service worker, mode hors-ligne, installabilité.

### Comment
1. **Serwist** (successeur de `next-pwa`, compatible App Router).
2. `manifest.json` : nom, icônes (192 et 512 px), `display: standalone`, couleur de thème `#14589C`.
3. Stratégies de cache différenciées :
   - app shell → **cache-first**
   - tuiles cartographiques → **cache-first** avec expiration
   - données temps réel → **network-first** avec repli cache
4. **IndexedDB** pour l'historique carbone et le profil → consultables hors-ligne.
5. Vérifie l'installabilité via Lighthouse (HTTPS obligatoire, d'où le nom de domaine en phase 0).

**DoD** — L'app s'installe sur mobile, l'écran « Mon impact » s'ouvre en mode avion, et une notification push est reçue.

---

## Phase 10 — Accessibilité, sécurité, éco-conception

### Comment
- **axe-core** dans les tests : zéro violation critique, sinon la CI échoue.
- Navigation clavier complète, focus visible, cibles tactiles ≥ 48 px.
- Contrastes conformes AA (déjà validés dans le design system).
- Exploiter les champs **d'accessibilité PMR du GTFS** pour les itinéraires accessibles.
- Sécurité : en-têtes (CSP, HSTS), CORS restrictif, rate-limiting, aucun secret dans le code.
- Éco-conception : `next/image`, découpage du code, pas de polling (push WebSocket), purge automatique des données expirées.

**DoD** — Audit Lighthouse ≥ 90 en Performance et Accessibilité ; aucune violation axe critique.

---

## Phase 11 — Tests et intégration continue

### Comment
| Niveau | Outil | Cible |
|---|---|---|
| Unitaire | Jest | calcul carbone, règles de points, tri d'itinéraires |
| Intégration | Jest + conteneur PG | requêtes PostGIS, API externes simulées |
| E2E | Playwright | inscription → planification → consultation impact |
| Accessibilité | axe-core | pages principales |

**GitHub Actions** : sur chaque pull request → `lint` → `test` → `build`. Un échec bloque la fusion.

**DoD** — Le parcours critique est couvert en E2E et la CI est verte.

---

## Phase 12 — Déploiement sur OVHcloud

### Comment
1. VPS OVH (8–16 Go de RAM), Docker + Compose installés.
2. `docker-compose.prod.yml` avec les 5 services + **Caddy** en frontal (TLS Let's Encrypt automatique).
3. Secrets via variables d'environnement, jamais dans le dépôt.
4. Déploiement par GitHub Actions : build de l'image → push → `ssh` → `docker compose pull && up -d`.
5. **Sauvegardes** : `pg_dump` planifié + snapshot du VPS. Teste une restauration au moins une fois.
6. **Sentry** pour le suivi des erreurs en production.
7. Trois environnements : `dev` (local), `staging` (conteneur séparé), `prod`.

**DoD** — L'app est en ligne en HTTPS sur ton domaine, installable, et un `git push` sur `main` la met à jour automatiquement.

---

## Journal de bord

Tiens à jour `docs/avancement.md` avec une case à cocher par phase.
Le jury demande un **retour d'expérience sur les itérations** (points de friction, ajustements) : ce journal est ce qui te permettra de répondre précisément plutôt que de reconstruire de mémoire.

- [ ] Phase 0 — Prérequis
- [ ] Phase 1 — Socle monorepo
- [ ] Phase 2 — Base de données
- [ ] Phase 3 — OpenTripPlanner
- [ ] Phase 4 — F1 compte & profil
- [ ] Phase 5 — F3 temps réel
- [ ] Phase 6 — F2 planificateur
- [ ] Phase 7 — F4 carbone
- [ ] Phase 8 — Gamification
- [ ] Phase 9 — PWA
- [ ] Phase 10 — A11y / sécurité / éco
- [ ] Phase 11 — Tests & CI
- [ ] Phase 12 — Déploiement OVH
