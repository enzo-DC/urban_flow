import type { cookies } from 'next/headers';

// access_token expire au bout de 15 min, refresh_token au bout de 7 j — un
// access_token absent (supprime par le navigateur a expiration) ne veut pas
// dire deconnecte tant que refresh_token reste valide : le rafraichissement
// se fait cote client au premier appel API (voir app/api/_lib/authenticated.ts).
// Ne verifier que access_token ici forcerait une reconnexion manuelle toutes
// les 15 min a chaque navigation vers une page protegee — vrai bug trouve en
// lisant le flux complet, corrige ici en meme temps que le cote API.
export function peutEtreAuthentifie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): boolean {
  return Boolean(
    cookieStore.get('access_token') || cookieStore.get('refresh_token'),
  );
}
