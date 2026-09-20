import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  Vector3,
} from 'three';

import type { GlobeActivityLocation } from '../api/globeActivity.js';
import { latLonToVector3, stableUnit } from './coordinates.js';
import { normalizedIntensity } from './intensity.js';
import { ACTIVITY_CAPACITY, type Budget } from './lod.js';
import { rankedActivities } from './activityModel.js';

const vertexShader = `
  attribute vec3 pulse;
  varying vec2 vUv;
  varying vec3 vPulse;

  void main() {
    vUv = uv;
    vPulse = pulse;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPulse;

  void main() {
    float r = length(vUv - 0.5) * 2.0;

    if (r > 1.0) discard;

    float phase = fract(
      time * (0.24 + vPulse.y * 0.16) + vPulse.x
    );

    float ringRadius = 0.16 + phase * 0.80;

    float ring = exp(
      -pow((r - ringRadius) / 0.035, 2.0)
    ) * pow(1.0 - phase, 1.55);

    float core = exp(-r * r * 48.0);

    float halo = exp(-r * r * 4.5) * 0.62;

    float alpha =
      (core * 1.80 + halo + ring * 0.95)
      * (0.92 + vPulse.y * 0.55);

    vec3 color = mix(
      vec3(0.10, 0.72, 0.95),
      vec3(0.72, 1.00, 1.00),
      vPulse.y
    );

    gl_FragColor = vec4(
      color,
      alpha * smoothstep(1.0, 0.78, r)
    );
  }
`;

interface Props {
  /** Merged app data: catalog location + aggregated activity count. */
  locations: GlobeActivityLocation[];
  /** Live LOD budget ref from GlobeCanvas (no React state in render path). */
  lodBudgetRef: RefObject<Budget>;
}

/**
 * Week 12 performance architecture with the prototype pulse shader: ONE
 * InstancedMesh of fixed capacity ACTIVITY_CAPACITY (500), allocated once —
 * pooling, single draw call, zero per-frame allocation. The layer is a
 * child of the rotating Earth group, so pulses stay geographically aligned
 * during rotation. One instance per active location — never per event.
 */
export function ActivityLayer({ locations, lodBudgetRef }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  const { gl } = useThree();

  // Hover tooltip state (pointer → instanceId via raycast; id → city/count
  // via a locationId lookup). Null when not hovering an active instance.
  const [hover, setHover] = useState<{ city: string; count: number } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const ranked = useMemo(
    () =>
      rankedActivities(
        locations.map((l) => ({
          id: l.locationId,
          city: l.city,
          country: l.country,
          latitude: l.latitude,
          longitude: l.longitude,
        })),
        locations.map((l) => ({ locationId: l.locationId, count: l.count })),
      ),
    [locations],
  );

  const pool = useMemo(
    () =>
      Array.from({ length: ACTIVITY_CAPACITY }, () => ({
        id: '',
        normal: new Vector3(),
        rank: Infinity,
        count: 0,
        fade: 0,
      })),
    [],
  );

  const scratch = useMemo(
    () => ({
      object: new Object3D(),
      camera: new Vector3(),
      z: new Vector3(0, 0, 1),
    }),
    [],
  );

  const attributes = useMemo(
    () =>
      new InstancedBufferAttribute(
        new Float32Array(ACTIVITY_CAPACITY * 3),
        3,
      ).setUsage(DynamicDrawUsage),
    [],
  );

  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);

  // locationId → display info for the tooltip; rebuilt when data changes.
  const infoById = useMemo(() => {
    const map = new Map<string, { city: string; count: number }>();
    for (const l of locations) {
      if (l.count > 0) map.set(l.locationId, { city: l.city, count: l.count });
    }
    return map;
  }, [locations]);

  // instanceId → locationId follows the pool slot assignment in the effect
  // below; captured at pointer time from the pool array.
  const handlePointerMove = (e: { instanceId?: number; clientX: number; clientY: number }) => {
    const id = e.instanceId;
    const rect = gl.domElement.getBoundingClientRect();
    // Html anchors at projected world origin = canvas center (OrbitControls
    // targets the globe center), so the offset is measured from the center.
    setHoverPos({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2
    });
    if (id === undefined || id < 0) {
      setHover(null);
      return;
    }
    const slotId = pool[id]?.id;
    const info = slotId ? infoById.get(slotId) : undefined;
    setHover(info ?? null);
  };

  useEffect(() => {
    if (!mesh.current) return;

    mesh.current.instanceMatrix.setUsage(DynamicDrawUsage);

    const ids = new Set(ranked.map((record) => record.location.id));

    for (const slot of pool) {
      if (!ids.has(slot.id)) {
        slot.rank = Infinity;
        slot.count = 0;
      }
    }

    ranked.forEach(({ location, count }, rank) => {
      let index = pool.findIndex((slot) => slot.id === location.id);

      if (index < 0) {
        index = pool.findIndex((slot) => !ids.has(slot.id));
      }

      if (index < 0) return;

      const slot = pool[index];

      if (slot.id !== location.id) {
        slot.fade = 0;
      }

      slot.id = location.id;
      slot.rank = rank;
      slot.count = count;

      latLonToVector3(location.latitude, location.longitude, slot.normal);

      attributes.setXYZ(index, stableUnit(location.id), normalizedIntensity(count), 0);
    });

    attributes.needsUpdate = true;
  }, [ranked, pool, attributes]);

  useFrame(({ camera }, delta) => {
    const layer = mesh.current;
    if (!layer) return;

    uniforms.time.value += delta;

    layer.updateWorldMatrix(true, false);
    scratch.camera.copy(camera.position);
    layer.worldToLocal(scratch.camera);

    const budget = lodBudgetRef.current;
    const smoothing = 1 - Math.exp(-delta * 7);

    for (let i = 0; i < ACTIVITY_CAPACITY; i++) {
      const slot = pool[i];

      const cameraLength = scratch.camera.length();
      const facing =
        cameraLength > 0
          ? slot.normal.dot(scratch.camera) / cameraLength
          : 0;

      const target =
        slot.count > 0 && slot.rank < budget
          ? Math.min(1, Math.max(0, facing / 0.12))
          : 0;

      slot.fade += (target - slot.fade) * smoothing;

      const visibility = facing > 0 ? slot.fade : 0;

      const strength = normalizedIntensity(slot.count);

      // Pulse quad (ring/core), tangent to the surface.
      scratch.object.position.copy(slot.normal).multiplyScalar(1.014);
      scratch.object.quaternion.setFromUnitVectors(scratch.z, slot.normal);
      scratch.object.scale.setScalar((0.075 + strength * 0.055) * visibility);
      scratch.object.updateMatrix();
      layer.setMatrixAt(i, scratch.object.matrix);
    }

    layer.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, ACTIVITY_CAPACITY]}
      frustumCulled={false}
      renderOrder={4}
      onPointerMove={handlePointerMove}
      onPointerOut={() => setHover(null)}
    >
      <planeGeometry args={[1, 1]}>
        <primitive attach="attributes-pulse" object={attributes} />
      </planeGeometry>

      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        depthTest
      />
    </instancedMesh>
      {hover && hoverPos && (
        <Html
          position={[0, 0, 0]}
          center
          style={{
            pointerEvents: 'none',
            transform: `translate(${hoverPos.x}px, ${hoverPos.y}px)`,
            zIndex: 10
          }}
        >
          <div className="activity-tooltip">
            <span className="activity-tooltip-city">{hover.city}</span>
            <span className="activity-tooltip-count">{hover.count} activities</span>
          </div>
        </Html>
      )}
    </>
  );
}
