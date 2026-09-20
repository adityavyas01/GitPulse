// import { Suspense, useEffect, useRef } from 'react';
// import { Canvas, useFrame } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
// import { Group } from 'three';

// import { Earth } from './Earth.js';
// import { Atmosphere } from './Atmosphere.js';
// import { CloudLayer } from './CloudLayer.js';
// import { StarField } from './StarField.js';
// import { ActivityLayer } from './ActivityLayer.js';
// import { CameraFlyTo, flyToEarthGroup } from './CameraFlyTo.js';
// import { MAX_CAMERA_DISTANCE, lodBudget, type Budget } from './lod.js';
// import {
//   getCenteringRotationY,
//   getRealTimeEarthState,
//   INDIA_LONGITUDE,
//   SIDEREAL_DAY,
// } from './earthAstronomy.js';

// /**
//  * Prototype globe engine inside the existing Git Pulse app shell. Data
//  * (locations + counts) comes from the existing app data layer as props;
//  * geographic alignment uses the canonical frame in coordinates.ts, so the
//  * Earth's real-time rotation never shifts activity away from its city.
//  */
// export function GlobeCanvas({
//   locations,
//   flyToTarget = null
// }: {
//   locations: import('../api/globeActivity.js').GlobeActivityLocation[];
//   flyToTarget?: { latitude: number; longitude: number; seq: number } | null;
// }) {
//   return (
//     <Canvas
//       camera={{ position: [0, 0.35, 3.05], fov: 43, near: 0.05, far: 100 }}
//       dpr={[1, 1.75]}
//       gl={{ antialias: true, alpha: true }}
//     >
//       <Suspense fallback={null}>
//         <Scene locations={locations} flyToTarget={flyToTarget} />
//       </Suspense>
//     </Canvas>
//   );
// }

// function Scene({
//   locations,
//   flyToTarget
// }: {
//   locations: import('../api/globeActivity.js').GlobeActivityLocation[];
//   flyToTarget: { latitude: number; longitude: number; seq: number } | null;
// }) {
//   const earth = useRef<Group>(null);
//   const budget = useRef<Budget>(80);

//   // Deterministic initial orientation; the globe then rotates at the real
//   // sidereal rate (no IP geolocation call — no extra external request).
//   const initialRotation = getCenteringRotationY(INDIA_LONGITUDE);
//   const rotationRef = useRef(initialRotation);
//   const lastTimestamp = useRef(Date.now());
//   const sunDirection = useRef(getRealTimeEarthState().sunDirection);

//   // Register the rotating group so CameraFlyTo can track it across frames.
//   useEffect(() => {
//     flyToEarthGroup.current = earth.current;
//     return () => {
//       flyToEarthGroup.current = null;
//     };
//   }, []);

//   useFrame(({ camera }) => {
//     const earthGroup = earth.current;
//     if (!earthGroup) return;

//     const now = Date.now();
//     const elapsed = Math.max(0, (now - lastTimestamp.current) / 1000);
//     lastTimestamp.current = now;

//     const siderealRate = (Math.PI * 2) / SIDEREAL_DAY;
//     rotationRef.current += siderealRate * elapsed;
//     earthGroup.rotation.y = rotationRef.current;

//     // Sun direction is Earth-local; rotation only spins the mesh.
//     sunDirection.current = getRealTimeEarthState(new Date(now)).sunDirection;

//     // LOD budget re-evaluation per frame; consumers read the ref (no React
//     // state updates in the render path — Week 12 architecture).
//     budget.current = lodBudget(camera.position.length(), budget.current);
//   });

//   return (
//     <>
//       <StarField />

//       <group ref={earth}>
//         <Earth sunDirection={sunDirection.current} />
//         <CloudLayer />
//         <ActivityLayer locations={locations} lodBudgetRef={budget} />
//         <Atmosphere />
//       </group>

//       <OrbitControls
//         makeDefault
//         enablePan={false}
//         enableDamping
//         dampingFactor={0.075}
//         rotateSpeed={0.45}
//         zoomSpeed={0.65}
//         minDistance={1.38}
//         maxDistance={MAX_CAMERA_DISTANCE}
//         minPolarAngle={0.07}
//         maxPolarAngle={Math.PI - 0.07}
//       />

//       <CameraFlyTo target={flyToTarget} />
//     </>
//   );
// }

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Group } from 'three';
import * as THREE from 'three';

