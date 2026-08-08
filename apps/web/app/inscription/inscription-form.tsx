'use client';

import { PASSWORD_MIN_LENGTH } from '@urbanflow/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  consentementRgpd?: string;
}

export function InscriptionForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentementRgpd, setConsentementRgpd] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Entre une adresse e-mail valide.';
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Les deux mots de passe ne correspondent pas.';
    }
    if (!consentementRgpd) {
      errors.consentementRgpd =
        'Le consentement est requis pour créer un compte.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, consentementRgpd }),
      });
      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setFormError(extractErrorMessage(body));
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setFormError('Impossible de créer le compte pour le moment. Réessaie.');
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
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        {fieldErrors.email && (
          <p id="email-error" className="error" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? 'password-error' : 'password-hint'
          }
        />
        {fieldErrors.password ? (
          <p id="password-error" className="error" role="alert">
            {fieldErrors.password}
          </p>
        ) : (
          <p id="password-hint" className="hint">
            {PASSWORD_MIN_LENGTH} caractères minimum.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="confirm-password">Confirmer le mot de passe</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={
            fieldErrors.confirmPassword ? 'confirm-password-error' : undefined
          }
        />
        {fieldErrors.confirmPassword && (
          <p id="confirm-password-error" className="error" role="alert">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <div>
        <div className="checkbox-row">
          <input
            id="consentement-rgpd"
            name="consentementRgpd"
            type="checkbox"
            checked={consentementRgpd}
            onChange={(event) => setConsentementRgpd(event.target.checked)}
            aria-invalid={Boolean(fieldErrors.consentementRgpd)}
            aria-describedby={
              fieldErrors.consentementRgpd ? 'consentement-error' : undefined
            }
          />
          <label htmlFor="consentement-rgpd">
            J&apos;accepte que mes trajets servent à calculer mon empreinte
            carbone. Aucune position brute n&apos;est conservée.
          </label>
        </div>
        {fieldErrors.consentementRgpd && (
          <p id="consentement-error" className="error" role="alert">
            {fieldErrors.consentementRgpd}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={pending}
      >
        {pending ? 'Création…' : 'Créer mon compte'}
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
