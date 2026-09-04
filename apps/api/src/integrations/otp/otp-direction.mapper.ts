// Traduit le RelativeDirection d'OTP (etapes de marche pas a pas) en une
// instruction courte en francais. Liste des valeurs verifiee par
// introspection sur une instance OTP reelle avant d'ecrire ce mapping.
const DIRECTION_VERS_FR: Record<string, string> = {
  DEPART: 'Départ',
  CONTINUE: 'Continuez',
  LEFT: 'Tournez à gauche',
  RIGHT: 'Tournez à droite',
  SLIGHTLY_LEFT: 'Légèrement à gauche',
  SLIGHTLY_RIGHT: 'Légèrement à droite',
  HARD_LEFT: 'Tournez fortement à gauche',
  HARD_RIGHT: 'Tournez fortement à droite',
  UTURN_LEFT: 'Faites demi-tour',
  UTURN_RIGHT: 'Faites demi-tour',
  CIRCLE_CLOCKWISE: 'Prenez le rond-point',
  CIRCLE_COUNTERCLOCKWISE: 'Prenez le rond-point',
  ELEVATOR: "Prenez l'ascenseur",
  ENTER_STATION: 'Entrez dans la station',
  EXIT_STATION: 'Sortez de la station',
  FOLLOW_SIGNS: 'Suivez les panneaux',
};

// OTP renvoie des libelles generiques (pas des noms propres) quand aucune
// rue nommee ne s'applique — traduits ici, le reste (vrais noms de rue)
// reste tel quel.
const RUE_GENERIQUE_VERS_FR: Record<string, string> = {
  road: 'route',
  path: 'chemin',
  'bike path': 'piste cyclable',
  underpass: 'passage souterrain',
  overpass: 'passerelle',
  footway: 'sentier piéton',
};

export function versDirectionFrancaise(direction: string): string {
  return DIRECTION_VERS_FR[direction] ?? 'Continuez';
}

export function versNomRue(streetName: string | null): string | undefined {
  if (!streetName) return undefined;
  return RUE_GENERIQUE_VERS_FR[streetName] ?? streetName;
}
