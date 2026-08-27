// Petit magasin cle/valeur IndexedDB, sans dependance externe : sert a
// rendre l'historique carbone et le profil consultables hors-ligne
// (Phase 9, PWA). Chaque cle stocke la derniere valeur connue, ecrasee a
// chaque chargement reseau reussi.
const DB_NAME = 'urbanflow-hors-ligne';
const STORE_NAME = 'donnees';
const DB_VERSION = 1;

function ouvrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(DB_NAME, DB_VERSION);
    requete.onupgradeneeded = () => {
      requete.result.createObjectStore(STORE_NAME);
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error as Error);
  });
}

export async function sauvegarderHorsLigne<T>(
  cle: string,
  valeur: T,
): Promise<void> {
  const db = await ouvrirDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(valeur, cle);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error as Error);
  });
  db.close();
}

export async function lireHorsLigne<T>(cle: string): Promise<T | null> {
  const db = await ouvrirDb();
  const valeur = await new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const requete = transaction.objectStore(STORE_NAME).get(cle);
    requete.onsuccess = () =>
      resolve((requete.result as T | undefined) ?? null);
    requete.onerror = () => reject(requete.error as Error);
  });
  db.close();
  return valeur;
}
