import { createSerwistRoute } from '@serwist/turbopack';

// esbuild-wasm plante sous Windows (chemin de working directory invalide
// pour son layout POSIX interne) — on laisse donc useNativeEsbuild a son
// defaut par plateforme : natif sous Windows (dev), esbuild-wasm sous
// Linux (image Docker), les deux paquets etant installes.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: 'app/sw.ts',
  });
