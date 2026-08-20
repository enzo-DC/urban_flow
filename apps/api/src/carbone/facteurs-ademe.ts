import type { ModeTransport } from '@urbanflow/shared';

/**
 * Table de reference des facteurs d'emission (g CO2e / km, ou g CO2e /
 * voyageur.km pour le transport collectif), compilee le 2026-08-20.
 *
 * Source unique pour toute l'application : l'estimation affichee au moment
 * de la planification (Phase 6, itineraires/) et le calcul definitif
 * enregistre a la fin d'un trajet reellement effectue (Phase 7) partagent
 * cette meme table — jamais deux chiffres differents pour le meme concept.
 *
 * Avertissement methodologique (transparence deliberee, pas un oubli) :
 * les sources melangent deux perimetres differents selon la disponibilite
 * des donnees —
 *   - phase d'usage seule (carburant/electricite consommes) pour bus,
 *     metro, tram, voiture ;
 *   - cycle de vie complet (fabrication + logistique de collecte incluses)
 *     pour la trottinette/le scooter, seule donnee ADEME disponible pour
 *     ces modes et la plus pertinente : leur impact reel est domine par la
 *     collecte/recharge, pas l'electricite de charge elle-meme.
 * Une comparaison strictement egale sur tous les modes demanderait une
 * etude ADEME cycle de vie complet pour chacun, qui n'existe pas encore
 * pour le reseau Tisseo specifiquement.
 */
export const VERSION_TABLE_ADEME = '2026-08-20';

interface FacteurAdeme {
  grammesParKm: number;
  source: string;
}

const TABLE_ADEME: Record<ModeTransport, FacteurAdeme> = {
  marche: {
    grammesParKm: 0,
    source: "ADEME — phase d'usage nulle (marche/velo, pas de carburant)",
  },
  velo: {
    grammesParKm: 0,
    source: "ADEME — phase d'usage nulle (marche/velo, pas de carburant)",
  },
  trottinette: {
    grammesParKm: 120,
    source:
      'ADEME, etude trottinettes en libre-service 2020 (1ere generation ; ' +
      'cycle de vie incluant la logistique de collecte/recharge, dominante ' +
      'dans leur impact reel — les generations recentes seraient environ ' +
      'deux fois moins emettrices, mais sans facteur ADEME chiffre publie)',
  },
  scooter: {
    grammesParKm: 120,
    source:
      'Assimile a la trottinette en libre-service (ADEME 2020) : pas de ' +
      'facteur ADEME dedie aux scooters electriques partages, meme ' +
      'logistique de collecte/recharge par vehicule',
  },
  bus: {
    grammesParKm: 92,
    source:
      'ADEME Base Carbone, "Autobus, Gazole, Courte distance" (phase ' +
      "d'usage, carburant) — via Open Data Ile-de-France Mobilites",
  },
  metro: {
    grammesParKm: 3.8,
    source:
      "RATP 2019, reseau metro parisien (phase d'usage, electricite) — " +
      'reference nationale standard, Tisseo ne publie pas de facteur propre',
  },
  tram: {
    grammesParKm: 3.2,
    source:
      "RATP/Transilien 2019 (phase d'usage, electricite) — reference " +
      'nationale standard, Tisseo ne publie pas de facteur propre',
  },
  voiture: {
    grammesParKm: 214,
    source:
      'ADEME Base Empreinte, voiture particuliere thermique moyenne ' +
      "(phase d'usage, carburant + amont filiere)",
  },
};

export function calculerCo2Grammes(
  mode: ModeTransport,
  distanceMetres: number,
): number {
  const km = distanceMetres / 1000;
  return Math.round(TABLE_ADEME[mode].grammesParKm * km);
}

/**
 * CO2 evite par rapport a un trajet equivalent effectue en voiture seule.
 * Ne peut jamais etre negatif : un trajet fait en voiture n'evite rien.
 */
export function calculerCo2EviteGrammes(
  distanceTotaleMetres: number,
  co2ReelGrammes: number,
): number {
  const co2VoitureEquivalent = calculerCo2Grammes(
    'voiture',
    distanceTotaleMetres,
  );
  return Math.max(0, co2VoitureEquivalent - co2ReelGrammes);
}

export function sourceFacteur(mode: ModeTransport): string {
  return TABLE_ADEME[mode].source;
}
