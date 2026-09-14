export type IntensityLevel = 'low' | 'medium' | 'high' | 'surge';

export interface IntensityConfig {
  baseScale: number;
  pulseAmount: number;
  speed: number;
  color: string;
  opacity: number;
}

/**
 * Activity intensity drives visual weight (UI_SPEC.md section 5).
 * Normalized so one extreme city cannot destroy visual hierarchy.
 */
export const INTENSITY_LEVELS: Record<IntensityLevel, IntensityConfig> = {
  low:    { baseScale: 0.015, pulseAmount: 0.15, speed: 0.25, color: '#3b82f6', opacity: 0.55 },
  medium: { baseScale: 0.022, pulseAmount: 0.22, speed: 0.4,  color: '#22d3ee', opacity: 0.65 },
  high:   { baseScale: 0.03,  pulseAmount: 0.3,  speed: 0.55, color: '#a5f3fc', opacity: 0.75 },
  surge:  { baseScale: 0.04,  pulseAmount: 0.4,  speed: 0.75, color: '#f0f9ff', opacity: 0.9 }
};
