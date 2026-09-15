/**
 * Globe-internal data shapes. The app-level GlobeActivityLocation (merged
 * location+count) is split into these at the GlobeCanvas boundary; data
 * semantics stay with the existing API layer.
 */
export interface Location {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}
export interface Activity {
  locationId: string;
  count: number;
}
