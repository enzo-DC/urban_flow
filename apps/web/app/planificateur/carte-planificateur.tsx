'use client';

import type { Itineraire, LieuGeocode } from '@urbanflow/shared';
import {
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

  useEffect(() => {
    if (!conteneurRef.current) return;
    const carte = new MapLibreMap({
      container: conteneurRef.current,
      style: STYLE_OSM,
      center: CENTRE_TOULOUSE,
      zoom: 12,
    });
    carte.addControl(new NavigationControl(), 'top-right');
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

      if (hasBounds) {
        carte.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 400 });
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
      role="img"
      aria-label="Carte de l'itineraire selectionne"
    />
  );
}
