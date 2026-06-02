'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationMarker {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  lat: number;
  lng: number;
  address: string;
}

interface AdminMapProps {
  locations: LocationMarker[];
  onSelect: (id: string) => void;
}

export default function AdminMap({ locations, onSelect }: AdminMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    if (!mapRef.current) {
      // 1. Initialize map centered in Delhi
      mapRef.current = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 12);

      // Add high quality tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Layer group for all markers
      markersLayerRef.current = L.featureGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when locations array updates
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Clear previous markers
    markersLayerRef.current.clearLayers();

    if (locations.length === 0) return;

    locations.forEach((loc) => {
      if (!loc.lat || !loc.lng) return;

      // Color coding priority pins
      let markerColor = '#38bdf8'; // Blue: Low / Default
      if (loc.status === 'Resolved' || loc.status === 'Closed') {
        markerColor = '#10b981'; // Green: Resolved
      } else if (loc.priority === 'High') {
        markerColor = '#f43f5e'; // Red: High
      } else if (loc.priority === 'Medium') {
        markerColor = '#f59e0b'; // Yellow: Medium
      }

      // Circular glowing custom SVG markers
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          background-color: ${markerColor};
          width: 14px;
          height: 14px;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 8px ${markerColor};
          animation: pulseGlow 1.5s infinite ease-in-out;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      // Dynamic popup binding
      const popupContent = `
        <div style="font-family: sans-serif; font-size: 11px; color: #1e293b; max-width: 180px;">
          <strong style="display: block; font-size: 12px; margin-bottom: 3px;">${loc.title}</strong>
          <span style="display: inline-block; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-bottom: 4px;">${loc.category}</span>
          <br/>
          <strong>Status:</strong> ${loc.status} <br/>
          <strong>Priority:</strong> ${loc.priority} <br/>
          <button id="btn-${loc.id}" style="
            background-color: #0f172a;
            color: white;
            border: none;
            padding: 4px 8px;
            margin-top: 6px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-weight: bold;
          ">Review Details</button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-${loc.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelect(loc.id);
            marker.closePopup();
          };
        }
      });

      if (markersLayerRef.current) {
        markersLayerRef.current.addLayer(marker);
      }
    });

    // Auto fit map bounds if multiple markers exist
    try {
      const bounds = markersLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (e) {
      // Ignore fits errors for single markers
    }
  }, [locations]);

  return <div ref={mapContainerRef} className="h-full w-full rounded-2xl overflow-hidden" style={{ minHeight: '340px' }} />;
}
