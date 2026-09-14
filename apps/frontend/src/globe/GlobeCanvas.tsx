import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { Earth, Atmosphere } from './Earth.js';
import { StarField } from './effects/StarField.js';
import { ActivityLayer } from './effects/ActivityLayer.js';
import { FAKE_ACTIVITY } from './fakeActivity.js';
import { CameraFlyTo } from './CameraFlyTo.js';
import type { GlobeActivityLocation } from '../api/globeActivity.js';
import { GLOBE_RADIUS } from './coordinates.js';

/**
 * Globe scene: Earth + atmosphere + stars + lighting + camera + capped
 * aggregate city pulses. Locations come from the app-level data layer
 * (live view or Week 10 timeline replay slot) via props. Week 11 adds a
 * smooth camera fly-to target (UI_SPEC §7).
 */
export function GlobeCanvas({
  locations,
  flyToTarget = null,
  useFakeData = false
}: {
  locations: GlobeActivityLocation[];
  flyToTarget?: { latitude: number; longitude: number; seq: number } | null;
  useFakeData?: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 3.2], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#04060c']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} color="#fff4e0" />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} color="#3b82f6" />

      <Earth />
      <Atmosphere />
      <StarField />
      <CameraFlyTo target={flyToTarget} />
      <ActivityLayer
        locations={locations.length > 0 ? locations : useFakeData ? FAKE_ACTIVITY : []}
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minDistance={GLOBE_RADIUS * 1.5}
        maxDistance={GLOBE_RADIUS * 8}
      />
    </Canvas>
  );
}
