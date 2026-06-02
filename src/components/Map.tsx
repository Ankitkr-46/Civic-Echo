'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function Map({ lat, lng, onChange }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Reset default icon paths which leaflet sometimes breaks during webpack/next packaging
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapRef.current) {
      // 1. Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 14);

      // Add modern, high-contrast map tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // 2. Add draggable marker
      markerRef.current = L.marker([lat, lng], {
        draggable: true,
      }).addTo(mapRef.current);

      // 3. Listen to drag movements
      markerRef.current.on('dragend', () => {
        if (markerRef.current) {
          const position = markerRef.current.getLatLng();
          onChange(position.lat, position.lng);
        }
      });

      // 4. Map click listener to reposition
      mapRef.current.on('click', (e) => {
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
          onChange(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map view and marker when parent coordinate shifts
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentLatLng = markerRef.current.getLatLng();
      if (currentLatLng.lat !== lat || currentLatLng.lng !== lng) {
        mapRef.current.setView([lat, lng]);
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-xl overflow-hidden" style={{ minHeight: '260px' }} />;
}
