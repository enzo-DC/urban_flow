# UrbanFlow Mobility — Roadmap détaillée par tâches et commits

Ce document découpe @markdown/PROGRAMME_PRODUCTION.md en tâches unitaires, chacune assez
petite pour correspondre à **un commit**. Respecte les règles de @markdown/CLAUDE.md,
@markdown/claude-rule-frontend.md et @markdown/claude-rule-backend.md pour chaque tâche.

**Convention de commit** : `type(scope): description` — Conventional Commits.
Types utilisés ici : `feat`, `fix`, `chore`, `docs`, `test`, `ci`.
Coche chaque case au fur et à mesure et reporte l'avancement dans `docs/avancement.md`.

---

## Sprint S0 — Phase 0 : Prérequis

**Feature : `setup-prerequisites`**

- [ ] `chore(env): vérifier et documenter les versions locales (node, pnpm, docker, java, git)`
- [ ] `docs(env): créer .env.example listant toutes les variables requises`
- [ ] `chore(accounts): demander la clé API Tisséo sur le portail open data`
- [ ] `chore(infra): provisionner le VPS OVHcloud (8-16 Go RAM) et réserver un nom de domaine`
- [ ] `chore(repo): créer le dépôt GitHub privé et configurer les accès`
- [ ] `chore(data): télécharger le GTFS Tisséo, l'extrait OSM Haute-Garonne (Geofabrik) et les flux GBFS`
- [ ] `docs(data): documenter la source et l'usage de chaque jeu de données (GTFS, GTFS-RT, OSM, GBFS, facteurs ADEME)`

**DoD sprint** : commandes de vérification OK, clé Tisséo demandée, `.env.example` complet.

---

## Sprint S0 — Phase 1 : Socle du monorepo

**Feature : `monorepo-bootstrap`**

- [ ] `chore(workspace): initialiser pnpm workspace (pnpm-workspace.yaml, package.json racine)`
- [ ] `feat(web): bootstrap Next.js 16 App Router dans apps/web (TypeScript, sans logique métier)`
- [ ] `feat(api): bootstrap NestJS 11 dans apps/api`
- [ ] `feat(shared): créer packages/shared avec les interfaces de base (Itineraire, Segment, ModeTransport)`
- [ ] `chore(lint): configurer ESLint + Prettier uniques à la racine, hérités par les deux apps`
- [ ] `chore(docker): écrire infra/docker-compose.yml avec les 5 services (db, cache, otp, api, web)`
- [ ] `chore(versions): fixer les versions critiques dans les package.json (pas de ^ sur les majeures)`
- [ ] `ci(lint): vérifier que pnpm lint passe sur les deux apps`

**DoD sprint** : `docker compose up` démarre les 5 services, page d'accueil Next.js répond, `pnpm lint` passe.

---

## Sprint S1 — Phase 2 : Base de données et modèle de domaine

**Feature : `database-domain-model`**

- [ ] `chore(db): ajouter l'image postgis/postgis:18-3.6 dans docker-compose`
- [ ] `chore(orm): installer et configurer Prisma`
- [ ] `feat(db): migration initiale — activer l'extension postgis (CREATE EXTENSION)`
- [ ] `feat(db): modéliser l'entité Utilisateur`
- [ ] `feat(db): modéliser l'entité ProfilMobilite`
- [ ] `feat(db): modéliser l'entité Trajet`
- [ ] `feat(db): modéliser l'entité Itineraire et Segment`
- [ ] `feat(db): modéliser l'entité EmpreinteCarbone`
- [ ] `feat(db): modéliser l'entité Recompense`
- [ ] `feat(db): modéliser l'entité Operateur`
- [ ] `feat(db): déclarer les colonnes géographiques en geography(Point, 4326) via Unsupported`
- [ ] `feat(db): ajouter les index GiST sur chaque colonne géographique`
- [ ] `feat(db): écrire la requête de proximité de référence (ST_DWithin) en SQL natif`
- [ ] `chore(db): écrire le script de seed avec des données synthétiques uniquement`
- [ ] `test(db): test d'intégration validant une requête de proximité correcte`

