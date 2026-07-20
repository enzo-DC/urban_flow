---
paths:
  - "apps/api/**/*.ts"
  - "packages/shared/**/*.ts"
---

# Back-end — apps/api (NestJS 11)

## Organisation

- Un module par domaine : `utilisateur`, `itineraire`, `geoloc`, `carbone`, `gamification`,
  `integrations` (Tisséo, GBFS).
- Monolithe **modulaire** : les modules communiquent par interfaces ou évènements, jamais par
  import direct d'un service interne d'un autre domaine.
- Chaque opérateur de mobilité est intégré derrière l'interface commune `FournisseurMobilite`.
  Ajouter un opérateur = ajouter une implémentation, sans modifier le cœur.

## Contrats d'API

- Endpoints préfixés `/api/v1/`.
- Les types de requête et de réponse vivent dans `packages/shared` et sont importés des deux côtés.
  Ne duplique jamais une interface entre front et back.
- Tous les DTO sont validés par `class-validator` (`ValidationPipe` global, `whitelist: true`).
- Codes de retour : `200` succès, `422` requête invalide, `503` aucune source disponible.

## Base de données

- Prisma pour le relationnel courant.
- **Requêtes spatiales en SQL natif** via `$queryRaw` : Prisma ne gère pas les types PostGIS.
  Colonnes déclarées `Unsupported("geography")`.
- Toute colonne géographique doit avoir un index **GiST**, sinon les recherches de proximité
  s'effondrent en performance.
- Motif de proximité : `ST_DWithin(position, ST_MakePoint($lon,$lat)::geography, rayon)`.

## Intégrations externes

- **GTFS-RT** : Protocol Buffers, décoder avec `gtfs-realtime-bindings`. Rafraîchissement
  planifié via `@nestjs/schedule` (30–60 s).
- **GBFS** : lire `gbfs.json` (auto-discovery) avant tout autre endpoint ; aligner le TTL du cache
  sur le `ttl` annoncé par le flux.
- **OpenTripPlanner** : appelé en HTTP (API GraphQL). Ne jamais reconstruire le graphe depuis le
  code applicatif.
- Chaque appel externe : timeout explicite + fallback. Les appels parallèles utilisent
  `Promise.allSettled`. Une source indisponible produit une réponse partielle, jamais une 500.

## Cache (Valkey)

- Cache les itinéraires fréquents et les disponibilités, avec un TTL cohérent avec la fraîcheur
  réelle de la donnée.
- Sessions et refresh tokens en Valkey : l'API doit rester **sans état** pour être répliquable.

## Évènements

- `TrajetEffectue` est publié par le module itinéraire via `EventEmitter2`.
- `carbone` et `gamification` le consomment indépendamment et **ne s'importent jamais l'un l'autre**.
- N'ajoute pas de dépendance directe entre consommateurs : c'est le point d'architecture défendu
  dans le dossier (couplage faible).

## Données personnelles

- Le tracé GPS brut sert au calcul puis n'est pas persisté ; seul l'agrégat est stocké.
- Aucune donnée personnelle dans les logs (ni position, ni email, ni token).
- Les routes d'export et de suppression de compte doivent rester fonctionnelles après toute
  évolution du modèle.

## Tests

- Logique métier (calcul carbone, attribution de points, tri d'itinéraires) : couverture unitaire
  obligatoire, c'est le cœur évalué du projet.
- Intégrations externes simulées (mocks) dans les tests d'intégration — jamais d'appel réseau réel
  en CI.
