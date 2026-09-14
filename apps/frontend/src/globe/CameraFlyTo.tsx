import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { GLOBE_RADIUS, latLonToVector3 } from './coordinates.js';

const FLY_RATE = 6.7; // exponential smoothing rate (1/s) — matches the previous ~0.08/frame feel at 60 FPS but is frame-rate independent
const STOP_DISTANCE = 0.002;
const CAMERA_DISTANCE = GLOBE_RADIUS * 2.6;

/**
 * Week 11 (UI_SPEC §7): smooth camera fly-to. When a target is set, the
 * camera eases toward a position above the location; user interaction is
 * preserved because OrbitControls and this effect share the same camera.
 * The target is consumed once the camera is close or the prop is cleared.
 */
export function CameraFlyTo({
  target
}: {
  target: { latitude: number; longitude: number; seq: number } | null;
}) {
  const { camera } = useThree();
  const goalRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!target) {
      goalRef.current = null;
      return;
    }
    const surface = latLonToVector3(target.latitude, target.longitude, GLOBE_RADIUS);
    goalRef.current = surface.normalize().multiplyScalar(CAMERA_DISTANCE);
  }, [target]);

  useFrame((_, delta) => {
    const goal = goalRef.current;
    if (!goal) return;
    camera.position.lerp(goal, 1 - Math.exp(-FLY_RATE * delta));
    if (camera.position.distanceTo(goal) < STOP_DISTANCE) {
      goalRef.current = null;
    }
  });

  return null;
}
