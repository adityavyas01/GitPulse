import * as THREE from 'three';

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const SIDEREAL_DAY = 86164.0905;

/** Deterministic initial orientation when no user region is known. */
export const INDIA_LONGITUDE = 78.9629;
export { SIDEREAL_DAY };

function normalizeAngle(angle: number) {
  return ((angle + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
}

function solarData(date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0;

  const meanLongitude = normalizeAngle((280.460 + 0.9856474 * d) * DEG);
  const meanAnomaly = (357.528 + 0.9856003 * d) * DEG;

  const eclipticLongitude =
    meanLongitude +
    (1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)) * DEG;

  const obliquity = (23.4393 - 0.0000004 * d) * DEG;

  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));

  const greenwichSiderealAngle = normalizeAngle(
    (
      280.46061837 +
      360.98564736629 * d +
      0.000387933 * (d / 36525) ** 2 -
      (d / 36525) ** 3 / 38710000
    ) * DEG,
  );

  return { rightAscension, declination, greenwichSiderealAngle };
}

/**
 * Sun direction in the Earth-local coordinate system used by Earth.tsx
 * (x = cos(lat)*sin(lon), y = sin(lat), z = cos(lat)*cos(lon)).
 */
export function getSunDirection(date = new Date()) {
  const { rightAscension, declination, greenwichSiderealAngle } = solarData(date);

  const subsolarLongitude = normalizeAngle(rightAscension - greenwichSiderealAngle);

  return new THREE.Vector3(
    Math.cos(declination) * Math.sin(subsolarLongitude),
    Math.sin(declination),
    Math.cos(declination) * Math.cos(subsolarLongitude),
  ).normalize();
}

/**
 * Presentation rotation that puts a requested longitude at the camera.
 * Camera-facing longitude is 0 in the local globe convention, so a
 * longitude L is brought forward with a -L rotation around Y.
 */
export function getCenteringRotationY(longitude: number) {
  return -longitude * DEG;
}

export function getRealTimeEarthState(date = new Date()) {
  return { sunDirection: getSunDirection(date) };
}
