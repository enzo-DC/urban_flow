/** Longueur minimale du mot de passe — partagée entre la validation
 * cote NestJS (RegisterDto) et la validation cote formulaire Next.js,
 * pour ne jamais laisser les deux dériver l'une de l'autre. */
export const PASSWORD_MIN_LENGTH = 12;
