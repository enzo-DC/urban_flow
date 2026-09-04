'use client';

import type {
  ArretTransport,
  Itineraire,
  LieuGeocode,
} from '@urbanflow/shared';
import {
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { decodePolyline } from './decode-polyline';

const CENTRE_TOULOUSE: [number, number] = [1.4442, 43.6045];
const TRACE_LAYER_ID = 'trace-itineraire';

const STYLE_OSM: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© les contributeurs OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// MapLibre ne fournit ses controles qu'en anglais par defaut (voir
// default_locale.ts du paquet) — seules les cles reellement utilisees par
// les controles ajoutes ci-dessous (Navigation + Geolocate) sont traduites.
const LOCALE_FR: Record<string, string> = {
  'NavigationControl.ZoomIn': 'Zoomer',
  'NavigationControl.ZoomOut': 'Dézoomer',
  'NavigationControl.ResetBearing':
    'Faites glisser pour pivoter, cliquez pour réinitialiser le nord',
  'GeolocateControl.FindMyLocation': 'Afficher ma position',
  'GeolocateControl.LocationNotAvailable': 'Position indisponible',
};

const COULEUR_MODE: Record<string, string> = {
  marche: '#5a6b7b',
  velo: '#1e7a46',
  trottinette: '#1e7a46',
  scooter: '#b45309',
  bus: '#14589c',
  metro: '#14589c',
  tram: '#14589c',
  voiture: '#b45309',
};

interface CartePlanificateurProps {
  depart: LieuGeocode | null;
  arrivee: LieuGeocode | null;
  itineraire: Itineraire | null;
}

export function CartePlanificateur({
  depart,
  arrivee,
  itineraire,
}: CartePlanificateurProps) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<MapLibreMap | null>(null);
  const marqueursRef = useRef<Marker[]>([]);
  const arretsMarqueursRef = useRef<Marker[]>([]);
  // Ecarte une reponse d'arrets perimee (recherche precedente) qui
  // arriverait apres une nouvelle : seule la derniere requete en vol compte.
  const arretsRequeteIdRef = useRef(0);

  useEffect(() => {
    if (!conteneurRef.current) return;
    const carte = new MapLibreMap({
      container: conteneurRef.current,
      style: STYLE_OSM,
      center: CENTRE_TOULOUSE,
      zoom: 12,
      locale: LOCALE_FR,
    });
    carte.addControl(new NavigationControl(), 'top-right');
    // Point bleu façon Google Maps : bouton dédié, jamais activé
    // automatiquement (la géolocalisation continue reste un choix explicite
    // de l'utilisateur — trackUserLocation ne fait que suivre, ne recentre
    // pas la carte ni ne recalcule l'itinéraire).
    carte.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
        showAccuracyCircle: true,
      }),
      'top-right',
    );
    carteRef.current = carte;
    return () => {
      carte.remove();
      carteRef.current = null;
    };
  }, []);

  useEffect(() => {
    const carte = carteRef.current;
    if (!carte) return;

    function dessiner() {
      if (!carte) return;

      for (const marqueur of marqueursRef.current) marqueur.remove();
      marqueursRef.current = [];
      if (carte.getLayer(TRACE_LAYER_ID)) carte.removeLayer(TRACE_LAYER_ID);
      if (carte.getSource(TRACE_LAYER_ID)) carte.removeSource(TRACE_LAYER_ID);

      const bounds = new LngLatBounds();
      let hasBounds = false;

      if (depart) {
        const point: [number, number] = [
          depart.position.longitude,
          depart.position.latitude,
        ];
        marqueursRef.current.push(
          new Marker({ color: '#14589c' }).setLngLat(point).addTo(carte),
        );
        bounds.extend(point);
        hasBounds = true;
      }
      if (arrivee) {
        const point: [number, number] = [
          arrivee.position.longitude,
          arrivee.position.latitude,
        ];
        marqueursRef.current.push(
          new Marker({ color: '#b45309' }).setLngLat(point).addTo(carte),
        );
        bounds.extend(point);
        hasBounds = true;
      }

      const segmentsAvecTrace = (itineraire?.segments ?? []).filter(
        (segment) => segment.trace,
      );
      if (segmentsAvecTrace.length > 0) {
        const features = segmentsAvecTrace.map((segment) => ({
          type: 'Feature' as const,
          properties: { mode: segment.mode },
          geometry: {
            type: 'LineString' as const,
            coordinates: decodePolyline(segment.trace as string),
          },
        }));

        carte.addSource(TRACE_LAYER_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });
        carte.addLayer({
          id: TRACE_LAYER_ID,
          type: 'line',
          source: TRACE_LAYER_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            // Le typage strict des expressions maplibre attend un tuple de
            // longueur fixe : la liste de couleurs par mode est generee
            // dynamiquement depuis COULEUR_MODE, echappe donc a ce typage.
            'line-color': [
              'match',
              ['get', 'mode'],
              ...Object.entries(COULEUR_MODE).flat(),
              '#14589c',
            ] as unknown as string,
            'line-width': 4,
          },
        });

        for (const feature of features) {
          for (const coord of feature.geometry.coordinates) {
            bounds.extend(coord);
          }
        }
        hasBounds = true;
      }

      for (const marqueur of arretsMarqueursRef.current) marqueur.remove();
      arretsMarqueursRef.current = [];

      if (hasBounds) {
        carte.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 400 });
        // Attend la fin de l'animation pour interroger exactement la zone
        // visible a l'ecran (carte.getBounds()), pas la zone approximative
        // avant fitBounds.
        const requeteId = ++arretsRequeteIdRef.current;
        carte.once('moveend', () => {
          void chargerArrets(carte, requeteId);
        });
      }
    }

    async function chargerArrets(carte: MapLibreMap, requeteId: number) {
      const zone = carte.getBounds();
      const params = new URLSearchParams({
        minLat: String(zone.getSouth()),
        minLon: String(zone.getWest()),
        maxLat: String(zone.getNorth()),
        maxLon: String(zone.getEast()),
      });
      try {
        const res = await fetch(`/api/arrets?${params.toString()}`);
        if (!res.ok) return;
        const arrets = (await res.json()) as ArretTransport[];
        // Une recherche plus recente a demarre entre-temps : cette reponse
        // ne correspond plus a la zone actuelle, on l'ignore.
        if (requeteId !== arretsRequeteIdRef.current) return;

        for (const marqueur of arretsMarqueursRef.current) marqueur.remove();
        arretsMarqueursRef.current = arrets.map((arret) => {
          const point = document.createElement('div');
          point.className = 'arret-point';
          point.title = arret.nom;
          return new Marker({ element: point })
            .setLngLat([arret.position.longitude, arret.position.latitude])
            .addTo(carte);
        });
      } catch {
        // Degradation silencieuse : les arrets sont un complement visuel,
        // jamais un blocage de la planification d'itineraire elle-meme.
      }
    }

    if (carte.isStyleLoaded()) {
      dessiner();
    } else {
      carte.once('load', dessiner);
    }
  }, [depart, arrivee, itineraire]);

  return (
    <div
      ref={conteneurRef}
      className="map-shell"
      // role="img" serait incorrect : MapLibre injecte des controles
      // focusables (zoom, boussole) dans ce conteneur, or un role "img" ne
      // doit jamais avoir de descendant focusable (viole nested-interactive,
      // trouve via axe-core). "region" reste un landmark valide pour un
      // widget interactif.
      role="region"
      aria-label="Carte de l'itineraire selectionne"
    />
  );
}
