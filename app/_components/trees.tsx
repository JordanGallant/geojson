'use client'
import React, { useState, useEffect, useRef } from 'react'
import * as L from 'leaflet'

// Types matching your API response
interface Tree {
  id: string;
  boomsoort: string;
  boomhoogte: number;
  coordinates: [number, number];
  distance: number;
}

interface ApiResponse {
  success: boolean;
  userLocation: { lat: number; lng: number };
  trees: Tree[];
  closest: Tree;
}

export default function Trees() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

useEffect(() => {
  if (typeof window !== 'undefined' && mapRef.current && !mapInstanceRef.current && location) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    mapInstanceRef.current = L.map(mapRef.current).setView([location.lat, location.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);
  }
}, [location]);


  // Update map when location and trees change
  useEffect(() => {
    if (mapInstanceRef.current && location) {
      // Clear existing markers
      mapInstanceRef.current.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          mapInstanceRef.current?.removeLayer(layer);
        }
      });

      // Add user location marker (blue)
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>',
        iconSize: [20, 20],
      });
      
      L.marker([location.lat, location.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('Your Location');

      // Add tree markers (green)
      trees.forEach((tree, index) => {
        const treeIcon = L.divIcon({
          className: 'tree-marker',
          html: `<div style="background-color: ${index === 0 ? '#ef4444' : '#22c55e'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [16, 16],
        });

        L.marker([tree.coordinates[1], tree.coordinates[0]], { icon: treeIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <strong>${tree.boomsoort}</strong><br>
            Height: ${tree.boomhoogte}m<br>
            Distance: ${tree.distance}m
            ${index === 0 ? '<br><em>Closest tree</em>' : ''}
          `);
      });

      // Fit map to show all markers
      if (trees.length > 0) {
        const group = new L.FeatureGroup([
          L.marker([location.lat, location.lng]),
          ...trees.map(tree => L.marker([tree.coordinates[1], tree.coordinates[0]]))
        ]);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [location, trees]);

  // Get current location and query trees
  const findTrees = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = { lat: latitude, lng: longitude };
        setLocation(userLocation);

        try {
          const response = await fetch(`/api/trees?lat=${latitude}&lng=${longitude}&limit=1000`);
          const data: ApiResponse = await response.json();

          if (data.success) {
            setTrees(data.trees);
          } else {
            setError('No trees found');
          }
        } catch (err) {
          setError('Failed to fetch trees');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setError('Location access denied');
        setLoading(false);
      }
    );
  };

  // Auto-load on mount
  useEffect(() => {
    findTrees();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Find Trees Near You</h1>
      
      <button
        onClick={findTrees}
        disabled={loading}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4 disabled:opacity-50"
      >
        {loading ? 'Finding Trees...' : 'Find Nearby Trees'}
      </button>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {location && (
        <div className="mb-4 text-sm text-gray-600">
          Your location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)} | Found {trees.length} trees
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border-2 border-gray-300"
        style={{ minHeight: '400px' }}
      />

      {/* Add Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />
    </div>
  );
}