# UrbanFlow Mobility

Plateforme de mobilité urbaine multimodale (PWA) pour Toulouse Métropole.
Agrège le réseau Tisséo, VélôToulouse et les scooters partagés ; calcule des itinéraires
multimodaux, l'empreinte carbone évitée et des récompenses.

Projet de certification RNCP 36146 (Concepteur Développeur de Solutions Digitales).
Le dossier de conception fait foi sur les décisions d'architecture : @docs/PROGRAMME_PRODUCTION.md

## Stack — versions imposées

| Couche | Techno | Version |
|---|---|---|
| Runtime | Node.js | 24 LTS |
| Langage | TypeScript | 6.0 (strict) |
| Front / PWA | Next.js (App Router) + Serwist | 16 |
| Carto | MapLibre GL JS + tuiles OSM | — |
| Back | NestJS (Express 5) | 11 |
| BDD | PostgreSQL + PostGIS | 18 / 3.6 |
| Cache | Valkey | 9 |
| Itinéraires | OpenTripPlanner (JVM Java 25) | 2 |
| Hébergement | OVHcloud (VPS, Docker Compose) | — |

Ne propose pas de changer ces briques : chacune est justifiée par une matrice décisionnelle
dans le dossier. Signale-moi un problème plutôt que de substituer une alternative.

## Structure

```
apps/web/       Next.js — présentation + BFF. Aucune logique métier ici.
apps/api/       NestJS — domaine métier, intégrations, calculs.
packages/shared Types & DTO partagés. Source de vérité des contrats front/back.
infra/          docker-compose, config OTP, graphe.
docs/           Programme de production, avancement, décisions.
```

## Commandes

```bash
pnpm install              # à la racine uniquement (workspace pnpm)
docker compose up -d      # db, cache, otp, api, web
pnpm --filter web dev     # front seul
pnpm --filter api dev     # back seul
pnpm lint                 # ESLint + Prettier
pnpm test                 # Jest (unitaire + intégration)
pnpm test:e2e             # Playwright
```

Utilise **pnpm**, jamais npm ni yarn.

## Règles non négociables

Ces règles viennent des contraintes de certification. Une violation est un défaut bloquant.

**RGPD**
- Le tracé GPS brut sert au calcul puis n'est **jamais persisté**. Seul l'agrégat est stocké
  (mode, distance, CO₂).
- Les jeux de test et de développement sont **synthétiques**. Jamais de position réelle en base.
- L'export et la suppression de compte doivent rester fonctionnels à chaque évolution du modèle.
  Une suppression efface réellement les lignes ; ce n'est pas un drapeau `deleted`.

**Accessibilité — WCAG 2.1 AA**
- Tout élément interactif est atteignable au clavier, avec focus visible.
- Cibles tactiles ≥ 48 × 48 px.
- L'information n'est jamais portée par la seule couleur : toujours doubler d'un texte ou d'une icône.
- Aucune violation axe-core critique ne doit passer en CI.

**Résilience**
- Tout appel à une API tierce (Tisséo, GBFS, OTP) a un timeout et un fallback.
- Les appels parallèles utilisent `Promise.allSettled`, jamais `Promise.all` : une source
  indisponible ne doit pas faire échouer la réponse globale.

**Sécurité**
- Aucun secret en dur ni journalisé. Variables d'environnement uniquement.
- Validation de toutes les entrées via `class-validator` sur les DTO.

## Pièges spécifiques à ce projet

- **PostGIS + Prisma** : Prisma ne gère pas les types géographiques. Déclare-les en
  `Unsupported("geography")` et écris les requêtes spatiales en SQL natif via `$queryRaw`.
  Toute colonne géographique doit avoir un index GiST.
- **OpenTripPlanner** : le graphe se construit une fois et se recharge (`--load`). Ne jamais
  le reconstruire au démarrage. Le paramètre `-Xmx` est la cause quasi systématique des échecs
  de build. Requiert Java 25.
- **GTFS-RT** est du Protocol Buffers, pas du JSON. Décoder avec `gtfs-realtime-bindings`.
- **GBFS** : lire `gbfs.json` (auto-discovery) avant les autres endpoints, et respecter le `ttl`
  annoncé par le flux pour le TTL du cache.
- **Valkey, pas Redis** : image et client Valkey (fork BSD). Le protocole est identique, donc les
  clients Redis fonctionnent, mais garde la dénomination Valkey partout.
- **Découplage carbone / gamification** : les deux modules consomment l'évènement
  `TrajetEffectue` via `EventEmitter2` et **ne doivent jamais s'importer l'un l'autre**.

## Conventions

- TypeScript `strict`. Pas de `any` : si un type manque, écris-le dans `packages/shared`.
- Le code, les noms de variables et les commentaires sont en **anglais**.
  L'interface utilisateur et la documentation sont en **français**.
- Un module NestJS par domaine métier (utilisateur, itineraire, geoloc, carbone, gamification).
- Endpoints préfixés `/api/v1/`.
- Commits en Conventional Commits (`feat:`, `fix:`, `docs:`…).
- Commentaires rares et utiles : explique *pourquoi*, pas *quoi*.

## Attentes de travail

- Avant de coder une fonctionnalité, vérifie la phase correspondante dans
  @docs/PROGRAMME_PRODUCTION.md et suis son ordre.
- Après une modification, lance `pnpm lint` et les tests concernés, et dis-moi ce qui a échoué.
- Ne crée pas de fichier de documentation spontanément ; mets à jour `docs/avancement.md`
  quand une phase se termine.
- Si une décision te semble contredire le dossier, signale-le avant d'implémenter.
