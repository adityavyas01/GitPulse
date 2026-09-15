export type Intensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'SURGE';

export function intensity(count: number): Intensity {
  return count >= 180 ? 'SURGE' : count >= 90 ? 'HIGH' : count >= 30 ? 'MEDIUM' : 'LOW';
}

export function normalizedIntensity(count: number) {
  return ({ LOW: 0.2, MEDIUM: 0.45, HIGH: 0.7, SURGE: 1 })[intensity(count)];
}
