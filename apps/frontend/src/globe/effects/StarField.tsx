import { useMemo } from 'react';
import * as THREE from 'three';

interface StarFieldProps {
  count?: number;
}

/**
 * Background starfield. Static points, no per-frame allocation.
 */
export function StarField({ count = 2000 }: StarFieldProps) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.12} color="#9db4d0" sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}
