'use client';

import type { LieuGeocode } from '@urbanflow/shared';
import { useRef, useState } from 'react';

const DEBOUNCE_MS = 350;
const LONGUEUR_MIN = 3;

interface ChampAdresseProps {
  id: string;
  label: string;
  valeur: LieuGeocode | null;
  onSelect: (lieu: LieuGeocode) => void;
  placeholder?: string;
}

export function ChampAdresse({
  id,
  label,
  valeur,
  onSelect,
  placeholder,
}: ChampAdresseProps) {
  const [texte, setTexte] = useState(valeur?.label ?? '');
  const [resultats, setResultats] = useState<LieuGeocode[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Adapte l'input a une valeur choisie ailleurs (ex. geolocalisation) sans
  // effacer une saisie locale en cours : comparaison pendant le rendu plutot
  // qu'un effet (cf. "You Might Not Need an Effect", React).
  const [derniereValeur, setDerniereValeur] = useState(valeur);
  if (valeur !== derniereValeur) {
    setDerniereValeur(valeur);
    setTexte(valeur?.label ?? '');
  }

  function handleChange(value: string) {
    setTexte(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < LONGUEUR_MIN) {
      setResultats([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void rechercher(value);
    }, DEBOUNCE_MS);
  }

  async function rechercher(value: string) {
    try {
      const res = await fetch(`/api/lieux?q=${encodeURIComponent(value)}`);
      if (!res.ok) return;
      const body = (await res.json()) as LieuGeocode[];
      setResultats(body);
      setOuvert(true);
    } catch {
      setResultats([]);
    }
  }

  function handleSelect(lieu: LieuGeocode) {
    onSelect(lieu);
    setTexte(lieu.label);
    setResultats([]);
    setOuvert(false);
  }

  return (
    <div className="field search-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={texte}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => resultats.length > 0 && setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
      />
      {ouvert && resultats.length > 0 && (
        <ul className="search-results" role="listbox">
          {resultats.map((lieu) => (
            <li key={`${lieu.position.latitude},${lieu.position.longitude}`}>
              <button type="button" onMouseDown={() => handleSelect(lieu)}>
                {lieu.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
