'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Dernier recours : remplace TOUT le rendu (y compris app/layout.tsx, donc
// sans les styles globaux) si une erreur echappe a chaque frontiere
// d'erreur normale de l'application. Rare par construction — reste
// volontairement minimal, sans dependance a globals.css.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: '80px 20px',
        }}
      >
        <h1>Une erreur inattendue est survenue</h1>
        <p>L&rsquo;équipe a été prévenue. Réessaie dans un instant.</p>
      </body>
    </html>
  );
}
