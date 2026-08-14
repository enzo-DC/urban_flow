import { fetchWithTimeout } from './http-client.util';

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('renvoie la reponse quand fetch repond avant le delai', async () => {
    const response = new Response('ok', { status: 200 });
    global.fetch = jest.fn().mockResolvedValue(response);

    const result = await fetchWithTimeout('https://example.test', {
      timeoutMs: 1000,
    });

    expect(result).toBe(response);
  });

  it("abandonne l'appel si le delai est depasse", async () => {
    global.fetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    ) as unknown as typeof fetch;

    await expect(
      fetchWithTimeout('https://example.test', { timeoutMs: 20 }),
    ).rejects.toThrow();
  });
});