**DoD sprint** : migrations rejouables de zéro, seed fonctionnel, requête de proximité correcte.

---

## Sprint S1 — Phase 3 : OpenTripPlanner *(risque technique prioritaire)*

**Feature : `otp-engine`**

- [ ] `chore(otp): placer toulouse.osm.pbf et le GTFS Tisséo dans infra/otp/`
- [ ] `chore(otp): récupérer otp-shaded-*.jar depuis Maven Central`
- [ ] `chore(otp): construire le graphe (java -Xmx8G --build --save)`
- [ ] `chore(otp): servir le graphe construit (--load) et vérifier le rechargement au redémarrage`
- [ ] `feat(otp): déclarer les flux GBFS dans router-config.json`
- [ ] `test(otp): valider une requête GraphQL de référence (Capitole → Blagnac)`
- [ ] `ci(otp): planifier la reconstruction du graphe à la publication d'un nouveau GTFS`
- [ ] `docs(otp): noter les pièges rencontrés (RAM, taille de l'extrait OSM) dans docs/avancement.md`

**DoD sprint** : requête d'itinéraire multimodal cohérente, redémarrage via graphe sauvegardé.

---

## Sprint S2 — Phase 4 : F1 — Compte et profil de mobilité

**Feature : `feature-account-profile`**

- [ ] `feat(auth): implémenter l'inscription avec hachage argon2`
- [ ] `feat(auth): implémenter la connexion avec JWT court (15 min) + refresh token httpOnly/Secure/SameSite`
- [ ] `feat(auth): endpoint de rafraîchissement du token`
- [ ] `feat(users): endpoint profil (lecture/écriture) avec validation class-validator sur tous les DTO`
- [ ] `feat(gdpr): consentement explicite horodaté à l'inscription`
- [ ] `feat(gdpr): endpoint GET /api/v1/moi/export — archive JSON de toutes les données`
- [ ] `feat(gdpr): endpoint DELETE /api/v1/moi — suppression effective (pas de flag deleted)`
- [ ] `feat(web): page d'inscription avec labels associés et erreurs en aria-describedby`
- [ ] `feat(web): page de connexion accessible (clavier, focus visible)`
- [ ] `feat(web): page profil (préférences, accessibilité PMR, droits RGPD)`
- [ ] `test(auth): tests unitaires sur l'auth et les DTO de validation`
- [ ] `test(gdpr): test E2E export + suppression réelle des données`

**DoD sprint** : compte créé/connecté/exporté/supprimé réellement ; mots de passe jamais en clair ni journalisés.

---

## Sprint S3 — Phase 5 : F3 — Intégrations temps réel

**Feature : `feature-realtime-integrations`**

- [ ] `feat(integrations): définir l'interface commune FournisseurMobilite`
- [ ] `feat(integrations): décoder le flux GTFS-RT Tisséo avec gtfs-realtime-bindings`
- [ ] `feat(integrations): tâche planifiée de rafraîchissement GTFS-RT (30-60s) via @nestjs/schedule`
- [ ] `feat(integrations): lire gbfs.json (auto-discovery) puis station_status/free_bike_status`
- [ ] `feat(cache): mettre en cache les résultats GBFS/GTFS-RT dans Valkey avec TTL aligné sur le flux`
- [ ] `feat(integrations): ajouter timeout + fallback sur chaque appel externe (dégradation gracieuse)`
- [ ] `feat(integrations): implémenter un module VélôToulouse derrière FournisseurMobilite`
- [ ] `feat(integrations): implémenter un module scooters partagés derrière FournisseurMobilite`
- [ ] `test(integrations): test simulant la coupure d'un flux tiers — vérifier l'absence de 500`

**DoD sprint** : disponibilités en direct ; coupure d'un flux tiers = réponse partielle, jamais 500.

---

## Sprint S4-S5 — Phase 6 : F2 — Planificateur multimodal *(cœur du produit)*