import { Earth } from './Earth.js';
// import { Atmosphere } from './Atmosphere.js';
import { StarField } from './StarField.js';
import { ActivityLayer } from './ActivityLayer.js';
import { CameraFlyTo, flyToEarthGroup } from './CameraFlyTo.js';
import { MAX_CAMERA_DISTANCE, lodBudget, type Budget } from './lod.js';
import { recordFrame } from './effects/performance.js';
import {
  getCenteringRotationY,
  getRealTimeEarthState,
  INDIA_LONGITUDE,
  SIDEREAL_DAY,
} from './earthAstronomy.js';

/**
 * Prototype globe engine inside the existing Git Pulse app shell. Data
 * (locations + counts) comes from the existing app data layer as props;
 * geographic alignment uses the canonical frame in coordinates.ts, so the
 * Earth's real-time rotation never shifts activity away from its city.
 */
export function GlobeCanvas({
  locations,
  flyToTarget = null,
  visualizationTime = null
}: {
  locations: import('../api/globeActivity.js').GlobeActivityLocation[];
  flyToTarget?: { latitude: number; longitude: number; seq: number } | null;
  /** Timeline-selected time for day/night shading; null = LIVE (real time). */
  visualizationTime?: Date | null;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 3.0], fov: 43, near: 0.05, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <PerformanceTracker />

      <Suspense fallback={null}>
        <Scene
          locations={locations}
          flyToTarget={flyToTarget}
          visualizationTime={visualizationTime}
        />
      </Suspense>
    </Canvas>
  );
}

/**
 * Records the actual R3F render-loop frame rate for the DOM performance
 * overlay. Kept independent from globe/activity rendering so the metric
 * remains valid regardless of which visual layers are mounted.
 */
function PerformanceTracker() {
  useFrame(({ clock }) => {
    recordFrame(clock.elapsedTime * 1000);
  });

  return null;
}

function Scene({
  locations,
  flyToTarget,
  visualizationTime
}: {
  locations: import('../api/globeActivity.js').GlobeActivityLocation[];
  flyToTarget: { latitude: number; longitude: number; seq: number } | null;
  visualizationTime: Date | null;
}) {
  const earth = useRef<Group>(null);
  const budget = useRef<Budget>(80);

  // Deterministic initial orientation; the globe then rotates at the real
  // sidereal rate (no IP geolocation call — no extra external request).
  const initialRotation = getCenteringRotationY(INDIA_LONGITUDE);
  const rotationRef = useRef(initialRotation);
  const lastTimestamp = useRef(Date.now());
  const sunDirection = useRef(new THREE.Vector3());

  // Register the rotating group so CameraFlyTo can track it across frames.
  useEffect(() => {
    flyToEarthGroup.current = earth.current;
    return () => {
      flyToEarthGroup.current = null;
    };
  }, []);

  useFrame(({ camera }) => {
    const earthGroup = earth.current;
    if (!earthGroup) return;

    const now = Date.now();
    const elapsed = Math.max(0, (now - lastTimestamp.current) / 1000);
    lastTimestamp.current = now;

    const siderealRate = (Math.PI * 2) / SIDEREAL_DAY;
    rotationRef.current += siderealRate * elapsed;
    earthGroup.rotation.y = rotationRef.current;

    // Sun direction is Earth-local; rotation only spins the mesh. The
    // astronomy input is the timeline-selected time in replay, real time in
    // LIVE — day/night shading always matches the rendered activity slot.
    sunDirection.current.copy(
      getRealTimeEarthState(visualizationTime ?? new Date(now)).sunDirection
    );

    // LOD budget re-evaluation per frame; consumers read the ref (no React
    // state updates in the render path — Week 12 architecture).
    budget.current = lodBudget(camera.position.length(), budget.current);
  });

  return (
    <>
      <StarField />

      <group ref={earth}>
        <Earth sunDirection={sunDirection.current} />
        <ActivityLayer locations={locations} lodBudgetRef={budget} />
        {/* <Atmosphere /> */}
      </group>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={1}
        zoomSpeed={0.65}
        minDistance={1.38}
        maxDistance={MAX_CAMERA_DISTANCE}
        minPolarAngle={0.07}
        maxPolarAngle={Math.PI - 0.07}
      />

      <CameraFlyTo target={flyToTarget} />
    </>
  );
}