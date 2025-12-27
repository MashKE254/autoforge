/**
 * Google Maps Integration Client
 *
 * API key-based integration for Google Maps Platform
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class GoogleMapsClient extends APIKeyClient {
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(options: { userId?: string }) {
    super('google-maps', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const response = await fetch(
          `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Google Maps API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          throw new Error(`Geocoding failed: ${data.status}`);
        }

        return {
          success: true,
          results: data.results.map((r: any) => ({
            formattedAddress: r.formatted_address,
            lat: r.geometry.location.lat,
            lng: r.geometry.location.lng,
            placeId: r.place_id,
            types: r.types,
          })),
        };
      },
      async () => IntegrationsDemoMode.googleMaps_geocode(address),
      'geocode'
    );
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const response = await fetch(
          `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Google Maps API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          throw new Error(`Reverse geocoding failed: ${data.status}`);
        }

        return {
          success: true,
          results: data.results.map((r: any) => ({
            formattedAddress: r.formatted_address,
            placeId: r.place_id,
            types: r.types,
          })),
        };
      },
      async () => IntegrationsDemoMode.googleMaps_reverseGeocode(lat, lng),
      'reverse_geocode'
    );
  }

  /**
   * Get directions between two locations
   */
  async getDirections(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const response = await fetch(
          `${this.baseUrl}/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${this.apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Google Maps API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          throw new Error(`Directions failed: ${data.status}`);
        }

        return {
          success: true,
          routes: data.routes.map((r: any) => ({
            summary: r.summary,
            distance: r.legs[0].distance,
            duration: r.legs[0].duration,
            steps: r.legs[0].steps.map((s: any) => ({
              instruction: s.html_instructions.replace(/<[^>]*>/g, ''),
              distance: s.distance,
              duration: s.duration,
            })),
          })),
        };
      },
      async () => IntegrationsDemoMode.googleMaps_getDirections(origin, destination, mode),
      'get_directions'
    );
  }

  /**
   * Find nearby places
   */
  async findNearbyPlaces(lat: number, lng: number, radius: number = 1000, type?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        let url = `${this.baseUrl}/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${this.apiKey}`;
        if (type) url += `&type=${type}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Google Maps API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error(`Places search failed: ${data.status}`);
        }

        return {
          success: true,
          places: data.results.map((p: any) => ({
            name: p.name,
            address: p.vicinity,
            lat: p.geometry.location.lat,
            lng: p.geometry.location.lng,
            placeId: p.place_id,
            types: p.types,
            rating: p.rating,
            openNow: p.opening_hours?.open_now,
          })),
        };
      },
      async () => IntegrationsDemoMode.googleMaps_findNearbyPlaces(lat, lng, radius, type),
      'find_nearby_places'
    );
  }

  /**
   * Get place details
   */
  async getPlaceDetails(placeId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const response = await fetch(
          `${this.baseUrl}/place/details/json?place_id=${placeId}&key=${this.apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Google Maps API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          throw new Error(`Place details failed: ${data.status}`);
        }

        const place = data.result;
        return {
          success: true,
          place: {
            name: place.name,
            address: place.formatted_address,
            phoneNumber: place.formatted_phone_number,
            website: place.website,
            rating: place.rating,
            reviews: place.reviews,
            openingHours: place.opening_hours,
            photos: place.photos?.map((p: any) => ({
              reference: p.photo_reference,
              width: p.width,
              height: p.height,
            })),
          },
        };
      },
      async () => IntegrationsDemoMode.googleMaps_getPlaceDetails(placeId),
      'get_place_details'
    );
  }

  /**
   * Calculate distance matrix
   */
  async getDistanceMatrix(origins: string[], destinations: string[], mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const response = await fetch(
          `${this.baseUrl}/distancematrix/json?origins=${origins.join('|')}&destinations=${destinations.join('|')}&mode=${mode}&key=${this.apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Google Maps API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          throw new Error(`Distance matrix failed: ${data.status}`);
        }

        return {
          success: true,
          matrix: data.rows.map((row: any, i: number) => ({
            origin: origins[i],
            destinations: row.elements.map((el: any, j: number) => ({
              destination: destinations[j],
              distance: el.distance,
              duration: el.duration,
              status: el.status,
            })),
          })),
        };
      },
      async () => IntegrationsDemoMode.googleMaps_getDistanceMatrix(origins, destinations, mode),
      'get_distance_matrix'
    );
  }
}
