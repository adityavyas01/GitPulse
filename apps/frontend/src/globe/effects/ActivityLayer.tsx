import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { GlobeActivityLocation } from '../../api/globeActivity.js';
import { latLonToVector3, GLOBE_RADIUS } from '../coordinates.js';
import { INTENSITY_LEVELS, type IntensityLevel } from './intensity.js';
import {
  MAX_PULSES,
  type LodTier,
  isFrontFacing,
  phaseFor,
  selectLodPulses,
  tierForDistance
} from './lod.js';
import { recordFrame } from './performance.js';

interface ActivityLayerProps {
  locations: GlobeActivityLocation[];
}

/**
 * Week 12 (ROADMAP.md — Performance + LOD): one InstancedMesh of fixed
 * capacity MAX_PULSES is allocated once and reused — object pooling and a
 * single draw call. LOD caps the rendered count by camera distance
 * (global/regional/city tiers); unused slots are scaled to zero. Back-
 * hemisphere instances are hidden each frame (visibility control).
 * Aggregate-driven: one instance per active location — never per event.
 */
export function ActivityLayer({ locations }: ActivityLayerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const [tier, setTier] = useState<LodTier>(() => tierForDistance(camera.position.length()));
  const tierRef = useRef(tier);

  // Fixed-capacity instance pool, allocated once per mount.
  const pool = useMemo(
    () => ({
      matrices: Array.from({ length: MAX_PULSES }, () => new THREE.Matrix4()),
      positions: Array.from({ length: MAX_PULSES }, () =>
        latLonToVector3(0, 0, GLOBE_RADIUS * 1.002)
      ),
      normals: Array.from({ length: MAX_PULSES }, () => new THREE.Vector3()),
      scales: new Float32Array(MAX_PULSES),
      colors: {
        low: new THREE.Color(INTENSITY_LEVELS.low.color),
        medium: new THREE.Color(INTENSITY_LEVELS.medium.color),
        high: new THREE.Color(INTENSITY_LEVELS.high.color),
        surge: new THREE.Color(INTENSITY_LEVELS.surge.color)
      }
    }),
    []
  );

  // Selection + static per-slot data, recomputed when data or LOD tier changes.
  const selected = useMemo(() => {
    const maxCount = Math.max(...locations.map((l) => l.count), 1);
    const pulses = selectLodPulses(locations, tier);
    return pulses.map((loc) => {
      const pos = latLonToVector3(loc.latitude, loc.longitude, GLOBE_RADIUS * 1.002);
      const normalized = loc.count / maxCount;
      const level: IntensityLevel =
        normalized > 0.75
          ? 'surge'
          : normalized > 0.5
            ? 'high'
            : normalized > 0.25
              ? 'medium'
              : 'low';
      return { position: pos, normal: pos.clone().normalize(), phase: phaseFor(loc.locationId), level };
    });
  }, [locations, tier]);

  // Push static data into the pool whenever the selection changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < MAX_PULSES; i++) {
      const sel = selected[i];
      pool.scales[i] = sel ? INTENSITY_LEVELS[sel.level].baseScale : 0;
      if (sel) {
        pool.positions[i].copy(sel.position);
        pool.normals[i].copy(sel.normal);
        const m = pool.matrices[i];
        m.makeScale(pool.scales[i], pool.scales[i], pool.scales[i]);
        m.setPosition(pool.positions[i]);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, pool.colors[sel.level]);
      } else {
        mesh.setMatrixAt(i, pool.matrices[i].makeScale(0, 0, 0));
      }
    }
    mesh.count = MAX_PULSES;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [selected, pool]);

  useFrame(({ clock }) => {
    recordFrame(clock.elapsedTime * 1000);

    // LOD re-evaluation happens only when the camera crosses a tier boundary.
    const nextTier = tierForDistance(camera.position.length());
    if (nextTier !== tierRef.current) {
      tierRef.current = nextTier;
      setTier(nextTier);
    }

    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const camDir = camera.position.clone().normalize();

    for (let i = 0; i < MAX_PULSES; i++) {
      const sel = selected[i];
      if (!sel) continue;
      const visible = isFrontFacing(pool.normals[i], camDir);
      const config = INTENSITY_LEVELS[sel.level];
      const phase = (t * config.speed + sel.phase) % 1;
      const pulse = pool.scales[i] * (1 + Math.sin(phase * Math.PI * 2) * config.pulseAmount);
      const m = pool.matrices[i];
      if (visible) {
        m.makeScale(pulse, pulse, pulse);
        m.setPosition(pool.positions[i]);
      } else {
        m.makeScale(0, 0, 0);
      }
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PULSES]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 12, 12]} />
      <meshBasicMaterial transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

