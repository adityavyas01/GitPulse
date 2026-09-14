export interface GlobeActivityLocation {
  locationId: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  count: number;
}

/**
 * Fake activity data for Week 2 (Globe Engine).
 * Replaced by real API data in Week 8 per ROADMAP.md.
 */
export const FAKE_ACTIVITY: GlobeActivityLocation[] = [
  { locationId: 'sfo', city: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194, count: 842 },
  { locationId: 'nyc', city: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, count: 761 },
  { locationId: 'lon', city: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, count: 655 },
  { locationId: 'ber', city: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405, count: 412 },
  { locationId: 'blr', city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946, count: 918 },
  { locationId: 'tok', city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, count: 549 },
  { locationId: 'syd', city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, count: 214 },
  { locationId: 'sao', city: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, count: 301 },
  { locationId: 'sgp', city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, count: 267 },
  { locationId: 'tor', city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, count: 322 },
  { locationId: 'par', city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, count: 289 },
  { locationId: 'ams', city: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, count: 196 }
];
