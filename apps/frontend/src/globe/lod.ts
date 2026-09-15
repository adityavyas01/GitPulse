export const ACTIVITY_CAPACITY = 500;
export const MAX_CAMERA_DISTANCE = 7.0;
export const REGIONAL_DISTANCE = 2.4;
export const CITY_DISTANCE = 1.65;
export type Budget = 80 | 240 | 500;

// Resolve the nested <=4.5R / <=2.4R ranges into non-overlapping bands.
// Global: (2.4,4.5], regional: (1.65,2.4], city: <=1.65. All units are R=1.
// Hysteresis prevents flickering when the camera rests on a boundary.
export function lodBudget(distance: number, previous?: Budget): Budget {
  const h = 0.06;
  if (previous === 500 && distance <= CITY_DISTANCE + h) return 500;
  if (previous === 80 && distance >= REGIONAL_DISTANCE - h) return 80;
  if (previous === 240 && distance > CITY_DISTANCE - h && distance <= REGIONAL_DISTANCE + h) return 240;
  return distance <= CITY_DISTANCE ? 500 : distance <= REGIONAL_DISTANCE ? 240 : 80;
}
