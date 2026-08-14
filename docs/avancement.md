# Journal de bord — UrbanFlow Mobility

Suivi de l'avancement par phase (voir `markdown/PROGRAMME_PRODUCTION.md`), avec les points de
friction rencontrés et les ajustements faits par rapport au plan initial.

- [x] Phase 0 — Prérequis
- [x] Phase 1 — Socle monorepo
- [x] Phase 2 — Base de données
- [x] Phase 3 — OpenTripPlanner
- [x] Phase 4 — F1 compte & profil
- [ ] Phase 5 — F3 temps réel
- [ ] Phase 6 — F2 planificateur
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
