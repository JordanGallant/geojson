'use client'
import React, { useState, useEffect } from 'react'

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
  const [closestTree, setClosestTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = { lat: latitude, lng: longitude };
        setLocation(userLocation);
        
        // Automatically query for trees once we have location
        await queryTrees(latitude, longitude);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Query the API for closest trees
  const queryTrees = async (lat: number, lng: number, limit: number = 5) => {
    try {
      setError(null);
      
      const response = await fetch(
        `/api/trees?lat=${lat}&lng=${lng}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setTrees(data.trees);
        setClosestTree(data.closest);
      } else {
        setError('No trees found in your area.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trees data.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Find Closest Trees</h1>
      
      {/* Location Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Location</h2>
        
        {locationError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {locationError}
          </div>
        )}
        
        {location ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p><strong>Latitude:</strong> {location.lat.toFixed(6)}</p>
            <p><strong>Longitude:</strong> {location.lng.toFixed(6)}</p>
          </div>
        ) : (
          <p className="text-gray-600">Getting your location...</p>
        )}
        
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Location'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Closest Tree Section */}
      {closestTree && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Closest Tree</h2>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
            <p><strong>Species:</strong> {closestTree.boomsoort}</p>
            <p><strong>Height:</strong> {closestTree.boomhoogte}m</p>
            <p><strong>Distance:</strong> {closestTree.distance}m away</p>
            <p><strong>Coordinates:</strong> {closestTree.coordinates[1].toFixed(6)}, {closestTree.coordinates[0].toFixed(6)}</p>
          </div>
        </div>
      )}

      {/* All Trees Section */}
      {trees.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Nearby Trees ({trees.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trees.map((tree) => (
              <div key={tree.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{tree.boomsoort}</h3>
                <p className="text-sm text-gray-600">Height: {tree.boomhoogte}m</p>
                <p className="text-sm text-gray-600">Distance: {tree.distance}m</p>
                <p className="text-xs text-gray-500 mt-2">
                  {tree.coordinates[1].toFixed(4)}, {tree.coordinates[0].toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !location && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Finding your location and nearby trees...</p>
        </div>
      )}
    </div>
  );
}