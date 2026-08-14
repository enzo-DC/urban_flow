export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs: number;
}

/**
 * Wrapper autour de fetch avec timeout explicite — regle non negociable du
 * projet pour tout appel a une API tierce (voir markdown/claude-rule-backend.md).
 * Rejette avec une erreur d'abandon si le delai est depasse ; a l'appelant
 * de fournir le repli (fallback).
 */
export async function fetchWithTimeout(
  url: string,
  { timeoutMs, ...init }: FetchWithTimeoutOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