**Feature : `feature-multimodal-planner`**

Back :
- [ ] `feat(itineraire): DTO de requête POST /api/v1/itineraires (origine, destination, préférences)`
- [ ] `feat(itineraire): géocodage via service places Tisséo ou Nominatim`
- [ ] `feat(itineraire): appels parallèles Promise.allSettled([otp, gbfs, trafic])`
- [ ] `feat(itineraire): agrégation des résultats et calcul du CO2 par segment`
- [ ] `feat(itineraire): tri des itinéraires selon le critère demandé`
- [ ] `feat(cache): cache Valkey sur les couples origine/destination fréquents`
- [ ] `test(itineraire): mesurer le budget de performance (< 2s au 95e centile)`

Front :
- [ ] `feat(web): intégrer la carte MapLibre GL + fond de tuiles OSM (composant client, sans SSR)`
- [ ] `feat(web): géolocalisation navigator.geolocation avec repli sur saisie manuelle`
- [ ] `feat(web): écran planificateur (deux champs, carte, tri segmenté)`
- [ ] `feat(web): cartes de résultats comparables (itinéraires)`
- [ ] `test(web): test E2E — trajet Capitole → Blagnac renvoie plusieurs options triables`

**DoD sprint** : plusieurs options multimodales triables en < 2s, utilisable sans géolocalisation.

---

## Sprint S6 — Phase 7 : F4 — Calculateur d'empreinte carbone

**Feature : `feature-carbon-footprint`**

- [ ] `feat(carbone): table de référence des facteurs ADEME versionnée (avec date de version)`
- [ ] `feat(carbone): calcul CO2 = distance × facteur(mode) à l'enregistrement d'un trajet`
- [ ] `feat(carbone): calcul du comparatif voiture équivalent`
- [ ] `feat(events): publier l'évènement TrajetEffectue via EventEmitter2`
- [ ] `feat(carbone): consommer TrajetEffectue dans le module carbone (sans import direct d'autres modules)`
- [ ] `feat(gdpr): s'assurer que le tracé GPS brut n'est jamais persisté (seul l'agrégat l'est)`
- [ ] `feat(web): écran "Mon impact" avec chiffre dominant et équivalent concret`
- [ ] `test(carbone): tests unitaires du calcul carbone (cœur évalué du projet)`

**DoD sprint** : empreinte cohérente, aucune trace GPS brute en base, évènement consommé par 2 modules indépendants.

---

## Sprint S6 — Phase 8 : Gamification

**Feature : `feature-gamification`**

- [ ] `feat(gamification): consommer TrajetEffectue en second consommateur indépendant`
- [ ] `feat(gamification): attribution de points pondérés par le CO2 évité (pas par nombre de trajets)`
- [ ] `feat(gamification): règle anti-fraude — recouper mode déclaré et vitesse moyenne`
- [ ] `feat(gamification): modèle badges et paliers`
- [ ] `feat(push): générer les clés VAPID et gérer l'abonnement Web Push`
- [ ] `feat(push): déclencher une notification à l'approche d'un palier`
- [ ] `test(gamification): tests unitaires sur l'attribution de points et l'anti-fraude`

**DoD sprint** : points attribués, badge débloqué, notification push reçue sur mobile installé.

---

## Sprint S7 — Phase 9 : PWA

**Feature : `feature-pwa`**

- [ ] `chore(pwa): installer et configurer Serwist`
- [ ] `feat(pwa): manifest.json (nom, icônes 192/512, display standalone, couleur #14589C)`
- [ ] `feat(pwa): stratégie cache-first pour l'app shell`
- [ ] `feat(pwa): stratégie cache-first avec expiration pour les tuiles cartographiques`
- [ ] `feat(pwa): stratégie network-first avec repli cache pour les données temps réel`
- [ ] `feat(pwa): IndexedDB pour historique carbone et profil, consultables hors-ligne`
- [ ] `chore(pwa): vérifier l'installabilité et le HTTPS via Lighthouse`

