import { Vector3 } from 'three';

export const EARTH_RADIUS = 1;
export const GLOBE_RADIUS = EARTH_RADIUS;

// Canonical right-handed coordinates: +Y north, +Z (0°,0°), +X (0°,90°E).
// Earth shading, astronomy, and all geographic geometry use this exact
// convention (prototype globe frame); app data stays plain lat/lon degrees.
export function isCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

export function latLonToVector3(
  latitude: number,
  longitude: number,
  out = new Vector3(),
) {
  if (!isCoordinate(latitude, longitude)) {
    throw new RangeError('Invalid geographic coordinates');
  }
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  return out.set(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  );
}

export function isAboveHorizon(normal: Vector3, localCamera: Vector3) {
  return normal.dot(localCamera) > EARTH_RADIUS;
}

export function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

export const stableUnit = (value: string) => fnv1a(value) / 4294967296;
