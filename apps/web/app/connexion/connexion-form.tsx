'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function ConnexionForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setFormError(extractErrorMessage(body));
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setFormError('Impossible de se connecter pour le moment. Réessaie.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="form-banner error" role="alert">
          {formError}
        </p>
      )}

      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={pending}
      >
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function extractErrorMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return 'Une erreur est survenue. Réessaie.';
}