**DoD sprint** : app installable, écran "Mon impact" accessible en mode avion, notification push reçue.

---

## Sprint S7 — Phase 10 : Accessibilité, sécurité, éco-conception

**Feature : `feature-a11y-security-ecodesign`**

- [ ] `test(a11y): intégrer axe-core dans les tests — zéro violation critique`
- [ ] `feat(a11y): navigation clavier complète et focus visible sur toutes les pages`
- [ ] `feat(a11y): vérifier les cibles tactiles ≥ 48px et les contrastes AA`
- [ ] `feat(itineraire): exploiter les champs d'accessibilité PMR du GTFS pour les itinéraires accessibles`
- [ ] `feat(security): en-têtes CSP, HSTS, CORS restrictif`
- [ ] `feat(security): rate-limiting sur les endpoints sensibles`
- [ ] `chore(security): audit — aucun secret en dur dans le code`
- [ ] `feat(eco): utiliser next/image et le découpage de code (code-splitting)`
- [ ] `feat(eco): remplacer le polling par du push WebSocket là où c'est pertinent`
- [ ] `feat(eco): purge automatique des données expirées`
- [ ] `ci(a11y): audit Lighthouse ≥ 90 en Performance et Accessibilité`

**DoD sprint** : Lighthouse ≥ 90 (Perf + A11y), aucune violation axe critique.

---

## Sprint S8 — Phase 11 : Tests et intégration continue

**Feature : `feature-tests-ci`**

- [ ] `test(unit): tests Jest — calcul carbone, règles de points, tri d'itinéraires`
- [ ] `test(integration): tests Jest + conteneur PG — requêtes PostGIS, API externes simulées`
- [ ] `test(e2e): scénario Playwright — inscription → planification → consultation impact`
- [ ] `test(a11y): axe-core sur les pages principales`
- [ ] `ci(pipeline): GitHub Actions — lint → test → build sur chaque pull request`
- [ ] `ci(pipeline): bloquer la fusion en cas d'échec`

**DoD sprint** : parcours critique couvert en E2E, CI verte.

---

## Sprint S8 — Phase 12 : Déploiement sur OVHcloud

**Feature : `feature-deployment`**

- [ ] `chore(infra): provisionner et configurer le VPS OVH (Docker + Compose)`
- [ ] `chore(infra): écrire docker-compose.prod.yml avec les 5 services + Caddy (TLS Let's Encrypt)`
- [ ] `chore(security): externaliser tous les secrets en variables d'environnement`
- [ ] `ci(deploy): pipeline GitHub Actions — build image → push → ssh → docker compose pull && up -d`
- [ ] `chore(backup): planifier pg_dump et snapshot VPS`
- [ ] `test(backup): tester une restauration complète au moins une fois`
- [ ] `feat(observability): intégrer Sentry pour le suivi des erreurs en production`
- [ ] `chore(env): mettre en place les trois environnements dev / staging / prod`

**DoD sprint** : app en ligne en HTTPS, installable, mise à jour automatique via git push sur main.

---

## Suivi transverse

**Feature : `docs-journal`**

- [ ] `docs(journal): créer docs/avancement.md avec une case à cocher par phase`
- [ ] `docs(journal): tenir à jour le retour d'expérience par itération (frictions, ajustements)`

---

## Rappels non négociables (à vérifier avant chaque commit sensible)

- RGPD : pas de tracé GPS brut persisté, jeux de test synthétiques, export/suppression toujours fonctionnels.
- Résilience : `Promise.allSettled` (jamais `.all`), timeout + fallback sur tout appel externe.
- Sécurité : aucun secret en dur/journalisé, validation `class-validator` sur tous les DTO.
- Accessibilité : clavier, focus visible, cibles ≥ 48px, jamais la couleur seule pour une information.
- Découplage : `carbone` et `gamification` ne s'importent jamais l'un l'autre — uniquement via `TrajetEffectue`.
- Commits en **Conventional Commits**, code/commentaires en anglais, UI/doc en français.
