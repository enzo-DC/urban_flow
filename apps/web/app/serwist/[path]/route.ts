import { createSerwistRoute } from '@serwist/turbopack';

// esbuild-wasm plante sous Windows (chemin de working directory invalide
// pour son layout POSIX interne) — on laisse donc useNativeEsbuild a son
// defaut par plateforme : natif sous Windows (dev), esbuild-wasm sous
// Linux (image Docker), les deux paquets etant installes.
//
// La page /hors-ligne (repli de navigation, voir app/sw.ts) est precachee
// explicitement : c'est une route dynamique (server component), pas un
// fichier statique du dossier public, donc non couverte par
// globPublicPatterns. Revision = horodatage de build, pas de dependance
// a git (indisponible dans l'image Docker).
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: 'app/sw.ts',
    additionalPrecacheEntries: [
      { url: '/hors-ligne', revision: String(Date.now()) },
    ],
  });
