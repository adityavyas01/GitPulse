import * as THREE from 'three';

export const GLOBE_RADIUS = 1;

/**
 * Converts lat/lon (degrees) to a position on the globe surface.
 * Standard geographic convention: lat north positive, lon east positive.
 */
export function latLonToVector3(latitude: number, longitude: number, radius: number = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
