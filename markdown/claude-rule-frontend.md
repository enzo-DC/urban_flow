---
paths:
  - "apps/web/**/*.{ts,tsx,css}"
---

# Front-end — apps/web

## Next.js 16 (App Router)

- Server Components **par défaut**. N'ajoute `"use client"` que si le composant a besoin d'état,
  d'un effet, ou d'une API navigateur (géolocalisation, carte).
- La carte MapLibre est forcément un composant client, chargé en dynamique sans SSR.
- Pas de logique métier ici : le calcul d'itinéraire, le CO₂ et les points vivent dans `apps/api`.
  Le front affiche et agrège, il ne décide pas.
- Les appels réseau passent par les Route Handlers de Next (rôle BFF), qui relaient vers NestJS.
  Ne jamais exposer l'URL interne de l'API ni un secret côté client.

## Design system — jetons imposés

Ces valeurs viennent du dossier de conception (§11.3). Ne les improvise pas.

| Rôle | Valeur |
|---|---|
| Primaire (actions, liens, mode actif) | `#14589C` |
| Primaire foncé (états actifs) | `#0F3F73` |
| Gain carbone / succès | `#1E7A46` |
| Perturbation / alerte | `#B45309` |
| Texte principal | `#0F1B26` |
| Texte secondaire | `#5A6B7B` |
| Surfaces | `#F5F8FA` · `#E8F1FA` · `#E4F2EA` |

- Police **Inter**, auto-hébergée (jamais via un CDN tiers : performance et RGPD).
- Échelle typographique : 32 / 24 / 20 / 16 / 14 px. Corps minimum **16 px** sur mobile.
- Tous les espacements sont des multiples de **8 px**.
- Le vert est réservé au bénéfice environnemental mesuré. Ne l'utilise pas pour une action neutre.

## Accessibilité

- Chaque champ a un `<label>` associé ; les erreurs sont reliées par `aria-describedby`.
- Ordre de tabulation logique, focus visible non supprimé.
- Cibles tactiles ≥ 48 px.
- La carte doit avoir une alternative textuelle : la liste des itinéraires reste utilisable seule,
  sans interaction cartographique.

## PWA (Serwist)

- App shell et tuiles cartographiques → **cache-first**.
- Données temps réel → **network-first** avec repli sur le cache.
- Historique carbone et profil → IndexedDB, consultables hors-ligne.
- Ne mets jamais en cache une réponse authentifiée contenant des données personnelles.

## Écrans

Respecte la maquette V1 : planificateur (deux champs, carte, tri segmenté, cartes de résultats),
« Mon impact » (chiffre dominant + équivalent concret), profil (préférences, PMR, droits RGPD).
Barre de navigation à trois entrées — ne l'étends pas sans me demander.
