# Journal de bord — UrbanFlow Mobility

Suivi de l'avancement par phase (voir `markdown/PROGRAMME_PRODUCTION.md`), avec les points de
friction rencontrés et les ajustements faits par rapport au plan initial.

- [x] Phase 0 — Prérequis
- [x] Phase 1 — Socle monorepo
- [x] Phase 2 — Base de données
- [x] Phase 3 — OpenTripPlanner
- [ ] Phase 4 — F1 compte & profil
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
